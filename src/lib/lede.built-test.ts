import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TERM_DESTINATIONS } from "./plain-term.ts";

/**
 * **The first screen of a page a stranger arrives on** (kolonie-website#121,
 * `#123`, `#128`).
 *
 * `AGENTS.md` §3 is six rules about what a first screen may say, and the two of
 * them that are mechanically checkable are checked here. The other four are
 * about sentences and are checked by somebody reading them; a test that claimed
 * to check *"state an outcome for the human"* would be a test that passes on
 * anything.
 *
 * **What is checkable is order and vocabulary.** A lede that arrives after the
 * page's first heading is not a first screen, and a lede that spends a Colony
 * word without linking it is the exact failure `#120` and `#121` were both
 * written about. Both survive an edit that keeps the words and moves them,
 * which is the edit a reviewer misses.
 *
 * **The page list is deliberate rather than discovered.** Every other test in
 * this directory reads `dist/` and covers a new page on the day it is added,
 * and that is right for a property every page must have. This is not one: a
 * lede is what these three issues decided five specific pages need, and a rule
 * that every page must open with one would be this component becoming
 * mandatory furniture by accident. A page added next month gets a lede when
 * somebody decides it needs one.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));

const html = (route: string) =>
  readFileSync(join(dist, route.replace(/^\//, ""), "index.html"), "utf8");

/** The pages three issues decided open with one, and why each was named. */
const LEDE_PAGES: readonly { readonly route: string; readonly issue: string }[] = [
  { route: "/academy/", issue: "kolonie-website#121" },
  // Both of these opened in the Colony's vocabulary rather than in the reader's,
  // and `/run-a-swarm/` kept its answer to *what do I actually do* six screens
  // below the fold (`#123`).
  { route: "/the-register/", issue: "kolonie-website#123" },
  { route: "/run-a-swarm/", issue: "kolonie-website#123" },
  // `#128` names `/pricing/` and `/quests/` together and only one of them is
  // here. `/quests/` is documentation — `chrome.ts` holds the exception — and a
  // lede is written for somebody deciding, which is not who reads it. It got a
  // paragraph of reference instead, which is why this list is four pages rather
  // than the five `Lede.astro` anticipated.
  { route: "/pricing/", issue: "kolonie-website#128" },
];

