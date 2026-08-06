import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DOCS, GITHUB, NAV_LINKS, SIGN_IN } from "./site-nav.ts";

/**
 * **The header is on every page, and it is the same header** (kolonie-website#50).
 *
 * That is the whole of `#50`'s first acceptance criterion, and it is a property
 * of the output rather than of any one file: this site renders its header from
 * two places — `Site.astro` for `/` and the Starlight `Header` override for
 * everything else — because `/` left the framework in `#30`. A header that is
 * right in one of them and stale in the other is precisely the state `#40` and
 * `#42` each had to repair by hand, one link at a time.
 *
 * **The rejection case is `every built page`, and it is deliberately not a
 * list.** The pages are read off `dist/` rather than enumerated here, so a page
 * added next month is covered by this test on the day it is added rather than
 * on the day somebody remembers to extend an array. A new page that ships
 * without the header fails this.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));

/** Every built page, found rather than listed. */
const pages = readdirSync(dist, { recursive: true, encoding: "utf8" })
  .filter((file) => file.endsWith("index.html"))
  // Pagefind ships its own fixtures under `pagefind/`; they are not this site's
  // pages and carry no header.
  .filter((file) => !file.startsWith("pagefind"));

const html = (file: string) => readFileSync(join(dist, file), "utf8");

it("found the built pages at all", () => {
  // Without this, every `describe.each` below would vacuously pass on an empty
  // list — a green suite proving nothing, which is worse than a red one.
  expect(pages.length).toBeGreaterThan(10);
});

describe.each(pages)("%s", (file) => {
  const page = html(file);

  it("renders the header", () => {
    expect(page).toContain('class="site-header');
  });

  // Astro appends a scoped class to every styled element, so every class match
  // here is a prefix rather than an equality.
  it("carries the wordmark, linked home", () => {
    expect(page).toMatch(/<a href="\/" class="site-header__mark[^"]*">Kolonie AI</);
  });

  it.each(NAV_LINKS)("navigates to $label", (link) => {
    expect(page).toContain(`href="${link.href}"`);
    expect(page).toContain(`>${link.label}<`);
  });

  it("ends on the GitHub icon and the two buttons", () => {
    expect(page).toContain(`href="${GITHUB.href}"`);
    // The icon is a mark for the eye and a word for a screen reader.
    expect(page).toMatch(
      new RegExp(`class="sr-only[^"]*">${GITHUB.label}<`),
    );

    // `#50`: one outline, one filled, and they are `#48`'s components rather
    // than a second implementation — which is what the class names prove.
    expect(page).toMatch(
      new RegExp(`class="btn btn--secondary[^"]*"[^>]*href="${DOCS.href}"`),
    );
    expect(page).toMatch(
      new RegExp(`class="btn btn--primary[^"]*"[^>]*href="${SIGN_IN.href}"`),
    );
  });

  it("names Sign in once, not once per width", () => {
    // The obvious way to keep a button in the bar at every width is one copy
    // per breakpoint, each hidden at the other's. CSS hides the extra one from
    // the eye and not from a screen reader, which announces *Sign in, Sign in*.
    expect(page.match(new RegExp(`>\\s*${SIGN_IN.label}\\s*<`, "g"))).toHaveLength(1);
  });

  it("folds into a menu rather than a script", () => {
    // A scripted menu is a fourth thing on this site that stops working with
    // JavaScript off. `#37` made the same choice for the FAQ.
    expect(page).toContain('class="site-header__menu');
    expect(page).toContain("<summary");
  });
});

describe("the header's items come from one list", () => {
  it("is three in the middle, with no dropdown", () => {
    expect(NAV_LINKS).toHaveLength(3);
  });

  it("sends Sign in to the console and the icon to the organisation", () => {
    expect(SIGN_IN.href).toBe("https://console.kolonie.ai/");
    expect(GITHUB.href).toBe("https://github.com/Kolonie-AI");
  });

  it("says in the component that the announcement bar was refused", () => {
    // `#50` requires the refusal to be written down rather than left as an
    // absence, so that nobody reads the empty strip as a slot to fill.
    const source = readFileSync(
      fileURLToPath(new URL("../components/SiteHeader.astro", import.meta.url)),
      "utf8",
    );
    expect(source).toMatch(/no announcement bar/i);
  });

  it("does not put the same word in the nav and on a button", () => {
    // Why the third nav item is `Skill` and not `Docs` — see `site-nav.ts`.
    // `#50` decided both, and the two halves contradicted each other.
    expect(NAV_LINKS.map((link) => link.label)).not.toContain(DOCS.label);
  });
});
