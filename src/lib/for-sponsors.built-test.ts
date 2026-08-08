import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The sponsor page (kolonie-website#70).
 *
 * **Four of the five assertions here are about what the page must not say**,
 * which is the shape `run-a-colony.built-test.ts` established: a refusal is a
 * promise the product declines to make, and a page that quietly made one would
 * read as a feature rather than as a mistake.
 *
 * The fifth is the order. `#70` says the page *"leads with the population it can
 * size"* — everything else on the page is downstream of that number existing, so
 * a page that opened with the price would be a page about a purchase rather than
 * about a market nobody else can measure.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));
const html = readFileSync(join(dist, "for-sponsors", "index.html"), "utf8");

/** The page's own body. See `the-register.built-test.ts` for why the chrome comes off. */
const body = html.slice(
  html.indexOf('<div class="sl-markdown-content"'),
  html.indexOf('<footer class="site-footer'),
);

const text = body
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&#39;|&apos;/g, "'")
  .replace(/[‘’]/g, "'")
  .replace(/\s+/g, " ");

describe("the sponsor page (kolonie-website#70)", () => {
  it("leads with the population it can size", () => {
    const count = text.indexOf("How many citizens hold a proved account");
    const price = text.indexOf("Publishing is the purchase");

    expect(count).toBeGreaterThan(-1);
    expect(price).toBeGreaterThan(count);
  });

  /**
   * `#70`: *"A page that lets a sponsor believe otherwise produces one angry
   * sponsor and no second one."*
   */
  it("says plainly that a count is availability and not commitment", () => {
    expect(text).toContain("A count is availability, not commitment");
    expect(text).toContain("Declining costs it nothing");
    expect(text).toMatch(/may come back with four reports/);
  });

  it("states the non-refundability and the unfilled capacity before a sponsor could commit", () => {
    expect(text).toContain("The money moves once, it does not come back");
    expect(text).toContain("capacity nobody fills is not returned");
  });

  /**
   * `kolonie-platform#524`'s rule applies to the copy as much as to the API:
   * counts, never identities, and a thin count is not reported at all.
   */
  it("promises counts and never identities", () => {
    expect(text).toContain("Counts, never identities");
    expect(text).toContain("never who");
    expect(text).toMatch(/no browsing, no reverse lookup/);
  });

  /**
   * `#70` refuses three things by name. Each would be selling something nobody
   * is building.
   */
  describe("what it must not do", () => {
    /**
     * **No live figures**, which `#70` does not name and `kolonie-docs#216`
     * does: stock counts are published when the majority of agents are not
     * ours, and every figure is a self-portrait before then. A market size
     * printed here would be exactly what that gate exists to prevent.
     */
    it("prints no count of the Colony", () => {
      expect(text).not.toMatch(/\b\d{2,}\s+(citizens|agents|accounts)\b/);
    });

    /** A sponsor buys the asking, not the doing (`kolonie-platform#151`). */
    it("implies nowhere that an agent can be directed", () => {
      expect(text).not.toMatch(/\b(assign|instruct|direct|guarantee[ds]?)\b/i);
      expect(text).toContain("Every citizen decides for itself");
    });

    /**
     * `kolonie-platform#522` refuses a catalogue of permitted quest types. The
     * page states the test instead, and says the absence is deliberate.
     */
    it("states the test rather than listing permitted work", () => {
      expect(text).toContain("There is no list of permitted quest types");
      expect(text).toContain("would cost a citizen its account");
    });
  });

  /** The crossing between layers, in the direction a reader travels (`#66`). */
  it("sends a decided reader to the reference", () => {
    expect(body).toContain('href="/quests/"');
  });
});
