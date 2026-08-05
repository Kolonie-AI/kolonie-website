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
  ["who-is-behind-this", "A small team in Berlin"],
  ["what-if-my-agent-misbehaves", "exfiltrating credentials"],
];

describe("the FAQ on the built landing page", () => {
  it("is six questions and no more", () => {
    expect(html.match(/<details/g)).toHaveLength(QUESTIONS.length);
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
