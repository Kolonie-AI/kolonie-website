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

  // The syntax palette (kolonie-website#31), on both grounds a snippet is
  // drawn on: `.prompt` sits on --k-surface, `.skill-install` on --k-bg. A
  // highlighted token is body text at body size, so it is AA and not AA_UI —
  // the decision on the issue was explicit that a syntax palette skipping this
  // check would be a hole in the one guarantee this repository enforces.
  ...(["plain", "command", "string", "flag", "value", "punct", "comment"] as const).flatMap(
    (kind): Array<[string, string, number, string]> => [
      [`--k-syn-${kind}`, "--k-bg", AA, `syntax: ${kind} in an install line`],
      [`--k-syn-${kind}`, "--k-surface", AA, `syntax: ${kind} in a prompt`],
    ],
  ),

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

describe("the self-hosted fonts are the fonts they claim to be", () => {
  // The files under `public/fonts/` are copies. A copy silently diverges from
  // its source the first time the source is updated, and the failure is a font
  // nobody notices is stale.
  //
  // Two families since kolonie-website#48: the mono face for headings, code and
  // labels, and Inter for prose. Both are checked the same way, and the package
  // each was copied out of is named here rather than assumed.
  const families = [
    { package: "jetbrains-mono", prefix: "jetbrains-mono", licence: "LICENSE-JetBrainsMono" },
    { package: "inter", prefix: "inter", licence: "LICENSE-Inter" },
  ] as const;

  const files = families.flatMap((family) =>
    (["latin", "latin-ext"] as const).map((subset) => ({
      family,
      file: `${family.prefix}-${subset}-wght-normal.woff2`,
    })),
  );

  it.each(files)("$file matches the package it was copied from", ({ family, file }) => {
    const served = readFileSync(
      fileURLToPath(new URL(`../../public/fonts/${file}`, import.meta.url)),
    );
    const packaged = readFileSync(
      fileURLToPath(
        new URL(
          `../../node_modules/@fontsource-variable/${family.package}/files/${file}`,
          import.meta.url,
        ),
      ),
    );
    expect(served.equals(packaged)).toBe(true);
  });

  it.each(families)(
    "$package ships its licence beside them, which OFL-1.1 requires",
    (family) => {
      expect(read(`../../public/fonts/${family.licence}`)).toMatch(
        /SIL OPEN FONT LICENSE/i,
      );
    },
  );

  it.each(files)("$file is declared by an @font-face in this file", ({ file }) => {
    expect(themeCss).toContain(`/fonts/${file}`);
  });
});

/**
 * **The prose face resolves, on every page** (kolonie-website#48).
 *
 * The defect this replaces was not a missing font — it was a font stack that
 * pointed at `var(--sl-font-system)`, a variable **another package** declares.
 * On a page Starlight rendered it resolved; on `/`, which left the framework in
 * `#30`, it resolved to nothing and the browser's default serif won. One
 * declaration, two answers, and no test could see it because the file itself
 * looked correct.
 *
 * So the rule that is checked is the one that would have caught it: **a font
 * stack in this file may not depend on a variable this file does not declare**,
 * and its first named family must be one served from `public/fonts/`. The
 * fallbacks after it are for the frames before the face lands; the browser's
 * generic default is never reached because a real family always precedes it.
 */
describe("the type stacks stand on their own", () => {
  const stacks = [
    ["--k-font-prose", "Inter"],
    ["--k-font-mono", "JetBrains Mono"],
  ] as const;

  it.each(stacks)("%s names %s first, self-hosted", (token, family) => {
    const declared = dark[token];
    expect(declared.split(",")[0]!.trim()).toBe(`'${family}'`);
    expect(themeCss).toContain(`font-family: '${family}';`);
  });

  // The rejection case. Point either stack back at a variable from outside this
  // file — which is exactly what `--k-font-prose` did — and this fails.
  it.each(stacks)("%s points at nothing outside this file", (token) => {
    expect(dark[token]).not.toMatch(/var\(\s*--(?!k-)/);
  });

  // And the generic-family case: a stack whose *first* entry is `serif`,
  // `sans-serif` or `system-ui` is a page that renders in whatever the visitor
  // happens to have, which is the state #48 was opened for.
  it.each(stacks)("%s does not open on a generic family", (token) => {
    expect(dark[token].split(",")[0]!.trim()).not.toMatch(
      /^(serif|sans-serif|monospace|system-ui|ui-\w+)$/,
    );
  });
});

/**
 * **The scale has roles, and a page is written against the roles**
 * (kolonie-website#48).
 *
 * The steps are a ruler. `--k-type-*` says which mark each kind of text stands
 * at, and it is the layer that can be checked: *is an h2 large enough to
 * separate two sections* is a question about the ratio between two roles and
 * cannot be asked of a ruler at all.
 */
describe("the type scale", () => {
  const rem = (token: string) => {
    const value = dark[token];
    const m = value.match(/^([\d.]+)rem$/);
    if (!m) throw new Error(`${token} is ${value}, which this test cannot size`);
    return Number(m[1]);
  };

  it.each([
    "--k-type-small",
    "--k-type-body",
    "--k-type-h3",
    "--k-type-h2",
    "--k-type-h1",
    "--k-type-display",
  ])("declares %s", (token) => {
    expect(dark[token]).toBeTruthy();
  });

  // The acceptance criterion of #48, as a number: measured at 25.6px against an
  // 18px body — 1.4×, a heading that has to be looked for.
  it("sets h2 to at least twice the body size", () => {
    expect(rem("--k-type-h2") / rem("--k-type-body")).toBeGreaterThanOrEqual(2);
  });

  it("rises without a repeat", () => {
    const ladder = [
      "--k-type-small",
      "--k-type-body",
      "--k-type-h3",
      "--k-type-h2",
      "--k-type-h1",
      "--k-type-display",
    ].map(rem);
    expect(ladder).toEqual([...ladder].sort((a, b) => a - b));
    expect(new Set(ladder).size).toBe(ladder.length);
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
