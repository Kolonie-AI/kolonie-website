import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROOF_SURFACES } from "./proof-strip.ts";
import { SERVED_BY_THE_API } from "./site-footer.ts";

/**
 * The row that says *do not take our word for it* (kolonie-website#126).
 *
 * `#126` is a measurement of where the evidence was: the Atlas, the Academy,
 * the register and the source were all linked from the footer and from nowhere
 * a reader meets before deciding. Four properties of the built page are what
 * that is worth, and each one can be taken away by an edit that looks tidy.
 *
 * **Four items and one link each.** A fifth entry is a fifth claim about what
 * can be checked, and a second link inside an item turns a strip into a
 * navigation block — which this page has, in the footer, already.
 *
 * **GitHub is worded.** `#126` asks for the organisation *"linked once
 * prominently (not only icon if icon is easy to miss on mobile — verify)"*.
 * Verified in `SiteHeader.astro` on 2026-08-17: the header's entry is an icon
 * with only screen-reader text, inside the panel behind the burger — on a phone
 * it is not merely easy to miss, it is behind a closed menu. So the strip's
 * link carries the word, and this asserts the word rather than the icon.
 *
 * **It paints with the human's half.** `#117` places the strip fourth, directly
 * after what a human can and cannot do. The section sits there in the document
 * too, so the assertion is relational: ahead of everything unordered, and never
 * before the block it follows.
 *
 * **No numbers in it.** `#54` allows the catalogue to be counted and puts every
 * figure this site shows in `Stats.astro`, read from the Colony at page load. A
 * typed count here would be a second copy of a live number, on the one row
 * whose entire argument is that its claims can be checked.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));
const landing = readFileSync(join(dist, "index.html"), "utf8");

/** Every rule the landing page applies, with Astro's scoping hash taken out. */
const styles = [
  ...[...landing.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)]
    .map((tag) => tag[0].match(/href="([^"]+)"/)?.[1])
    .filter((href): href is string => href !== undefined && href.startsWith("/"))
    .map((href) => readFileSync(join(dist, href.slice(1)), "utf8")),
  ...[...landing.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]),
]
  .join("\n")
  .replaceAll(/:where\(\.astro-[a-z0-9]+\)/g, "");

/**
 * The section itself, from its opening tag to the next section's.
 *
 * Found by regex rather than by an exact tag, because Astro appends its scoping
 * class to `class` and the attribute order is the component's — pinning either
 * would make this test fail on a rename that changed nothing it is about.
 */
const strip = (() => {
  const start = landing.search(/<section[^>]*\bclass="[^"]*\bproof-strip\b/);
  if (start === -1) throw new Error("the proof strip is not on the built page");

  const rest = landing.slice(start);
  const end = rest.indexOf("<section", 1);

  return end === -1 ? rest : rest.slice(0, end);
})();

/**
 * The flex `order` a `.page` child is given, or `NaN` if it is given none.
 *
 * Both sides of the selector allow a comma list, and the trailing one is what
 * this strip needs: it shares its `order` with `.human-account`, so lightningcss
 * merges the two rules into one prelude and neither selector is followed by `{`
 * any more. `container.built-test.ts` carries the same reading, and the fuller
 * account of why.
 */
const orderOf = (selector: string): number => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = styles.match(
    new RegExp(`(?:^|[,}\\n])\\s*${escaped}(?:,[^{}]*)?\\{([^}]*)\\}`),
  )?.[1];

  return Number(rule?.match(/order:(-?\d+)/)?.[1] ?? Number.NaN);
};

describe("the proof strip (kolonie-website#126)", () => {
  it("is four surfaces, one link each", () => {
    expect(PROOF_SURFACES).toHaveLength(4);
    expect([...strip.matchAll(/<a\s/g)]).toHaveLength(4);
  });

  it("sends each one where the module says", () => {
    for (const { label, href, why } of PROOF_SURFACES) {
      expect(strip, `${label} is not linked`).toContain(`href="${href}"`);
      expect(strip, `${label} has no line saying what is there`).toContain(why);
    }
  });

  /**
   * The destinations exist, which on this row is not a general tidiness check:
   * every other block on the page argues, and this one asks to be checked. A
   * dead link here fails the only thing it is doing.
   *
   * `/atlas` is exempt because it is not built here — `kolonie-platform#546`
   * serves it, which is the same exemption `site-footer.ts` states and the
   * reason that list is exported rather than being a comment.
   */
  it("points at pages that exist", () => {
    for (const { label, href } of PROOF_SURFACES) {
      if (!href.startsWith("/") || SERVED_BY_THE_API.includes(href)) continue;

      expect(existsSync(join(dist, href, "index.html")), `${label}: ${href} was not built`).toBe(
        true,
      );
    }
  });

  it("gives the organisation a word and not only an icon", () => {
    // The header's entry is an icon inside the burger panel, with its label in
    // `sr-only` text. On a phone that is behind a closed menu, which is what
    // `#126` asks to be verified before this link is justified.
    expect(strip).toContain("https://github.com/Kolonie-AI");
    expect(strip).toContain(">GitHub<");
    expect(strip, "the strip's own GitHub link is hidden text too").not.toContain("sr-only");
  });

  it("paints with the human's half, ahead of everything unordered", () => {
    expect(orderOf(".page>.proof-strip"), "the strip is not ordered at all").not.toBeNaN();
    expect(orderOf(".page>.proof-strip")).toBeLessThan(0);
    // Never above the section it belongs under. Equal is the arrangement that
    // ships — same `order`, and the document order decides between them.
    expect(orderOf(".page>.human-account")).toBeLessThanOrEqual(orderOf(".page>.proof-strip"));
  });

  it("goes back to document order for the agent's view", () => {
    expect(
      styles.match(/#agent:target~\*[^{]*>\.proof-strip[^{]*\{order:0\}/),
      "the strip is moved for the human and never moved back",
    ).not.toBeNull();
  });

  it("carries no number", () => {
    const prose = strip.replace(/<[^>]+>/g, " ");

    expect(/\d/.test(prose), "a figure appeared in the strip — `#54` puts those in Stats").toBe(
      false,
    );
  });
});
