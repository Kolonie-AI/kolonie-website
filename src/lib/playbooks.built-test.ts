import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `/playbooks/` answers the term that had nowhere to go (kolonie-website#124).
 *
 * **What this page is for.** `Playbook` was the one word in `AGENTS.md` §3's
 * gloss list with no page on this site, so first-screen copy spent it and
 * linked the Atlas instead — a destination that is adjacent rather than
 * correct. `plain-term.ts` now sends the term here, and a link is only as good
 * as the page behind it: what is asserted below is that this one still answers
 * *what is a playbook*, *why does the Colony have them* and *where does an
 * agent read them*.
 *
 * **The route is shared and that is deliberate.** `#115` extends this same path
 * with a catalogue read from the API rather than opening a second one, which is
 * `#124`'s own instruction. So nothing here asserts the absence of a list —
 * that would be a test against the next issue. What it asserts is the prose
 * `#115` must not lose while adding one.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));

const html = readFileSync(join(dist, "playbooks", "index.html"), "utf8");

/**
 * The page's own words, with the chrome taken off first — the same slice
 * `layers.built-test.ts` takes, and for the same reason. The footer's tagline
 * is *"learn to act, earn, and govern themselves"*, which is on every page and
 * is not a claim this one makes; judging the whole document would fail the
 * earnings rule below on furniture and teach the next reader to loosen it.
 */
const text = html
  .replace(/<header\b[\s\S]*?<\/header>/gi, " ")
  .replace(/<footer\b[\s\S]*?<\/footer>/gi, " ")
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .toLowerCase();

describe("/playbooks/ (kolonie-website#124)", () => {
  it("defines the term it exists to define", () => {
    // The gloss rule's floor: a reader who followed the word `playbook` from
    // another page's first screen meets a plain sentence, not a catalogue.
    expect(text).toContain("a playbook is a recipe");
    expect(text).toContain("steps");
  });

  /**
   * The three pages a reader leaves for, and each is a different question.
   * `/academy/` is *how does an agent come to hold the accounts a playbook
   * assumes*, `/atlas` is *can it get one at this provider*, and `/skill/` is
   * *how do I connect at all* — which is the only honest answer to *where are
   * they*, since the catalogue is served over the Colony's own tools.
   */
  it.each(["/academy/", "/atlas", "/skill/"])("sends the reader on to %s", (href) => {
    expect(html).toContain(`href="${href}"`);
  });

  /**
   * **No promised earnings, ever** (`AGENTS.md`). The standing rule of this
   * repository, and this is the page most likely to break it: the subject is
   * work an agent does, and the sentence *what your agent could make* writes
   * itself. It is asserted here rather than trusted because the words that
   * would appear are predictable.
   */
  it.each(["earn", "income", "revenue", "payout", "profit", "salary"])(
    "promises no %s",
    (word) => {
      expect(text).not.toContain(word);
    },
  );

  /**
   * **The shelf is described as new, because it is.** A page that talks about a
   * catalogue in the present tense reads as a full one, and the honest sentence
   * costs nothing — the Atlas grew the same way and saying so is the argument
   * rather than an apology for it.
   */
  it("does not describe the catalogue as full", () => {
    expect(text).toContain("the catalogue is new");
  });

  /**
   * `#124` puts the human's own step in front of the reader on the page, not in
   * the small print: some doors need a person, and a playbook that needs one
   * says so and waits.
   */
  it("says which steps are the reader's own", () => {
    expect(text).toContain("some doors need a person");
  });

  /**
   * A playbook is a description of work rather than permission to do it. The
   * red lines are the whole Colony's, so the page points at the file rather
   * than paraphrasing it into a fourth copy.
   */
  it("binds a playbook to the red lines", () => {
    expect(html).toContain("kolonie-docs/blob/main/governance/red-lines.md");
  });
});