describe.each(LEDE_PAGES)("$route", ({ route }) => {
  const page = html(route);

  /** The lede's own markup, so nothing below it can satisfy a test about it. */
  const lede = () => {
    const start = page.indexOf('<div class="lede');
    expect(start).toBeGreaterThan(-1);
    return page.slice(start, page.indexOf("</div>", start));
  };

  it("opens with a lede", () => {
    // Astro appends a scoped class, so this is a prefix rather than an equality.
    expect(page).toMatch(/<div class="lede[^"]*"/);
  });

  it("puts it before the page's first heading", () => {
    // The `h1` is the frontmatter title and is rendered by `[...slug].astro`
    // above the body, so the heading that matters here is the first `h2` — the
    // start of the depth the lede exists to introduce.
    const heading = page.indexOf("<h2");
    expect(heading).toBeGreaterThan(-1);
    expect(page.indexOf('<div class="lede')).toBeLessThan(heading);
  });

  it("says only one thing once", () => {
    // Two ledes is a page with two first screens, which is the failure mode of
    // a component that is easy to add: somebody opens a section with one.
    expect(page.match(/<div class="lede/g)).toHaveLength(1);
  });

  it("gives the reader somewhere to go next", () => {
    // §3's rule 1 is an outcome *and* one thing to do. The thing to do is
    // written into the prose rather than rendered as a button — `Lede.astro`
    // says why — so what is checkable is that the block contains a link at all.
    expect(lede()).toMatch(/<a[^>]+href=/);
  });

  /**
   * **No Colony word standing on its own** (`AGENTS.md` §3, rule 2, and `#120`).
   *
   * The rule is that a term arrives with a plain gloss beside it and a link to
   * its page. A gloss cannot be tested. A link can, and a term inside one is
   * the floor of the rule: a reader who meets an unfamiliar word has somewhere
   * to resolve it. A term in the running text with nothing behind it is the
   * thing `#121` found on `/academy/` and `#123` on both pages it names.
   */
  it("spends no Colony term outside a link", () => {
    const withoutLinks = lede().replaceAll(/<a\b[^>]*>[\s\S]*?<\/a>/g, " ");
    const text = withoutLinks.replaceAll(/<[^>]+>/g, " ");

    for (const { term } of TERM_DESTINATIONS) {
      expect(text.toLowerCase()).not.toMatch(
        new RegExp(`\\b${term.toLowerCase()}s?\\b`),
      );
    }
  });
});

/**
 * **A visual anchor beside the lede** (kolonie-website#133).
 *
 * `#133` names four landings the homepage links to and asks each for one
 * supporting visual next to its human-first lede — *the same system as the
 * homepage, not one-off art.* Three of the four are reachable from this
 * repository and all three are here; the fourth is recorded on the issue, since
 * `/atlas/` is served by `kolonie-platform` (`SERVED_BY_THE_API` in
 * `site-footer.ts`).
 *
 * **`/playbooks` left the list, and this is the whole reason.** `#124` wrote
 * that page here and it was asserted alongside the other two; `#115` moved the
 * route to the API (`kolonie-platform#1220`), because a catalogue rendered from
 * a table cannot sit under a built parent. A `*.built-test.ts` reads `dist/`,
 * and there is no longer a `dist/playbooks/index.html` to read — so the
 * assertion moved with the page rather than being dropped: the transplanted
 * prose is covered by `playbook-pages.test.ts` in that repository, which is
 * where the bytes are now produced.
 *
 * **It is a separate list from `LEDE_PAGES` above and stays one.** A lede is
 * what a page needs when a stranger lands on it; an anchor is what `#133`
 * decided two specific pages need. Folding them together would quietly make
 * every future lede owe a picture, which is the kind of rule that gets
 * satisfied with decoration.
 *
 * **Either shape counts, and that is the finding rather than a loophole.** The
 * register's anchor is an illustration because the claim it makes is one a
 * picture makes better; the Academy's is an icon row because its own picture is
 * `<AcademyGraph />` sixty lines down and a second image above it would be the
 * page's most expensive byte spent twice. `#133`'s own instruction is to prefer
 * icons and spend an illustration only where it earns the weight, so a test
 * that demanded one shape would be a test against the issue.
 */
describe("the lede anchors kolonie-website#133 asked for", () => {
  const ANCHORED = ["/academy/", "/the-register/"] as const;

  it.each(ANCHORED)("%s carries one, close enough to the lede to be its anchor", (route) => {
    const page = html(route);

    const end = page.indexOf("</div>", page.indexOf('<div class="lede'));
    expect(end).toBeGreaterThan(-1);

    // The window is what makes this an assertion about the *first screen*. A
    // picture eight paragraphs down is the state `/academy/` was already in when
    // `#133` was written, and it passed a naive "the page has an image" check.
    const afterLede = page.slice(end, end + 1200);

    expect(afterLede).toMatch(/<img\b|class="lede-icons/);
  });

  /**
   * The icon row's labels are text and its glyphs are hidden — the same call
   * `#132` made on the homepage cards. An icon beside the word it illustrates
   * that also announces itself reads that word twice.
   */
  it("draws the icon row from the set, decoratively", () => {
    const row = html("/academy/").match(/<ul class="lede-icons[\s\S]*?<\/ul>/)?.[0];

    expect(row, "no icon row on /academy/").toBeDefined();

    const icons = row!.match(/<svg\b[^>]*data-icon="[^"]+"/g) ?? [];
    expect(icons.length).toBeGreaterThanOrEqual(2);
    // Four is the ceiling `LedeIcons.astro` states: five is a navigation bar.
    expect(icons.length).toBeLessThanOrEqual(4);

    for (const icon of icons) expect(icon).toContain('aria-hidden="true"');

    // Every claim survives images being off, which is the whole reason the
    // glyphs are allowed to be decorative.
    // Astro scopes the component's styles, so the span carries a class here
    // that it does not carry in the source.
    const labels = row!.match(/<span[^>]*>([^<]+)<\/span>/g) ?? [];
    expect(labels).toHaveLength(icons.length);
    for (const label of labels) expect(label.replace(/<[^>]+>/g, "").trim().length).toBeGreaterThan(8);
  });
});
