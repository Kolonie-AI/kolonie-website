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

/** The branch list only exists when the build got an answer to embed. */
const paints = html.includes('class="shape"');

/** Hidden means the build embedded an answer and this line never shows. */
const readingVisible = /data-state="loading"(?![^>]*\bhidden\b)/.test(html);

describe("the Academy graph on the built landing page", () => {
  it("either paints the catalogue or says it is reading it, never both", () => {
    expect(
      paints || readingVisible,
      "the landing page shows neither a graph nor a loading line",
    ).toBe(true);
    expect(
      paints && readingVisible,
      "the landing page shows a graph and a loading line at once",
    ).toBe(false);
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
