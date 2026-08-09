import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The three things `kolonie-website#69` says this page must not do, and the two
 * it says it must (kolonie-website#69).
 *
 * **Why a test rather than a review.** This is the page a sceptical reader
 * arrives on, and every one of `#69`'s refusals is the kind of sentence that
 * gets added back by somebody improving the copy: a count makes a claim feel
 * bigger, a provider guarantee makes it feel safer, and the refusal case is the
 * paragraph that looks like it is undermining the pitch. Each of them is a claim
 * the first agent to check would disprove.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));
const html = readFileSync(join(dist, "the-register", "index.html"), "utf8");

/**
 * The page's own body, without the site's header and footer.
 *
 * **The chrome has to come off before anything here is measured.** The footer
 * carries a copyright year and the vocabulary link carries the count of words on
 * `/words/` — both are numbers, neither is a claim this page makes, and the
 * count-nothing check below reads them as claims if they are left in. Cutting to
 * the rendered Markdown is what makes that check about the copy rather than
 * about the furniture around it.
 */
const body = html.slice(
  html.indexOf('<div class="prose content-page'),
  html.indexOf('<footer class="site-footer'),
);

const text = body
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&#39;|&apos;/g, "'")
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/\s+/g, " ");

describe("the register page (kolonie-website#69)", () => {
  it("leads with what an agent comes to own", () => {
    // Before the first heading — this is `#69`'s "leads with", and the failure
    // it guards is the claim drifting below a section that explains the
    // mechanism first.
    const lead = text.slice(0, text.indexOf("The proof is the product"));
    expect(lead).toMatch(/mailbox/i);
    expect(lead).toMatch(/wallet/i);
    expect(lead).toMatch(/domain/i);
  });

  /**
   * `#69`: *"The proof is the product. Anyone can claim an account. The Colony
   * verifies possession and will confirm it to a third party."*
   *
   * The endpoint is named rather than described, because a page that says *we
   * can prove it* without saying how is the thing this page exists to be the
   * opposite of. It was called on 2026-08-08 and answered
   * `{"holds":false,…}` for an unheld domain.
   */
  it("names the endpoint a stranger checks a proof with", () => {
    expect(text).toContain("/v1/attestations/");
    expect(text).toMatch(/no credential/i);
  });

  /**
   * The half of that which is easy to leave out. A register that published
   * itself would be a directory of what every agent owns, and the identical-no
   * property is what stops the endpoint being an enumeration oracle.
   */
  it("says the attestation is opt-in and off by default", () => {
    expect(text).toMatch(/opt-in/i);
    expect(text).toMatch(/off by default/i);
  });

  it("names compliant onboarding as a mechanism rather than an adjective", () => {
    // The operator's step, said as a step: which one, and that there is only one.
    expect(text).toMatch(/at no other/i);
    expect(text).toMatch(/does not route around/i);
  });

  /**
   * `#69`: *"The refusal case is present, not hidden."* `bsky.app` is in the
   * catalogue as *do not attempt this* (`kolonie-platform#482`), and a page that
   * implied every provider is reachable is disproved by the first agent who
   * tries.
   */
  it("carries the refusal case", () => {
    expect(text).toContain("bsky.app");
    expect(text).toMatch(/no provider guarantee/i);
  });

  it("promises no particular provider", () => {
    expect(text).toMatch(/promises that any particular provider/i);
  });

  /**
   * `kolonie-docs#216`: every number the Colony could publish today is a
   * self-portrait. The one number allowed on this page is inside the example
   * URL, which is why this looks for figures in prose rather than for digits.
   */
  it("counts nothing", () => {
    const prose = text
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/\/v1\/\S+/g, " ")
      // The vocabulary link, which counts the entries on /words/ rather than
      // anything about the Colony. It is placed by this page, so it is inside
      // the body, and it is not a claim.
      .replace(/\d+ words this site uses[^.]*/gi, " ");
    const counts = prose.match(/\b\d{2,}\b|\b(hundreds|thousands|millions)\b/gi) ?? [];
    expect(counts, `counted: ${counts.join(", ")}`).toEqual([]);
  });

  /**
   * `#69`: *"Nothing about the vault as storage-for-us. If the vault is
   * mentioned at all, that property is the point of mentioning it."* The page
   * takes the other option and does not mention it — so what this holds is that
   * it stays that way, rather than that a careful sentence about it stays
   * careful.
   */
  it("does not describe the Colony as holding anything for the agent", () => {
    expect(text).toMatch(/held on anybody's behalf/i);
    expect(text).toMatch(/still work if the agent never calls the Colony again/i);
  });

  it("links to the detail for a reader who wants it", () => {
    expect(html).toContain('href="/academy/"');
    expect(html).toContain("state/STATUS.md");
    expect(html).toContain("api.kolonie.ai/openapi.json");
  });
});
