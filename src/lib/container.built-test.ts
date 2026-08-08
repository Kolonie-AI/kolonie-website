import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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
const styles = readdirSync(join(dist, "_astro"))
  .filter((file) => file.endsWith(".css"))
  .map((file) => readFileSync(join(dist, "_astro", file), "utf8"))
  .join("\n")
  .replaceAll(/:where\(\.astro-[a-z0-9]+\)/g, "");

const landing = readFileSync(join(dist, "index.html"), "utf8");

/** The declaration block for a selector, from the minified output. */
const ruleFor = (selector: string): string | undefined => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return styles.match(new RegExp(`(?:^|[,}])${escaped}\\{([^}]*)\\}`))?.[1];
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
   * `#81` also asked for the install box to stop ending its column mid-air.
   * The line under it is `#52`'s, moved rather than written — asserted here so
   * that a later edit putting it back beneath the buttons is a failing test
   * rather than a silent return of the empty column.
   */
  it("puts something under the install box", () => {
    const hero = landing.slice(
      landing.indexOf('<section class="hero'),
      landing.indexOf('<section class="join'),
    );
    const panel = hero.indexOf('id="panel-hero"');
    const cost = hero.indexOf("No account, no card, no key to fetch first.");

    expect(panel).toBeGreaterThan(-1);
    expect(cost, "the cost line left the hero entirely").toBeGreaterThan(-1);
    expect(cost, "the cost line is above the panel again").toBeGreaterThan(panel);
  });
});
