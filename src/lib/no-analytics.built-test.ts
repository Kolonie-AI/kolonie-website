import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { PROVIDER_ENQUIRY, PROVIDER_PATH } from "./provider-enquiry.ts";

/**
 * Run **after** `astro build`, which is why this file is not named `*.test.ts`
 * — the ordinary suite runs before the build and would read whatever `dist/`
 * happened to be lying around, which is a test that passes on a stale answer.
 *
 * **This file is the inverse of `analytics.built-test.ts`, which it replaces**
 * (`kolonie-website#58`). That one asserted the PageSense tag reached every
 * built page, so a page added later could not silently miss it. This one
 * asserts no page loads a third-party script at all, so a tag added later
 * cannot silently arrive.
 *
 * Keeping the shape and inverting the claim is deliberate. The site's own rule
 * is that every claim on it must be true *today*, and `governance/privacy.md`
 * §3 now says this site sets no cookie and stores nothing — a sentence which is
 * checkable only if something checks it.
 *
 * **This is the fourth turn of the same question in two days.** PageSense was
 * added on 2026-08-05, replaced by self-hosted Umami on 2026-08-06 when `#43`
 * found no legal basis, reversed the same day on the maintainer's instruction,
 * and removed with nothing in its place by `#58`. A cookieless self-hosted
 * replacement is not an untried idea here: it existed, ran, and was removed.
 *
 * ## The one exception, and why it is named here rather than tolerated
 *
 * `kolonie-website#76` puts a provider form on `/for-providers/`, and its spam
 * defence is hCaptcha — a third-party script. The maintainer decided on
 * 2026-08-08 that it goes on the site and the policy gains the exception.
 *
 * **The exception would otherwise be invisible to this file**, which is the part
 * worth stating. hCaptcha is fetched by `ProviderEnquiry.astro` at the reader's
 * first keystroke, so it never appears as a `<script src>` in any built page and
 * every assertion above would keep passing over a site that now loads it. A
 * check that silently stops covering the thing it was written for is worse than
 * no check, so the exception is asserted rather than accommodated: the group
 * below fails if the URL appears on any page but that one, and fails if it stops
 * being lazy on that one.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));

const pagesUnder = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return pagesUnder(path);
    return entry.endsWith(".html") ? [path] : [];
  });

/**
 * Every `src` on a `<script>` in the document.
 *
 * **The test is about what the page loads, not about what it says.** An earlier
 * version of this file searched the whole HTML for vendor names and failed on
 * `/privacy`, which describes the tracker that used to run and when it stopped
 * — prose the policy needs in order to be honest about its own history. A
 * privacy policy naming a vendor is the opposite of a tracking problem, and a
 * test that cannot tell those apart is one somebody eventually loosens.
 */
const scriptSources = (html: string): string[] =>
  [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)].map(
    (match) => match[1] ?? "",
  );

/** Hosts a page may legitimately fetch a script from: none but our own. */
const isThirdParty = (src: string): boolean =>
  /^(https?:)?\/\//i.test(src) && !/^(https?:)?\/\/(kolonie\.ai|www\.kolonie\.ai)\//i.test(src);

describe("the built site carries no third-party analytics", () => {
  const pages = pagesUnder(dist);

  it("built some pages at all", () => {
    // Astro emits an empty site without complaint if the content collection is
    // misconfigured, and an assertion over nothing passes.
    expect(pages.length).toBeGreaterThan(1);
  });

  /**
   * **The rejection case `#58` asks for**: a built page carrying a third-party
   * analytics script fails this. It is deliberately broader than analytics —
   * any script from any host that is not ours fails, because the next tracker
   * will not be called PageSense.
   */
  it.each(pages.map((page) => page.slice(dist.length)))(
    "loads no third-party script on %s",
    (page) => {
      const offending = scriptSources(readFileSync(join(dist, page), "utf8")).filter(isThirdParty);

      expect(offending).toEqual([]);
    },
  );

  /**
   * The PageSense project identifier, which is the one string that would
   * survive a careless revert while the vendor's name did not — it is a bare
   * hex id in a URL and reads like a hash. Checked across the whole document
   * rather than only in script tags, because there is no honest reason for it
   * to appear anywhere at all.
   */
  it.each(pages.map((page) => page.slice(dist.length)))(
    "carries no PageSense project id on %s",
    (page) => {
      expect(readFileSync(join(dist, page), "utf8")).not.toContain(
        "bc90774253b5437f852dd57c2cea80ec",
      );
    },
  );

  /**
   * The machine-readable routes stay byte-clean, for the reason the tag's own
   * test gave: they are served to an agent as content, so a script tag in one
   * is not a tracking question but a correctness one.
   */
  it.each(["llms.txt", "robots.txt"])("has no script in /%s", (name) => {
    expect(readFileSync(join(dist, name), "utf8")).not.toContain("<script");
  });

  /**
   * The one exception (`kolonie-website#76`), held to the two properties that
   * make it small: it is on one page, and it is lazy.
   *
   * A reader who only reads `/for-providers/` loads nothing from anybody, which
   * is the state every other page is in and is what lets `governance/privacy.md`
   * state the exception precisely rather than approximately.
   */
  describe("the provider form's captcha (kolonie-website#76)", () => {
    const host = new URL(PROVIDER_ENQUIRY.script).host;

    it.each(pages.map((page) => page.slice(dist.length)))(
      "is not a loaded script tag on %s, even on the page that uses it",
      (page) => {
        const sources = scriptSources(readFileSync(join(dist, page), "utf8"));

        expect(sources.filter((src) => src.includes(host))).toEqual([]);
      },
    );

    it("appears on the provider page, since that is where the form is", () => {
      const provider = readFileSync(join(dist, PROVIDER_PATH, "index.html"), "utf8");

      expect(provider).toContain(PROVIDER_ENQUIRY.script);
      // Fetched on `input`, not on load. This is the whole of the exception:
      // reading the page costs the reader nothing.
      expect(provider).toContain("addEventListener('input'");
    });

    /**
     * **`/privacy/` is excluded, and this file already knew why.** The comment
     * on `scriptSources` above records the same lesson from `#58`: an earlier
     * version searched the whole document for vendor names and failed on the
     * privacy page, which has to name what the site loads in order to be honest
     * about it. A policy naming a vendor is the opposite of a tracking problem.
     *
     * That mistake was made again here on 2026-08-08 and caught by the check
     * itself, which is the argument for the check.
     */
    it.each(
      pages
        .map((page) => page.slice(dist.length))
        .filter((page) => !page.startsWith(PROVIDER_PATH))
        .filter((page) => !page.startsWith("/privacy")),
    )("does not mention it on %s", (page) => {
      expect(readFileSync(join(dist, page), "utf8")).not.toContain(host);
    });

    it("is named on /privacy/, because a policy that hides it is worse", () => {
      const privacy = readFileSync(join(dist, "privacy", "index.html"), "utf8");

      expect(privacy).toContain(host);
      // And the two properties that keep the exception small are stated there,
      // not only asserted here.
      expect(privacy).toMatch(/first keystroke/i);
      expect(privacy).toContain("for-providers");
    });
  });
});
