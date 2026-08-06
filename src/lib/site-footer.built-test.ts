import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_DESCRIPTION } from "./head.ts";
import { LLMS_SUMMARY } from "./llms.ts";
import { LEGAL_PAGES } from "./legal-pages.ts";
import { legalLinks, navigationLinks, socialLinks } from "./site-footer.ts";

/**
 * **The footer is on every page, and every link in it goes somewhere**
 * (kolonie-website#51).
 *
 * Two properties, and neither can be checked in a component:
 *
 * - **Reachability.** `#42` and `#44` require the legal pages linked from the
 *   footer of *every* page. That was true of five pages out of six once, which
 *   is the failure `site-footer.ts` exists to prevent, and the only place it is
 *   visible is the built output.
 * - **Resolution.** `#51` asks for links that are checked rather than assumed. A
 *   footer that lists a page which does not exist is worse than a single line,
 *   and a typo in an href is invisible until somebody clicks it.
 *
 * **The rejection case is the legal list.** A legal page added to
 * `legal-pages.ts` and missing from the footer fails here — which is the state
 * `#44` shipped in and had to be repaired by hand.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));

const pages = readdirSync(dist, { recursive: true, encoding: "utf8" })
  .filter((file) => file.endsWith("index.html"))
  .filter((file) => !file.startsWith("pagefind"));

const html = (file: string) => readFileSync(join(dist, file), "utf8");

it("found the built pages at all", () => {
  expect(pages.length).toBeGreaterThan(10);
});

describe.each(pages)("%s", (file) => {
  const page = html(file);

  it("renders the footer", () => {
    expect(page).toContain('class="site-footer');
  });

  it("opens on the wordmark and the one-sentence description", () => {
    expect(page).toContain('class="site-footer__mark');
    expect(page).toContain(SITE_DESCRIPTION);
  });

  it("keeps #38's liveness chip, still read rather than asserted", () => {
    expect(page).toContain('class="liveness');
    expect(page).toContain('data-state="checking"');
  });

  it.each(navigationLinks)("navigates to $label", (link) => {
    expect(page).toContain(`href="${link.href}"`);
  });

  it.each(socialLinks)("links $label in the social column", (link) => {
    expect(page).toContain(`href="${link.href}"`);
  });

  // The rejection case: add a page to `legal-pages.ts`, forget the footer, and
  // every one of these fails rather than four pages out of six quietly not
  // carrying it.
  it.each(legalLinks)("carries $label in the bottom bar", (link) => {
    expect(page).toContain(`href="${link.href}"`);
  });

  it("has no newsletter field and no compliance badge", () => {
    // Both were refused on `#51` rather than left out, and the reasons are in
    // `SiteFooter.astro`. An `<input>` in a footer is the whole of the first.
    expect(page).not.toMatch(/<input[^>]*type="email"/);
    expect(page).not.toMatch(/SOC ?2|ISO ?27001|GDPR compliant/i);
  });
});

describe("every footer link resolves", () => {
  const internal = [...navigationLinks, ...legalLinks, ...socialLinks].filter(
    (link) => link.href.startsWith("/"),
  );

  it("checks a meaningful number of them", () => {
    expect(internal.length).toBeGreaterThanOrEqual(
      navigationLinks.length + LEGAL_PAGES.length,
    );
  });

  it.each(internal)("$href was built", (link) => {
    // Checked against `dist/`, not asserted. A trailing slash is this site's
    // convention and Astro writes `<path>/index.html` for it.
    expect(existsSync(join(dist, link.href.slice(1), "index.html"))).toBe(true);
  });

  // Nothing here can reach the network, so an external link is checked for the
  // one property that is checkable offline and is the one that breaks: that it
  // is absolute and https. A bare host or a `http://` link on this site would be
  // a mixed-content warning on the page arguing that its claims are checkable.
  it.each(
    [...navigationLinks, ...legalLinks, ...socialLinks].filter(
      (link) => !link.href.startsWith("/"),
    ),
  )("$href is absolute and secure", (link) => {
    expect(link.href).toMatch(/^https:\/\//);
  });
});

describe("the description is quoted rather than written again", () => {
  it("is the sentence /llms.txt opens with", () => {
    // `#51`: *do not write a third wording — quote one and say which*. The
    // comment on `SITE_DESCRIPTION` says which; this is what keeps it true.
    expect(LLMS_SUMMARY).toContain(SITE_DESCRIPTION);
  });
});
