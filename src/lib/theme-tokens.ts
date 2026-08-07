/**
 * The dark theme's `--k-*` colours, as hex, read out of `src/styles/theme.css`.
 *
 * **This exists because two build-time consumers need the same answer** and had
 * their own copy of it: `src/styles/assets.test.ts`, which fails when a
 * committed image stops matching the tokens, and `src/lib/mark.ts`, which has
 * to know which of the mark's two hex values is the accent before it can put
 * the token back. Three copies of an HSL-to-hex conversion is three places for
 * one of them to round differently, so there is one.
 *
 * `scripts/build-assets.mjs` keeps its own copy and that is not an oversight:
 * it is a plain `.mjs` script run by `node` with no TypeScript loader, so it
 * cannot import this file. The duplication is between the generator and this,
 * and `assets.test.ts` is precisely what catches the two disagreeing — a
 * committed asset only matches if both computed the same colour.
 *
 * **Dark and not light.** The generated images have one set of colours baked
 * in, and the site's own background under them is the dark one; the light
 * theme is handled where it can be — in the DOM, by `mark.ts` — rather than by
 * a second set of files. `theme.css` is the source for both.
 *
 * ## The bytes are the caller's problem, and that is `head.ts`'s split
 *
 * `themeColorFrom` takes the stylesheet as text for the same reason this does,
 * and the reason is worth repeating because both ways of reading the file are
 * wrong half the time. A module bundled by Vite cannot `readFileSync` its own
 * neighbours — at build time a relative path resolves into `dist/.prerender/`
 * and the read fails with `ENOENT` mid-render. And a module under Vitest
 * cannot `import '…theme.css?raw'` — the runner stubs CSS imports to an empty
 * string, so the parse silently finds no tokens and every assertion about a
 * colour compares against `undefined`.
 *
 * Both of those were hit in `#60`, in that order. So neither is chosen here:
 * the caller reads the file the way its own environment can, and the parsing
 * lives in one place.
 */
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

export const darkTokensFrom = (css: string): Record<string, string> => {
  const dark = css.slice(
    css.indexOf(":root,"),
    css.indexOf("[data-theme='light']"),
  );
  const out: Record<string, string> = {};
  for (const [, name, h, s, l] of dark.matchAll(
    /(--k-[a-z0-9-]+)\s*:\s*hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)/g,
  )) {
    out[name] = hex(Number(h), Number(s) / 100, Number(l) / 100);
  }
  return out;
};
