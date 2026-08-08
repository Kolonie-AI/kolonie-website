import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { CALL_TO_ACTION_PHRASES, LAYER_PAIRS, LAYER_RULE, isDocumentation } from "./layers.ts";

/**
 * The boundary between the two layers, checked on the built site
 * (kolonie-website#66).
 *
 * **Why this is a built test and not a unit one.** The rule is about what a
 * reader meets on a page, and the thing that would break it is a paragraph
 * somebody adds to an `.mdx` file months from now — not a function returning the
 * wrong boolean. The predicate is already covered where it lives; what is
 * unchecked is whether the pages obey it.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));

const pagesUnder = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return pagesUnder(path);
    return entry.endsWith(".html") ? [path] : [];
  });

/** The rendered text of a page, with tags, scripts and styles removed. */
const text = (html: string): string =>
  html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

/**
 * The built path a page is served at — `dist/quests/index.html` → `/quests/`.
 * This is the form `LAYER_PAIRS` is written in, so the two can be compared.
 */
const servedPath = (file: string): string =>
  file.replace(dist, "").replace(/index\.html$/, "").replace(/\.html$/, "") || "/";

describe("the two layers (kolonie-website#66)", () => {
  const pages = pagesUnder(dist);

  it("built some pages at all", () => {
    expect(pages.length).toBeGreaterThan(1);
  });

  /**
   * **The rule is on the site, not only in a comment.** `#66` says it is *"the
   * thing that will otherwise be re-litigated on every new page"*, and a rule
   * kept only in an issue is one the next contributor has not read. It lives in
   * `layers.ts` as an exported constant so that this test, the component and any
   * page that wants to quote it read the same bytes.
   */
  it("states its rule in one place", () => {
    expect(LAYER_RULE).toContain("already decided");
    expect(LAYER_RULE).toContain("has not");
  });

  /**
   * **`#66`'s third criterion: no documentation page carries a call to action.**
   *
   * This binds nothing today — every content page on this site is still a page
   * a stranger arrives on — and that is exactly why it is written now. The first
   * documentation page is `kolonie-website#71`, and the check that stops it
   * arriving with a hook has to exist before it does, not after somebody notices.
   */
  it.each(pagesUnder(dist).map(servedPath))("%s carries no call to action if it is documentation", (path) => {
    // `isDocumentation` takes a Starlight route id, which is the served path
    // without its slashes — `/docs/whatever/` → `docs/whatever`.
    const routeId = path.replace(/^\/|\/$/g, "");
    if (!isDocumentation(routeId)) return;

    const file = pages.find((p) => servedPath(p) === path)!;
    const html = readFileSync(file, "utf8");

    /**
     * **The chrome comes off before the text does, and that is a fix**
     * (kolonie-website#87).
     *
     * `#50`'s header and `#51`'s footer are on every page and carry the site's
     * own navigation, which is not this page's call to action. This intended to
     * say so and could not: it stripped the tags first and then looked for
     * `<main` in the result, so the slice never found anything and the whole
     * page was judged. It passed anyway, because the header's filled button
     * said `Sign in` — a phrase this list does not contain.
     *
     * `#87` made that button `Send your agent`, which turned a guard that was
     * not working into a guard that was failing, and the fix is the one the
     * comment already described.
     */
    const chromeless = html
      .replace(/<header\b[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer\b[\s\S]*?<\/footer>/gi, " ");

    const main = text(chromeless).toLowerCase();

    const found = CALL_TO_ACTION_PHRASES.filter((phrase) => main.includes(phrase));
    expect(found, `${path} is documentation and carries: ${found.join(", ")}`).toEqual([]);
  });

  /**
   * **A pair whose either half does not exist is a dead link on a real page.**
   * The table is empty today; this is what stops it filling up with rows written
   * ahead of the pages they name, which is the failure mode of a mapping kept by
   * hand.
   */
  it.each(LAYER_PAIRS.length ? LAYER_PAIRS : [])(
    "both halves of %o were actually built",
    (pair) => {
      const built = new Set(pages.map(servedPath));
      expect(built.has(pair.persuasion), `${pair.persuasion} was not built`).toBe(true);
      expect(built.has(pair.documentation), `${pair.documentation} was not built`).toBe(true);
      // #66: the label names its destination. "Learn more" is what this forbids.
      expect(pair.label.length).toBeGreaterThan(10);
    },
  );

  /**
   * The way back, which `#66` also asks for in one click. It is `#50`'s header
   * rather than anything this issue built, and this asserts that the reason it
   * needed nothing built is still true — every page carrying the same header is
   * what makes a documentation page reachable in both directions.
   */
  it.each(pagesUnder(dist).map(servedPath))("%s can be left again in one click", (path) => {
    const file = pages.find((p) => servedPath(p) === path)!;
    const html = readFileSync(file, "utf8");

    // The site's own navigation, on every page. If a layer ever renders without
    // it, a reader who followed a link into it is stranded.
    expect(html, `${path} renders no site header`).toMatch(/href="\/"/);
  });
});
