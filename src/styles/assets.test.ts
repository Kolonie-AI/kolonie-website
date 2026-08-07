import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { darkTokensFrom } from "../lib/theme-tokens.ts";

/**
 * The favicon and the Open Graph image are generated from the theme's tokens by
 * `scripts/build-assets.mjs`, because an image cannot read a CSS custom
 * property. That is the whole reason this file exists: without it, a palette
 * change leaves the favicon on the old colours and the only thing that notices
 * is a reader looking at a browser tab (kolonie-website#11).
 */

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const read = (p: string) => readFileSync(at(p), "utf8");

/**
 * The dark block's colours, as the generator computes them.
 *
 * Read through `src/lib/theme-tokens.ts` since `#60`, which needed the same
 * answer in the header component and would otherwise have been a third copy of
 * the HSL-to-hex conversion. The generator still holds its own, for the reason
 * that file gives.
 */
const tokens = darkTokensFrom(read("./theme.css"));

describe("the favicon is the theme's colours", () => {
  const svg = read("../../public/favicon.svg");

  it.each(["--k-bg", "--k-accent", "--k-text-strong"])(
    "carries %s as it is currently set",
    (token) => {
      expect(svg, "run `node scripts/build-assets.mjs`").toContain(
        tokens[token],
      );
    },
  );

  it("holds no colour the theme does not set", () => {
    const used = [...svg.matchAll(/#[0-9a-f]{6}/gi)].map((m) =>
      m[0].toLowerCase(),
    );
    expect(used.filter((c) => !Object.values(tokens).includes(c))).toEqual([]);
  });
});

describe("the site is not shared as a bare link", () => {
  // Every link anyone posts is this image, so its absence is the entire visual
  // impression of the project for a reader who has not clicked yet.
  it("serves an Open Graph image at the size the platforms crop to", () => {
    const png = readFileSync(at("../../public/og.png"));
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    // IHDR: width and height are the two big-endian words after the chunk name.
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  });

  it("names it in the head, at an absolute URL", () => {
    // Relative Open Graph images are ignored by most consumers.
    //
    // Declared in `src/lib/head.ts` since kolonie-website#30, not in
    // `astro.config.mjs`: `/` left Starlight, so the config is no longer the
    // only place a page's head is written from, and the two surfaces read this
    // one list. `head.built-test.ts` checks the tag survived onto every built
    // page, which is the assertion that catches them drifting apart.
    const head = read("../lib/head.ts");
    expect(head).toContain("https://kolonie.ai/og.png");
    expect(head).toContain("summary_large_image");
  });

  it("serves an Apple touch icon", () => {
    const png = readFileSync(at("../../public/apple-touch-icon.png"));
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([180, 180]);
  });
});
