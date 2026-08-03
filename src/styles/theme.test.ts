import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The theme's two obligations, checked rather than asserted
 * (kolonie-website#11).
 *
 * 1. Every text-on-background pair the site can produce meets WCAG AA, in both
 *    themes. Terminal palettes fail this constantly — dim grey on near-black is
 *    the usual way an aesthetic decision becomes an unreadable page — so the
 *    ratios are computed from `theme.css` itself, not from a screenshot taken
 *    once and a promise.
 * 2. Colour values live in `theme.css` and nowhere else. Two contributors
 *    styling two pages produce two sites, and the drift is invisible until they
 *    are next to each other.
 */

const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const themeCss = read("./theme.css");

/** `hsl(200 14% 7%)` → sRGB in 0..1. Only the space this file uses. */
const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
};

/** WCAG 2.x relative luminance. */
const luminance = ([r, g, b]: [number, number, number]) => {
  const lin = (c: number) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(parse(a)), luminance(parse(b))];
  const [hi, lo] = x > y ? [x, y] : [y, x];
  return (hi + 0.05) / (lo + 0.05);
};

const parse = (value: string): [number, number, number] => {
  const m = value.match(
    /^hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)$/,
  );
  if (!m) throw new Error(`not an hsl() this test understands: ${value}`);
  return hslToRgb(Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100);
};

/**
 * The `--k-*` declarations of one block, with `var(--k-…)` references resolved.
 * `base` is the dark set, which the light block overrides rather than restates.
 */
const tokensOf = (block: string, base: Record<string, string> = {}) => {
  const out: Record<string, string> = { ...base };
  for (const [, name, value] of block.matchAll(
    /(--k-[a-z0-9-]+)\s*:\s*([^;]+);/g,
  )) {
    out[name] = value.trim();
  }
  for (const name of Object.keys(out)) {
    let seen = 0;
    // A token may point outside this file — `--k-font-prose` deliberately takes
    // Starlight's system stack. Those are left as written; the pairs below only
    // ever ask for colours, which do resolve here.
    while (out[name].startsWith("var(--k-")) {
      const ref = out[name].slice(4, -1).trim();
      if (!out[ref]) throw new Error(`${name} points at unset ${ref}`);
      out[name] = out[ref];
      if (++seen > 8) throw new Error(`${name} resolves in a circle`);
    }
  }
  return out;
};

const blockAfter = (marker: string) => {
  const start = themeCss.indexOf(marker);
  if (start === -1) throw new Error(`theme.css no longer contains ${marker}`);
  const open = themeCss.indexOf("{", start);
  return themeCss.slice(open, themeCss.indexOf("\n}", open));
};

const dark = tokensOf(blockAfter(":root,\n::backdrop"));
const light = tokensOf(blockAfter(":root[data-theme='light']"), dark);

/**
 * Every pair a reader can end up looking at. `AA` is normal body text; `AA_UI`
 * is the 3:1 that WCAG allows for large text and for the boundary of a control,
 * and it is used only where the token is exactly that.
 */
const AA = 4.5;
const AA_UI = 3;

const pairs: Array<[string, string, number, string]> = [
  ["--k-text-strong", "--k-bg", AA, "headings on the page"],
  ["--k-text-strong", "--k-surface", AA, "headings on the header and cards"],
  ["--k-text-strong", "--k-surface-raised", AA, "headings on inline code"],
  ["--k-text", "--k-bg", AA, "body text"],
  ["--k-text", "--k-surface", AA, "body text on a card"],
  ["--k-text", "--k-surface-raised", AA, "inline code"],
  ["--k-text-muted", "--k-bg", AA, "secondary text"],
  ["--k-text-muted", "--k-surface", AA, "secondary text on a card"],
  ["--k-text-muted", "--k-surface-raised", AA, "secondary text on inline code"],
  ["--k-text-faint", "--k-bg", AA, "the smallest labels"],
  ["--k-text-faint", "--k-surface", AA, "the smallest labels on a card"],
  ["--k-accent", "--k-bg", AA, "links"],
  ["--k-accent", "--k-surface", AA, "links in the header"],
  ["--k-accent-strong", "--k-bg", AA, "the accented text Starlight sets"],
  ["--k-accent-strong", "--k-accent-dim", AA, "an accent chip"],
  ["--k-on-accent", "--k-accent", AA, "the label of a filled button"],
  ["--k-hairline-strong", "--k-bg", AA_UI, "the border of a control"],

  // The four aside kinds and the Academy's "holds this skill" green. Starlight
  // sets an aside's body in --sl-color-white on the dim ground and its title in
  // the high, so those are the two pairs each has to survive.
  ...(["note", "tip", "caution", "danger", "good"] as const).flatMap(
    (kind): Array<[string, string, number, string]> => [
      ["--k-text-strong", `--k-${kind}-dim`, AA, `${kind}: what it says`],
      ["--k-" + kind + "-high", `--k-${kind}-dim`, AA, `${kind}: its title`],
      ["--k-" + kind, "--k-bg", AA_UI, `${kind}: the rule down its side`],
    ],
  ),
];

