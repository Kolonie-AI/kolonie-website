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

describe("the paths a client asks for without reading the page", () => {
  // kolonie-website#62. Both answered 404 until then. The clients that ask for
  // them are the unattended ones — feed readers, link-preview services,
  // crawlers, an Android launcher — so nothing complains when they are missing;
  // the entry simply renders without an icon.

  it("answers /favicon.ico with an actual icon container", () => {
    const ico = readFileSync(at("../../public/favicon.ico"));
    // `sharp` cannot write ICO, so the container is assembled in the generator.
    // The arithmetic is the whole risk: an offset that is wrong by a few bytes
    // still produces a plausible file that no test on this side would notice.
    expect(ico.readUInt16LE(0)).toBe(0); // reserved
    expect(ico.readUInt16LE(2)).toBe(1); // an icon, not a cursor

    const count = ico.readUInt16LE(4);
    expect(count).toBe(3);

    const frames = Array.from({ length: count }, (_, index) => {
      const entry = 6 + index * 16;
      return {
        width: ico.readUInt8(entry),
        height: ico.readUInt8(entry + 1),
        length: ico.readUInt32LE(entry + 8),
        offset: ico.readUInt32LE(entry + 12),
      };
    });

    expect(frames.map((frame) => frame.width)).toEqual([16, 32, 48]);

    for (const frame of frames) {
      expect(frame.height).toBe(frame.width);
      // Every offset points at a PNG that is the size the directory claims,
      // and the last one ends exactly at the end of the file.
      const image = ico.subarray(frame.offset, frame.offset + frame.length);
      expect(image.subarray(1, 4).toString()).toBe("PNG");
      expect([image.readUInt32BE(16), image.readUInt32BE(20)]).toEqual([
        frame.width,
        frame.height,
      ]);
    }
    const last = frames[frames.length - 1]!;
    expect(last.offset + last.length).toBe(ico.length);
  });

  describe("the web manifest", () => {
    const manifest = JSON.parse(read("../../public/site.webmanifest"));

    it("takes its colours from the tokens rather than being typed", () => {
      expect(manifest.theme_color).toBe(tokens["--k-bg"]);
      expect(manifest.background_color).toBe(tokens["--k-bg"]);
    });

    it("makes no claim about being an application", () => {
      // `#62`: `display: standalone` says *this is software*. This site is
      // documentation, and a reader who added it to a home screen and lost the
      // back button would have been told something untrue about it. A refusal,
      // so it is asserted rather than left as an absence somebody fills in.
      expect(manifest.display).toBeUndefined();
    });

    it("opens the site rather than the page it was added from", () => {
      expect(manifest.start_url).toBe("/");
    });

    it("names icons that exist, at the sizes it claims", () => {
      expect(manifest.icons).toHaveLength(2);
      for (const icon of manifest.icons) {
        const png = readFileSync(at(`../../public${icon.src}`));
        const [width, height] = [png.readUInt32BE(16), png.readUInt32BE(20)];
        expect(`${width}x${height}`).toBe(icon.sizes);
      }
    });
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

  it("draws the mark into it rather than beside a retyped copy of it", () => {
    // `kolonie-website#61`. The Open Graph image is a screenshot, so nothing
    // downstream of it can tell whether the shield in the corner is the
    // generated mark or an `<svg>` somebody pasted into the template — the two
    // look identical until a palette change moves one and not the other.
    //
    // The generator holds the geometry in three constants and emits it through
    // one function, so this asserts the template uses that value. It is a
    // source-text check because there is no other place the distinction is
    // still visible; by the time there is a PNG, it has been lost.
    const generator = read("../../scripts/build-assets.mjs");
    const template = generator.slice(generator.indexOf("const og = `"));
    expect(template).toContain("${markRegular}");
    expect(template).not.toContain("<path");
  });

  /**
   * `kolonie-website#91`. The words on this image addressed the agent, and the
   * reader is a person — so a rewrite of the copy that left the PNG behind
   * would be invisible until somebody shared a link.
   *
   * A source-text check for the same reason the mark's is one: by the time
   * there is a PNG the sentence has become pixels, and nothing downstream can
   * tell which sentence they are.
   */
  it("carries the claim written for the person who is reading it", () => {
    const generator = read("../../scripts/build-assets.mjs");
    const template = generator.slice(generator.indexOf("const og = `"));

    expect(generator).toContain(
      "Your agent gets its own mailbox, domain, wallet and GitHub account, and earns with them.",
    );
    expect(generator).toContain(
      "You only open the doors where a human is demanded.",
    );
    // The template reads the constant rather than repeating it, so the string
    // above is the one thing to change — and the X profile carries the same
    // sentence as its bio, which is a maintainer's step when it moves.
    expect(template).toContain("${OG_CLAIM}");
  });

  it("says nothing on it to the agent, and lists no domains", () => {
    const generator = read("../../scripts/build-assets.mjs");
    const template = generator.slice(generator.indexOf("const og = `"));

    // The pitch it replaced, verbatim enough to catch a revert.
    expect(template).not.toContain("An agent arrives as a stranger");
    // Two of the three meant nothing to this reader and the third is the link
    // they already clicked.
    expect(template).not.toContain("mcp.kolonie.ai");
    expect(template).not.toContain("api.kolonie.ai");
  });

  it("serves an Apple touch icon", () => {
    const png = readFileSync(at("../../public/apple-touch-icon.png"));
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([180, 180]);
  });
});
