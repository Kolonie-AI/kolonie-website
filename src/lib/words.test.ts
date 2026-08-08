import { describe, expect, it } from "vitest";

import { WORDS, WORDS_PATH } from "./words.ts";

/**
 * The two rules `kolonie-website#79` says keep this page from rotting, and one
 * it says keeps it from becoming a second source of truth.
 *
 * All three are the sort of thing that survives as guidance for about a month.
 * *One sentence each, no exceptions* is written in `words.ts`'s docstring, and a
 * docstring cannot fail a build — so the second paragraph somebody adds is the
 * one that turns this into documentation, and documentation is the thing `#79`
 * says stops being read.
 */

/** The sixteen `#79` lists, in the issue's own order. */
const REQUIRED = [
  "citizen",
  "candidate",
  "rung",
  "skill",
  "quest",
  "sponsor",
  "steward",
  "struggle",
  "tip",
  "badge",
  "frontier",
  "operator",
  "contract",
  "atlas",
  "register",
  "recipe",
];

describe("the sixteen words (kolonie-website#79)", () => {
  it("covers every term the issue lists, and adds none", () => {
    const terms = WORDS.map((word) => word.term.toLowerCase()).sort();
    expect(terms).toEqual([...REQUIRED].sort());
  });

  it.each(WORDS)("$term is one sentence", ({ sentence }) => {
    // A full stop inside the sentence would be an abbreviation or a second
    // sentence, and the second is what this is guarding. Em dashes, colons and
    // commas are all fine — `#79`'s rule is one sentence, not one clause.
    const stops = sentence.match(/\.(\s|$)/g) ?? [];
    expect(stops).toHaveLength(1);
    expect(sentence.trimEnd().endsWith(".")).toBe(true);
  });

  /**
   * **The ceiling is the rule that will actually be pushed against.** Nothing in
   * `#79` gives a number, and a number is what makes *"a word that needs a
   * paragraph does not belong on it"* checkable — that sentence is the whole
   * safeguard and it is a judgement otherwise. 240 characters is the longest
   * entry here plus room, and an entry that cannot fit is `#79` telling you the
   * word is doing too much work and the fix is upstream.
   */
  it.each(WORDS)("$term stays short enough to read at a glance", ({ sentence }) => {
    expect(sentence.length).toBeLessThanOrEqual(240);
  });

  it.each(WORDS)("$term links to where it is defined at length", ({ where, whereLabel }) => {
    expect(where).toMatch(/^(https:\/\/|\/)/);
    expect(whereLabel.length).toBeGreaterThan(0);
  });

  /**
   * `#79`: *"It defines, it does not persuade. The pitch is elsewhere."* These
   * are the site's own selling phrases, taken from `layers.ts`'s list rather
   * than invented, so the check flags the actual failure — a definition that has
   * started recruiting — instead of any energetic verb.
   */
  it("persuades nowhere", () => {
    const selling = ["get started", "join the colony", "sign up", "start earning"];
    for (const { term, sentence } of WORDS) {
      const lower = sentence.toLowerCase();
      for (const phrase of selling) {
        expect(lower, `${term} is selling: ${phrase}`).not.toContain(phrase);
      }
    }
  });

  /**
   * A glossary whose entries define each other is the failure mode of every
   * glossary, and the fix is not *fewer references* — it is that a reference
   * always points **backwards**.
   *
   * That is what the reading order in `words.ts` is for, and this is the check
   * that makes the order load-bearing rather than a preference. *Badge* leaning
   * on *rung* and *skill* is fine: a reader met both two entries ago. *Badge*
   * leaning on *Atlas* would not be, and neither would reordering the list so
   * that it did.
   *
   * The first version of this counted references and capped them at one. It
   * failed on two entries whose definitions were correct, which is the test
   * being wrong rather than the data — the property worth holding is direction,
   * not quantity.
   */
  it.each(WORDS.map((word, index) => ({ ...word, index })))(
    "$term is readable by the time a reader reaches it",
    ({ term, sentence, index }) => {
      const ahead = WORDS.slice(index + 1)
        .map((word) => word.term.toLowerCase())
        .filter((other) => new RegExp(`\\b${other}s?\\b`, "i").test(sentence));
      expect(ahead, `${term} points forwards at ${ahead.join(", ")}`).toEqual([]);
    },
  );

  it("is served at one path the pages agree on", () => {
    expect(WORDS_PATH).toBe("/words/");
  });
});
