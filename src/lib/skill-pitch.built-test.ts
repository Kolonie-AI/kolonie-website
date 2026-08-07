import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { readSkillPitch, pitchToHtml, SkillPitchError } from "./skill-pitch.ts";

/**
 * `/skill` and the seven runtime skills cannot say different things
 * (kolonie-website#73, and `kolonie-website#8` before it).
 *
 * `#8` bound this page and the fork page not to disagree, and it was kept by
 * whoever remembered it. `#73` asks for a source instead of a rule, and this is
 * the check that the source is actually what reaches the page — a build-time
 * read is only worth anything if nothing quietly falls back to a copy.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));

const prose = (file: string): string =>
  readFileSync(join(dist, file), "utf8")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

describe("/skill renders the skill's own argument", () => {
  const page = prose("skill/index.html");
  const pitch = readSkillPitch();

  it("read something at all", () => {
    // A body.md whose section had been emptied would make every assertion below
    // vacuous, which is the shape of failure this file exists to avoid.
    expect(pitch.length).toBeGreaterThan(4);
  });

  /**
   * **Every paragraph, not a sample.** `#73`: *"no claim on one that is absent
   * from the other."* Comparing a phrase or two would pass a page that dropped
   * the honest half — the *what this is not* paragraphs — which is exactly the
   * half a future edit is tempted to trim.
   */
  it.each(readSkillPitch().map((p, i) => [i, p] as const))(
    "carries paragraph %i of Why an agent joins",
    (_index, paragraph) => {
      // Compared as rendered text so Markdown emphasis on one side and tags on
      // the other do not make identical sentences look different.
      const rendered = prose_of(pitchToHtml(paragraph));
      expect(page).toContain(rendered);
    },
  );

  /**
   * The order, which is `kolonie-docs#218`'s and which `#73` requires this page
   * to keep: the register leads, compliant onboarding is the mechanism, the
   * earning comes last. Asserted as positions on the built page rather than
   * trusted to the `.map()` that produced them.
   */
  it("keeps the body's order", () => {
    const positions = pitch.map((p) => page.indexOf(prose_of(pitchToHtml(p))));

    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions]).toEqual([...positions].sort((a, b) => a - b));
  });

  /**
   * **The converter refuses rather than guesses.** If *Why an agent joins* grows
   * a list or a heading, the build must stop and say so — the alternative is
   * literal asterisks on a public page, which is the failure nobody notices
   * because the build was green.
   *
   * This is the rejection case: without it, every assertion above could pass on
   * a converter that silently passed unknown Markdown through.
   */
  it("refuses a construct it cannot render", () => {
    expect(() => pitchToHtml("- a list item")).toThrow(SkillPitchError);
    expect(() => pitchToHtml("## a heading")).toThrow(SkillPitchError);
    expect(() => pitchToHtml("```\ncode\n```")).toThrow(SkillPitchError);
  });

  it("renders the emphasis it does know", () => {
    expect(pitchToHtml("**bold** and `code` and *em*")).toBe(
      "<strong>bold</strong> and <code>code</code> and <em>em</em>",
    );
  });
});

/** The same normalisation the page goes through, applied to a fragment. */
function prose_of(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
