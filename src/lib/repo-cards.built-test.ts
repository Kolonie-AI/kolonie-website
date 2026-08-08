import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

/**
 * One social-preview card per repository (kolonie-website#90).
 *
 * **Why these are tested at all.** They are images nobody looks at twice: each
 * is uploaded by hand into a repository's settings page and then sits there for
 * a year, on a surface the Colony never renders. A card that came out 1200×630,
 * or that lost its lockup, or that was simply never generated for a repository
 * added last month, looks like nothing at all from inside this repository — the
 * build is green and the site is unchanged. It shows up as a grey generated card
 * under somebody else's link.
 *
 * `#90` asks for exactly this: *"A test asserts the fourteen exist, their
 * dimensions and their weight, and fails when the repository list and the card
 * list disagree."*
 *
 * **The rejection case is the last clause**, and it is the one that matters:
 * the other three fail when something is wrong with a card that exists, and that
 * one fails when a card does not.
 */

const root = fileURLToPath(new URL("../..", import.meta.url));
const cards = join(root, "public", "repo-cards");
const drawings = join(root, "assets", "repo-card-drawings");

/**
 * The briefs, from the generator rather than from a copy.
 *
 * `execFileSync` and not an import, which is the shape `illustrations.built-test.ts`
 * already uses for `check-illustration-palette.mjs`: a `.ts` test importing a
 * `.mjs` script needs type plumbing that buys nothing, and a second copy of the
 * list in `src/` is the duplication this test exists to prevent one instance of.
 */
const briefs = JSON.parse(
  execFileSync("node", [join(root, "scripts", "build-repo-cards.mjs"), "--briefs"], {
    encoding: "utf8",
  }),
) as {
  cards: Record<
    string,
    {
      drawing: string | null;
      neutral: boolean;
      runtime: string | null;
      fellBack: string | null;
    }
  >;
};

const expected = Object.keys(briefs.cards);

/** Every card actually on disk, found rather than listed. */
const present = existsSync(cards)
  ? readdirSync(cards)
      .filter((file) => file.endsWith(".png"))
      .map((file) => file.slice(0, -".png".length))
  : [];

describe("there is a card for every repository (kolonie-website#90)", () => {
  it("found the cards at all", () => {
    // Without this every `it.each` below would pass on an empty list.
    expect(present.length).toBeGreaterThan(10);
  });

  /**
   * **The clause `#90` calls for by name.** A repository added tomorrow is a
   * missing card *the build names*, rather than a card nobody notices is absent.
   *
   * This compares the cards against the briefs, which is what can be checked
   * with no network. The other half — whether the briefs still match the
   * organisation — is `node scripts/build-repo-cards.mjs --list`, which needs a
   * token and so cannot be a test. It prints one line per disagreement in either
   * direction and exits non-zero.
   */
  it("has exactly the cards the briefs name, and no others", () => {
    expect([...present].sort()).toEqual([...expected].sort());
  });

  it.each(expected)("%s exists", (repository) => {
    expect(existsSync(join(cards, `${repository}.png`))).toBe(true);
  });

  /**
   * **1280×640, GitHub's own recommended size for this surface** — not
   * `og.png`'s 1200×630, which is the Open Graph ratio and belongs to a
   * different job. And under 1 MB, which GitHub enforces.
   */
  it.each(expected)("%s is 1280×640 and well under a megabyte", async (repository) => {
    const file = join(cards, `${repository}.png`);
    const meta = await sharp(file).metadata();

    expect(meta.width).toBe(1280);
    expect(meta.height).toBe(640);
    expect(statSync(file).size).toBeLessThan(1024 * 1024);
    expect(statSync(file).size).toBeGreaterThan(0);
  });

  /**
   * `#90`: *"Each Colony-drawn illustration passes
   * `scripts/check-illustration-palette.mjs`."*
   *
   * **On the drawings and not on the cards, and that is the whole split.** The
   * drawing is what the model made and what the palette rule is about; the card
   * is the drawing plus real type plus the mark, composited here. Running the
   * check over a finished card would measure the compositor.
   */
  it("every drawing sits on the theme's own palette", () => {
    const files = readdirSync(drawings)
      .filter((file) => file.endsWith(".png"))
      .map((file) => join(drawings, file));

    expect(files.length).toBeGreaterThan(0);

    // Throws on a non-zero exit, which is what the checker does when a drawing
    // is off-palette. The output is the failure message.
    execFileSync(
      "node",
      [join(root, "scripts", "check-illustration-palette.mjs"), ...files],
      { encoding: "utf8" },
    );
  });

  it("uses a drawing for every card but the neutral one", () => {
    for (const [repository, card] of Object.entries(briefs.cards)) {
      if (card.neutral) {
        expect(card.drawing, `${repository} is neutral and names a drawing`).toBeNull();
        continue;
      }
      expect(card.drawing, `${repository} names no drawing`).not.toBeNull();
      expect(existsSync(join(drawings, `${card.drawing}.png`))).toBe(true);
    }
  });

  /**
   * `#90`: *"The six runtime cards are the same drawing with a different mark
   * inside."* One drawing, six cards, six different names in it.
   */
  it("gives the six runtimes one drawing and six names", () => {
    const runtimes = Object.entries(briefs.cards).filter(([, card]) => card.runtime !== null);

    expect(runtimes).toHaveLength(6);
    expect(new Set(runtimes.map(([, card]) => card.drawing)).size).toBe(1);
    expect(new Set(runtimes.map(([, card]) => card.runtime)).size).toBe(6);
  });

  /**
   * `#90`: *"any that fell back to type say so in the issue or in a comment
   * beside the list."*
   *
   * All six did, and the reason each gave is beside its name in
   * `repo-card-briefs.mjs`. This asserts the record exists rather than its
   * contents — a runtime that later gains a usable mark should fail here and be
   * removed from the list deliberately, not silently keep a stale sentence.
   */
  it("records a reason for every runtime that fell back", () => {
    for (const [repository, card] of Object.entries(briefs.cards)) {
      if (card.runtime === null) continue;
      expect(card.fellBack, `${repository} fell back with no reason recorded`).toBeTruthy();
      expect(card.fellBack!.length).toBeGreaterThan(20);
    }
  });

  /**
   * `#90`: *"The total added to `public/` does not reach the landing page's
   * image budget — these are never served to a visitor, and no page references
   * them."*
   *
   * The second half is the one that could go wrong quietly: an `<img>` pointing
   * at a card would put a 1280×640 image on a page for no reason, and the
   * budget in `illustrations.built-test.ts` only counts what the landing page
   * references.
   */
  it("is referenced by no page, and costs less than the landing page's images", () => {
    const dist = join(root, "dist");
    const pages = readdirSync(dist, { recursive: true, encoding: "utf8" }).filter((file) =>
      file.endsWith(".html"),
    );

    for (const page of pages) {
      expect(
        readFileSync(join(dist, page), "utf8"),
        `${page} references a repository card`,
      ).not.toContain("/repo-cards/");
    }

    const total = present.reduce(
      (sum, name) => sum + statSync(join(cards, `${name}.png`)).size,
      0,
    );
    expect(total, `${Math.round(total / 1024)}KB of cards`).toBeLessThan(320 * 1024);
  });
});
