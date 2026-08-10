import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NOT_PAGES } from "./built-pages.ts";
import { OG_IMAGE } from "./head.ts";

/**
 * Run **after** `astro build` — hence `*.built-test.ts` rather than
 * `*.test.ts`, which the ordinary suite would pick up and run against whatever
 * `dist/` happened to be lying around.
 *
 * **Why it exists.** Until kolonie-website#30 there was one place a page's
 * `<head>` was written from, and checking that place was enough. `/` left the
 * documentation framework in `#30` and writes its own, so there are two
 * surfaces now: `src/lib/head.ts` is the one list they both read, and this is
 * the assertion that the reading actually happened. A landing page that
 * silently lost the Open Graph image fails in the place it costs most — the
 * preview card of the link somebody shared — and nothing in the source can
 * catch that. Only the output can.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));

/**
 * Every built page, as an absolute path.
 *
 * `NOT_PAGES` is what keeps `/site-chrome/` out of it — the chrome fragment the
 * Atlas includes (`kolonie-website#99`), which is built HTML and is not a page.
 * The list and the reason are in `built-pages.ts`.
 */
const pagesUnder = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return pagesUnder(path);
    if (!entry.endsWith(".html")) return [];

    const served = path.slice(dist.length + 1);

    return NOT_PAGES.some((route) => served.startsWith(route)) ? [] : [path];
  });

describe("the shared head tags in the built site", () => {
  const pages = pagesUnder(dist);

  it("built some pages at all", () => {
    expect(pages.length).toBeGreaterThan(1);
  });

  it.each(pages.map((page) => page.slice(dist.length)))(
    "%s carries the Open Graph image, the card, and the theme colour",
    (page) => {
      const html = readFileSync(join(dist, page), "utf8");

      expect(html).toContain(OG_IMAGE);
      expect(html).toContain("summary_large_image");
      expect(html).toMatch(/name="theme-color"/);
      // kolonie-website#62. In the same list and for the same reason as the
      // rest: it has to be declared twice, and the copy that goes missing is
      // the one nobody is looking at.
      expect(html).toMatch(/rel="manifest" href="\/site\.webmanifest"/);
    },
  );

  /**
   * The landing page is the one this is really about: it is the page most
   * often shared, and the only one whose head is not written by the framework.
   */
  it("the landing page is composed rather than paged", () => {
    const html = readFileSync(join(dist, "index.html"), "utf8");

    // The documentation pager survived #21 on the most important page on the
    // site. It is what #30 was opened for; this is the check that it stays gone.
    expect(html).not.toContain("pagination-links");
    expect(html).toContain("Kolonie AI");
  });

  it("the landing page search and social descriptions lead with operator value", () => {
    const html = readFileSync(join(dist, "index.html"), "utf8");
    const description =
      "Develop agents that gain verified skills, control real accounts, earn SOL from quests, take roles, and specialise across your swarm.";

    expect(html).toContain(`<meta name="description" content="${description}">`);
    expect(html).toContain(
      `<meta property="og:description" content="${description}">`,
    );
  });
});
