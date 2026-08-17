import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NOT_PAGES } from "./built-pages.ts";

/**
 * **One centred container, and the header sits in it** (kolonie-website#81).
 *
 * Measured with a real browser at a 2560px viewport on 2026-08-07:
 *
 * | | Header width | Content |
 * |---|---|---|
 * | `agentmail.to` | 1280px, centred | in the same track |
 * | `kolonie.ai` | **2560px, edge to edge** | 960px inner |
 *
 * The header stretched to whatever the window was and the content did not, so
 * on a wide display the two no longer lined up. The maintainer runs one at
 * roughly 3800px, where it is worse.
 *
 * **Why this is a test and not a screenshot.** Every assertion here is about a
 * property no reviewer can see at the width they happen to be using: a header
 * that is edge-to-edge at 2560 looks perfectly deliberate at 1440, which is
 * exactly how it survived this long. What can be checked without a browser is
 * that the three containers are *the same declaration* — and that is also the
 * property that erodes, because the failure mode is one of them being tuned
 * and the other two left behind.
 *
 * The widths themselves were verified in Chromium at 1440, 2560 and 3840 on
 * 2026-08-08: header row and page share an origin and a width at all three.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));

/**
 * The built CSS with Astro's scoping hashes taken out.
 *
 * Astro compiles a scoped rule to `.page:where(.astro-lcdefpme)>.hero:where(…)`
 * — the hash lands on *every* compound in the selector, and it changes whenever
 * the file does. A test that matched around it would be a test about the
 * compiler; removing it first is what leaves the selector anybody wrote.
 */
const htmlPages = readdirSync(dist, { recursive: true, encoding: "utf8" })
  .filter((file) => file.endsWith(".html"))
  .filter((file) => !NOT_PAGES.some((route) => file.startsWith(route)));

/**
 * **The inline `<style>` blocks are read too, and they have to be.** Astro
 * inlines a small component stylesheet into the pages that use it rather than
 * emitting a file — so `Prose.astro`'s rules, which are the composition on
 * fourteen of the site's pages since kolonie-website#95, are in the HTML and
 * not under `_astro/`. A test that read only the files would have passed by
 * finding nothing.
 */
const styles = [
  ...readdirSync(join(dist, "_astro"))
    .filter((file) => file.endsWith(".css"))
    .map((file) => readFileSync(join(dist, "_astro", file), "utf8")),
  ...htmlPages.flatMap((file) =>
    [...readFileSync(join(dist, file), "utf8").matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(
      (match) => match[1],
    ),
  ),
]
  .join("\n")
  .replaceAll(/:where\(\.astro-[a-z0-9]+\)/g, "");

const landing = readFileSync(join(dist, "index.html"), "utf8");

/** The declaration block for a selector, from the minified output. */
const ruleFor = (selector: string): string | undefined => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  /**
   * The boundary allows a newline as well as `,` and `}`, and **allows nothing
   * else**. The CSS files are minified and a rule there is always preceded by
   * one of the two; an inline `<style>` block starts its first rule after a
   * newline. Without the newline, `Prose.astro`'s composition rule — the one
   * #96 is about — is invisible to this test while looking perfectly matched.
   *
   * A general `\s` was the first spelling and it is wrong: a *space* before the
   * selector is a descendant combinator, so `pre` would match the `pre` inside
   * `.prose pre{…}` and this would return a rule about a different element
   * while reporting the one it was asked for.
   */
  return styles.match(new RegExp(`(?:^|[,}\\n])\\s*${escaped}\\{([^}]*)\\}`))?.[1];
};

