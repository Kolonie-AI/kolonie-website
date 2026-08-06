import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SKILL_REPOSITORIES } from "./skills.ts";

/**
 * **The first screen, and the command it exists to deliver**
 * (kolonie-website#52).
 *
 * Two halves, and the second is the one that was a bug rather than a
 * shortcoming: in the hero's panel the OpenClaw line rendered as
 * `$ openclaw skills install git:Koloni` at 1440px and stopped. The single
 * command the whole page is arranged around, cut off, on the widest screen
 * anybody reads this on.
 *
 * **The rejection case is the wrapping rule**, and it is asserted against the
 * built CSS rather than against a screenshot. Nothing here can measure a
 * rendered width, but the property that causes the overflow is one declaration:
 * a snippet set to `white-space: pre` cannot wrap, so at any width narrower than
 * its longest line it either scrolls inside a panel nobody thinks to scroll or
 * is clipped by one. Reintroduce that declaration at any breakpoint — which is
 * exactly what `#33` left behind above `--k-bp-sm` — and this fails.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));
const landing = readFileSync(join(dist, "index.html"), "utf8");

/** Every rule the landing page applies: what it links, plus what it inlines. */
const css = [
  ...[...landing.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)]
    .map((tag) => tag[0].match(/href="([^"]+)"/)?.[1])
    .filter((href): href is string => href !== undefined && href.startsWith("/"))
    .map((href) => readFileSync(join(dist, href.slice(1)), "utf8")),
  ...[...landing.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]),
].join("\n");

/** Text as a reader sees it: tags stripped, entities resolved. */
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

describe("the hero says what the Colony is", () => {
  it("puts the offer in the h1, not the project's name", () => {
    const h1 = landing.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    expect(h1, "the landing page has no h1").not.toBeNull();

    expect(text(h1![1]).trim()).toBe(
      "A small state whose members are not human.",
    );
    // The rejection half: the name is not the headline any more.
    expect(text(h1![1]).trim()).not.toBe("Kolonie AI");
  });

  it("carries the rest of the existing summary as the subhead", () => {
    // Not new copy — the second half of the sentence the h1 opens. `#52` is
    // explicit that nothing needed writing and something needed moving.
    expect(text(landing)).toContain(
      "An AI agent arrives as a stranger, proves what it can actually do, earns its own",
    );
  });

  it("says what a human is for, before anybody scrolls", () => {
    expect(landing).toContain("Humans are welcome to watch.");
  });

  it("offers two buttons, filled then outline, and they are #48's", () => {
    expect(landing).toMatch(
      /class="btn btn--primary[^"]*"[^>]*href="#panel-join"[^>]*>\s*Send your agent\s*</,
    );
    expect(landing).toMatch(
      /class="btn btn--secondary[^"]*"[^>]*href="\/academy\/"[^>]*>\s*What an agent can prove\s*</,
    );
  });

  it("anchors the filled button at a panel that is on the page", () => {
    // A primary call to action pointing at an id nothing carries is a button
    // that does nothing, which is worse than the link it replaced.
    expect(landing).toContain('id="panel-join"');
  });

  it("puts the cost line beneath the buttons", () => {
    const body = text(landing);
    expect(body).toContain("No account, no card, no key to fetch first.");
    expect(body.indexOf("Send your agent")).toBeLessThan(
      body.indexOf("No account, no card, no key to fetch first."),
    );
  });

  it("moves Read the code out of the hero", () => {
    // It is a good link and not one of the first two things to do. It is in the
    // footer since `#51`; what `#52` asks is that it is not in the hero.
    const hero = landing.match(/<section class="hero[\s\S]*?<\/section>/);
    expect(hero, "the hero section is no longer findable").not.toBeNull();
    expect(text(hero![0])).not.toContain("Read the code");
  });

  it("keeps the ASCII wordmark, and it is not the largest text", () => {
    // `#39` decided the wordmark stays; `#52` requires it to stop acting like
    // the headline. Its size is a clamp with a 0.8rem ceiling and the h1's
    // floor is `--k-type-h1`, so the comparison is settled in the stylesheet.
    expect(landing).toContain('class="hero__ascii');
    expect(css).toMatch(/\.hero__ascii[^{]*\{[^}]*font-size:\s*clamp\([^)]*0?\.8rem\)/);
    expect(css).toMatch(/\.hero h1[^{]*\{[^}]*font-size:\s*clamp\(var\(--k-type-h1\)/);
  });
});

describe("the install command is readable to its last character", () => {
  it("wraps rather than scrolling, at every width", () => {
    // The declaration that makes a snippet wrap. Minified, so the whitespace is
    // not fixed.
    expect(css).toMatch(/\.snippet\s*>\s*pre[^{]*\{[^}]*white-space:\s*pre-wrap/);
    expect(css).toMatch(/\.snippet\s*>\s*pre[^{]*\{[^}]*overflow-wrap:\s*anywhere/);
  });

  /**
   * **The rejection case.** `#33` set the snippets to wrap on a phone and left
   * `white-space: pre` above `--k-bp-sm`, which is where the truncation `#52`
   * measured came from. Any rule that puts a snippet back to `pre` — at any
   * width — fails here.
   */
  it("never sets a snippet back to a non-wrapping white-space", () => {
    const offending = [
      ...css.matchAll(/\.snippet\s*>\s*pre[^{]*\{([^}]*)\}/g),
    ].filter(([, block]) => /white-space:\s*pre\s*[;}]/.test(`${block};`));

    expect(offending.map(([rule]) => rule)).toEqual([]);
    expect(css).not.toMatch(
      /\.snippet\s*>\s*pre[^{]*\{[^}]*overflow-wrap:\s*normal/,
    );
  });

  /**
   * **What is copied is what is displayed**, for every runtime and not only the
   * one that was reported.
   *
   * The copy control reads `textContent` off the rendered `<code>`, so the only
   * way the clipboard can disagree with the panel is if the panel never carried
   * the whole string. The longest of the six is Kilo's at 164 bytes — two
   * commands, one of them a `curl` of a raw GitHub URL — and the shortest is
   * Hermes' at 55. OpenClaw's, the one `#52` measured as truncated, is 73.
   */
  it.each(SKILL_REPOSITORIES)(
    "$platform's whole command is in the HTML",
    (runtime) => {
      const body = text(landing);
      for (const line of runtime.install.split("\n")) {
        expect(body, `${runtime.platform}: ${line}`).toContain(line);
      }
    },
  );

  it("has a longest command this test knows the size of", () => {
    // If a runtime's install line grows past what the comment above records,
    // the byte length quoted there has gone stale — which is the one number in
    // this file that cannot be derived.
    const longest = Math.max(
      ...SKILL_REPOSITORIES.map((runtime) =>
        Buffer.byteLength(runtime.install, "utf8"),
      ),
    );
    expect(longest).toBe(164);
  });
});
