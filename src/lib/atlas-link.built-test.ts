import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ATLAS_PATH } from "./atlas.ts";

/**
 * The site links to the Atlas (kolonie-website#92).
 *
 * `kolonie.ai/atlas` answered `200` and **nothing on the site linked to it** —
 * not the landing page, not the footer's navigation column, not the header. A
 * reader found it by being told the URL.
 *
 * That mattered more after `kolonie-platform#590`: the catalogue went from three
 * entries to a hundred and eight, and the page the site's own claim points at
 * was the one page a reader could not reach.
 *
 * **Run against the built HTML**, because the landing page left the framework in
 * `#30` and the Starlight pages did not — so there are two footers, and `dist/`
 * is the only place both are visible at once. That is the drift `#42` found by
 * hand and this file exists so nobody has to again.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));

const pagesUnder = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return pagesUnder(path);
    return entry.endsWith(".html") ? [path] : [];
  });

/**
 * The footer of one page, isolated from its body.
 *
 * Without this the landing page would pass on its own in-body link and say
 * nothing about the column, which is the half that has to be on *every* page.
 */
const footerOf = (html: string): string => {
  const start = html.indexOf('<footer class="site-footer');
  return start === -1 ? "" : html.slice(start);
};

const linksToAtlas = (html: string): boolean =>
  html.includes(`href="${ATLAS_PATH}"`) || html.includes(`href="${ATLAS_PATH}/"`);

describe("finding the Atlas from the site", () => {
  const pages = pagesUnder(dist);

  it("built some pages to look at", () => {
    expect(pages.length).toBeGreaterThan(5);
  });

  /**
   * **Every page, from the one list both footers read.** `site-footer.ts` states
   * the rule its column follows — *every page on this site that a reader arrives
   * on, and nothing invented* — and the Atlas was the exception.
   */
  it("carries the link in the footer of every page, on both footers", () => {
    const missing = pages.filter((path) => {
      const footer = footerOf(readFileSync(path, "utf8"));
      return footer === "" || !linksToAtlas(footer);
    });

    expect(missing.map((path) => path.slice(dist.length))).toEqual([]);
  });

  /**
   * **Once, beside the claim it is evidence for**, and not as a new section:
   * `#87` is already about this page having one call to action too few and
   * eleven thousand pixels too many.
   */
  it("links to it from the landing page body, beside what an agent holds", () => {
    const html = readFileSync(join(dist, "index.html"), "utf8");
    const body = html.slice(0, html.indexOf('<footer class="site-footer'));

    expect(linksToAtlas(body)).toBe(true);
    // Beside the section that makes the claim, rather than anywhere on the page.
    const claim = body.indexOf("what-an-agent-can-prove-here");
    expect(claim).toBeGreaterThan(-1);
    expect(body.indexOf(`href="${ATLAS_PATH}"`, claim)).toBeGreaterThan(claim);
  });

  /**
   * `#92`: **no count typed into prose.** A figure ages on the next curation,
   * and `kolonie-platform#590` is the demonstration — its own list was twelve
   * longer than the number written beside it.
   *
   * The machine-readable files state a size because they *read* one; a page that
   * is not rebuilt when the catalogue changes must not.
   */
  it("states no provider count on the landing page", () => {
    const html = readFileSync(join(dist, "index.html"), "utf8");
    const body = html.slice(0, html.indexOf('<footer class="site-footer'));
    const text = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    for (const said of [
      "providers",
      "provider entries",
      "entries in the Atlas",
      "providers in the Atlas",
    ]) {
      expect(text).not.toMatch(new RegExp(`\\d+\\s+${said}`, "i"));
    }
  });
});