describe.each([
  ["dark", dark],
  ["light", light],
])("%s theme meets WCAG AA", (_name, tokens) => {
  it.each(pairs)("%s on %s ≥ %s — %s", (fg, bg, min) => {
    const ratio = contrast(tokens[fg], tokens[bg]);
    // The message carries the ratio, so a failure says how far off it is
    // rather than only that it is off.
    expect(
      Number(ratio.toFixed(2)),
      `${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs ${min}:1`,
    ).toBeGreaterThanOrEqual(min);
  });
});

describe("colour values stay in the theme layer", () => {
  const sources = readdirSync(fileURLToPath(new URL("..", import.meta.url)), {
    recursive: true,
    encoding: "utf8",
  })
    .filter((f) => /\.(astro|css|mdx|md|ts)$/.test(f))
    .filter((f) => !f.endsWith(".test.ts") && f !== "styles/theme.css");

  // `#fff`, `#ffffff`, `rgb(…)`, `hsl(…)`, and the named colours that turn up
  // in a hurry. A page needing a colour needs a token, and if no token fits,
  // theme.css is where the argument about adding one happens.
  //
  // The hex form only counts at the start of a value, because `#193` is both a
  // colour and how this codebase writes an issue number, and prose citing
  // `kolonie-platform#193` is not a styling decision.
  const literal =
    /(?:^|[\s(:,])#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|color-mix)\(|\bcolor\s*:\s*(?:white|black|red|green|blue|grey|gray)\b/;

  it.each(sources)("%s has none", (file) => {
    const body = read(`../${file}`);
    const offending = body
      .split("\n")
      .map((line, i) => [i + 1, line] as const)
      // A fragment identifier in a link is not a colour.
      .filter(([, line]) => literal.test(line) && !/\]\(#|href=/.test(line));
    expect(offending.map(([n, l]) => `${file}:${n} ${l.trim()}`)).toEqual([]);
  });
});

describe("the self-hosted font is the font it claims to be", () => {
  // The files under `public/fonts/` are copies. A copy silently diverges from
  // its source the first time the source is updated, and the failure is a font
  // nobody notices is stale.
  it.each([
    "jetbrains-mono-latin-wght-normal.woff2",
    "jetbrains-mono-latin-ext-wght-normal.woff2",
  ])("%s matches the package it was copied from", (file) => {
    const served = readFileSync(
      fileURLToPath(new URL(`../../public/fonts/${file}`, import.meta.url)),
    );
    const packaged = readFileSync(
      fileURLToPath(
        new URL(
          `../../node_modules/@fontsource-variable/jetbrains-mono/files/${file}`,
          import.meta.url,
        ),
      ),
    );
    expect(served.equals(packaged)).toBe(true);
  });

  it("ships the licence beside them, which OFL-1.1 requires", () => {
    expect(read("../../public/fonts/LICENSE")).toMatch(/SIL OPEN FONT LICENSE/i);
  });
});

describe("the light theme is a theme, not an afterthought", () => {
  it("overrides every colour token the dark theme sets", () => {
    const colours = Object.keys(dark).filter((k) =>
      dark[k].startsWith("hsl("),
    );
    const overridden = new Set(
      [...blockAfter(":root[data-theme='light']").matchAll(/(--k-[a-z0-9-]+)\s*:/g)].map(
        (m) => m[1],
      ),
    );
    expect(colours.filter((k) => !overridden.has(k))).toEqual([]);
  });
});
