#!/usr/bin/env node
/**
 * Check a generated illustration against the theme tokens (kolonie-website#65).
 *
 * `#65`: *"check the output against the tokens rather than assuming the prompt
 * was obeyed."* Run it by hand on a fresh candidate before it ever reaches
 * `public/`, and `src/lib/illustrations.built-test.ts` runs it on every build.
 *
 *     node scripts/check-illustration-palette.mjs public/illustrations/*.webp
 *
 * **It is Node and `sharp` rather than Python and Pillow**, and that is not a
 * preference. The first version was Python; it passed here and failed CI with
 * `ModuleNotFoundError: No module named 'PIL'`, because this repository's CI is
 * Node and installs no Python packages. The alternatives were to install Pillow
 * in CI for one check, or to let the test skip when the import fails — and a
 * check that silently does not run is the failure mode this repository writes
 * tests against. `sharp` is already a dependency, so the check now runs
 * everywhere the site builds.
 *
 * ## How it decides
 *
 * Every distinct colour is snapped to its nearest token in **CIE Lab**, so the
 * tolerance means the same thing on a dark plate as it does on the amber. A
 * colour further than the tolerance from every token is off-palette — except
 * that anti-aliased edges sit *between* two tokens by construction, so a colour
 * lying close to the segment joining any two tokens is accepted as well.
 */

import sharp from "sharp";

/** Straight from `src/styles/theme.css`. The dark set is the one that renders. */
const TOKENS = {
  "--k-bg": [0x0f, 0x13, 0x14],
  "--k-surface": [0x18, 0x1d, 0x20],
  "--k-surface-raised": [0x24, 0x2a, 0x2e],
  "--k-accent": [0xf7, 0xac, 0x3b],
  "--k-accent-strong": [0xfc, 0xd6, 0x9c],
  "--k-accent-dim": [0x37, 0x28, 0x10],
};

/** Delta-E 76. About 10 is "noticeable to a trained eye". */
const TOLERANCE = 12;

/**
 * 0.05% of pixels, and the number was set by the rejection case rather than by
 * taste: a 60x60 patch of a plausible-but-wrong amber is 0.229% of a 1536x1024
 * frame and has to fail. Both committed illustrations score 0.000%, so there is
 * no drift to leave room for. An earlier 0.5% let that patch through.
 */
const LIMIT = 0.0005;

function toLab([r8, g8, b8]) {
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

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const LAB = Object.fromEntries(Object.entries(TOKENS).map(([k, v]) => [k, toLab(v)]));

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
 */
const RAMPS = (() => {
  const entries = Object.values(TOKENS);
  const ramps = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [a, b] = [entries[i], entries[j]];
      for (let s = 0; s <= 32; s++) {
        const t = s / 32;
        ramps.push(toLab([0, 1, 2].map((c) => a[c] + t * (b[c] - a[c]))));
      }
    }
  }
  return ramps;
})();

const hex = (r, g, b) =>
  "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0").toUpperCase()).join("");

async function check(path) {
  const { data, info } = await sharp(path).raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;

  // Count distinct colours first: an image of this kind has a few hundred, and
  // converting each once instead of per pixel is the whole cost of the check.
  const counts = new Map();
  for (let i = 0; i < data.length; i += channels) {
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const total = info.width * info.height;
  const off = [];

  for (const [key, count] of counts) {
    const rgb = [(key >> 16) & 0xff, (key >> 8) & 0xff, key & 0xff];
    const lab = toLab(rgb);

    let nearest = Infinity;
    let nearestName = "";
    for (const [name, token] of Object.entries(LAB)) {
      const d = dist(lab, token);
      if (d < nearest) [nearest, nearestName] = [d, name];
    }
    if (nearest <= TOLERANCE) continue;

    let blend = Infinity;
    for (const sample of RAMPS) {
      const d = dist(lab, sample);
      if (d < blend) blend = d;
      if (blend <= TOLERANCE) break;
    }
    if (blend <= TOLERANCE) continue;

    off.push({ share: count / total, hex: hex(...rgb), dE: nearest, near: nearestName });
  }

  off.sort((a, b) => b.share - a.share);
  const share = off.reduce((sum, o) => sum + o.share, 0);

  console.log(`\n${path}  (${info.width}x${info.height})`);
  console.log(`  off-palette: ${(share * 100).toFixed(3)}% of pixels`);
  for (const o of off.slice(0, 8)) {
    console.log(
      `    ${o.hex}  ${(o.share * 100).toFixed(3).padStart(6)}%  dE ${o.dE.toFixed(1)} from ${o.near}`,
    );
  }
  return share;
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: check-illustration-palette.mjs <image>...");
  process.exit(2);
}

const worst = Math.max(...(await Promise.all(files.map(check))));
console.log(`\n${worst < LIMIT ? "PASS" : "FAIL"} (threshold ${LIMIT * 100}% of pixels)`);
process.exit(worst < LIMIT ? 0 : 1);
