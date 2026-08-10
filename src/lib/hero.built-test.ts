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
]
  .join("\n")
  /**
   * Astro's scoping hash, taken out before anything is matched — the same step
   * `container.built-test.ts` takes and for the same reason.
   *
   * **It became necessary with kolonie-website#95.** The hero's `h1` was sized
   * in two places: `index.astro`, which owns the hero, and an unscoped
   * `.hero h1` in `theme.css` left over from the framework's splash template.
   * `#95` deleted the leftover, so the only rule left is the scoped one, and a
   * scoped rule reaches the stylesheet as `.hero:where(.astro-x) h1:where(…)`.
   * Removing the hash is what leaves the selector somebody actually wrote.
   */
  .replaceAll(/:where\(\.astro-[a-z0-9]+\)/g, "");

/** Text as a reader sees it: tags stripped, entities resolved. */
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

describe("the hero says what the operator gets back", () => {
  it("puts the approved operator outcome in the h1", () => {
    const h1 = landing.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    expect(h1, "the landing page has no h1").not.toBeNull();

    expect(text(h1![1]).trim()).toBe(
      "Send your agent. Get back a more capable, independent member of your swarm.",
    );
    expect(text(h1![1]).trim()).not.toBe("Kolonie AI");
  });

  it("puts the practical capability chain immediately under the outcome", () => {
    expect(text(landing)).toContain(
      "Your agent gains verified skills, creates and controls accounts with your help, " +
        "earns SOL from funded quests, takes roles, and coordinates within your swarm.",
    );
  });

  /**
   * **This assertion changed with `kolonie-website#67`, and the claim it makes
   * is stronger than the one it replaces.**
   *
   * `#52` put a line in the hero so a reader would not wonder whether a site
   * built for agents was for them, and this test pinned its wording:
   * *"Humans are welcome to watch."* `#67` measured what that cost — the page
   * addressed one reader, and the only thing it ever said to the other was what
   * they could not do.
   *
   * `#52`'s requirement was *say what a human is for before anybody scrolls*,
   * not *say this sentence*, so what is asserted here is the requirement: both
   * readers are named above the fold and each has somewhere on this page to go.
   * A hero that names only one of them fails, which is the state `#67` opened
   * about, and so does one that names both and links neither.
   */
  it("names both readers and lets each pick its half, before anybody scrolls", () => {
    const hero = landing.slice(0, landing.indexOf('class="join"'));

    // `#84` is the third revision of this assertion and it moves the
    // requirement rather than dropping it. `#67`'s two links were the third
    // asking of one question inside one screen — the header switch asks it,
    // the sentence asked it, and the join block asked it again below. What
    // `#52` required is *say which half is theirs before anybody scrolls*, and
    // a control above the headline says it in the form a reader looks for.
    //
    // So both readers are still named above the fold, and both halves are
    // still reachable from up here. A hero that names one of them fails, and
    // so does one that names both and offers no way to choose.
    expect(hero).toContain("Read this as an </span>Agent");
    expect(hero).toMatch(/Read this as a human — [^<]*<\/span>Human/);
    expect(hero).toContain('href="#human"');
    expect(hero).toContain('href="#agent"');

    // The paragraph itself is gone, and stays gone.
    expect(hero).not.toContain("Arriving on your own?");
    expect(hero).not.toContain("This half is yours.");
  });

  /**
   * The destination of the operator's half of that line. `#67` requires the
   * two readers to be able to *self-select*, which a link into nothing is not —
   * this is the same guard the filled button already has below.
   */
  it("anchors the operator's half at a section that is on the page", () => {
    expect(landing).toContain('id="you-run-a-swarm"');
  });

  it("offers two buttons, filled then outline, and they are #48's", () => {
    expect(landing).toMatch(
      /class="btn btn--primary[^"]*"[^>]*href="#panel-hero"[^>]*>\s*Send your agent\s*</,
    );
    expect(landing).toMatch(
      /class="btn btn--secondary[^"]*"[^>]*href="\/academy\/"[^>]*>\s*What an agent can prove\s*</,
    );
  });

  it("anchors the filled button at a panel that is on the page", () => {
    // A primary call to action pointing at an id nothing carries is a button
    // that does nothing, which is worse than the link it replaced.
    expect(landing).toContain('id="panel-hero"');
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

  /**
   * **The ASCII block is gone and the badge is in its place**
   * (kolonie-website#82).
   *
   * `#39` decided the wordmark stays and this test pinned the size that kept it
   * from acting like the headline. `#82` measured the other question: the
   * maintainer's reading on 2026-08-07 is that it *looks ugly* and occupies the
   * most valuable space on the site, which should carry the strongest thing the
   * Colony can say.
   *
   * So what is asserted is the position rather than the decoration — something
   * is above the headline, it is one line, and the headline is still the
   * loudest thing in the hero.
   */
  it("opens on a one-line badge, and it is not the largest text", () => {
    expect(landing).not.toContain('class="hero__ascii');

    const badge = landing.match(/<p class="hero__badge[^"]*"[^>]*>([\s\S]*?)<\/p>/);
    expect(badge, "no badge above the headline").not.toBeNull();

    // One line. `#82`: *"Two lines is a paragraph and belongs lower."* A
    // sentence-count is the closest a test gets to that without a browser.
    const words = text(badge![1]).trim();
    expect(words.split(".").filter((part) => part.trim() !== "")).toHaveLength(3);
    expect(words).not.toContain("\n");

    // Above the headline, which is where the value is.
    expect(landing.indexOf('class="hero__badge')).toBeLessThan(
      landing.indexOf("<h1"),
    );

    // And still quieter than it: the badge is `--k-type-small`, the h1 a clamp
    // that floors at `--k-type-h1`.
    expect(css).toMatch(/\.hero__badge[^{]*\{[^}]*font-size:\s*var\(--k-type-small\)/);
    expect(css).toMatch(/\.hero h1[^{]*\{[^}]*font-size:\s*clamp\(var\(--k-type-h1\)/);
  });

  /**
   * **The runtime count is read, not typed** (kolonie-website#82, and `#80` is
   * why). A count typed into a page goes stale on the day somebody adds a
   * repository, and a seventh runtime is an ordinary week here.
   */
  it("counts the runtimes from the one list that holds them", () => {
    const words = [
      "Zero", "One", "Two", "Three", "Four", "Five", "Six",
      "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
    ];

    expect(text(landing)).toContain(
      `${words[SKILL_REPOSITORIES.length]} runtimes.`,
    );
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
