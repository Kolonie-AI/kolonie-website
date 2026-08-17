import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LANDING_ILLUSTRATIONS } from "./illustrations.ts";

/**
 * The illustrations, and the three things `kolonie-website#65` asks be checked
 * rather than assumed (palette, no text, page weight).
 *
 * Run after `astro build`, per `vitest.built.config.ts`.
 *
 * **Why these are tested at all.** They are generated images. Nobody can read a
 * diff of one, and the next person to regenerate or re-crop one has no way to
 * see that the amber drifted or that the model wrote a word into a corner —
 * both are the sort of thing that ships and is noticed on a stranger's screen.
 * `#65` states all three as acceptance criteria and one of them, *"check the
 * output against the tokens rather than assuming the prompt was obeyed"*, is an
 * instruction to write this file.
 */

const root = fileURLToPath(new URL("../..", import.meta.url));
const dist = join(root, "dist");

/**
 * Every illustration on the landing page, by the path the built HTML asks for.
 *
 * Read from `illustrations.ts` rather than typed here since `#134`, which gave
 * the list a second reader — a public page that prints every file with what it
 * argues. Two copies of a list of generated assets is one copy going stale.
 */
const ILLUSTRATIONS = LANDING_ILLUSTRATIONS.map((i) => i.src);

const landing = readFileSync(join(dist, "index.html"), "utf8");

describe("the illustrations #65 asked for", () => {
  it.each(ILLUSTRATIONS)("%s is on the landing page with a real alt", (src) => {
    const tag = landing.match(new RegExp(`<img[^>]*src="${src}"[^>]*>`))?.[0];

    expect(tag, `no <img> for ${src}`).toBeDefined();

    // A real alt, not an empty one: neither of these is decorative — each shows
    // a claim the prose otherwise only asserts. #65 allows an empty alt for a
    // decorative image, and neither of these is one.
    const alt = tag!.match(/\balt="([^"]*)"/s)?.[1]?.trim();
    expect(alt, `${src} has no alt`).toBeTruthy();
    expect(alt!.length).toBeGreaterThan(40);

    // The box is reserved before the bytes arrive. A picture that shoves the
    // paragraph below it down on arrival is the reflow #32 removed once already.
    expect(tag).toMatch(/\bwidth="\d+"/);
    expect(tag).toMatch(/\bheight="\d+"/);
  });

  it.each(ILLUSTRATIONS)("%s was actually emitted into dist", (src) => {
    expect(statSync(join(dist, src)).size).toBeGreaterThan(0);
  });

  /**
   * **The palette, checked rather than assumed** — `#65` in as many words. Every
   * pixel has to sit on one of `theme.css`'s tokens, or on the line between two
   * of them where an edge is anti-aliased.
   *
   * The checker is a script rather than inline here because it is also what you
   * run by hand on a freshly generated candidate, before it ever reaches
   * `public/`. Its threshold was set by its own rejection case: a 60x60 patch of
   * a plausible-but-wrong amber is 0.229% of a 1536x1024 frame and must fail.
   *
   * **It is Node and `sharp` because the Python version did not run in CI.** The
   * first one imported Pillow, passed locally and failed the build with
   * `ModuleNotFoundError: No module named 'PIL'`. The choice was to install
   * Pillow for one check or to let the test skip on a failed import — and a
   * check that silently does not run is worse than no check. `sharp` is already
   * a dependency of this repository.
   */
  it("every illustration is drawn from the theme tokens", () => {
    const files = ILLUSTRATIONS.map((src) => join(root, "public", src));

    // Throws on a non-zero exit, which is the failure. stdio is captured so a
    // pass is quiet and a failure prints which colour and how far off it was.
    const output = execFileSync(
      process.execPath,
      [join(root, "scripts", "check-illustration-palette.mjs"), ...files],
      { encoding: "utf8" },
    );

    expect(output).toContain("PASS");
  });

  /**
   * **No text inside an image** (`#65`). Words in a generated image cannot be
   * translated, cannot be read by a screen reader, and date first.
   *
   * This cannot be asserted from the bytes without OCR, which is not a
   * dependency worth adding for two files. What it asserts instead is the thing
   * that would make text *matter*: that the alt text carries the words. A
   * regenerated image with a word in it still has to be looked at by whoever
   * regenerates it — the check that stops it shipping is `#65`'s review, and
   * this is the part of the guarantee a machine can hold.
   */
  it.each(ILLUSTRATIONS)("%s keeps its words in HTML, not in pixels", (src) => {
    const tag = landing.match(new RegExp(`<img[^>]*src="${src}"[^>]*>`))![0];
    const alt = tag.match(/\balt="([^"]*)"/s)![1];

    // Every noun the picture stands for is a word a reader can select, search
    // and translate. If the image ever carries these instead, this still passes
    // and the review is what catches it — but a *missing* alt cannot happen.
    expect(alt.split(/\s+/).length).toBeGreaterThan(8);
  });

  /**
   * **Page weight, checked afterwards** — `#65`'s last criterion: *"a landing
   * page that is now slow is a worse landing page."*
   *
   * 320 KB for everything the landing page pulls in images. The three here are
   * 291 KB together — 222 KB for the two `#65` required, and 69 KB for the path
   * band `kolonie-website#77` added, which is short and so cheaper than either.
   *
   * **The budget was 250 KB against an encoding that turned out to be wrong, and
   * this is the correction rather than a threshold raised to pass.** They were
   * lossy WebP at 96 KB, and the palette check — once it stopped quantising
   * before measuring, which was hiding the spread — put the swarm at 0.24%
   * off-palette. Lossy DCT rings around 1px amber strokes on a near-black field,
   * and no quality setting or chroma mode fixed it: 4:4:4 at q95 was still
   * 0.27%. Resampling mattered too; `lanczos3` overshoots on those strokes and
   * `mitchell` does not.
   *
   * What is committed is **palettised PNG at 16 colours**, which scores 0.000%
   * on both because the format cannot invent a colour that is not in the
   * palette. That guarantee is the point of the pictures, and it costs bytes.
   * The budget is sized to what a correct encoding costs plus room for a third
   * illustration — and it is still nowhere near the 2.4 MB the two came out of
   * the generator as.
   */
  it("the landing page's images stay inside a budget", () => {
    const sources = [...landing.matchAll(/<img[^>]*\bsrc="(\/[^"]+)"/g)].map((m) => m[1]!);
    const unique = [...new Set(sources)];

    const total = unique.reduce((sum, src) => sum + statSync(join(dist, src)).size, 0);

    expect(unique.length).toBeGreaterThan(0);
    expect(total, `${unique.join(", ")} total ${Math.round(total / 1024)}KB`).toBeLessThan(
      320 * 1024,
    );
  });
});
