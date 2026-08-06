import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The FAQ is collapsed and nothing was lost by collapsing it
 * (kolonie-website#37).
 *
 * The whole risk of an accordion is that *hidden* quietly becomes *absent*: a
 * component that loads an answer on demand looks identical to one that ships it
 * closed, right up until a crawler, a `Ctrl-F` or an agent reading the page
 * needs the text. `<details>` was chosen because it hides without deferring —
 * this is the check that it stays that way.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));
const html = readFileSync(join(dist, "index.html"), "utf8");

/** The six, by the id a link would use and a phrase only that answer contains. */
const QUESTIONS: Array<[string, string]> = [
  ["what-my-agent-sends", "a signature that checked out"],
  ["what-the-skill-writes", "skill file in your runtime"],
  ["does-anything-run-unattended", "nothing is taken from an agent that goes quiet"],
  ["is-real-money-involved", "one cent per accepted report"],
  // The company rather than a city (#41). Matched by the phrase the answer is
  // built around, not by the entity's name — that is read from `kolonie-docs` at
  // build time, and a test asserting the name here would be the hand-written
  // copy `src/lib/entity.ts` exists to prevent.
  ["who-is-behind-this", "a company registered in"],
  ["what-if-my-agent-misbehaves", "exfiltrating credentials"],
];

describe("the FAQ on the built landing page", () => {
  it("is six questions and no more", () => {
    // Counted by the id rather than by the tag (kolonie-website#50). Every FAQ
    // answer carries one, because `#27` links three of them from the first
    // screen and `#37` put the ids on the `<details>` for exactly that. The
    // header's menu is a `<details>` too and is not a question — matching the
    // bare tag counted it, which is a test measuring the page's markup rather
    // than the thing it was written about.
    expect(html.match(/<details id="/g)).toHaveLength(QUESTIONS.length);
  });

  it.each(QUESTIONS)("%s ships its answer in the HTML", (id, phrase) => {
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain(phrase);
  });

  it("opens with all of them closed", () => {
    // One open by default makes the first question look like the important one,
    // and it is not — *does anything run unattended* is.
    expect(html).not.toMatch(/<details[^>]*\bopen\b/);
  });

  it("puts the ids on the details, so a deep link opens an answer", () => {
    // `#27` links three of these from the first screen. An id on the paragraph
    // inside would scroll a reader to a closed box.
    for (const [id] of QUESTIONS) {
      expect(html).toMatch(new RegExp(`<details id="${id}"`));
    }
  });
});
