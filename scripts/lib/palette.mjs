/**
 * The Colony's palette, in the two forms every image tool here needs
 * (kolonie-website#65, #90).
 *
 * **One copy, and this file exists because there were about to be two.**
 * `check-illustration-palette.mjs` had the tokens, the Lab conversion and the
 * blend ramps inline; `snap-illustration-palette.mjs` needs exactly the same
 * three, and a snapper that disagreed with the checker by a rounding step is a
 * pipeline whose output fails its own gate for reasons nobody can see. So the
 * maths is here and both import it — which is `#120`'s rule applied to a
 * numerical constant rather than to a document.
 */

/** Straight from `src/styles/theme.css`. The dark set is the one that renders. */
export const TOKENS = {
  "--k-bg": [0x0f, 0x13, 0x14],
  "--k-surface": [0x18, 0x1d, 0x20],
  "--k-surface-raised": [0x24, 0x2a, 0x2e],
  "--k-accent": [0xf7, 0xac, 0x3b],
  "--k-accent-strong": [0xfc, 0xd6, 0x9c],
  "--k-accent-dim": [0x37, 0x28, 0x10],
};

/** Delta-E 76. About 10 is "noticeable to a trained eye". */
export const TOLERANCE = 12;

/**
 * 0.05% of pixels, and the number was set by the rejection case rather than by
 * taste: a 60x60 patch of a plausible-but-wrong amber is 0.229% of a 1536x1024
 * frame and has to fail. An earlier 0.5% let that patch through.
 */
export const LIMIT = 0.0005;

export function toLab([r8, g8, b8]) {
  const inv = (c) => {
    const v = c / 255;
    return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92;
  };
  const [r, g, b] = [inv(r8), inv(g8), inv(b8)];
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export const LAB = Object.fromEntries(
  Object.entries(TOKENS).map(([k, v]) => [k, toLab(v)]),
);

/**
 * Every blend of every pair of tokens, sampled in **sRGB** and then converted.
 *
 * **The straight line has to be drawn in the space the blending happens in, and
 * the first version drew it in the wrong one.** It interpolated between two
 * tokens in Lab, which is where the distances are measured — but an
 * anti-aliased edge is a weighted average of two *stored* sRGB values, and sRGB
 * is gamma-encoded, so that path is a curve in Lab rather than a line. A pixel
 * halfway between the amber and the background missed the Lab segment by more
 * than the tolerance and was reported off-palette, which is a checker that
 * fails correct images.
 *
 * 33 samples per pair: the gap between adjacent samples is far below the
 * tolerance everywhere on the curve, so nothing real falls between two of them.
 *
 * **Each sample keeps its sRGB as well as its Lab** since `#90`, because the
 * snapper needs a colour to write and the checker needs one to measure against.
 * That is the only change this extraction made to either.
 */
export const RAMPS = (() => {
  const entries = Object.values(TOKENS);
  const ramps = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [a, b] = [entries[i], entries[j]];
      for (let s = 0; s <= 32; s++) {
        const t = s / 32;
        const rgb = [0, 1, 2].map((c) => a[c] + t * (b[c] - a[c]));
        ramps.push({ rgb: rgb.map((v) => Math.round(v)), lab: toLab(rgb) });
      }
    }
  }
  return ramps;
})();

/** Every colour a pixel is allowed to be: the tokens, and every blend of two. */
export const ALLOWED = [
  ...Object.values(TOKENS).map((rgb) => ({ rgb, lab: toLab(rgb) })),
  ...RAMPS,
];

export const hex = (r, g, b) =>
  "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0").toUpperCase()).join("");
