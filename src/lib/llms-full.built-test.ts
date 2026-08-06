import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `/llms-full.txt` as the build produced it (kolonie-website#47).
 *
 * Run **after** `astro build`, which is why this is `*.built-test.ts` — the
 * ordinary suite runs before the build and would read whatever `dist/` was
 * lying around.
 *
 * **This is the rejection case `#47` asks for**, and it has to be here rather
 * than in a unit test: *a page added to the collection and absent from the
 * output fails*. Nothing in the source can promise that, because the two files
 * read the collection at build time. What can promise it is the built pair —
 * every page `/llms.txt` indexes must appear in `/llms-full.txt`, so a page
 * that reaches one and not the other fails before it ships.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));
const read = (name: string) => readFileSync(join(dist, name), "utf8");

describe("the built /llms-full.txt", () => {
  const index = read("llms.txt");
  const full = read("llms-full.txt");

  // The `## Pages` section of `/llms.txt`, which is the list this file has to
  // match. Parsed rather than hard-coded: a hard-coded list is the drift both
  // files exist to avoid.
  const indexed = [...index.matchAll(/^- \[([^\]]+)\]\(https:\/\/kolonie\.ai(\/[^)]*)\)/gm)]
    .map(([, title, path]) => ({ title, path }))
    .filter(({ path }) => !path.startsWith("/llms"));

  it("indexed some pages at all", () => {
    // An assertion over an empty list passes, and Astro emits a site with no
    // pages without complaint if the collection is misconfigured.
    expect(indexed.length).toBeGreaterThan(1);
  });

  it("opens with the same summary block as /llms.txt", () => {
    const summary = index.slice(0, index.indexOf("\n## Endpoints"));
    expect(full.startsWith(summary)).toBe(true);
  });

  it.each(indexed.map(({ title, path }) => [path, title]))(
    "inlines %s with its content",
    (path, title) => {
      expect(full).toContain(`## ${title}`);
      expect(full).toContain(`URL: https://kolonie.ai${path}`);
    },
  );

  it("lists the pages in the order /llms.txt lists them", () => {
    const positions = indexed.map(({ title }) => full.indexOf(`## ${title}`));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("carries more than the index does", () => {
    // `/llms.txt` is titles and descriptions. If this file is not several times
    // its size, the bodies did not arrive — which is what an empty container
    // render looks like, and it is otherwise a perfectly well-formed file.
    expect(full.length).toBeGreaterThan(index.length * 5);
  });

  it("is linked from /llms.txt", () => {
    expect(index).toContain("https://kolonie.ai/llms-full.txt");
  });

  it("contains no markup, no frontmatter and no unrendered expression", () => {
    expect(full).not.toMatch(/<\/?[a-z][a-z0-9-]*(\s|>|\/)/i);
    // Not a bare `---`: that is this file's own rule between two pages. Raw
    // frontmatter is a `---` with the collection's keys under it.
    expect(full).not.toMatch(/^---\n(title|description|template|head):/m);
    expect(full).not.toMatch(/^import .* from ['"]/m);
    expect(full).not.toMatch(/\{\/\*/);
    expect(full).not.toMatch(/\{entity\.|\{JURISDICTION\}/);
  });
});
