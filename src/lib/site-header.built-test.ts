import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NOT_PAGES } from "./built-pages.ts";
import { DOCS, GITHUB, NAV_LINKS, SEND, SIGN_IN } from "./site-nav.ts";

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
/**
 * Every built page, found rather than listed — minus the built HTML that is not
 * a page. `NOT_PAGES` has one entry and `built-pages.ts` says why.
 */
const pages = readdirSync(dist, { recursive: true, encoding: "utf8" })
  .filter((file) => file.endsWith("index.html"))
  .filter((file) => !NOT_PAGES.some((route) => file.startsWith(route)));

const html = (file: string) => readFileSync(join(dist, file), "utf8");

it("found the built pages at all", () => {
  // Without this, every `describe.each` below would vacuously pass on an empty
  // list — a green suite proving nothing, which is worse than a red one.
  expect(pages.length).toBeGreaterThan(10);
});

describe.each(pages)("%s", (file) => {
  const page = html(file);

  /**
   * The header's own markup, so an assertion about *the header* cannot be
   * satisfied — or broken — by the rest of the page.
   *
   * It became load-bearing on `kolonie-website#87`: the hero now carries a
   * quiet *Already have an account? Sign in.* beneath its primary action, which
   * is a second legitimate `Sign in` on the landing page and would otherwise
   * fail the count below for the right words and the wrong reason.
   */
  const header = page.slice(
    page.indexOf('<header class="site-header'),
    page.indexOf("</header>"),
  );

  it("renders the header", () => {
    expect(page).toContain('class="site-header');
  });

  // Astro appends a scoped class to every styled element, so every class match
  // here is a prefix rather than an equality.
  it("carries the wordmark, linked home", () => {
    expect(page).toMatch(
      /<a href="\/" class="site-header__mark[^"]*">[\s\S]*?Kolonie AI\s*<\/a>/,
    );
  });

  it("carries the mark beside it, in the same link", () => {
    // `#60`: on every page, in both themes, linking to `/`. Both themes is the
    // `var(--k-…)` — an inlined SVG with a literal hex in it is a mark that
    // ignores the reader's theme toggle, which is the defect `mark.ts` exists
    // to make impossible and this is where it is checked on the real output.
    const link = page.match(
      /<a href="\/" class="site-header__mark[^"]*">([\s\S]*?)<\/a>/,
    )?.[1];
    expect(link).toBeDefined();
    expect(link).toContain("<svg");
    expect(link).toContain("var(--k-accent)");
    expect(link).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it("does not announce the mark and the wordmark as two things", () => {
    const link = page.match(
      /<a href="\/" class="site-header__mark[^"]*">([\s\S]*?)<\/a>/,
    )?.[1];
    expect(link).toContain('aria-hidden="true"');
    expect(link).not.toContain("aria-label");
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
      new RegExp(`class="btn btn--primary[^"]*"[^>]*href="${SEND.href}"`),
    );
  });

  /**
   * **The filled button is not `Sign in` any more** (kolonie-website#87).
   *
   * `#40` made it the header's one persistent action and `#87` measured what
   * that costs: it is *"labelled for people who already joined"*, on every
   * page, to every stranger who has just read the argument. The primary action
   * describes what a **new** visitor does, and it is the hero's label rather
   * than a second one, so the site has one primary action instead of a
   * vocabulary of them.
   */
  it("offers the new visitor's action, not the returning one's", () => {
    expect(header).toContain(`>${SEND.label}<`);
    expect(header).not.toMatch(
      new RegExp(`class="btn[^"]*"[^>]*href="${SIGN_IN.href}"`),
    );
  });

  /**
   * **And `Sign in` is beside it rather than gone.** `#87`'s solution is two
   * things, and a header that dropped the returning visitor entirely would have
   * shipped one of them: *"That is the whole solution and it serves both
   * readers."*
   */
  it("still names Sign in, quietly", () => {
    expect(header).toContain(`href="${SIGN_IN.href}"`);
    expect(header).toContain(`>${SIGN_IN.label}<`);
    // Text, not a second bordered control: two buttons side by side read as two
    // alternatives of the same weight, which is what `#87` is undoing.
    expect(header).not.toMatch(
      new RegExp(`class="btn[^"]*"[^>]*>\\s*${SIGN_IN.label}`),
    );
  });

  it("names Sign in once, not once per width", () => {
    // The obvious way to keep a control in the bar at every width is one copy
    // per breakpoint, each hidden at the other's. CSS hides the extra one from
    // the eye and not from a screen reader, which announces *Sign in, Sign in*.
    expect(header.match(new RegExp(`>\\s*${SIGN_IN.label}\\s*<`, "g"))).toHaveLength(1);
  });

  it("folds into a menu rather than a script", () => {
    // A scripted menu is a fourth thing on this site that stops working with
    // JavaScript off. `#37` made the same choice for the FAQ.
    expect(page).toContain('class="site-header__menu');
    expect(page).toContain("<summary");
  });
});

describe("the header's items come from one list", () => {
  /**
   * **Four since `#85`, and the ceiling is what this test is for** rather than
   * the exact count. `#50` refused dropdowns — the reference needs them for four
   * product areas and this site has a handful of pages — so the guard is that
   * the row stays short enough not to need one, and `#85` named four items.
   */
  it("is four in the middle, with no dropdown", () => {
    expect(NAV_LINKS).toHaveLength(4);
  });

  /**
   * **No item is a word this project invented** (`#85`), which is the whole of
   * that issue and the thing a later edit is most likely to undo by reaching for
   * the shortest available label.
   */
  it("uses no Colony vocabulary in the middle", () => {
    const invented = ["academy", "quest", "skill", "rung", "citizen", "colony", "swarm"];

    for (const link of NAV_LINKS) {
      for (const word of invented) {
        expect(link.label.toLowerCase()).not.toContain(word);
      }
    }
  });

  /**
   * And every one of them points at a page this site actually builds (`#85`):
   * *"Shipping a menu with dead links is worse than shipping the three words it
   * replaces."* Read off `dist` rather than off a list, so a menu item that
   * outlives its page fails here.
   */
  it("points every item at a page that exists", () => {
    const built = new Set(pages.map((file) => `/${file.replace(/index\.html$/, "")}`));

    for (const link of NAV_LINKS) {
      expect(built).toContain(link.href);
    }
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
