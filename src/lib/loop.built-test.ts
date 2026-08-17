import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * **The four moves, and where they land in the reader's order**
 * (kolonie-website#117).
 *
 * `#117` is a measurement of this page as a first-time human meets it: the hero
 * led with a runtime count and an install chooser, and no block on the page
 * answered *what happens to my agent if I send it* in one screen. The loop is
 * that block, and two of its properties are the ones an edit can quietly take
 * away.
 *
 * **The order, which is not the document order.** The section sits after `Join`
 * in the markup — the reader who came to act keeps the command first — and ahead
 * of it in the human's paint order, through the flex `order` rules. Delete the
 * order rule and the loop is still on the page, still correct, and eight screens
 * below the fold for the reader it was written for.
 *
 * **The glosses.** `AGENTS.md` §3's rule is that Colony vocabulary may not appear
 * on a first screen without an everyday phrase in front of it, and this section
 * is now part of that first screen. What is asserted is the rule rather than the
 * wording: any of the eight terms in this section's prose, outside a gloss, is a
 * failure — which is the check no reviewer reliably performs on the fifth edit to
 * a tile.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));
const landing = readFileSync(join(dist, "index.html"), "utf8");

/** Every rule the landing page applies, with Astro's scoping hash taken out. */
const styles = [
  ...[...landing.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)]
    .map((tag) => tag[0].match(/href="([^"]+)"/)?.[1])
    .filter((href): href is string => href !== undefined && href.startsWith("/"))
    .map((href) => readFileSync(join(dist, href.slice(1)), "utf8")),
  ...[...landing.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]),
]
  .join("\n")
  .replaceAll(/:where\(\.astro-[a-z0-9]+\)/g, "");

/** The section itself, from its opening tag to the next section's. */
const loop = (() => {
  const start = landing.indexOf('<section id="the-loop"');
  if (start === -1) throw new Error("the loop section is not on the built page");

  const rest = landing.slice(start);
  const end = rest.indexOf("<section", 1);

  return end === -1 ? rest : rest.slice(0, end);
})();

/** The flex `order` a `.page` child is given, or `NaN` if it is given none. */
const orderOf = (selector: string): number => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = styles.match(new RegExp(`(?:^|[,}\\n])\\s*${escaped}\\{([^}]*)\\}`))?.[1];

  return Number(rule?.match(/order:(-?\d+)/)?.[1] ?? Number.NaN);
};

describe("the outcome loop (kolonie-website#117)", () => {
  it("is four tiles, not three and not six", () => {
    const tiles = [...loop.matchAll(/<article class="card/g)];

    // Four is `#117`'s own number and it is a claim about the offer rather than
    // about the grid: wake, grow, own, reuse. A fifth tile is a fifth move, and
    // whoever adds one should have to change this line and say what it is.
    expect(tiles).toHaveLength(4);
  });

  it("links each move to the page that explains it", () => {
    for (const href of ["/academy/", "/atlas", "/the-register/"]) {
      expect(loop, `the loop does not link ${href}`).toContain(`href="${href}"`);
    }
  });

  /**
   * **Paints directly under the hero for the human, and in document order for
   * the agent.**
   *
   * Asserted relationally rather than as literal numbers, which is the shape
   * `container.built-test.ts` uses for the hero and the reason there was room to
   * insert this at all: `audience-switch.built-test.ts` pins `-2` and `-1`
   * literally, so a renumbering there is a failing test and a renumbering here is
   * not supposed to be.
   */
  it("sits between the hero and the operator's half in the human's order", () => {
    expect(orderOf(".page>#the-loop"), "the loop is not ordered at all").not.toBeNaN();
    expect(orderOf(".page>.hero")).toBeLessThan(orderOf(".page>#the-loop"));
    expect(orderOf(".page>#the-loop")).toBeLessThan(orderOf(".page>#you-run-a-swarm"));
  });

  it("goes back to document order for the agent's view", () => {
    expect(
      styles.match(/#agent:target~\*[^{]*>#the-loop[^{]*\{order:0\}/),
      "the loop is moved for the human and never moved back",
    ).not.toBeNull();
  });

  /**
   * And the command still comes first for the reader who arrived to run it.
   *
   * The whole reason the section is placed after `Join` in the markup rather than
   * where it paints. Moving the tag itself above `Join` would leave every test
   * above passing and would put two screens of argument between an agent's
   * operator and the one line they came for — which is `#81`'s failure, exactly.
   */
  it("does not come between the hero and the joining path in the document", () => {
    expect(landing.indexOf('class="join')).toBeLessThan(landing.indexOf('id="the-loop"'));
  });

  /**
   * The eight terms `AGENTS.md` §3 names, none of which may stand in this
   * section's prose without a plain phrase in front of it.
   *
   * `MCP` is matched case-sensitively — lowercase `mcp` appears inside install
   * commands, which are not prose and are not on this page's first screen.
   */
  it("uses no Colony word outside a gloss", () => {
    const prose = loop
      .replaceAll(/<span class="plain-term__gloss[\s\S]*?<\/span>\s*<\/p>/g, "")
      .replace(/<[^>]+>/g, " ");

    for (const term of ["academy", "rung", "atlas", "playbook", "quest", "citizen", "register"]) {
      expect(
        new RegExp(`\\b${term}s?\\b`, "i").test(prose),
        `"${term}" appears in the loop with nothing explaining it`,
      ).toBe(false);
    }

    expect(/\bMCP\b/.test(prose), "MCP appears in the loop with nothing explaining it").toBe(false);
  });
});
