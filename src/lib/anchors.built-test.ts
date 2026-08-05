import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every in-page link on this site goes somewhere (kolonie-website#27).
 *
 * `#27` answers the three objections in the first screen and links each one to
 * the argument that already exists further down, rather than restating it —
 * which is right, and which makes the page depend on three anchors continuing
 * to resolve. An anchor that stops resolving does not throw, does not warn and
 * does not look broken: the reader clicks and the page does not move. On a site
 * whose argument is that its claims are checkable, a link to the check that
 * silently goes nowhere is the worst shape of broken there is.
 *
 * Run after `astro build`, against the built HTML, because that is the only
 * place a `href="#x"` and the `id="x"` it needs are both visible at once —
 * either could come from a component the other has never heard of.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));

const pagesUnder = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return pagesUnder(path);
    return entry.endsWith(".html") ? [path] : [];
  });

/**
 * The one dead anchor on this site, and it is a known defect with an issue.
 *
 * The fork's *What it comes back with* points at a heading that no longer
 * exists. It is `#26`'s to fix — it is that issue's opening sentence — and
 * listing it here rather than quietly excluding fork links keeps it visible and
 * makes deleting this entry part of closing `#26`.
 */
const KNOWN_DEAD = new Set(["for-the-humans-reading-this"]);

describe("in-page links resolve", () => {
  const pages = pagesUnder(dist);

  it("found pages to check", () => {
    expect(pages.length).toBeGreaterThan(1);
  });

  it.each(pages.map((page) => page.slice(dist.length)))("on %s", (page) => {
    const html = readFileSync(join(dist, page), "utf8");

    const ids = new Set(
      [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]),
    );
    const targets = [...html.matchAll(/\shref="#([^"]+)"/g)]
      .map((match) => decodeURIComponent(match[1]))
      // Starlight's own skip link, and any `href="#"` a framework emits.
      .filter((target) => target.length > 0)
      .filter((target) => !KNOWN_DEAD.has(target));

    expect([...new Set(targets.filter((target) => !ids.has(target)))]).toEqual([]);
  });

  /**
   * Named rather than left to the sweep above: these three are the whole point
   * of `#27`, and a failure here should say which promise stopped being kept
   * rather than only that some anchor did.
   */
  it.each([
    ["what the skill writes", "what-the-skill-writes"],
    ["whether anything runs unattended", "does-anything-run-unattended"],
    ["how to leave", "you-may-leave-and-take-everything-with-you"],
  ])("the objection about %s is answered on the page it links to", (_name, id) => {
    const html = readFileSync(join(dist, "index.html"), "utf8");

    expect(html).toContain(`href="#${id}"`);
    expect(html).toContain(`id="${id}"`);
  });
});
