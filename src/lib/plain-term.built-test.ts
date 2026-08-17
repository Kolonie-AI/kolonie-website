import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ATLAS_PATH } from "./atlas.ts";
import { TERM_DESTINATIONS } from "./plain-term.ts";

/**
 * **The gloss pattern, as it is served** (kolonie-website#120, used by `#117`).
 *
 * `plain-term.test.ts` asserts the map: every term the gloss rule names is
 * accounted for, no destination is external, no spelling has drifted. That is the
 * data. This file is the other half — what a reader actually receives — and the
 * three failures it exists for are all invisible in the map:
 *
 * **The pattern rendering in the wrong order.** `#120`'s whole finding is that
 * the meaning has to arrive *before* the word. A call site that passes the Colony
 * term as the plain phrase, or a later edit to the component that moves the gloss
 * ahead of the sentence, satisfies every unit test and reverses the thing being
 * fixed.
 *
 * **The meaning becoming hover-only.** `#120`: *"Accessible (not hover-only
 * meaning)."* A `title` attribute or an `<abbr>` added later would look like an
 * improvement and would put the explanation somewhere a phone and a screen reader
 * cannot reach.
 *
 * **A gloss pointing at a page that is not built.** The map can only promise the
 * path is internal. Whether `/atlas` is a page in `dist` is a fact about the
 * build, and the reader who trusted the sentence enough to click is the one a
 * 404 fails.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));
const landing = readFileSync(join(dist, "index.html"), "utf8");

/** Every rendered gloss on the landing page, as the markup inside its `<p>`. */
const glosses = [...landing.matchAll(/<p class="plain-term[^"]*"[^>]*>([\s\S]*?)<\/p>/g)].map(
  (match) => match[1],
);

/** Text as a reader sees it: tags stripped, the entities Astro emits resolved. */
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll(/\s+/g, " ")
    .trim();

/**
 * Whether a path in an `href` is a page this build produced.
 *
 * Both spellings are accepted because both are correct depending on one Astro
 * setting, and this file has no business asserting which: a directory build puts
 * `/words` at `words/index.html`, a file build at `words.html`. What it does
 * assert is that one of them is there.
 */
const isBuiltPage = (href: string): boolean => {
  const path = href.replace(/^\//, "").replace(/\/$/, "");

  return existsSync(join(dist, path, "index.html")) || existsSync(join(dist, `${path}.html`));
};

/**
 * The one destination on this host that this repository does not build.
 *
 * `/atlas` is served by the API on the same origin (`kolonie-platform#546`, and
 * `atlas.ts` explains at length why the catalogue is read rather than held here).
 * So it is a page a reader reaches and not a file in `dist`, and it is named here
 * rather than the check being loosened: any *other* gloss that fails to resolve is
 * a 404 waiting for the reader who trusted the sentence enough to click.
 */
const SERVED_ELSEWHERE_ON_THIS_HOST = new Set([ATLAS_PATH]);

describe("the plain-phrase → term → link pattern, as served (kolonie-website#120)", () => {
  /**
   * `#120`'s acceptance criterion, counted: *"Used in at least 3 places on the
   * homepage (hero/loop tiles)."*
   *
   * Three rather than a fixed four, because the tile that has no Colony word to
   * hand over deliberately does not use the pattern — see the comment above the
   * loop in `index.astro`. What the number guards is the pattern being built and
   * then used once as a decoration.
   */
  it("is used at least three times on the homepage", () => {
    expect(glosses.length).toBeGreaterThanOrEqual(3);
  });

  it("puts the everyday phrase before the Colony word, every time", () => {
    for (const gloss of glosses) {
      const plain = gloss.indexOf('class="plain-term__plain');
      const term = gloss.indexOf('class="plain-term__gloss');

      expect(plain, "a gloss with no plain phrase at all").toBeGreaterThanOrEqual(0);
      expect(term, "a plain phrase with nothing glossed onto it").toBeGreaterThan(plain);
    }
  });

  /**
   * And the phrase is a sentence rather than a label.
   *
   * The failure this catches is the pattern surviving as markup while the copy
   * collapses back into jargon: `plain="Academy"`, `term="Academy"`. A phrase of
   * two words cannot be what `#120` means by *the meaning arrives first*.
   */
  it("gives each term a phrase long enough to be a meaning", () => {
    for (const gloss of glosses) {
      const plain = text(gloss.match(/<span class="plain-term__plain[^"]*"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? "");
      const term = text(gloss.match(/<a [^>]*>([\s\S]*?)<\/a>/)?.[1] ?? "");

      expect(plain.split(" ").length, `too short to explain anything: ${plain}`).toBeGreaterThan(8);
      expect(plain.toLowerCase()).not.toContain(term.toLowerCase());
    }
  });

  it("never hides the meaning behind a pointer", () => {
    for (const gloss of glosses) {
      expect(gloss, "a gloss carrying a title attribute").not.toMatch(/\stitle=/);
      expect(gloss, "a gloss using abbr").not.toContain("<abbr");
    }
  });

  it("links every term to a page this build produced", () => {
    const hrefs = glosses.map((gloss) => gloss.match(/<a [^>]*href="([^"]+)"/)?.[1]);

    expect(hrefs.filter((href) => href === undefined), "a term with no link").toEqual([]);

    for (const href of hrefs as string[]) {
      expect(href.startsWith("/"), `a gloss leaving the site: ${href}`).toBe(true);
      if (SERVED_ELSEWHERE_ON_THIS_HOST.has(href)) continue;

      expect(isBuiltPage(href), `a gloss pointing at a page that is not built: ${href}`).toBe(true);
    }
  });

  /**
   * Every rendered destination is one the map decided.
   *
   * `href` is a prop on the component for the case the map cannot know about, and
   * this asserts the homepage is not that case: a tile that hand-links a term is
   * how the same word ends up pointing at two pages, which is the reason
   * `plain-term.ts` exists at all.
   */
  it("takes the homepage's destinations from the map", () => {
    const known = new Set(TERM_DESTINATIONS.map((entry) => entry.href));

    for (const gloss of glosses) {
      const href = gloss.match(/<a [^>]*href="([^"]+)"/)?.[1];
      expect(known.has(href ?? ""), `not a destination in plain-term.ts: ${href}`).toBe(true);
    }
  });
});
