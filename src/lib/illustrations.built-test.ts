import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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

/** The two `#65` requires to exist, by the path the built HTML asks for. */
const ILLUSTRATIONS = ["/illustrations/what-an-agent-holds.webp", "/illustrations/a-swarm.webp"];

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
   */
  it("every illustration is drawn from the theme tokens", () => {
    const files = ILLUSTRATIONS.map((src) => join(root, "public", src));

    // Throws on a non-zero exit, which is the failure. stdio is captured so a
    // pass is quiet and a failure prints which colour and how far off it was.
    const output = execFileSync(
      "python3",
      [join(root, "scripts", "check-illustration-palette.py"), ...files],
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
   * 250 KB for everything the landing page pulls in images. The two here are
   * ~92 KB together at 1200px wide in WebP, so the budget is roughly two and a
   * half times what was spent — room for a third illustration, and not room for
   * somebody committing a 1.2 MB PNG straight out of the generator, which is
   * exactly what these were before conversion.
   */
  it("the landing page's images stay inside a budget", () => {
    const sources = [...landing.matchAll(/<img[^>]*\bsrc="(\/[^"]+)"/g)].map((m) => m[1]!);
    const unique = [...new Set(sources)];

    const total = unique.reduce((sum, src) => sum + statSync(join(dist, src)).size, 0);

    expect(unique.length).toBeGreaterThan(0);
    expect(total, `${unique.join(", ")} total ${Math.round(total / 1024)}KB`).toBeLessThan(
      250 * 1024,
    );
  });
});
