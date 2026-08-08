#!/usr/bin/env node
/**
 * Put a generated illustration onto the Colony's palette (kolonie-website#90).
 *
 *     node scripts/snap-illustration-palette.mjs <in.png> <out.png> [--width N]
 *
 * ## Why this exists, and why it is not a way of fooling the checker
 *
 * `#65` requires the output to be *"checked against the tokens rather than
 * assuming the prompt was obeyed"*, and the checker is
 * `check-illustration-palette.mjs`. Measured on 2026-08-08, a fresh candidate
 * in the established style scored **0.058%** against a 0.05% limit — and the
 * reason was not noise. The model's amber was `#FFBF31` against the token's
 * `#F7AC3B`: a hue it chose, dE 12–15, consistently, however the prompt asked.
 *
 * There are three ways out of that and only one of them is honest.
 *
 * - **Re-roll until it passes** is the tempting one. It does not converge on
 *   anything: the model has a favourite amber and generating again produces a
 *   different drawing with the same wrong colour. It also makes the pipeline
 *   non-deterministic in the one way `#90` forbids — *regenerating produces the
 *   same cards from the same inputs*.
 * - **Widen the tolerance** would let the checker pass an image that really is
 *   off-palette, which is the failure the checker exists to catch and the exact
 *   thing `#65` set 0.05% against a rejection case to prevent.
 * - **Change the colour** is this file. The image is *made* to contain only
 *   palette colours, and then the checker measures whether it does. The
 *   assertion afterwards is true rather than tolerated.
 *
 * ## How it snaps, and why not to the nearest token
 *
 * Snapping every pixel to its nearest **token** would harden every edge: an
 * anti-aliased boundary is a run of blends, and collapsing each to whichever end
 * it is nearer turns a smooth line into a staircase.
 *
 * So each pixel goes to the nearest colour in `ALLOWED` — the six tokens **and**
 * every blend of any two of them, sampled in sRGB. An edge pixel lands on the
 * blend it already was, one step over; the amber lands on the amber. The drawing
 * survives and its colours become the Colony's.
 *
 * ## And then it is palettised, which is a separate thing
 *
 * `png({ palette: true, colours: 16 })`, which is what the three committed
 * illustrations already are — measured 2026-08-08, `the-path.png` holds exactly
 * 16 distinct colours. Snapping puts the pixels on the palette; palettising is
 * what keeps the file small, and `mitchell` is the resize kernel because
 * `lanczos3` overshoots on one-pixel lines and reintroduces colours that were
 * just removed.
 */

import sharp from "sharp";
import { ALLOWED, dist, toLab } from "./lib/palette.mjs";

/**
 * The nearest allowed colour, cached by input.
 *
 * An image of this kind holds a few thousand distinct colours and a million
 * pixels, so the search runs a few thousand times rather than a million.
 */
const nearest = (() => {
  const cache = new Map();
  return (r, g, b) => {
    const key = (r << 16) | (g << 8) | b;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;

    const lab = toLab([r, g, b]);
    let best = ALLOWED[0];
    let bestAt = Infinity;
    for (const candidate of ALLOWED) {
      const d = dist(lab, candidate.lab);
      if (d < bestAt) [bestAt, best] = [d, candidate];
    }
    cache.set(key, best.rgb);
    return best.rgb;
  };
})();

export async function snap(input, output, width) {
  const resized = sharp(input);
  if (width !== undefined) resized.resize({ width, kernel: "mitchell" });

  const { data, info } = await resized
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b] = nearest(data[i], data[i + 1], data[i + 2]);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png({ palette: true, colours: 16, effort: 10, compressionLevel: 9 })
    .toFile(output);

  return { width: info.width, height: info.height };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [input, output, ...rest] = process.argv.slice(2);
  if (input === undefined || output === undefined) {
    console.error("usage: snap-illustration-palette.mjs <in.png> <out.png> [--width N]");
    process.exit(2);
  }

  const at = rest.indexOf("--width");
  const width = at >= 0 ? Number(rest[at + 1]) : undefined;

  const size = await snap(input, output, width);
  console.log(`${output}  ${size.width}x${size.height}`);
}
