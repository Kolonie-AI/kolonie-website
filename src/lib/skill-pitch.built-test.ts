import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  readSkillPitch,
  pitchToHtml,
  blockToHtml,
  SkillPitchError,
} from "./skill-pitch.ts";

/**
 * `/skill` and the seven runtime skills cannot say different things
 * (kolonie-website#73, and `kolonie-website#8` before it).
 *
 * `#8` bound this page and the fork page not to disagree, and it was kept by
 * whoever remembered it. `#73` asks for a source instead of a rule, and this is
 * the check that the source is actually what reaches the page — a build-time
 * read is only worth anything if nothing quietly falls back to a copy.
 *
 * **The section it reads moved, and this file moved with it**
 * (kolonie-website#147). `kolonie-docs#577` rewrote `body.md` into a budgeted
 * router and *Why an agent joins* went with the prose it carried; the current
 * router's public argument is `## The invitation`, and that is what `/skill`
 * now renders. Nothing about the arrangement changed — the argument is still
 * read rather than copied, and the source is still the one the runtimes are
 * generated from.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));

const html = (file: string): string => readFileSync(join(dist, file), "utf8");

const prose = (file: string): string =>
  html(file)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

describe("/skill renders the skill's own argument", () => {
  const page = prose("skill/index.html");
  const pitch = readSkillPitch();

  it("read something at all", () => {
    // A section that had been emptied would make every assertion below
    // vacuous, which is the shape of failure this file exists to avoid.
    expect(pitch.length).toBeGreaterThan(2);
    expect(pitch[0].kind).toBe("paragraph");
  });

  /**
   * **The current section's shape, asserted rather than assumed.** The router's
   * invitation is prose around a list of what a walk should look like, and a
   * reader of this file should be able to see that the list is carried rather
   * than flattened or dropped — dropping it is exactly what a converter that
   * refused lists would have been tempted into.
   */
  it("carries the section's list as a list", () => {
    const lists = pitch.filter((block) => block.kind === "list");

    expect(lists).toHaveLength(1);
    expect(lists[0].kind === "list" && lists[0].items.length).toBeGreaterThan(3);
  });

  /**
   * **Every block, not a sample.** `#73`: *"no claim on one that is absent
   * from the other."* Comparing a phrase or two would pass a page that dropped
   * the honest half — the *what this is not* half — which is exactly the half a
   * future edit is tempted to trim.
   */
  it.each(readSkillPitch().map((block, i) => [i, block] as const))(
    "carries block %i of the invitation",
    (_index, block) => {
      // Compared as rendered text so Markdown emphasis on one side and tags on
      // the other do not make identical sentences look different.
      expect(page).toContain(prose_of(blockToHtml(block)));
    },
  );

  /**
   * The order, which is the body's and which `#73` requires this page to keep.
   * Asserted as positions on the built page rather than trusted to the `.map()`
   * that produced them.
   */
  it("keeps the body's order", () => {
    const positions = pitch.map((block) =>
      page.indexOf(prose_of(blockToHtml(block))),
    );

    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions]).toEqual([...positions].sort((a, b) => a - b));
  });

  /**
   * **Semantic HTML, not a paragraph of dashes.** The list is what made this
   * page's converter grow a construct at all, and rendering it as prose with
   * hyphens in it would satisfy every text assertion above while publishing
   * something no screen reader reads as a list.
   */
  it("renders the list as list markup on the built page", () => {
    const source = html("skill/index.html");
    const list = pitch.find((block) => block.kind === "list");

    expect(list?.kind).toBe("list");
    if (list?.kind !== "list") return;

    const rendered = list.items.map((item) => `<li>${pitchToHtml(item)}</li>`);
    for (const item of rendered) expect(source).toContain(item);

    const first = source.indexOf(rendered[0]);
    const opening = source.lastIndexOf("<ul>", first);
    const closing = source.indexOf("</ul>", first);

    expect(opening).toBeGreaterThan(-1);
    expect(closing).toBeGreaterThan(source.indexOf(rendered.at(-1)!));
  });

  /**
   * **The converter refuses rather than guesses.** If the section grows a
   * heading, a quote or a code fence, the build must stop and say so — the
   * alternative is literal asterisks on a public page, which is the failure
   * nobody notices because the build was green.
   *
   * This is the rejection case: without it, every assertion above could pass on
   * a converter that silently passed unknown Markdown through. **A list is no
   * longer in it, and that is the whole of what `#147` changed** — the
   * construct the canonical section actually uses is now rendered, and
   * everything the Colony has not taught this file is still refused.
   */
  it("refuses a construct it cannot render", () => {
    expect(() => pitchToHtml("## a heading")).toThrow(SkillPitchError);
    expect(() => pitchToHtml("> a quote")).toThrow(SkillPitchError);
    expect(() => pitchToHtml("```\ncode\n```")).toThrow(SkillPitchError);
    expect(() => pitchToHtml("![a picture](/p.png)")).toThrow(SkillPitchError);
    expect(() => pitchToHtml("<!-- a comment -->")).toThrow(SkillPitchError);
  });

  it("renders the emphasis it does know", () => {
    expect(pitchToHtml("**bold** and `code` and *em*")).toBe(
      "<strong>bold</strong> and <code>code</code> and <em>em</em>",
    );
  });

  it("wraps a paragraph and a list in the elements they are", () => {
    expect(blockToHtml({ kind: "paragraph", markdown: "one **two**" })).toBe(
      "<p>one <strong>two</strong></p>",
    );
    expect(blockToHtml({ kind: "list", items: ["one", "`two`"] })).toBe(
      "<ul><li>one</li><li><code>two</code></li></ul>",
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
