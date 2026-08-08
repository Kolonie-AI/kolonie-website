import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The Human / Agent switch, and the three constraints that decided how it is
 * built (kolonie-website#78).
 *
 * **Every one of them is invisible to a reviewer looking at the page**, which is
 * why they are here. A scripted switch looks identical in a browser and fails
 * for an agent fetching the page; a switch that hides the other half looks
 * identical in a browser and serves half a document; a switch that remembers the
 * choice looks identical in a browser and sets something `governance/privacy.md`
 * says this site does not set.
 *
 * `#78`: *"Two routes, or one page with both halves present and one shown —
 * never a switch that hides content from a fetch."*
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));

const pagesUnder = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return pagesUnder(path);
    return entry.endsWith(".html") ? [path] : [];
  });

const pages = pagesUnder(dist);
const landing = readFileSync(join(dist, "index.html"), "utf8");

const styles = readdirSync(join(dist, "_astro"))
  .filter((file) => file.endsWith(".css"))
  .map((file) => readFileSync(join(dist, "_astro", file), "utf8"))
  .join("\n");

/**
 * **Does any `#human:target` rule take a half of the page off it**, as opposed
 * to moving it or turning the join block's lens (kolonie-website#78, #84).
 *
 * A function rather than an inline loop so that the test below can be run
 * against a stylesheet that *does* contain the failure — see the rejection case
 * beneath the assertion that uses it.
 *
 * The halves are `.page`'s own children, which is what makes the selector test
 * `\.page\s*>` rather than a list of the two class names: a third half added
 * tomorrow is covered without anybody remembering to add it here.
 */
