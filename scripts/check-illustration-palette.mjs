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
import { LAB, LIMIT, RAMPS, TOLERANCE, dist, hex, toLab } from "./lib/palette.mjs";

/**
 * **The tokens, the Lab conversion and the blend ramps moved to
 * `lib/palette.mjs` on `kolonie-website#90`**, unchanged, because the snapper
 * that issue adds needs the same three. A snapper disagreeing with this checker
 * by a rounding step is a pipeline whose output fails its own gate for reasons
 * nobody can see. The reasoning for each is in that file.
 */

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
      // `sample.lab` since `#90` — the ramps carry their sRGB too now, because
      // the snapper needs a colour to write and this needs one to measure.
      const d = dist(lab, sample.lab);
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
