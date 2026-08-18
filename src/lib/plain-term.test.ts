import { describe, expect, it } from "vitest";

import { ATLAS_PATH } from "./atlas.ts";
import { TERM_DESTINATIONS, TERMS_WITHOUT_A_PAGE, destinationFor } from "./plain-term.ts";
import { WORDS } from "./words.ts";

/**
 * The map that keeps a first-screen gloss from pointing somewhere that is not
 * there (kolonie-website#120).
 *
 * The component this feeds throws on a term it has no destination for, so the
 * failures worth a test here are the ones that still look fine at the call site:
 * a destination typed as an external URL, a term listed as both mapped and
 * unmapped, and a spelling that has drifted from the glossary's.
 */

/**
 * The eight terms `AGENTS.md` §3 says may not appear unglossed on a first
 * screen, lowercased.
 *
 * They are the reason this file exists, so each has to be accounted for — either
 * with a page here or with a written reason it has none. A ninth term added to
 * that section and to neither list is the drift this catches.
 */
const MUST_BE_ACCOUNTED_FOR = [
  "academy",
  "rung",
  "atlas",
  "playbook",
  "quest",
  "citizen",
  "register",
  "mcp",
];

describe("first-screen term destinations (kolonie-website#120)", () => {
  it("accounts for every term the gloss rule names", () => {
    const accounted = new Set([
      ...TERM_DESTINATIONS.map((entry) => entry.term.toLowerCase()),
      ...TERMS_WITHOUT_A_PAGE.map((entry) => entry.term.toLowerCase()),
    ]);

    expect(MUST_BE_ACCOUNTED_FOR.filter((term) => !accounted.has(term))).toEqual([]);
  });

  it("never lists a term as both mapped and unmapped", () => {
    const mapped = new Set(TERM_DESTINATIONS.map((entry) => entry.term.toLowerCase()));
    const unmapped = TERMS_WITHOUT_A_PAGE.map((entry) => entry.term.toLowerCase());

    expect(unmapped.filter((term) => mapped.has(term))).toEqual([]);
  });

  it.each(TERM_DESTINATIONS)("$term goes to a page on this site", ({ href }) => {
    // The whole point of the file: a reader on the first screen who clicks a
    // gloss stays on the site. `words.ts` is where a term's destination may be a
    // file in another repository, because that reader asked for the definition.
    expect(href.startsWith("/")).toBe(true);
    expect(href).not.toMatch(/^\/\//);
  });

  it.each(TERM_DESTINATIONS)("$term is spelled as the glossary spells it", ({ term }) => {
    const word = WORDS.find((entry) => entry.term.toLowerCase() === term.toLowerCase());

    // Absent is fine — `Academy` is the name of a place rather than a word with a
    // definition, which is why `#79` left it out. Present and spelled otherwise
    // is the fork this guards.
    if (word) expect(word.term).toBe(term);
  });

  it.each(TERMS_WITHOUT_A_PAGE)("$term says what to write instead", ({ instead }) => {
    // A term with no page is only safe to leave unmapped if the next writer is
    // told what to do about it. "Not yet" is not an instruction.
    expect(instead.length).toBeGreaterThan(20);
  });

  it("resolves a term as copy writes it, not only as the table spells it", () => {
    expect(destinationFor("Academy")?.href).toBe("/academy/");
    expect(destinationFor("academy")?.href).toBe("/academy/");
    expect(destinationFor("rungs")?.href).toBe("/academy/");
    expect(destinationFor(" quests ")?.href).toBe("/quests/");
    // `Atlas` ends in an s and is not a plural — the naive de-pluralisation must
    // not be the only thing that matches.
    expect(destinationFor("Atlas")?.href).toBe(ATLAS_PATH);
  });

  /**
   * `playbook` is here rather than in the test below, and the move is the
   * assertion (kolonie-website#124). It was the gloss rule's one term with no
   * page, and the page it now has is the one `#115` extends — so a link that
   * went back to being approximate would fail here first.
   */
  it("resolves the term that spent longest without a page", () => {
    expect(destinationFor("playbook")?.href).toBe("/playbooks/");
    expect(destinationFor("Playbooks")?.href).toBe("/playbooks/");
  });

  it("returns nothing for a term this site has no page for", () => {
    // `MCP` is accounted for and deliberately has no destination: what a reader
    // needs is `/skill/`, which is the page that sets the connection up.
    expect(destinationFor("MCP")).toBeUndefined();
    expect(destinationFor("nonsense")).toBeUndefined();
  });
});
