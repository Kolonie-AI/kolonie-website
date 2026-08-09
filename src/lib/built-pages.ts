/**
 * Which built HTML files are *pages*, for the tests that walk all of them
 * (kolonie-website#99).
 *
 * **Several built tests read `dist/` rather than a list**, deliberately: a page
 * added next month is covered on the day it is added rather than on the day
 * somebody remembers to extend an array. `site-header.built-test.ts` says so in
 * as many words, and it is the right default.
 *
 * `#99` produced the first built HTML file that is not a page. `/site-chrome/`
 * is a fragment another process includes — this site's header and footer, built
 * from this site's own source so that the Atlas pages the API renders do not
 * need a second copy of either. It has no `<main>`, no head tags, no
 * vocabulary link and nothing to read, and four assertions that are correct
 * about every page were correct to fail on it.
 *
 * **So the exclusion is a named list in one file rather than a filter repeated
 * in each test.** Four copies of `!file.startsWith('site-chrome')` is four
 * places to remember, and the fifth test written next month remembers none of
 * them. It is also where the reason lives: a route in this list is one that
 * exists and is not a page, and adding one should need that sentence written
 * about it.
 *
 * **It is not a way to excuse a page from a rule.** A page that fails one of
 * those assertions is a page with a defect; the list is for files that are not
 * pages at all, and it has one entry.
 */

import { readdirSync } from "node:fs";

/**
 * Built HTML that is not a page anybody reads.
 *
 * Matched as a path prefix under `dist/`, so `site-chrome` covers
 * `site-chrome/index.html`.
 */
export const NOT_PAGES: readonly string[] = [
  /** The chrome fragment the Atlas includes (`#99`). */
  "site-chrome",
];

/** Every built page, found rather than listed, with the non-pages taken out. */
export function builtPages(dist: string): string[] {
  return readdirSync(dist, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".html"))
    .filter((file) => !NOT_PAGES.some((route) => file.startsWith(route)));
}
