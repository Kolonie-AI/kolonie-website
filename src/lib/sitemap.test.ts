import { describe, expect, it } from "vitest";
import { pagesSitemap, sitemapIndex, sitemapSources, xmlEscape } from "./sitemap.ts";
import { ATLAS_SITEMAP_URL } from "./atlas.ts";

/**
 * `/sitemap.xml`, which this site did not have (kolonie-website#75).
 *
 * It matters now because `kolonie.ai/atlas` is hundreds of pages rendered from a
 * database, and a crawler that only follows links finds the index and none of
 * the long tail.
 */
describe("the sitemap index", () => {
  const index = sitemapIndex(sitemapSources());

  /**
   * **Two generators, and neither can produce the other's URLs.** A single file
   * would mean baking a copy of the catalogue into the build.
   */
  it("names this site's pages and the Atlas's own sitemap", () => {
    expect(index).toContain("/sitemap-pages.xml");
    expect(index).toContain(ATLAS_SITEMAP_URL);
  });

  /** `<sitemapindex>` cannot also carry `<url>` — that is why the pages moved. */
  it("is an index and carries no url element", () => {
    expect(index).toContain("<sitemapindex");
    expect(index).not.toContain("<url>");
  });

  it("escapes for XML rather than for HTML", () => {
    expect(xmlEscape("a&b'c")).toBe("a&amp;b&apos;c");
  });
});

describe("the site's own pages sitemap", () => {
  /**
   * The homepage is `src/pages/index.astro` and not a collection entry, so a
   * sitemap derived from the collection alone omits the one URL every crawler
   * starts at.
   */
  it("includes the site root, which the collection does not contain", () => {
    expect(pagesSitemap(["/skill/"])).toContain("<loc>https://kolonie.ai/</loc>");
  });

  it("does not add the root twice if it was given", () => {
    const body = pagesSitemap(["/", "/skill/"]);

    expect(body.match(/<loc>https:\/\/kolonie\.ai\/<\/loc>/g)).toHaveLength(1);
  });

  it("makes every path absolute", () => {
    const body = pagesSitemap(["/", "/skill/"]);

    expect(body).toContain("<loc>https://kolonie.ai/</loc>");
    expect(body).toContain("<loc>https://kolonie.ai/skill/</loc>");
  });

  it("is a urlset and not an index", () => {
    expect(pagesSitemap(["/"])).toContain("<urlset");
  });
});
