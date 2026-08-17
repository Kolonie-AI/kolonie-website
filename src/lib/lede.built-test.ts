import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TERM_DESTINATIONS } from "./plain-term.ts";

/**
 * **The first screen of a page a stranger arrives on** (kolonie-website#121,
 * `#123`, `#128`).
 *
 * `AGENTS.md` §3 is six rules about what a first screen may say, and the two of
 * them that are mechanically checkable are checked here. The other four are
 * about sentences and are checked by somebody reading them; a test that claimed
 * to check *"state an outcome for the human"* would be a test that passes on
 * anything.
 *
 * **What is checkable is order and vocabulary.** A lede that arrives after the
 * page's first heading is not a first screen, and a lede that spends a Colony
 * word without linking it is the exact failure `#120` and `#121` were both
 * written about. Both survive an edit that keeps the words and moves them,
 * which is the edit a reviewer misses.
 *
 * **The page list is deliberate rather than discovered.** Every other test in
 * this directory reads `dist/` and covers a new page on the day it is added,
 * and that is right for a property every page must have. This is not one: a
 * lede is what these three issues decided five specific pages need, and a rule
 * that every page must open with one would be this component becoming
 * mandatory furniture by accident. A page added next month gets a lede when
 * somebody decides it needs one.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));

const html = (route: string) =>
  readFileSync(join(dist, route.replace(/^\//, ""), "index.html"), "utf8");

/** The pages three issues decided open with one, and why each was named. */
const LEDE_PAGES: readonly { readonly route: string; readonly issue: string }[] = [
  { route: "/academy/", issue: "kolonie-website#121" },
  // Both of these opened in the Colony's vocabulary rather than in the reader's,
  // and `/run-a-swarm/` kept its answer to *what do I actually do* six screens
  // below the fold (`#123`).
  { route: "/the-register/", issue: "kolonie-website#123" },
  { route: "/run-a-swarm/", issue: "kolonie-website#123" },
];

describe.each(LEDE_PAGES)("$route", ({ route }) => {
  const page = html(route);

  /** The lede's own markup, so nothing below it can satisfy a test about it. */
  const lede = () => {
    const start = page.indexOf('<div class="lede');
    expect(start).toBeGreaterThan(-1);
    return page.slice(start, page.indexOf("</div>", start));
  };

  it("opens with a lede", () => {
    // Astro appends a scoped class, so this is a prefix rather than an equality.
    expect(page).toMatch(/<div class="lede[^"]*"/);
  });

  it("puts it before the page's first heading", () => {
    // The `h1` is the frontmatter title and is rendered by `[...slug].astro`
    // above the body, so the heading that matters here is the first `h2` — the
    // start of the depth the lede exists to introduce.
    const heading = page.indexOf("<h2");
    expect(heading).toBeGreaterThan(-1);
    expect(page.indexOf('<div class="lede')).toBeLessThan(heading);
  });

  it("says only one thing once", () => {
    // Two ledes is a page with two first screens, which is the failure mode of
    // a component that is easy to add: somebody opens a section with one.
    expect(page.match(/<div class="lede/g)).toHaveLength(1);
  });

  it("gives the reader somewhere to go next", () => {
    // §3's rule 1 is an outcome *and* one thing to do. The thing to do is
    // written into the prose rather than rendered as a button — `Lede.astro`
    // says why — so what is checkable is that the block contains a link at all.
    expect(lede()).toMatch(/<a[^>]+href=/);
  });

  /**
   * **No Colony word standing on its own** (`AGENTS.md` §3, rule 2, and `#120`).
   *
   * The rule is that a term arrives with a plain gloss beside it and a link to
   * its page. A gloss cannot be tested. A link can, and a term inside one is
   * the floor of the rule: a reader who meets an unfamiliar word has somewhere
   * to resolve it. A term in the running text with nothing behind it is the
   * thing `#121` found on `/academy/` and `#123` on both pages it names.
   */
  it("spends no Colony term outside a link", () => {
    const withoutLinks = lede().replaceAll(/<a\b[^>]*>[\s\S]*?<\/a>/g, " ");
    const text = withoutLinks.replaceAll(/<[^>]+>/g, " ");

    for (const { term } of TERM_DESTINATIONS) {
      expect(text.toLowerCase()).not.toMatch(
        new RegExp(`\\b${term.toLowerCase()}s?\\b`),
      );
    }
  });
});
