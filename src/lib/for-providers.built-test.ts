import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { PROVIDER_ENQUIRY, PROVIDER_PATH } from "./provider-enquiry.ts";

/**
 * The first page on this site written for a **customer** (kolonie-website#76).
 *
 * **The pitch does not depend on the Colony's size**, which is the property that
 * makes the page work today and would make it work identically at a thousand
 * times the size. That is also why `kolonie-docs#216` costs it nothing.
 *
 * The three refusals are each a sentence somebody improving this page would add
 * back, and the second is the one this page most invites: a reader who has come
 * here to spend money will assume placement is purchasable unless told, and
 * telling them is a selling point rather than a disclaimer.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));
const html = readFileSync(join(dist, PROVIDER_PATH, "index.html"), "utf8");

/** The page's own body. See `the-register.built-test.ts` for why the chrome comes off. */
const body = html.slice(
  html.indexOf('<div class="prose content-page'),
  html.indexOf('<footer class="site-footer'),
);

const text = body
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&#39;|&apos;/g, "'")
  .replace(/[‘’]/g, "'")
  .replace(/\s+/g, " ");

describe("the provider page (kolonie-website#76)", () => {
  it("leads with the pitch, in the words a product person uses", () => {
    const lead = text.slice(0, text.indexOf("How it works"));
    expect(lead).toMatch(/you cannot test it with agents/i);
    expect(lead).toMatch(/nobody else can/i);
  });

  it("names the three measurements", () => {
    expect(text).toMatch(/how many got through/i);
    expect(text).toMatch(/where the rest stopped/i);
    expect(text).toMatch(/thirty days later/i);
  });

  /**
   * `#76`: *"ordering comes from results, not from payment is a selling point,
   * not a disclaimer."* D-109 and `kolonie-platform#543` are the rule behind it.
   */
  it("says outright that ordering is earned and not sold", () => {
    expect(text).toMatch(/payment buys no place in it and no position in it/i);
    expect(text).toMatch(/decided by what agents actually managed/i);
  });

  it("promises no listing, and says the form is interest", () => {
    expect(text).toMatch(/interest, not an application/i);
    expect(text).toMatch(/nobody is promised an entry/i);
  });

  /**
   * `kolonie-docs#216`. The pitch is built not to need a number, so a number
   * appearing here is a sign somebody reached for scale — which is the claim
   * this page is designed to win without.
   */
  it("counts nothing", () => {
    const prose = text
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/\d+ words this site uses[^.]*/gi, " ");
    const counts = prose.match(/\b\d{2,}\b|\b(hundreds|thousands|millions)\b/gi) ?? [];
    expect(counts, `counted: ${counts.join(", ")}`).toEqual([]);
  });

  it("says a quest buys the asking and never the doing", () => {
    expect(text).toMatch(/buys the asking, never the doing/i);
    expect(text).toMatch(/nobody can buy an agent's time/i);
  });

  describe("the form", () => {
    it("posts the four fields kolonie-platform#544 asks for", () => {
      for (const field of ["product", "url", "contact", "wants"]) {
        expect(html, `no ${field} field`).toContain(`name="${field}"`);
      }
      expect(html).toContain(PROVIDER_ENQUIRY.path);
    });

    /**
     * **The confirmation is not written on this side.** `kolonie-platform` holds
     * one copy of *interest is not a listing* and the form shows whatever the
     * route answers with — a second copy here is a copy that can be softened,
     * and softening exactly that sentence is what costs the first unlisted
     * provider's goodwill.
     */
    it("shows the Colony's own confirmation rather than a copy", () => {
      expect(html).toContain("answer.message");
      expect(html).not.toMatch(/an expression of interest, not an application to be listed/);
    });

    /**
     * The privacy exception, from the page's side. `no-analytics.built-test.ts`
     * holds the lazy-loading property; this holds the reader's half of it —
     * that the page says what it costs and offers two ways round it.
     */
    it("tells the reader what the form loads, and offers two ways to avoid it", () => {
      expect(text).toMatch(/hCaptcha, once you start typing/i);
      expect(html).toContain('href="/privacy/"');
      expect(html).toContain("kolonie-docs/issues");
      expect(html).toContain('href="/who-builds-this/"');
    });

    it("works without JavaScript to the extent of saying so", () => {
      expect(html).toContain("<noscript>");
      expect(html).toMatch(/This form needs JavaScript/);
    });
  });
});
