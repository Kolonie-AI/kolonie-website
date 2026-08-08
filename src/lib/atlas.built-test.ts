import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The Atlas on the machine-readable surface, as the build produced it
 * (kolonie-website#75).
 *
 * Run **after** `astro build`, which is why this is `*.built-test.ts`. The unit
 * tests beside it assert what the functions return; these assert that the routes
 * emitted files at all — a route that fails to build answers `404`, and a
 * pointer to a `404` is worse than no pointer.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));
const read = (name: string) => readFileSync(join(dist, name), "utf8");

describe("what the build shipped", () => {
  it("names the Atlas in /llms.txt", () => {
    const body = read("llms.txt");

    expect(body).toContain("https://kolonie.ai/atlas");
    expect(body).toContain("The Atlas");
  });

  /**
   * The catalogue is somebody else's running service, so a build with it
   * unreachable is expected and must still produce the section. What is asserted
   * is the pointer, which is true either way.
   */
  it("carries an Atlas section in /llms-full.txt, reachable catalogue or not", () => {
    const body = read("llms-full.txt");

    expect(body).toContain("## The Atlas");
    expect(body).toContain("https://kolonie.ai/atlas/catalogue.json");
  });

  it("ships a sitemap index naming both halves", () => {
    const body = read("sitemap.xml");

    expect(body).toContain("<sitemapindex");
    expect(body).toContain("https://kolonie.ai/sitemap-pages.xml");
    expect(body).toContain("https://kolonie.ai/atlas/sitemap.xml");
  });

  /** The file the index points at has to exist, or the pointer is worse than none. */
  it("ships the pages sitemap the index names", () => {
    const body = read("sitemap-pages.xml");

    expect(body).toContain("<urlset");
    expect(body).toContain("<loc>https://kolonie.ai/</loc>");
  });

  it("points robots.txt at the sitemap index", () => {
    expect(read("robots.txt")).toContain("Sitemap: https://kolonie.ai/sitemap.xml");
  });
});
