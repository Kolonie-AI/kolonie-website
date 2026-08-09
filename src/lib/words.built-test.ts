import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NOT_PAGES } from "./built-pages.ts";

import { isDocumentation } from "./chrome.ts";
import { WORDS, WORDS_PATH } from "./words.ts";

/**
 * The vocabulary page as a reader meets it, and the link that reaches it
 * (kolonie-website#79).
 *
 * **Why this is a built test and not a unit one.** `words.test.ts` covers the
 * data — one sentence each, no forward references, every entry linked. What it
 * cannot see is the half of `#79` that is about pages: *"It is linked from every
 * persuasion page, near the first unfamiliar word, not buried in a footer."*
 * That is broken by somebody adding a sixth persuasion page and not thinking
 * about this one, which is exactly the failure a list nobody has to edit would
 * not catch.
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

const servedPath = (file: string): string =>
  file.replace(dist, "").replace(/index\.html$/, "").replace(/\.html$/, "") || "/";

/**
 * The rendered text of a page, with tags, scripts and styles removed — and
 * punctuation folded back to the ASCII the source is written in.
 *
 * **Two different things happen to an apostrophe here and both have to be
 * undone.** Prose in the `.mdx` goes through Markdown, which turns an
 * apostrophe into its typographic form. The sentences arrive from `words.ts`
 * as JSX expressions, which skip Markdown entirely and are HTML-escaped
 * instead. A version of this that handled only the first passed on the prose
 * and failed on the data, which is how it was found.
 */
const text = (html: string): string =>
  html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ");

const routeId = (path: string): string =>
  path === "/" ? "index" : path.replace(/^\//, "").replace(/\/$/, "");

const pages = pagesUnder(dist);

describe("the vocabulary page (kolonie-website#79)", () => {
  const page = pages.find((file) => servedPath(file) === WORDS_PATH);

  it("is built and served at the path the pages link to", () => {
    expect(page, `nothing built at ${WORDS_PATH}`).toBeDefined();
  });

  it("carries every term, with its sentence", () => {
    const rendered = text(readFileSync(page!, "utf8"));
    for (const { term, sentence } of WORDS) {
      expect(rendered, `${term} missing`).toContain(term);
      // The sentence's own words, not the punctuation, because MDX renders
      // straight quotes and dashes as their typographic forms.
      const opening = sentence.split(/[—,:]/)[0]!.trim();
      expect(rendered, `${term}'s sentence missing`).toContain(opening);
    }
  });

  it("sends the reader on to where each term is defined at length", () => {
    const html = readFileSync(page!, "utf8");
    for (const { term, where } of WORDS) {
      expect(html, `${term} does not link to ${where}`).toContain(`href="${where}"`);
    }
  });

  /**
   * `#79`: *"Nothing on it is longer than a sentence."* Asserted against the
   * built page rather than only against the data, because the failure it guards
   * is a paragraph added to the `.mdx` around the list — which `words.test.ts`
   * cannot see at all.
   *
   * The floor is what the page needs to make sense; the ceiling is what stops it
   * becoming the documentation `#79` says nobody reads. The prose outside the
   * list is four sentences today.
   */
  it("stays a page of definitions rather than becoming documentation", () => {
    const rendered = text(readFileSync(page!, "utf8"));
    const definitions = WORDS.reduce((sum, word) => sum + word.sentence.length, 0);
    // Everything on the page, minus the site's own header and footer chrome,
    // measured as a multiple of what the definitions themselves cost.
    expect(rendered.length).toBeLessThan(definitions * 3);
  });
});

describe("every persuasion page reaches it (kolonie-website#79)", () => {
  /**
   * Derived from `chrome.ts`'s predicate rather than from a list here, so a
   * sixth persuasion page is covered on the day it is added and not on the day
   * somebody remembers this file. That is the same reason `layers.built-test.ts`
   * enumerates `dist` instead of naming pages.
   *
   * Legal pages and the blog are excluded: `#79` says *persuasion page*, and the
   * terms it lists are the site's argument rather than its paperwork. A reader of
   * `/imprint/` has not met the word *rung*.
   */
  const persuasion = pages
    .map(servedPath)
    .filter((path) => !isDocumentation(routeId(path)))
    .filter((path) => path !== WORDS_PATH)
    .filter((path) => !path.startsWith("/blog"))
    // Starlight's own 404. It is not a page anybody arrives on to be persuaded,
    // it carries no prose at all, and it is not authored in this repository.
    .filter((path) => path !== "/404/" && path !== "/404")
    .filter((path) => !["/imprint/", "/privacy/", "/terms/", "/citizen-terms/"].includes(path));

  it("finds the persuasion pages to check", () => {
    expect(persuasion.length).toBeGreaterThanOrEqual(4);
  });

  it.each(persuasion)("%s links to the vocabulary", (path) => {
    const file = pages.find((candidate) => servedPath(candidate) === path)!;
    expect(readFileSync(file, "utf8")).toContain(`href="${WORDS_PATH}"`);
  });

  /**
   * *"Not buried in a footer"* is the other half of `#79`'s sentence, and it is
   * the half a link added in `Site.astro` would satisfy on paper while failing
   * every reader — furniture is what a reader who has just met an unfamiliar
   * word has already learned to skip.
   *
   * Measured as position: the link sits in the first two thirds of the page's
   * own body. That is loose on purpose — the point is that it is placed by the
   * page, near its own first specific word, rather than that it lands on a
   * particular line.
   *
   * **Measured across `<main>` and not across the file** (kolonie-website#99).
   * It was the whole document until then, and the whole document includes the
   * `<head>`: `#95` moved the prose layer into a component, Astro inlines a
   * component's stylesheet into the pages that use it, and several kilobytes of
   * CSS arriving above the content pushed `/pricing/` from 0.66 to 0.68 without
   * a word of the page moving. A heuristic that a stylesheet can fail is one
   * that will be nudged rather than read the next time it goes red — and the
   * sentence it is standing in for was always about the *body*, which is what
   * it now measures.
   */
  it.each(persuasion)("%s places the link in its body rather than its footer", (path) => {
    const file = pages.find((candidate) => servedPath(candidate) === path)!;
    const html = readFileSync(file, "utf8");

    const opens = html.indexOf("<main");
    const closes = html.indexOf("</main>");
    expect(opens, `${path} has no <main>`).toBeGreaterThan(-1);

    const body = html.slice(opens, closes);
    const at = body.indexOf(`href="${WORDS_PATH}"`);

    expect(at, `${path} does not link to the vocabulary from its body`).toBeGreaterThan(-1);
    expect(at / body.length).toBeLessThan(0.67);
  });
});
