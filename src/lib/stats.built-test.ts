import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AGENT_COMMITS } from "./join.ts";

/**
 * **The Colony's own numbers, and what happens when one cannot be read**
 * (kolonie-website#54).
 *
 * **The rejection case is the failure path**, which is what `#54` asks for: *"a
 * source that fails renders the fallback rather than a zero."* On a static site
 * there is no stored last-known value to fall back to, so the fallback is
 * omission — and the way that is made unfailable is that the live tiles start
 * `hidden` in the markup and are revealed only once a real value is in hand.
 * Nothing has to be undone on the failure path, which is the only version of
 * this that cannot regress into painting a `0`.
 *
 * That property is checked three ways here: the tiles ship hidden, the script
 * only ever *clears* `hidden` and never sets it, and it skips a falsy count
 * rather than rendering it.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));
const landing = readFileSync(join(dist, "index.html"), "utf8");

const block = landing.slice(
  landing.indexOf('<section class="stats'),
  landing.indexOf("</section>", landing.indexOf('<section class="stats')),
);

/**
 * The module that fills the live tiles.
 *
 * Collected from both places a component script can land: Astro inlines a small
 * one and emits a bundle for anything that imports — this one imports
 * `academy.ts`, so it is a file. Looking in only one place is a test that passes
 * or fails for a reason that has nothing to do with the code.
 */
const script =
  [
    ...[...landing.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map(
      (m) => m[1],
    ),
    ...[...landing.matchAll(/<script[^>]*src="(\/[^"]+)"/g)].map((m) =>
      readFileSync(join(dist, m[1].slice(1)), "utf8"),
    ),
  ].find((source) => source.includes("data-stat")) ?? "";

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&")
    .replace(/\s+/g, " ");

it("found the stat row at all", () => {
  expect(block.length).toBeGreaterThan(500);
});

describe("the row", () => {
  it("sits above the long prose sections", () => {
    // `#54`: *above the long prose sections*. The first of them is the one that
    // opens with what an agent can prove.
    expect(landing.indexOf('<section class="stats')).toBeLessThan(
      landing.indexOf('id="what-an-agent-can-prove-here"'),
    );
  });

  it("is three tiles", () => {
    // `#54` asks for three or four. Two of its four have no source — see the
    // component, and the note on the issue.
    expect(block.match(/class="stats__tile/g)).toHaveLength(3);
  });

  it("gives every tile a date or an interval", () => {
    // The rule is `kolonie-docs/AGENTS.md` §7 applied to a page rather than a
    // document: a figure with a visible date cannot quietly rot.
    expect(text(block)).toContain(`measured ${AGENT_COMMITS.measuredOn}`);
    expect(block.match(/data-stat-date/g)).toHaveLength(2);
  });
});

describe("the commit tile, which is static and dated", () => {
  it("shows the share, computed rather than typed", () => {
    const share = Math.round(
      (AGENT_COMMITS.byAgents / AGENT_COMMITS.total) * 100,
    );
    expect(text(block)).toContain(`${share}%`);
  });

  it("carries the pair and the command that reproduces it", () => {
    expect(text(block)).toContain(
      `${AGENT_COMMITS.byAgents} of ${AGENT_COMMITS.total.toLocaleString("en-US")}`,
    );
    expect(block).toContain('href="/who-builds-this/"');
  });
});

describe("the live tiles are read, not typed", () => {
  it("ships no number in the markup", () => {
    // A figure hard-coded into a component is wrong the first week and nothing
    // says so. The slots hold an em dash and are hidden until a read fills them.
    for (const tile of block.match(/<div class="stats__tile[^>]*data-stat=[\s\S]*?<\/div>/g) ??
      []) {
      expect(tile).toMatch(/data-stat-value[^>]*>\s*—\s*</);
    }
  });

  it("reads the Academy graph the same way the graph component does", () => {
    // Minified, so the function names are gone. What survives is the import,
    // and the import is the claim: this reads through `src/lib/academy.ts` —
    // the module `AcademyGraph` uses, whose three outcomes keep *the Academy is
    // empty* and *we could not ask* from rendering the same way — rather than
    // fetching the endpoint itself and inventing a second answer to that.
    expect(script).toMatch(/from"\.\/academy\.[\w-]+\.js"/);
    expect(script).toContain('outcome===`loaded`');
  });
});

/**
 * **The rejection case `#54` names.** A source that fails must render the
 * fallback and never a zero.
 */
describe("a source that fails renders no tile rather than a zero", () => {
  it("ships the live tiles hidden", () => {
    const live = block.match(/<div class="stats__tile[^>]*data-stat="[^"]*"[^>]*>/g) ?? [];

    expect(live).toHaveLength(2);
    for (const tile of live) expect(tile).toMatch(/\shidden\b/);
  });

  it("only ever reveals a tile, never hides one", () => {
    // If the script could set `hidden`, the failure path would depend on it
    // running. It cannot: the markup is the failure state, and success is what
    // has to happen for a tile to appear.
    expect(script).toMatch(/hidden\s*=\s*!1|hidden\s*=\s*false/);
    expect(script).not.toMatch(/hidden\s*=\s*!0|hidden\s*=\s*true/);
  });

  it("skips a falsy count instead of rendering it", () => {
    // A `0` on this row would mean *the API did not answer* and would read as
    // *the Academy teaches nothing* — the same two states `academy.ts` refuses
    // to collapse.
    expect(script).toMatch(/if\s*\(!\w+\)\s*continue/);
  });

  it("hides the live tiles outright when there is no script", () => {
    // A tile that says *reading…* forever is a placeholder, which `#54` refuses
    // as firmly as it refuses a zero. Done in `<noscript>` so the hiding
    // happens at parse time and no empty tile is ever painted.
    const noscript = landing.match(/<noscript>[\s\S]*?<\/noscript>/g) ?? [];
    expect(
      noscript.some((tag) => tag.includes("stats__tile") && tag.includes("display")),
    ).toBe(true);
  });
});

describe("the number does not exist twice on the page", () => {
  it("leaves no second copy of the figure in the prose", () => {
    // `#54`: the `974 of 1,097` sentence is removed or reduced to a link.
    const pair = `${AGENT_COMMITS.byAgents} of ${AGENT_COMMITS.total.toLocaleString("en-US")}`;
    expect(text(landing).split(pair)).toHaveLength(2);
  });

  it("keeps the prose pointing at where the number now lives", () => {
    expect(text(landing)).toContain("The share is in the row at the top of this page");
  });
});
