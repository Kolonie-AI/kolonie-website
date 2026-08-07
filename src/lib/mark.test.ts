import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { inlineMark } from "./mark.ts";
import { darkTokensFrom } from "./theme-tokens.ts";
import source from "../../public/mark.svg?raw";

/**
 * Read rather than imported: Vitest stubs a CSS import to an empty string, so
 * `?raw` here would hand every assertion below an undefined colour and pass.
 * `theme-tokens.ts` records why neither way of reading works everywhere.
 */
const themeCss = readFileSync(
  fileURLToPath(new URL("../styles/theme.css", import.meta.url)),
  "utf8",
);

/**
 * **The header's mark and `public/mark.svg` are one drawing** (kolonie-website#60).
 *
 * The whole risk this file covers is a second copy of the geometry. The mark is
 * generated from the theme's tokens by `scripts/build-assets.mjs`, and
 * `assets.test.ts` fails when the committed file stops matching them — but that
 * test reads the *file*, so a path retyped into a component is invisible to it.
 * A palette or shape change would then move the file and leave the header where
 * it was, with nothing red.
 */

/** Every `d="…"` in a document, in order. */
const paths = (svg: string) =>
  [...svg.matchAll(/\bd="([^"]+)"/g)].map((match) => match[1]);

describe("the header's mark is the generated one", () => {
  const rendered = inlineMark(themeCss);

  it("carries the generator's geometry, path for path", () => {
    // The assertion `#60` asks for: change `build-assets.mjs`, re-run it, and
    // the header changes with it. If this ever has to be updated by hand
    // alongside the generator, something has been copied that should not be.
    expect(paths(rendered)).toEqual(paths(source));
    expect(paths(rendered).length).toBeGreaterThan(0);
  });

  it("keeps the stroke weight the generator chose for this cut", () => {
    // `mark.svg` is the regular, untiled cut. Picking up the favicon's heavy
    // one instead would be the wrong file read, and would still look plausible.
    const weight = (svg: string) => svg.match(/stroke-width="(\d+)"/)?.[1];
    expect(weight(rendered)).toBe(weight(source));
  });

  it("does not carry the favicon's background tile", () => {
    // The header's own surface is already the theme's; a tile there is a dark
    // rounded square drawn on the colour it is already the colour of.
    expect(rendered).not.toContain("<rect");
  });
});

describe("it follows the theme rather than freezing it", () => {
  const rendered = inlineMark(themeCss);
  const tokens = darkTokensFrom(themeCss);

  it.each(["--k-accent", "--k-text-strong"])("draws in %s", (token) => {
    expect(rendered).toContain(`var(${token})`);
  });

  it("holds no literal colour at all", () => {
    // Not "holds no colour the theme does not set", which is `assets.test.ts`'s
    // claim about the file. In the DOM the tokens are reachable, so the
    // stronger claim is available and is the one that keeps the light theme
    // honest: a literal here is a mark that ignores the reader's toggle.
    expect(rendered).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it("would have used the dark theme's amber, had it not substituted", () => {
    // Guards the substitution itself rather than its result: if `mark.ts` ever
    // silently found nothing to replace, the two assertions above could still
    // pass on a file that had been regenerated in `currentColor`.
    expect(source).toContain(tokens["--k-accent"]);
    expect(source).toContain(tokens["--k-text-strong"]);
  });
});

describe("it is decorative where the wordmark speaks", () => {
  const rendered = inlineMark(themeCss);

  it("is hidden from a screen reader", () => {
    // `#60`: one of the mark and the site title is decorative, and it is the
    // image. The link's name comes from the text beside it.
    expect(rendered).toContain('aria-hidden="true"');
    expect(rendered).toContain('focusable="false"');
  });

  it("no longer announces its own name", () => {
    expect(rendered).not.toContain("aria-label");
    expect(rendered).not.toContain('role="img"');
  });

  it("still names itself in the file, which is served on its own", () => {
    // The A2A agent card points at `mark.svg` directly (`#59`), where there is
    // no wordmark beside it and the label is the only name it has.
    expect(source).toContain('aria-label="Kolonie AI"');
  });
});
