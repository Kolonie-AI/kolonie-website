import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEGAL_PAGES } from "./legal-pages.ts";

/**
 * **The contract `/site-chrome/` is, asserted from this side of it**
 * (kolonie-website#99).
 *
 * The Atlas pages are rendered by the API and served on this domain as host
 * routes (`kolonie-platform#546`), so they had none of this site's chrome:
 * measured 2026-08-08, `/atlas` had no `<header>`, no `<footer>` and one link
 * in a `nav`. `src/pages/site-chrome.astro` is what lets the process that
 * renders them put this site's own header and footer around them, from this
 * site's own source, so that there is not a second copy of either in another
 * repository — which is the failure `#42` and `#51` were written about.
 *
 * **A contract with a consumer in another repository needs a test in each**,
 * and this is the half that lives here. The platform's half asserts that it
 * extracts what it expects; this one asserts that what it expects is what gets
 * built. Either alone would go green while the pair was broken.
 *
 * What the consumer takes out of the document, and therefore what is asserted:
 *
 * - exactly one `<header class="site-header">` and one
 *   `<footer class="site-footer">`, so the extraction is unambiguous
 * - the stylesheet links and `<style>` blocks in `<head>`
 * - the four legal links, inside the footer
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));
const fragment = readFileSync(join(dist, "site-chrome", "index.html"), "utf8");

const fragmentCss = [
  ...[...fragment.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/g)].map(
    (match) => readFileSync(join(dist, match[1].replace(/^\//, "")), "utf8"),
  ),
  ...[...fragment.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]),
].join("\n");

describe("the chrome fragment the Atlas includes (#99)", () => {
  it("is built at the path the API fetches", () => {
    expect(fragment.length).toBeGreaterThan(1000);
  });

  /**
   * **One of each, which is the whole of what makes the extraction safe.** The
   * consumer takes the first `<header …>` and the first `<footer …>`; a second
   * of either on this page would make that silently wrong rather than
   * obviously so.
   */
  it("carries exactly one header and one footer", () => {
    expect(fragment.match(/<header\b/g)).toHaveLength(1);
    expect(fragment.match(/<footer\b/g)).toHaveLength(1);
    expect(fragment).toContain('<header class="site-header');
    expect(fragment).toContain('<footer class="site-footer');
  });

  /**
   * The site's own components, rendered by the site — which is the property the
   * whole arrangement exists for. A wordmark that changed here and not on the
   * Atlas is exactly the drift `#99` refuses.
   */
  it("renders the site's own header, with the wordmark and the navigation", () => {
    const header = fragment.slice(fragment.indexOf("<header"), fragment.indexOf("</header>"));

    expect(header).toContain('href="/" class="site-header__mark');
    expect(header).toContain("Kolonie AI");
    expect(header).toContain("site-header__nav");
  });

  /**
   * **All four legal pages, in the footer** — `#42` and `#44` require them on
   * every page, and the Atlas pages are the ones that had none of them.
   * Asserted against `LEGAL_PAGES` rather than a list typed here, so a fifth
   * legal page added to that module fails this until it is in the footer too.
   */
  it("carries every legal page in the footer", () => {
    const footer = fragment.slice(fragment.indexOf("<footer"), fragment.indexOf("</footer>"));

    expect(LEGAL_PAGES.length).toBeGreaterThan(3);
    for (const page of LEGAL_PAGES) {
      expect(footer, `${page.slug} is not linked from the chrome's footer`).toContain(
        `/${page.slug}/`,
      );
    }
  });

  /**
   * The styles have to travel with the markup or the Atlas gets this site's
   * header as unstyled links. A relative href is correct and load-bearing:
   * `/atlas` is on this same host, so `/_astro/x.css` resolves to this site's
   * build without anything having to rewrite it.
   */
  it("names its stylesheet at a path an Atlas page can resolve", () => {
    const hrefs = [...fragment.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(href.startsWith("/")).toBe(true);
  });

  /**
   * `#100` is the failure this assertion names: the fragment emitted the
   * header and footer with Astro's scope classes, but only linked `theme.css`.
   * Their rules had been folded into the landing page's content-hashed CSS, so
   * the Atlas drew the mark at the width of its container and left the footer
   * without columns.
   *
   * Every scope marker in the extracted chrome must occur in the CSS that the
   * same fragment tells its consumer to load. This checks the relationship,
   * rather than pinning today's generated scope or asset hash.
   */
  it("loads a rule for every scoped class its chrome emits", () => {
    const chrome = fragment.slice(fragment.indexOf("<header"), fragment.indexOf("</footer>"));
    const scopes = new Set(chrome.match(/astro-[a-z0-9]+/g) ?? []);

    expect(scopes.size).toBeGreaterThan(0);
    for (const scope of scopes) {
      expect(fragmentCss, `${scope} has no rule in the fragment's stylesheets`).toContain(
        `.${scope}`,
      );
    }
  });

  /**
   * It is served and it is not a page. A crawler that indexed it would put a
   * header and a footer with nothing between them into a search result.
   */
  it("tells crawlers to leave it alone", () => {
    expect(fragment).toMatch(/name="robots" content="noindex/);
  });

  /**
   * **No page on this site links to it**, which is what keeps it out of the
   * navigation, the sitemap and `/llms.txt` without any of those needing an
   * exception for it.
   */
  it("is linked from no page on the site", () => {
    const landing = readFileSync(join(dist, "index.html"), "utf8");

    expect(landing).not.toContain("/site-chrome");
  });
});
