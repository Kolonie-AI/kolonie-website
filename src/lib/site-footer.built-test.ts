import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_DESCRIPTION } from "./head.ts";
import { LLMS_SUMMARY } from "./llms.ts";
import { LEGAL_PAGES } from "./legal-pages.ts";
import {
  legalLinks,
  navigationLinks,
  SERVED_BY_THE_API,
  socialLinks,
} from "./site-footer.ts";

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

  /**
   * `rel="me"` is what makes the link a claim rather than a mention
   * (kolonie-docs#226): it says this account is the same entity as this site.
   *
   * Asserted on the built page rather than in the component, because there are
   * two footers and only one of them is written here — the drift between them
   * is the thing this file exists to catch, and an attribute is exactly the kind
   * of thing that gets added to one.
   */
  it.each(socialLinks)("claims $label as the Colony's own with rel=me", (link) => {
    expect(page).toMatch(
      new RegExp(`<a href="${link.href.replace(/[/.]/g, "\\$&")}"[^>]*rel="me"`),
    );
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

  /**
   * The links this site does not build, named rather than filtered out silently
   * (kolonie-website#92).
   *
   * **A page served by `kolonie-platform` on this host is not a broken link, and
   * the check that would call it one is right about everything else.** So the
   * exception is a list with a reason attached, and it is asserted to be small —
   * a filter that quietly grew would be this guard being turned off one entry at
   * a time.
   */
  const built = internal.filter((link) => !SERVED_BY_THE_API.includes(link.href));

  it("checks a meaningful number of them", () => {
    expect(built.length).toBeGreaterThanOrEqual(
      navigationLinks.length + LEGAL_PAGES.length - SERVED_BY_THE_API.length,
    );
  });

  it("excuses only what the API serves, and not much of it", () => {
    expect(SERVED_BY_THE_API.length).toBeLessThanOrEqual(2);
    // Every excused link is one the column actually carries, so an entry that
    // stops being linked cannot go on quietly excusing itself.
    for (const href of SERVED_BY_THE_API) {
      expect(internal.map((link) => link.href)).toContain(href);
    }
  });

  it.each(built)("$href was built", (link) => {
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

/**
 * **The crest, enormous and quiet behind the footer** (kolonie-website#82).
 *
 * `#82` measured that the mark *"exists at `public/mark.svg` and `favicon.svg`
 * and appears once, small, in the header"*, and asked for what the reference
 * does with its own: set very large and very low-contrast behind the footer,
 * anchoring the page without competing with anything on it.
 *
 * **Every assertion here is about something invisible on purpose.** A watermark
 * at 5% is exactly the element a later edit brightens, hardens into a copy of
 * the SVG, or lets swallow a click — and none of those would look wrong to
 * anybody reviewing the page, because the thing is meant not to be noticed.
 */
describe("the crest anchors the footer (kolonie-website#82)", () => {
  const styles = readdirSync(join(dist, "_astro"))
    .filter((file) => file.endsWith(".css"))
    .map((file) => readFileSync(join(dist, "_astro", file), "utf8"))
    .join("\n")
    .replaceAll(/:where\(\.astro-[a-z0-9]+\)/g, "");

  const rule = styles.match(/\.site-footer__anchor\{([^}]*)\}/)?.[1];

  it.each(pages)("is on %s, so it anchors every page", (file) => {
    expect(html(file)).toContain('class="site-footer__anchor');
  });

  it("is the generated mark, drawn in tokens", () => {
    // Not a copy and not a recolour — `brand/README.md` §4's first prohibition,
    // and a watermark is the likeliest place to break it. `inlineMark` puts the
    // baked-in values back as `var(--k-…)`, so a hex in this element means
    // somebody pasted the file instead of reading it.
    const anchor = html(pages[0]!).slice(
      html(pages[0]!).indexOf('class="site-footer__anchor'),
    );
    const svg = anchor.slice(0, anchor.indexOf("</div>"));

    expect(svg).toContain("<svg");
    expect(svg).toMatch(/stroke="var\(--k-accent\)"/);
    expect(svg).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it("is decorative, and takes no click", () => {
    // `inlineMark` strips the label and adds `aria-hidden`, so a screen reader
    // never meets it. `pointer-events` is the other half: an absolutely
    // positioned element over the footer's own links would swallow them.
    const anchor = html(pages[0]!).slice(
      html(pages[0]!).indexOf('class="site-footer__anchor'),
    );
    expect(anchor.slice(0, 400)).toContain('aria-hidden="true"');
    expect(rule, "no rule for .site-footer__anchor").toBeDefined();
    expect(rule).toContain("pointer-events:none");
  });

  it("stays behind, at a contrast that reads as texture", () => {
    // `#82`: *"low-contrast … which anchors the page without competing with
    // anything."* The number is the whole of that requirement, so it is here
    // rather than in somebody's eye.
    const opacity = Number(rule?.match(/opacity:\s*([\d.]+)/)?.[1] ?? Number.NaN);
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThanOrEqual(0.12);
  });

  it("cannot scroll the page sideways", () => {
    // It is deliberately larger than its corner of the footer and hangs off two
    // edges. The clip is what makes that safe, and it is on the footer.
    expect(styles).toMatch(/\.site-footer\{[^}]*overflow:hidden/);
    expect(styles).toMatch(/\.site-footer\{[^}]*position:relative/);
  });
});