describe("one container, shared (kolonie-website#81)", () => {
  /**
   * The three places a composition is bounded on this site. They are separate
   * elements in separate files, which is why the token exists: three numbers
   * that have to agree are three numbers that will not.
   */
  it.each([
    [".site-header__row", "the header's inner row"],
    [".page", "the landing page"],
    // kolonie-website#96: the content pages, the legal pages and the blog all
    // compose through `Prose.astro`, and they were the fourteen that composed
    // to 1080 while `/` composed to 1280.
    [".prose", "every rendered document"],
  ])("caps %s — %s — with the shared token", (selector) => {
    const rule = ruleFor(selector);
    expect(rule, `no rule for ${selector}`).toBeDefined();
    expect(rule).toContain("max-width:var(--k-container)");
    expect(rule).toMatch(/margin:0 auto|margin-inline:auto/);
  });

  it("caps the footer's columns with it too", () => {
    // The footer had `60rem` written out twice, in its own file, which is the
    // shape this token exists to remove.
    expect(styles).not.toMatch(/\.site-footer__[a-z-]*[^{]*\{[^}]*max-width:60rem/);
    expect(styles).toMatch(/\.site-footer[^{]*\{[^}]*max-width:var\(--k-container\)/);
  });

  /**
   * **`#81`: *"Backgrounds and borders may go full-bleed; content may not."***
   *
   * So `.site-header` keeps exactly two things and nothing else — a background
   * and a rule that stop before the window edge do not read as a bar at all.
   * The failure this catches is the padding or the flex row drifting back onto
   * the header, which is where they were and where they would be put back.
   */
  it("leaves the header full-bleed for its background and its rule only", () => {
    const rule = ruleFor(".site-header");
    expect(rule, "no rule for .site-header").toBeDefined();
    expect(rule).toMatch(/border-bottom|background/);
    expect(rule).not.toMatch(/display:flex/);
    expect(rule).not.toMatch(/padding/);
  });

  it("puts the header's content in a row of its own", () => {
    // The wrapper has to exist in the served HTML, not only in the stylesheet.
    expect(landing).toContain('class="site-header__row');
  });

  /**
   * **The same row, on every page** (kolonie-website#93).
   *
   * `#81` capped the composition and reached five pages; fourteen still
   * stretched. Measured in Firefox at 2560px on 2026-08-08: the header row was
   * 1280 on `/` and the four legal pages and **2512** on the other fourteen.
   * The markup agreed and the box around it did not — `SiteHeader.astro`
   * rendered on both surfaces, but on a Starlight page it rendered inside the
   * framework's own header shell, which has no container cap, and passed a
   * `bare` prop that removed its own.
   *
   * `#95` removed the shell and the prop, so what is asserted is that the cap
   * cannot be lifted again: **exactly one rule in the built CSS sets a
   * `max-width` on the row, and no rule anywhere clears it.** `bare` was
   * `max-width:none` in a file that also declared the cap, which is the shape
   * this catches.
   *
   * The pixel widths are not asserted here for `container.built-test.ts`'s own
   * reason, stated at the top of this file: a header that is edge-to-edge at
   * 2560 looks deliberate at 1440, and what a test can hold is that the three
   * containers are the same declaration.
   */
  it("caps the header's row from exactly one place, and never lifts it", () => {
    const capped = [...styles.matchAll(/\.site-header__row[^{]*\{([^}]*)\}/g)]
      .map((match) => match[1])
      .filter((block) => /max-width:/.test(block));

    expect(capped, "the header row is capped in more than one place").toHaveLength(1);
    expect(capped[0]).toContain("max-width:var(--k-container)");

    expect(
      styles,
      "something clears the header row's cap — this is how #93 happened",
    ).not.toMatch(/\.site-header__row[^{]*\{[^}]*max-width:(none|100%|unset)/);
  });

  /**
   * And the row is on every page, not only on the one this file reads.
   *
   * `site-header.built-test.ts` already asserts the header itself is on every
   * built page; this is the wrapper inside it, which is the element `#93` is
   * about and the one that was missing its cap on three quarters of the site.
   */
  it("renders the row on every built page", () => {
    expect(htmlPages.length).toBeGreaterThan(10);

    const without = htmlPages.filter(
      (file) => !readFileSync(join(dist, file), "utf8").includes('class="site-header__row'),
    );

    expect(without, `pages with no capped header row: ${without.join(", ")}`).toEqual([]);
  });
});

/**
 * **The first screen carries the whole offer** (kolonie-website#81): headline,
 * subhead, both buttons, and the install box.
 *
 * That is a measurement and this is not a browser, so what is asserted is the
 * structural fact the measurement depends on — the hero is the first thing
 * painted, in **both** views of the switch.
 *
 * The failure it names actually happened. `#78`'s reorder moved the operator's
 * half *"above the joining path"* by giving it a negative `order` against a
 * hero at `0`, which puts it above the **hero** as well. Nobody saw it because
 * that was the `#human` view and nobody's default until `#86`; measured at 1440
 * on 2026-08-08, the headline's baseline was 2461px down the page and every
 * part of the offer was below the fold.
 */
describe("the hero is the first screen, in either view (#81, #86)", () => {
  it("paints the hero ahead of the reordered halves", () => {
    const hero = ruleFor(".page>.hero");
    expect(hero, "the hero is not ordered at all").toBeDefined();

    const order = (rule: string | undefined): number =>
      Number(rule?.match(/order:(-?\d+)/)?.[1] ?? Number.NaN);

    expect(order(hero)).toBeLessThan(order(ruleFor(".page>#you-run-a-swarm")));
    expect(order(hero)).toBeLessThan(order(ruleFor(".page>.human-account")));
  });

  it("puts everything back in document order for the agent's view", () => {
    // All three, or the agent's view opens on a page half-reordered — which is
    // neither of the two arrangements anybody designed.
    const rule = styles.match(
      /#agent:target~\*[^{]*\.hero[^{]*\{order:0\}/,
    );
    expect(rule, "the hero is not reset under #agent:target").not.toBeNull();
  });

  /**
   * **`#81`'s second half, restated by `kolonie-website#119`.**
   *
   * `#81` asked for the install box to stop ending its column mid-air, and the
   * fix was `#52`'s cost line moved beneath it. `#119` removes the box from the
   * hero altogether — there is no second column left to end early — so what is
   * asserted now is the arrangement that replaced it: the cost line is still in
   * the hero, and it sits under the buttons, which is where `#52` put it before
   * the panel existed to be under.
   *
   * The line leaving the hero entirely is still the failure worth catching. It
   * is one sentence and it is the only thing on the first screen that answers
   * *what does this cost me*, so an edit tidying it away is exactly the kind
   * nobody notices.
   */
  it("keeps the cost line in the hero, under the buttons", () => {
    const hero = landing.slice(
      landing.indexOf('<section class="hero'),
      landing.indexOf('<section class="join'),
    );
    const buttons = hero.indexOf("Send your agent");
    const cost = hero.indexOf("No account, no card, no key to fetch first.");

    expect(hero, "the hero section is no longer findable").not.toBe("");
    expect(buttons, "the primary button left the hero").toBeGreaterThan(-1);
    expect(cost, "the cost line left the hero entirely").toBeGreaterThan(-1);
    expect(cost, "the cost line is above the buttons").toBeGreaterThan(buttons);
  });
});

/**
 * **One composition width, and the homepage is the reference**
 * (kolonie-website#96, decided by the maintainer 2026-08-08).
 *
 * Three widths were measured on one site in Firefox at 1440px on 2026-08-08:
 * 1280 on `/`, **1080** on the fourteen pages a documentation framework laid
 * out, and 736 on `console.kolonie.ai` (`kolonie-platform#584`, since raised).
 * `#95` removed the framework, so the fourteen compose through `Prose.astro`
 * and the number is `--k-container` on all of them.
 *
 * **The distinction this has to preserve** is the one `theme.css` states:
 * `--k-container` caps the *composition* and `--k-measure` caps a *line of
 * prose*. So this is not *make everything 1280 wide* — it is that the
 * composition is 1280 and running text stays readable inside it, which is what
 * the legal pages were already doing correctly and why `#96` calls them the
 * model.
 *
 * Verified in Chromium at 390, 1280, 1440 and 2560 on 2026-08-09: every page's
 * composition matches `/`'s, paragraphs sit at 748px on a 1280px composition,
 * and tables and code blocks use the full width.
 */
describe("one composition width, one reading width inside it (#96)", () => {
  it("caps the composition and the measure with two different tokens", () => {
    const composition = ruleFor(".prose");
    expect(composition).toContain("max-width:var(--k-container)");

    // The measure is on the text elements and not on their container, so a
    // table or a code block still uses the whole composition. A single rule
    // capping `.prose` at the measure would be the failure this catches: it
    // reads as correct and narrows a 26-row table to 68 characters.
    const measure = styles.match(
      /\.prose[^{]*:is\(h1,h2,h3,h4,p,ul,ol,dl,blockquote\)\{([^}]*)\}/,
    )?.[1];
    expect(measure, "running text is not capped at a measure").toBeDefined();
    expect(measure).toContain("max-width:var(--k-measure)");

    expect(composition).not.toContain("max-width:var(--k-measure)");
  });

  it("lets a table and a code block use the whole composition", () => {
    // A table narrowed to the measure is a table that stops being one, so it
    // composes at the container's width and scrolls inside itself rather than
    // widening the document — the trade `#49` made for the legal pages' 26 rows.
    const table = styles.match(/\.prose[^{]*table[^{]*\{([^}]*)\}/)?.[1];
    expect(table, "no rule for .prose table").toBeDefined();
    expect(table).toContain("overflow-x:auto");
    expect(table).toContain("max-width:100%");
    expect(table).not.toContain("max-width:var(--k-measure)");

    // A code block is the other one, and its rule is **not** here: what a long
    // code line does is `Site.astro`'s base layer since `#98`, because the site
    // had two answers to it. `Prose.astro` draws the frame and takes no
    // position on the text — asserting it here would be the second position.
    const pre = ruleFor("pre");
    expect(pre, "no base-layer rule for pre").toBeDefined();
    expect(pre).toContain("max-width:100%");
    expect(pre).toContain("white-space:pre-wrap");
  });

  /**
   * The console is the same decision one host over, and the token says so.
   *
   * `#96`'s last criterion is that `kolonie-platform#584` is cross-referenced
   * from wherever the value lives — because the two surfaces agreeing today is
   * worth nothing if the next person to move this number does not know there is
   * a second one.
   */
  it("names the console's half of the decision where the value is", () => {
    const theme = readFileSync(
      fileURLToPath(new URL("../styles/theme.css", import.meta.url)),
      "utf8",
    );
    const declaration = theme.slice(
      theme.lastIndexOf("/*", theme.indexOf("--k-container: 80rem")),
      theme.indexOf("--k-container: 80rem"),
    );
    expect(declaration).toContain("kolonie-platform#584");
  });
});
