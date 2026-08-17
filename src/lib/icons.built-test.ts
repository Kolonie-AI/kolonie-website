import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ICON_NAMES, isIconName } from "../icons/index.ts";

/**
 * The icon set as it reaches a reader (kolonie-website#129/#131/#132/#134).
 *
 * **Why this is a built test and not a unit one.** `src/lib/icons.test.ts`
 * already reads the twelve files and the tuple — that is the set as committed,
 * and it is the right place for *is this a 24px glyph with no colour in it*.
 * What that test cannot see is the other half of the promise: that the component
 * turns a name into markup a browser will draw in `currentColor`, and that every
 * shipped icon is on a page somebody can look at.
 *
 * The second one is what `#134` bought. A set of twelve icons where four are
 * used and eight exist only in a directory is a set nobody can review, and the
 * failure is silent — `astro check` is perfectly happy with an unused SVG. The
 * gallery iterates `ICON_NAMES`, so the assertion below is worth making: a name
 * added to the tuple appears on `/visuals/` in the same commit or this fails.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));

const pagesUnder = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return pagesUnder(path);
    return entry.endsWith(".html") ? [path] : [];
  });

/** Every `<svg …>` opening tag the component emitted, by the icon it is. */
const iconTags = (html: string): { name: string; tag: string }[] =>
  [...html.matchAll(/<svg\b[^>]*\bdata-icon="([^"]*)"[^>]*>/g)].map((m) => ({
    name: m[1]!,
    tag: m[0]!,
  }));

describe("the icon set on the built site", () => {
  const pages = pagesUnder(dist);
  const gallery = readFileSync(join(dist, "visuals", "index.html"), "utf8");
  const landing = readFileSync(join(dist, "index.html"), "utf8");

  it("built the page the icons are reviewed on", () => {
    expect(pages.length).toBeGreaterThan(1);
    expect(gallery).toContain("data-icon-gallery");
  });

  /**
   * **Every shipped icon is somewhere a person can see it.** This is `#134`'s
   * first acceptance criterion — *"public route lists all v1 icons with
   * names"* — and it is checked against the tuple rather than against a count,
   * so a thirteenth icon cannot be added without reaching the page.
   */
  it.each(ICON_NAMES)("%s is on /visuals/ with its name", (name) => {
    expect(gallery).toContain(`data-icon="${name}"`);
    // The name, as a page would type it. `#134`: the drawing is not the useful
    // half — an agent needs to know the glyph it wants is called `playbook`.
    expect(gallery).toContain(`>${name}<`);
  });

  /**
   * **The homepage still uses them** (`#132`). It is asserted here rather than
   * left to a reading of `index.astro`, because the way this regresses is a
   * later redesign of the cards that drops the glyphs and passes every other
   * test on the site.
   */
  it("the landing page draws icons", () => {
    const names = new Set(iconTags(landing).map((icon) => icon.name));
    expect(names.size).toBeGreaterThanOrEqual(4);
  });

  /**
   * **No page invents a name.** A typo in an `.astro` file is caught by
   * `astro check` against `IconName`; a hand-written `<svg data-icon="...">`
   * that skips the component is not, and it is how a colour value or a second
   * stroke width would get onto the site.
   */
  it("every drawn icon is one of the twelve", () => {
    for (const page of pages) {
      for (const icon of iconTags(readFileSync(page, "utf8"))) {
        expect(isIconName(icon.name), `${page} draws "${icon.name}"`).toBe(true);
      }
    }
  });

  /**
   * **Colour comes from `currentColor` and nowhere else** (`#131`, and
   * `AGENTS.md`'s rule that `theme.css` is the only file carrying a colour).
   * Checked on the emitted tag, which is the only place a component prop could
   * put one.
   */
  it("no drawn icon carries a colour value", () => {
    for (const page of pages) {
      for (const icon of iconTags(readFileSync(page, "utf8"))) {
        expect(icon.tag, `${page}: ${icon.name}`).not.toMatch(/#[0-9a-f]{3,8}\b/i);
        expect(icon.tag).not.toMatch(/\b(?:rgb|hsl|oklch)\(/i);
        expect(icon.tag).toContain('stroke="currentColor"');
      }
    }
  });

  /**
   * **Every icon is either named or hidden, never both and never neither**
   * (`#131`'s accessibility criterion). A decorative glyph beside a text label
   * announces the link twice if it keeps a name; a glyph that is the only thing
   * in its control is unreachable without one. There is no third state, and the
   * component is what guarantees it — this is the check that it does.
   */
  it("every drawn icon is labelled or hidden", () => {
    for (const page of pages) {
      for (const icon of iconTags(readFileSync(page, "utf8"))) {
        const hidden = icon.tag.includes('aria-hidden="true"');
        const named = icon.tag.includes('role="img"') && icon.tag.includes("aria-labelledby=");
        expect(hidden !== named, `${page}: ${icon.name} is ${icon.tag}`).toBe(true);
        // Not focusable either way: an inline SVG is a tab stop in older IE-era
        // engines and in some assistive tooling, and none of these is a control.
        expect(icon.tag).toContain('focusable="false"');
      }
    }
  });
});
