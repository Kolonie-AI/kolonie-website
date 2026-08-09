import { darkTokensFrom } from "./theme-tokens.ts";
// The generated file itself, read at build time. `?raw` and not `readFileSync`
// for the reason `head.ts` records: bundled, a relative path resolves into
// `dist/.prerender/` and the read fails with `ENOENT` mid-build.
//
// **Importing out of `public/` is unusual and it is the right file.** Vite's
// advice against it is about assets that should be served rather than bundled;
// nothing is bundled here — the bytes are read and the file goes on being
// served at `/mark.svg` exactly as before. Reading a second copy from `src/`
// instead is the duplication this whole module exists to prevent.
import source from "../../public/mark.svg?raw";

/**
 * The mark, as markup a page can put in its header (kolonie-website#60).
 *
 * ## Inlined, not `<img>` — and the theme toggle is what decides it
 *
 * `#60` asked for a choice between inlining the SVG and shipping two files,
 * and the choice is **inline**. The reason is not a preference:
 *
 * `public/mark.svg` is a generated file with two concrete hex values in it,
 * because it is also served on its own — the A2A agent card points at it
 * (`#59`) and nothing renders that inside this site's stylesheet. Those hexes
 * are the *dark* theme's. In the light theme `--k-accent` is a darker amber and
 * `--k-text-strong` is near-black, so an `<img src="/mark.svg">` on `/terms/`
 * in daylight draws a highlighter shield with an off-white cursor bar on an
 * off-white ground: the bar disappears. CSS cannot reach inside an `<img>` to
 * fix it.
 *
 * **And two files would not fix it either**, which is the part worth writing
 * down. The obvious second option is a light copy and a dark copy swapped by
 * `<picture>` and `prefers-color-scheme`. This site's theme is not that: it is
 * a `data-theme` attribute written into the markup, and a media query cannot
 * see it. A reader on a light OS gets the dark mark or the wrong one, and there
 * is no CSS that repairs a `<picture>` from the outside. Inlining puts the mark in the DOM, where the same custom
 * properties that colour everything else reach it.
 *
 * ## One source for the geometry
 *
 * The path data is **read from `public/mark.svg` at build time and never
 * retyped**. `scripts/build-assets.mjs` writes that file from the tokens; a
 * hand-copied path in an `.astro` file is exactly the second source
 * `src/styles/assets.test.ts` exists to prevent, and it is the one thing that
 * test cannot see. Substituting a colour for the token it came from is not a
 * copy — the shape is still the generator's, and `mark.test.ts` asserts that
 * every path in the output is one that is in the file.
 *
 * ## It throws rather than degrades
 *
 * If a palette change regenerates `mark.svg` in colours this file cannot find,
 * the build fails here. The alternative is a mark that quietly keeps a literal
 * hex and stops following the theme — the silent staleness the whole generated
 * pipeline is arranged against.
 */

/** The two tokens the mark is drawn in. Nothing else is substituted. */
const DRAWN_IN = ["--k-accent", "--k-text-strong"] as const;

/**
 * The mark as inline SVG, decorative.
 *
 * **`aria-hidden`, deliberately.** The file carries `role="img"` and an
 * `aria-label` because on its own it is the whole image and needs a name. In
 * the header it sits inside a link that already says *Kolonie AI* in text, and
 * `#60` is explicit that one of the two is decorative and it should be the
 * image. Leaving the label on announces the link twice.
 */
export const inlineMark = (themeCss: string): string => {
  const tokens = darkTokensFrom(themeCss);

  let svg = source;
  for (const token of DRAWN_IN) {
    const value = tokens[token];
    if (value === undefined || !svg.includes(value)) {
      throw new Error(
        `public/mark.svg does not carry ${token} (${value ?? "unset"}). ` +
          "Run `node scripts/build-assets.mjs` after a palette change.",
      );
    }
    svg = svg.replaceAll(value, `var(${token})`);
  }

  const remaining = svg.match(/#[0-9a-f]{3,8}\b/gi);
  if (remaining !== null) {
    throw new Error(
      `public/mark.svg carries a colour that is not a token: ${remaining.join(", ")}`,
    );
  }

  const labelled = 'role="img" aria-label="Kolonie AI"';
  if (!svg.includes(labelled)) {
    throw new Error(
      "public/mark.svg no longer carries the label this strips; check `scripts/build-assets.mjs`.",
    );
  }
  return svg.replace(labelled, 'aria-hidden="true" focusable="false"');
};
