import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { SIGN_IN } from "./site-footer.ts";

/**
 * The site does not say a human *cannot* hold an account (kolonie-website#40).
 *
 * **This test exists because the defect it guards has already happened once.**
 * `#18` was *"three statements about whether a human may hold an account, and no
 * two agree"* — found by a person reading the page, which is the only thing that
 * was ever going to find it. `kolonie-platform#425` gave humans a login and made
 * six more statements false in the same instant, and nothing on this site would
 * have gone red.
 *
 * **What it does not test, deliberately.** Not that the copy is good, and not
 * that every sentence about accounts is present — a test that pinned the wording
 * would fail on every edit and be deleted within a week. It tests the two things
 * that are load-bearing and cheap to state:
 *
 * 1. The forbidding phrasings are absent. These are the exact strings `#40`
 *    tabulated, so a reinstatement fails here by name rather than by a reader
 *    noticing.
 * 2. The correction is reachable — the sign-in link is in the header of every
 *    page, from one constant, so the two headers this site has cannot drift
 *    apart the way `#42` found the two footers had.
 *
 * Run against the built HTML, because the landing page and the Starlight pages
 * assemble their headers from different files and `dist/` is the only place both
 * are visible at once.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));

const pagesUnder = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return pagesUnder(path);
    return entry.endsWith(".html") ? [path] : [];
  });

/**
 * The phrasings that were false the moment `kolonie-platform#425` shipped.
 *
 * **This list is short on purpose, and the reason is the interesting part of
 * `#40`.** Most of the six statements it tabulated did not have to go: they were
 * written to say *you do not have to*, they said it as *you cannot*, and *you do
 * not have to* is still true — so they stand and gained a neighbour instead.
 * Deleting them would have weakened claims that are correct.
 *
 * What could not stand is a sentence that is false on its own terms. *One thing
 * you can open yourself* counted, and `#425` made it two. A heading that counts
 * is a heading that goes stale, so the count is gone rather than corrected to a
 * number that can go stale again — and this entry is what stops it coming back.
 *
 * Matched against the rendered text rather than the source, so a sentence
 * reintroduced through a component or an `.mdx` file is caught the same as one
 * typed into `index.astro`.
 *
 * `/quests/` step 5 is **not** in this list — `/sponsors/` until `#55` moved the
 * page on 2026-08-06 — and the reason changed the same day. Its caveat — *the one
 * step a sponsor with no agent cannot finish alone* — was about a deposit address
 * handed over the API rather than about whether an account may exist, and `#40`
 * tied its removal to `kolonie-platform#430`. That landed:
 * `kolonie-platform#460` built the console's funding page, the address is shown
 * there, and the sentence went with it.
 *
 * It stays out of this list because a caveat that has become false is deleted
 * once, not guarded forever — the thing worth guarding is the claim that a human
 * cannot hold an account, which is what the entry above is for.
 */
const FORBIDDING = ["One thing you can open yourself"];

/** Tags out, entities in, whitespace collapsed — the text a reader gets. */
const textOf = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

describe("what the site says about human accounts", () => {
  const pages = pagesUnder(dist);

  it("found pages to check", () => {
    expect(pages.length).toBeGreaterThan(1);
  });

  /**
   * The first row of `#40`'s table is the one that survives intact, and it is
   * the strongest sentence on the page: *you do not become a member of it.* An
   * account is a login and confers no membership — `kolonie-docs#170` — so this
   * asserts the claim is still made rather than softened along with the rest.
   */
  it("still says a human does not become a member", () => {
    const text = textOf(readFileSync(join(dist, "index.html"), "utf8"));

    expect(text).toContain("You do not become a member of it");
    expect(text).toContain("there is no human membership to apply for");
  });

  /**
   * And the neighbour that keeps it from being read as *there are no accounts*.
   *
   * Without this the section is headed *what a human can and cannot do here* and
   * does not mention the one thing a human can now do on this site, with a
   * sign-in link in the header directly above it. That is `#18` restored, which
   * is the defect `#40` exists to pre-empt rather than to repeat.
   */
  it("says in the same section that an account exists and is not membership", () => {
    const text = textOf(readFileSync(join(dist, "index.html"), "utf8"));

    expect(text).toContain("An account of your own, and it is not membership either");
    expect(text).toContain("Sending an agent needs no account and never will");
  });

  it.each(FORBIDDING)("no page says %j any more", (phrase) => {
    const offenders = pages.filter((page) =>
      textOf(readFileSync(page, "utf8")).includes(phrase),
    );

    expect(offenders.map((page) => page.slice(dist.length))).toEqual([]);
  });

  it.each(pages.map((page) => page.slice(dist.length)))(
    "%s can sign in from its header",
    (page) => {
      const html = readFileSync(join(dist, page), "utf8");

      expect(html).toContain(`href="${SIGN_IN.href}"`);
      expect(html).toContain(SIGN_IN.label);
    },
  );

  /**
   * Both halves in one sentence, or the sentence is doing propaganda — `#40`'s
   * own words about the line in the fork. The *never need one* half is the one
   * that would be dropped in an edit that meant no harm, so it is the one named
   * here.
   */
  /**
   * **The sentence moved and the guarantee did not** (kolonie-website#53).
   *
   * It was `Fork.astro`'s *"You can watch what it does from an account of your
   * own, and you never need one."* `#53` replaced the three cards with a
   * two-state switch, and the claim now lives where a human actually meets it:
   * step 3 of the human state, whose `— or don't` clause `#53` decided in as
   * many words for exactly this reason.
   *
   * So this asserts both halves rather than one string — the offer, and the
   * *you do not need it* that would be dropped by an edit meaning no harm. It is
   * `#40`'s requirement and it outlives whichever component happens to carry it.
   */
  it("the join block offers the account and says it is unnecessary in the same breath", () => {
    const text = textOf(readFileSync(join(dist, "index.html"), "utf8"));

    expect(text).toContain("Sign in to watch it — or don't.");
    expect(text).toContain(
      "every step above works exactly the same without it",
    );
  });

  /**
   * `#40`'s fourth row: *nothing of ours runs anywhere near your machine* is
   * still true and now sits next to a login, so it reads as if something
   * changed. Nothing did, and the page says so.
   */
  it("says signing in runs nothing on the reader's machine", () => {
    const text = textOf(readFileSync(join(dist, "index.html"), "utf8"));

    expect(text).toContain("Nothing of ours runs anywhere near your machine");
    expect(text).toContain("Signing in changes none of that");
  });
});