const hidesAHalf = (css: string): boolean =>
  (css.match(/#human:target[^{]*\{[^}]*\}/g) ?? [])
    .filter((rule) => /\.page\s*>/.test(rule))
    .some((rule) => /display:\s*none|visibility:\s*hidden/.test(rule));

describe("the audience switch (kolonie-website#78)", () => {
  it.each(pages.map((page) => page.slice(dist.length)))(
    "is in the header on %s, so a visitor can choose anywhere",
    (page) => {
      expect(readFileSync(join(dist, page), "utf8")).toContain("audience__pick");
    },
  );

  it("offers both readers, in words rather than only in a highlight", () => {
    expect(landing).toMatch(/Read this as an <\/span>Agent/);
    expect(landing).toMatch(/Read this as a human — [^<]*<\/span>Human/);
  });

  /**
   * **The one clause `kolonie-website#84` let survive the hero's sentence**,
   * and it is asserted because it is invisible: it lives in the `sr-only` span
   * on the human pick, so nobody reviewing the page in a browser can tell
   * whether it is still there.
   *
   * `#84`: *"If anything survives from the sentence, it is one clause —*
   * already running several agents? *as the label on the human half of the
   * switch. Not a paragraph."*
   */
  it("names the operator on the human half, in the spoken label", () => {
    expect(landing).toContain("already running several agents?");
  });

  /**
   * **The duplication `#84` removed, asserted as an absence** — the two other
   * places the same question was asked inside the first screen. Both would
   * come back as an ordinary-looking edit, and both looked reasonable in
   * isolation, which is why the count is here rather than in a reviewer's head.
   */
  it("asks the question once on the page, not three times", () => {
    expect(landing).not.toContain("Arriving on your own?");
    expect(landing).not.toContain("This half is yours.");
    expect(landing).not.toContain("I'm an agent");
    expect(landing).not.toContain("I&#39;m an agent");

    // One control, and it is the header's: two picks, once per page.
    expect(landing.match(/class="audience__pick/g)).toHaveLength(2);
  });

  /**
   * **The constraint that rules out every scripted answer.** An agent fetching
   * this page must get the whole thing, so both halves are in the document in
   * both modes and the switch reorders rather than hides.
   */
  it("serves both halves in one document, whichever is chosen", () => {
    expect(landing).toContain('id="you-run-a-swarm"');
    expect(landing).toContain('class="human-account');
    expect(landing).toContain("Sending your agent: the whole path");
  });

  it("moves the halves with order, and hides nothing", () => {
    // Unqualified since `kolonie-website#86`: the ordered view is the default,
    // so the rules that produce it carry no fragment, and `#agent:target` is
    // what puts the halves back where the document has them.
    expect(styles).toMatch(/\.page[^{]*\{[^}]*display:flex/);
    expect(styles).toMatch(/\.page[^{]*>#you-run-a-swarm[^{]*\{order:-2\}/);
    expect(styles).toMatch(/\.page[^{]*>\.human-account[^{]*\{order:-1\}/);
    expect(styles).toMatch(
      /#agent:target~\* \.page[^{]*>#you-run-a-swarm[^{,]*,[^{]*\.human-account[^{]*\{order:0\}/,
    );

    // The failure this names: a rule that took a half off the page instead of
    // moving it would satisfy every other assertion here.
    //
    // **Scoped to the halves rather than to every `#human:target` rule**
    // (kolonie-website#84). The switch became the page's only audience control
    // when the join block's radios were removed, so it now also turns that
    // block's lens — and a lens over one artefact *does* show one of two
    // readings of it, which is what a lens is and what `#53` built. The
    // property that must not break is narrower and always was: **a half of the
    // page is never taken off it.** The halves are `.page`'s own children, and
    // `hidesAHalf` below is the whole of the distinction.
    expect(hidesAHalf(styles)).toBe(false);
  });

  /**
   * **The rejection case for the rule above**, and it exists because that rule
   * became a filter rather than a sweep. A filter that matches nothing passes
   * every assertion made about what it found, silently and for ever — so what
   * is checked here is that the filter still *catches* the failure it names,
   * against a stylesheet written to contain it.
   */
  it("still catches a rule that takes a half off the page", () => {
    expect(
      hidesAHalf("#human:target~* .page>#you-run-a-swarm{display:none}"),
    ).toBe(true);
    expect(
      hidesAHalf("#human:target~* .page>.human-account{visibility:hidden}"),
    ).toBe(true);

    // And does not fire on the lens, which is the case it was narrowed for.
    expect(hidesAHalf("#human:target~* [data-as=agent]{display:none}")).toBe(
      false,
    );
  });

  /**
   * `#78`: *"No JavaScript requirement."* The switch is two links and a
   * `:target`, so the whole of it has to be reachable with scripting off.
   */
  it("needs no JavaScript: it is two links and a fragment", () => {
    expect(landing).toContain('href="#agent"');
    expect(landing).toContain('href="#human"');
    expect(landing).toContain('<div id="agent">');
    expect(landing).toContain('<div id="human">');
  });

  /**
   * The anchors carry no `tabindex` and no `aria-hidden`, and both were tried.
   * `tabindex="-1"` makes a browser focus what it navigates to, and
   * `aria-hidden` on a focused element is an accessibility error — the pair is
   * worse than either alone.
   */
  it("does not focus an element it has hidden from assistive technology", () => {
    expect(landing).not.toMatch(/<div id="(agent|human)"[^>]*aria-hidden/);
  });

  /**
   * `#78`: *"No cookie, no account."* And nothing stored either — `#58` is what
   * `governance/privacy.md`'s sentence about `localStorage` and `sessionStorage`
   * cost, and a switch is exactly the feature that would reach for it.
   *
   * The choice lives in the URL instead, which is better than the session memory
   * `#78` asks for rather than worse: a reader who shares the link shares the
   * half they were reading.
   */
  it("remembers nothing anywhere", () => {
    const scripts = [...landing.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
      .map((match) => match[1] ?? "")
      .join("\n");

    expect(scripts).not.toMatch(/sessionStorage|localStorage|document\.cookie/);
    expect(scripts).not.toMatch(/audience|#human|#agent/);
  });

  /**
   * **The rhythm between sections has to be order-aware, or the reorder leaves
   * a hole** (kolonie-website#86).
   *
   * It was `.page section + section { margin-top }`, and an adjacent sibling is
   * a *document* relationship: the visually-first section carried a margin it
   * should not have, and whatever landed under the moved pair butted against it
   * with no gap. True of the `#human` view before `#86` and invisible, because
   * that view was nobody's default.
   *
   * `gap` is measured between flex items in paint order, which is the
   * relationship that was meant. Asserted rather than left to the eye because
   * the failure is a spacing bug in one view of one page.
   */
  it("spaces the sections in the order they are painted", () => {
    expect(styles).toMatch(/\.page[^{]*\{[^}]*gap:var\(--k-flow-section\)/);
    expect(styles).not.toMatch(/\.page[^{]*section\+section/);
  });

  /**
   * **The default serves the unknown reader, and which reader that is turned
   * round on `kolonie-website#86`.**
   *
   * `#78` recommended the agent's half *"because that reader is the one who can
   * act immediately"*. `#86` kept the fact and reversed the conclusion: acting
   * immediately is why the agent does not need the default. *"An agent that
   * finds this page will manage… The bottleneck is people."*
   *
   * So the lit pick with no fragment is the human's, and the agent's is lit
   * only under `#agent:target` — which is the assertion below, in both
   * directions, because a rule lighting neither would pass a check for one.
   */
  it("defaults to the human's half without anybody choosing", () => {
    expect(styles).toMatch(
      /\.audience[^{]*\[data-home\] \.audience__pick--human[^{]*\{[^}]*accent/,
    );
    expect(styles).toMatch(
      /#agent:target~\*[^{]*\.audience__pick--agent[^{]*\{[^}]*accent/,
    );

    // And the reverse is not also true: nothing lights the agent's pick before
    // the reader asks for it. This is the assertion that would have caught the
    // flip being made in one file and not the other.
    const unqualified = (styles.match(/[^}]*\{[^}]*\}/g) ?? []).filter(
      (rule) =>
        rule.includes(".audience__pick--agent") && !rule.includes(":target"),
    );
    expect(unqualified.join("\n")).not.toMatch(/accent-dim/);
  });

  /**
   * **No detection, and `#86` names it as a requirement rather than an
   * implication.** *"No detection, no guessing from a user agent. A default is
   * a default."*
   *
   * The site ships no server-side rendering per request and no script that
   * reads one, so this is a guard against the idea arriving later rather than
   * against something present — which is exactly when it would be added.
   */
  it("guesses nothing about who is reading", () => {
    const scripts = [...landing.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
      .map((match) => match[1] ?? "")
      .join("\n");

    // The three properties a page reaches for when it wants to guess. Not
    // `navigator.` as a whole: `Prompt.astro`'s copy button is
    // `navigator.clipboard`, which is an action the reader asked for and not a
    // guess about them.
    expect(scripts).not.toMatch(
      /navigator\.userAgent|navigator\.language|navigator\.platform/,
    );

    // And the existing guard's other half, stated here for the reason `#86`
    // gives rather than the reason `#78` gave: no script decides the audience
    // at all, however it worked it out.
    expect(scripts).not.toMatch(/#human|#agent|audience__pick/);
  });

  /**
   * Away from the landing page the switch is two links home, and neither is lit.
   * Lighting one would claim the current page had an audience it does not have.
   */
  it("points home from a page that has no halves, and marks neither as chosen", () => {
    const academy = readFileSync(join(dist, "academy", "index.html"), "utf8");

    expect(academy).toContain('href="/#human"');
    expect(academy).not.toMatch(/<nav class="audience[^>]*data-home/);
  });
});
