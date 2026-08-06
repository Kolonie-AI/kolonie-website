import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * **The prose face, read out of the built pages** (kolonie-website#48).
 *
 * `theme.test.ts` proves the *declaration* is sound: the stack opens on a
 * self-hosted family and depends on no variable from outside that file. It
 * cannot prove the declaration reaches a page, and that is the half the defect
 * lived in — `--k-font-prose` was correct-looking and resolved to the browser's
 * default serif on `/`, because the page it was correct on and the page it was
 * wrong on load their CSS through two different mechanisms.
 *
 * This site has two surfaces and they are built differently: `/` is
 * `src/pages/index.astro` with a bundled stylesheet import since `#30`, and the
 * documentation pages are Starlight's, with `theme.css` handed to it as
 * `customCss`. So the check is done per page, over the CSS that page actually
 * links, on one page of each kind — plus `/academy/` and `/skill/`, which `#48`
 * names because they are the two a stranger is most likely to arrive on.
 *
 * **The rejection case is the last assertion of each block**: if the stack's
 * first family is a generic one — `serif`, `sans-serif`, `system-ui` — the page
 * renders in whatever the visitor happens to have, which is the state this
 * issue was opened for, and this fails.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));
const read = (path: string) => readFileSync(join(dist, path), "utf8");

/** The four pages of #48's first acceptance criterion. */
const PAGES = [
  ["/", "index.html"],
  ["/skill/", "skill/index.html"],
  ["/academy/", "academy/index.html"],
  ["/terms/", "terms/index.html"],
] as const;

/**
 * Every rule the page would apply: the stylesheets it links, plus its own
 * inline `<style>` blocks. Read off the page rather than from a known path,
 * because which file the theme ends up in is a bundler's decision and a test
 * that hard-codes it is testing the bundler.
 */
const cssOf = (html: string) => {
  const linked = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)]
    .map((tag) => tag[0].match(/href="([^"]+)"/)?.[1])
    .filter((href): href is string => href !== undefined && href.startsWith("/"))
    .map((href) => read(href.slice(1)));

  const inline = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(
    (m) => m[1],
  );

  return [...linked, ...inline].join("\n");
};

describe.each(PAGES)("%s", (route, file) => {
  const html = read(file);
  const css = cssOf(html);

  it("loads CSS at all", () => {
    expect(css.length, `${route} links no stylesheet and has no inline style`).
      toBeGreaterThan(0);
  });

  it("declares --k-font-prose", () => {
    expect(css, `${route} never declares the prose face`).toMatch(
      /--k-font-prose:/,
    );
  });

  it("opens that stack on Inter, not on a generic family", () => {
    // The bundler minifies, so the quotes and the spacing are not fixed. What
    // is fixed is which family comes first.
    const declared = css.match(/--k-font-prose:\s*([^;}]+)/);
    expect(declared, `${route} never declares the prose face`).not.toBeNull();

    const first = declared![1].split(",")[0]!.trim().replace(/["']/g, "");
    expect(first).toBe("Inter");
  });

  it("serves Inter from this origin rather than fetching it", () => {
    expect(css).toMatch(/@font-face/);
    expect(css).toContain("/fonts/inter-latin-wght-normal.woff2");
    // A stack naming a family no `@font-face` declares is a stack that falls
    // back, which is indistinguishable from not having set one.
    expect(css).toMatch(/font-family:\s*["']?Inter["']?/);
  });

  it("preloads the face so the swap lands before first paint", () => {
    expect(html).toMatch(
      /<link[^>]+rel="preload"[^>]+\/fonts\/inter-latin-wght-normal\.woff2/,
    );
  });
});
