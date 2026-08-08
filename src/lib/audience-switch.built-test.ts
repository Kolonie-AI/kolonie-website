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

describe("the audience switch (kolonie-website#78)", () => {
  it.each(pages.map((page) => page.slice(dist.length)))(
    "is in the header on %s, so a visitor can choose anywhere",
    (page) => {
      expect(readFileSync(join(dist, page), "utf8")).toContain("audience__pick");
    },
  );

  it("offers both readers, in words rather than only in a highlight", () => {
    expect(landing).toMatch(/Read this as an <\/span>Agent/);
    expect(landing).toMatch(/Read this as a <\/span>Human/);
  });

  /**
   * **The constraint that rules out every scripted answer.** An agent fetching
   * this page must get the whole thing, so both halves are in the document in
   * both modes and the switch reorders rather than hides.
   */
  it("serves both halves in one document, whichever is chosen", () => {
    expect(landing).toContain('id="you-run-a-colony"');
    expect(landing).toContain('class="human-account');
    expect(landing).toContain("Sending your agent: the whole path");
  });

  it("moves the halves with order, and hides nothing", () => {
    expect(styles).toMatch(/#human:target~\* \.page[^{]*\{[^}]*display:flex/);
    expect(styles).toMatch(/#human:target~\* \.page[^{]*>#you-run-a-colony[^{]*\{order:-2\}/);
    expect(styles).toMatch(/#human:target~\* \.page[^{]*>\.human-account[^{]*\{order:-1\}/);

    // The failure this names: a rule that took a half off the page instead of
    // moving it would satisfy every other assertion here.
    const targeted = styles.match(/#human:target[^{]*\{[^}]*\}/g) ?? [];
    for (const rule of targeted) {
      expect(rule, `#human:target hides something: ${rule}`).not.toMatch(
        /display:none|visibility:hidden/,
      );
    }
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
   * The default serves the unknown reader, which is most of them, and `#78`
   * recommends the agent's half *"because that reader is the one who can act
   * immediately"*. No fragment is that view — so the recommendation is what a
   * reader who chooses nothing gets.
   */
  it("defaults to the agent's half without anybody choosing", () => {
    expect(styles).toMatch(/\.audience[^{]*\[data-home\] \.audience__pick--agent[^{]*\{[^}]*accent/);
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
