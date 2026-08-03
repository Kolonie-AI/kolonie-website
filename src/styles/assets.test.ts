import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The favicon and the Open Graph image are generated from the theme's tokens by
 * `scripts/build-assets.mjs`, because an image cannot read a CSS custom
 * property. That is the whole reason this file exists: without it, a palette
 * change leaves the favicon on the old colours and the only thing that notices
 * is a reader looking at a browser tab (kolonie-website#11).
 */

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const read = (p: string) => readFileSync(at(p), "utf8");

const hex = (h: number, s: number, l: number) => {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return (
    "#" + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, "0")).join("")
  );
};

/** The dark block's colours, as the generator computes them. */
const tokens = (() => {
  const css = read("./theme.css");
  const dark = css.slice(css.indexOf(":root,"), css.indexOf("[data-theme='light']"));
  const out: Record<string, string> = {};
  for (const [, name, h, s, l] of dark.matchAll(
    /(--k-[a-z0-9-]+)\s*:\s*hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)/g,
  )) {
    out[name] = hex(Number(h), Number(s) / 100, Number(l) / 100);
  }
  return out;
})();

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
    const config = read("../../astro.config.mjs");
    expect(config).toContain("https://kolonie.ai/og.png");
    expect(config).toContain("summary_large_image");
  });

  it("serves an Apple touch icon", () => {
    const png = readFileSync(at("../../public/apple-touch-icon.png"));
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([180, 180]);
  });
});
