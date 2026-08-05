/**
 * The wordmark, as a density ramp (kolonie-website#39).
 *
 * `openclaw.ai` serves exactly one `<pre>`: 5,746 characters of ASCII in its
 * hero, drawn as a density ramp — `.` `:` `-` `=` `+` `x` — so it reads as a
 * shaded image rather than as line art. That technique is why it looks good and
 * it is the part worth copying. What is *not* copied is their lobster: it is an
 * existing brand asset, the Colony has no mascot, and inventing one inside a
 * website issue would be a brand decision taken in the wrong place.
 *
 * **Generated, and the generator is checked in with the output.** A
 * five-thousand-character blob nobody can regenerate is the asset that can
 * never be changed again. `src/lib/wordmark.test.ts` runs {@link renderWordmark}
 * and fails if `src/lib/wordmark.ts` is not what it produces, so the two cannot
 * drift.
 *
 * **No font is involved, and that is the reason it is reproducible.** Rendering
 * text through a rasteriser makes the output depend on which fonts the machine
 * has installed, which is a generator that produces a different answer on the
 * next contributor's laptop. The letterforms below are seven 5×7 bitmaps in this
 * file; everything after that is arithmetic.
 *
 *     node scripts/build-ascii.mjs
 */

import { writeFileSync } from "node:fs";

/** The seven letters, at 5×7. Only the ones `KOLONIE` needs. */
const GLYPHS = {
  K: ["X...X", "X..X.", "X.X..", "XX...", "X.X..", "X..X.", "X...X"],
  O: [".XXX.", "X...X", "X...X", "X...X", "X...X", "X...X", ".XXX."],
  L: ["X....", "X....", "X....", "X....", "X....", "X....", "XXXXX"],
  N: ["X...X", "XX..X", "XX..X", "X.X.X", "X..XX", "X..XX", "X...X"],
  I: ["XXXXX", "..X..", "..X..", "..X..", "..X..", "..X..", "XXXXX"],
  E: ["XXXXX", "X....", "X....", "XXXX.", "X....", "X....", "XXXXX"],
};

const WORD = "KOLONIE";

/**
 * The ramp, lightest first. Six marks and a space, as the reference uses.
 *
 * A space rather than a seventh mark for zero coverage: a background drawn in
 * dots is a rectangle, and the wordmark has to read as a wordmark.
 */
const RAMP = [" ", ".", ":", "-", "=", "+", "x"];

/** Output size. 68 by 7 keeps the letterforms' proportions once a character
 *  cell's own 0.6 aspect ratio is accounted for: 68 × 0.6 ÷ 7 ≈ 41 ÷ 7. */
const COLUMNS = 68;
const ROWS = 7;

/** How much finer the coverage field is than the letterforms. */
const SUPERSAMPLE = 4;

/** The bitmaps, laid out as one word with a column of space between letters. */
const source = () => {
  const rows = Array.from({ length: 7 }, () => []);

  for (const [index, letter] of [...WORD].entries()) {
    const glyph = GLYPHS[letter];
    if (glyph === undefined) throw new Error(`no bitmap for ${letter}`);

    for (let row = 0; row < 7; row += 1) {
      if (index > 0) rows[row].push(0);
      for (const cell of glyph[row]) rows[row].push(cell === "X" ? 1 : 0);
    }
  }

  return rows;
};

/** Nearest-neighbour upsample, so there is something to blur. */
const upsample = (grid) =>
  grid.flatMap((row) =>
    Array.from({ length: SUPERSAMPLE }, () =>
      row.flatMap((cell) => Array.from({ length: SUPERSAMPLE }, () => cell)),
    ),
  );

/**
 * A 3×3 box blur, twice.
 *
 * This is what turns line art into a shaded image: without it every cell is
 * either empty or full and the ramp has two values in it. The blur puts real
 * coverage between 0 and 1 around every edge, and the ramp turns that into the
 * marks that make the thing read as lit rather than drawn.
 */
const blur = (grid, passes = 2) => {
  let current = grid;

  for (let pass = 0; pass < passes; pass += 1) {
    current = current.map((row, y) =>
      row.map((_, x) => {
        let total = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const cell = current[y + dy]?.[x + dx];
            if (cell === undefined) continue;
            total += cell;
            count += 1;
          }
        }
        return total / count;
      }),
    );
  }

  return current;
};

/** The mean coverage of the field under one output cell. */
const sample = (field, column, row) => {
  const height = field.length;
  const width = field[0].length;

  const x0 = Math.floor((column * width) / COLUMNS);
  const x1 = Math.max(x0 + 1, Math.floor(((column + 1) * width) / COLUMNS));
  const y0 = Math.floor((row * height) / ROWS);
  const y1 = Math.max(y0 + 1, Math.floor(((row + 1) * height) / ROWS));

  let total = 0;
  let count = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      total += field[y][x];
      count += 1;
    }
  }

  return total / count;
};

/** `KOLONIE`, as `ROWS` lines of `COLUMNS` characters, trailing space trimmed. */
export function renderWordmark() {
  const field = blur(upsample(source()));

  return Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLUMNS }, (_, column) => {
      const coverage = sample(field, column, row);
      // `coverage` is 0..1; the ramp is seven marks, so the last index is 6.
      const index = Math.min(RAMP.length - 1, Math.round(coverage * (RAMP.length - 1)));
      return RAMP[index];
    })
      .join("")
      .replace(/\s+$/, ""),
  ).join("\n");
}

const FILE = new URL("../src/lib/wordmark.ts", import.meta.url);

const contents = `/**
 * \`KOLONIE\` as a density ramp, for the landing page's hero
 * (kolonie-website#39).
 *
 * **Generated. Do not edit.** \`node scripts/build-ascii.mjs\` writes this file,
 * and \`wordmark.test.ts\` fails if what is here is not what the generator
 * produces — so the block cannot become an asset nobody is able to change.
 *
 * It is decoration and it is marked as such: the hero renders it inside an
 * \`aria-hidden\` \`<pre>\`, with the wordmark present as real text in the heading
 * beside it. A screen reader reading several hundred punctuation marks is the
 * accessibility failure this repository tests against everywhere else.
 */
export const WORDMARK = ${JSON.stringify(renderWordmark())};
`;

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync(FILE, contents);
  process.stdout.write(`${renderWordmark()}\n\nwrote src/lib/wordmark.ts\n`);
}
