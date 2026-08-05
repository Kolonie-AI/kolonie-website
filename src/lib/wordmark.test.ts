import { describe, expect, it } from "vitest";
import { renderWordmark } from "../../scripts/build-ascii.mjs";
import { WORDMARK } from "./wordmark.ts";

/**
 * The ASCII wordmark is reproducible from its generator (kolonie-website#39).
 *
 * The decision on that issue was *generated from a source, checked in with the
 * generator*, and the reason was named: a several-thousand-character blob
 * nobody can regenerate is the asset that can never be changed again. This is
 * what makes that true rather than intended — edit `wordmark.ts` by hand and
 * this fails; change the generator without re-running it and this fails.
 *
 * The generator involves no font, deliberately. Rendering text through a
 * rasteriser would make the output depend on which fonts a machine has
 * installed, and this test would then fail on the next contributor's laptop
 * for a reason that has nothing to do with them.
 */

describe("the ASCII wordmark", () => {
  it("is exactly what the generator produces", () => {
    expect(WORDMARK).toBe(renderWordmark());
  });

  it("is a density ramp and not line art", () => {
    // Six marks and a space. If the blur in the generator is lost, this
    // collapses to two characters and the block reads as a stencil.
    const marks = new Set([...WORDMARK].filter((character) => character !== "\n"));

    expect([...marks].sort().join("")).toBe(" .:=+-x".split("").sort().join(""));
  });

  it("fits the column it is drawn in", () => {
    const lines = WORDMARK.split("\n");

    expect(lines).toHaveLength(7);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(68);
  });
});
