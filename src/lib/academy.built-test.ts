import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * What the landing page actually paints (kolonie-website#32).
 *
 * Run after `astro build`, against the real output of the real build.
 *
 * **It does not assert that the Colony answered.** A test that failed when the
 * platform was down would put the site's build back in the position `#32` was
 * told to keep it out of — coupled to a separate service. What it asserts is
 * the *pair*: an embedded answer comes with the date it was read, and a page
 * with no embedded answer says it is reading. Exactly one of the two, whichever
 * way the build went.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));
const html = readFileSync(join(dist, "index.html"), "utf8");

/**
 * Whether a block's `data-state` element is *visible* in the built page.
 *
 * **Scoped to one block, which is the whole of `#57`.** This read
 * `data-state="loading"` across the entire document, and by the time it was
 * written there was one such element. `#26` added a second — `CitizenStanding`,
 * whose `hidden` turns on its own data — so a build where the Academy answered
 * and the standing query did not failed an assertion about the Academy, for a
 * reason that had nothing to do with it.
 *
 * That is worse than a flake. This file's own header says it must not couple
 * the site's build to a separate service, which is the position `#32` was told
 * to keep it out of; the over-broad match had coupled it to a *second* service
 * it never meant to name. It passed only when both answered.
 *
 * **A helper rather than a tighter regular expression**, which was the third of
 * the three shapes `#57` offered. The two blocks are the same design — a
 * loading line, an error, a ready panel, each `hidden` on its own data — so the
 * assertion is a property of that design and not of the Academy. A third block
 * built the same way gets a line here rather than a fourth copy of a regex that
 * has now been wrong once.
 */
const visible = (block: string, state: string): boolean =>
  new RegExp(`class="${block}__state" data-state="${state}"(?![^>]*\\bhidden\\b)`).test(html);

/**
 * Exactly one of *painted* and *reading*, for one block.
 *
 * Both blocks render `data-state="ready"` hidden when there is nothing to show
 * and `data-state="loading"` hidden when there is — so the pair is the invariant
 * whichever way the build went, and neither half of it says anything about
 * whether the Colony was up.
 */
const assertOneOrTheOther = (block: string, name: string): void => {
  const painted = visible(block, "ready");
  const reading = visible(block, "loading");

  expect(painted || reading, `${name} shows neither an answer nor a loading line`).toBe(true);
  expect(painted && reading, `${name} shows an answer and a loading line at once`).toBe(false);
};

/** The branch list only exists when the build got an answer to embed. */
const paints = html.includes('class="shape"');

describe("the Academy graph on the built landing page", () => {
  it("either paints the catalogue or says it is reading it, never both", () => {
    assertOneOrTheOther("academy", "the Academy block");
  });

  /**
   * **The sibling `#57` asked about, and it is worth having on its own terms.**
   * Not because the standing block is likely to break — because an assertion
   * that covers two blocks by accident is exactly what produced this issue, and
   * one that covers them on purpose is a different thing with the same reach.
   */
  it("says the same of the citizen standing block, separately", () => {
    assertOneOrTheOther("standing", "the citizen standing block");
  });

  /**
   * The rejection case: the helper has to be able to fail, and it has to fail
   * for the block it was given rather than for its neighbour. Asserted against
   * a name no block uses, so a helper that quietly matched the whole document
   * would answer `true` here and be caught.
   */
  it("finds nothing for a block that is not on the page", () => {
    expect(visible("nosuchblock", "loading")).toBe(false);
    expect(visible("nosuchblock", "ready")).toBe(false);
  });

  it("dates an embedded answer, because an undated one is a claim it has not checked", () => {
    if (!paints) return;

    expect(html).toMatch(/Read from the Colony on \d{4}-\d{2}-\d{2}\./);
  });

  it("drops the no-JavaScript apology once the graph is on the page", () => {
    if (!paints) return;

    // With an embedded answer the branches are in the markup whether scripts
    // run or not, so there is nothing to apologise for. Leaving the notice
    // would be the page telling a reader it cannot show them what is directly
    // above it.
    expect(html).not.toContain("This graph is read live and needs JavaScript.");
  });

  it("keeps the verdict, which was always build-time and always painted", () => {
    // `#32` names the verdict as a third loading placeholder. It is not one:
    // `Verdict.astro` renders `src/lib/verdict.ts` at build time and has no
    // client script at all. This is here so the next reader of that issue does
    // not go looking for the placeholder that was never there.
    expect(html).toContain("A real verdict");
    expect(html).toContain("verdict__body");
  });
});
