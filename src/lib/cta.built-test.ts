import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SEND, SIGN_IN } from "./site-footer.ts";

/**
 * **The invitation is repeated, and its label is for a new visitor**
 * (kolonie-website#87).
 *
 * The landing page is about 11,000 pixels tall and every call to action was at
 * the top of it. *"A reader convinced by an argument two-thirds of the way down
 * has to scroll back to act on it."*
 *
 * **Both halves of this are invisible to a reviewer.** A page missing its
 * repeats looks complete — every section still reads correctly, and nothing is
 * broken; you only notice by scrolling 11,000 pixels and asking what you would
 * do if you agreed. And a label aimed at the wrong reader looks like a label.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));
const landing = readFileSync(join(dist, "index.html"), "utf8");

/**
 * Text as a reader sees it — with the scripts and stylesheets taken out first,
 * because a reader does not see those and this is used to measure how far down
 * the page something is.
 */
const text = (html: string) =>
  html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replace(/\s+/g, " ");

/**
 * Where each repeat sits in the document, as a fraction of it.
 *
 * **Position rather than section membership, and that is deliberate.** Pairing
 * `<section>` tags with a regex gets the wrong answer here: this page nests
 * them — `Join.astro` and `Swarm.astro` each render one inside the page's own —
 * and a non-greedy match closes an outer section on an inner tag. A test that
 * counted sections would report seven of nine and be wrong about both numbers.
 *
 * What `#87` is actually about is a reader being able to act *where they are*,
 * anywhere down 11,000 pixels. That is a question about spread, and spread is
 * what this measures.
 *
 * **Measured against the visible text rather than the bytes**, because bytes are
 * not page position: the install panel is seven tabs of markup and a handful of
 * words, and by byte the first repeat lands at 0.44 of a page it reaches at 0.28
 * of. Stripped text is the closest thing to height a test can hold.
 */
const repeats = [...landing.matchAll(/class="cta[^_]/g)].map(
  (match) => text(landing.slice(0, match.index)).length / text(landing).length,
);

describe("the invitation is repeated (kolonie-website#87)", () => {
  /**
   * `#87`: *"After every section that makes a case, one line and one button."*
   *
   * Not every section makes a case — the hero carries its own actions, the
   * closing block *is* the action, and the path section is mechanism. What is
   * asserted is that the repeats are many, which is the property that fails
   * when somebody removes them one at a time.
   */
  it("is many, not one", () => {
    expect(repeats.length).toBeGreaterThanOrEqual(8);
  });

  /**
   * **The whole complaint was that the invitation lived at the top.** Repeats
   * clustered in the first third would satisfy a count and none of the issue.
   */
  it("is spread down the page rather than clustered at the top", () => {
    expect(repeats.at(0)).toBeLessThan(0.35);
    expect(repeats.at(-1)).toBeGreaterThan(0.75);

    // And no stretch of the page is left without one. The largest gap between
    // consecutive repeats is what a reader convinced in the middle would have
    // to scroll through to find an action.
    const gaps = repeats.slice(1).map((at, index) => at - repeats[index]!);
    expect(Math.max(...gaps)).toBeLessThan(0.25);
  });

  /**
   * **`#87`: *"Not a banner, not a repeated hero — a single sentence that names
   * what the reader has just been persuaded of."***
   *
   * The same sentence eight times *is* the repeated hero the issue refuses, and
   * it is the shape this would drift into: a component with a default sentence,
   * and callers that stop passing one.
   */
  it("names something different each time", () => {
    const lines = [...landing.matchAll(/<span class="cta__line[^"]*">([\s\S]*?)<\/span>/g)]
      .map((match) => text(match[1] ?? "").trim());

    expect(lines.length).toBeGreaterThanOrEqual(8);
    expect(new Set(lines).size).toBe(lines.length);
    for (const line of lines) expect(line.length).toBeGreaterThan(20);
  });

  /**
   * One button each, and it points down the page rather than back to the top —
   * which would be this issue's own complaint in the other direction.
   */
  it("offers one button, at the block that carries both ways to act", () => {
    const blocks = [...landing.matchAll(/<p class="cta[^"]*">([\s\S]*?)<\/p>/g)]
      .map((match) => match[1] ?? "");

    expect(blocks.length).toBeGreaterThanOrEqual(8);
    for (const block of blocks) {
      expect(block.match(/class="btn/g) ?? []).toHaveLength(1);
      expect(block).toContain('href="#send-your-agent"');
    }

    // And the destination is on the page. A repeated call to action pointing at
    // nothing is worse than the single one it replaced.
    expect(landing).toContain('id="send-your-agent"');
  });
});

describe("the label is for a new visitor (kolonie-website#87)", () => {
  /**
   * `#87`: *"`Sign in` assumes the reader already has an account. The primary
   * action should describe what a **new** visitor is about to do."*
   */
  it("makes the primary action the new visitor's", () => {
    expect(SEND.label).not.toMatch(/sign in/i);
    expect(text(landing)).toContain(SEND.label);
  });

  /**
   * `#87`: *"Underneath it, small: **Already have an account? Sign in.** That is
   * the whole solution and it serves both readers."*
   *
   * Underneath the **primary** action, which is the hero's — and once. Under
   * all nine repeats it would be the banner the issue refuses.
   */
  it("puts the quiet sign-in beneath the primary action", () => {
    const hero = landing.slice(
      landing.indexOf('<section class="hero'),
      landing.indexOf('<section id="you-run-a-swarm'),
    );

    expect(text(hero)).toContain("Already have an account?");
    expect(hero).toContain(`href="${SIGN_IN.href}"`);

    // Beneath, not above: a returning visitor is looking for it and a new one
    // must not meet it before the thing they came to do.
    expect(hero.indexOf("Already have an account?")).toBeGreaterThan(
      hero.indexOf(">Send your agent<"),
    );

    // Once on the page. The repeats are a sentence and a button each.
    expect(text(landing).match(/Already have an account\?/g)).toHaveLength(1);
  });

  /**
   * **Explicitly refused on 2026-08-07, and the refusal is the assertion**
   * (`#87`).
   *
   * A cookie so the button could say `Sign in` to somebody who had been here
   * before was considered and rejected: it is a tracking cookie by function,
   * `governance/privacy.md` makes cookies on this site an expensive decision,
   * and it buys exactly one saved click. *"Do not reintroduce it without a
   * reason that is not this one."*
   *
   * A refusal recorded only in a closed issue is one the next contributor has
   * not read, and this is the exact feature that gets added back as an
   * improvement.
   */
  it("decides no label from a cookie, from storage, or from a user agent", () => {
    const scripts = [...landing.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
      .map((match) => match[1] ?? "")
      .join("\n");

    expect(scripts).not.toMatch(/document\.cookie|localStorage|sessionStorage/);
    expect(scripts).not.toMatch(/navigator\.userAgent/);
    // And nothing rewrites the action after the page is served.
    expect(scripts).not.toMatch(/Sign in|Send your agent/);
  });
});
