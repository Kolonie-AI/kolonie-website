import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ICON_NAMES, iconBody, isIconName } from "../icons/index.ts";

/**
 * The icon set holds together (kolonie-website#129, #131).
 *
 * Two things are being checked and they are not the same thing. The first is
 * that `ICON_NAMES` and the directory agree — a hand-written list is the price
 * of a typed `name`, and this is what stops it becoming a lie. The second is
 * that the files themselves obey the rules in `src/icons/README.md`, because
 * every one of those rules exists to stop an icon looking subtly wrong in a
 * place nobody is looking: a `width` in the file overrides the `size` prop, a
 * hard-coded colour ignores the text it sits beside, and a stroke drawn at 1
 * disappears on a phone.
 */

const dir = fileURLToPath(new URL("../icons", import.meta.url));
const read = (name: string) => readFileSync(join(dir, `${name}.svg`), "utf8");

/** Every `.svg` actually on disk, without its extension. */
const onDisk = readdirSync(dir)
  .filter((f) => f.endsWith(".svg"))
  .map((f) => f.replace(/\.svg$/, ""))
  .sort();

describe("the list and the directory", () => {
  it("names every file that is there", () => {
    expect([...ICON_NAMES].sort()).toEqual(onDisk);
  });

  it("is sorted, so a new icon has one obvious place to go", () => {
    expect([...ICON_NAMES]).toEqual([...ICON_NAMES].sort());
  });

  it("holds no duplicate", () => {
    expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length);
  });

  it("rejects a name it does not ship", () => {
    // The compile-time half of this is `astro check`; this is the runtime half,
    // for anything that arrives as a string — a content collection, a query.
    expect(isIconName("playbook")).toBe(true);
    expect(isIconName("playbooks")).toBe(false);
    expect(isIconName("")).toBe(false);
  });
});

describe.each(ICON_NAMES)("%s.svg", (name) => {
  const svg = read(name);
  const root = svg.match(/<svg[^>]*>/)![0];

  it("is drawn on the 24px grid", () => {
    expect(root).toContain('viewBox="0 0 24 24"');
  });

  it("sets no dimension of its own", () => {
    // `Icon.astro` writes width and height from the `size` prop. A file that
    // sets either wins over the component and the prop silently does nothing.
    expect(root).not.toMatch(/\swidth=/);
    expect(root).not.toMatch(/\sheight=/);
  });

  it("carries no colour and no class on the root", () => {
    expect(root).not.toMatch(/\s(fill|stroke|class|style)=/);
  });

  it("names no colour value anywhere", () => {
    // Colour is theme.css's, and an icon is a shape (#11). `currentColor` is
    // not a colour — it is a deferral to whatever the text beside it is.
    expect(svg).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(svg).not.toMatch(/\b(rgb|hsl|oklch)a?\(/i);
  });

  it("holds no text to be unreadable at 16px", () => {
    expect(svg).not.toMatch(/<text\b/i);
    expect(svg).not.toMatch(/<tspan\b/i);
  });

  it("unwraps to geometry with the root discarded", () => {
    const body = iconBody(name);

    expect(body).not.toContain("<svg");
    expect(body).not.toContain("</svg>");
    expect(body).toMatch(/<(path|circle|rect|line|polyline|polygon)\b/);
    // Whitespace collapsed: an icon inlined on twelve pages should not carry
    // its source indentation onto all twelve.
    expect(body).not.toMatch(/\n/);
  });
});

describe("stroke weight", () => {
  /**
   * `github` is the exception the set is allowed exactly one of: GitHub's own
   * mark, reproduced as a filled path rather than redrawn at our stroke weight.
   * It is asserted here rather than skipped, so that the exception stays one
   * file rather than becoming a habit.
   */
  it("is the component's for every icon but github", () => {
    for (const name of ICON_NAMES) {
      if (name === "github") continue;
      expect(read(name), `${name} sets its own stroke-width`).not.toMatch(
        /stroke-width=/,
      );
    }
  });

  it("is overridden by github, which is a filled mark", () => {
    const svg = read("github");
    expect(svg).toContain('fill="currentColor"');
    expect(svg).toContain('stroke="none"');
  });
});
