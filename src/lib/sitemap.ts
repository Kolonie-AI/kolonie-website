import { ATLAS_SITEMAP_URL } from "./atlas.ts";
import { ENTRY_POINTS } from "./skills.ts";

/**
 * `/sitemap.xml` — and there was not one (kolonie-website#75).
 *
 * The site had no sitemap of any kind, which mattered less while every page was
 * linked from the navigation. It matters now: `kolonie.ai/atlas` is hundreds of
 * pages rendered from a database by the API (`kolonie-platform#546`), and a
 * crawler that only follows links finds the index and none of the long tail.
 *
 * ## Why an index and not one file
 *
 * **Two generators produce these URLs and neither can produce the other's.**
 * This repository knows its own pages at build time and knows nothing about the
 * catalogue; the API knows every Atlas entry and is asked afresh on every
 * request. A single `/sitemap.xml` listing both would mean baking a copy of the
 * catalogue into the build — the copy this issue exists to avoid, and one that
 * goes stale between deploys with nothing saying so.
 *
 * A sitemap index is the standard mechanism for exactly this: `/sitemap.xml`
 * names `/sitemap-pages.xml`, which the build writes, and `/atlas/sitemap.xml`,
 * which the API serves live. A crawler follows both and sees every URL; each
 * half stays owned by the thing that knows it.
 *
 * **`<sitemapindex>` cannot also carry `<url>` elements**, which is why the
 * site's own pages moved into a second file rather than staying at the root.
 */

/** One entry in the index. */
export interface SitemapSource {
  readonly loc: string;
}

/** The five characters, escaped for XML rather than for HTML. */
export function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/**
 * The two sitemaps a crawler is pointed at.
 *
 * The Atlas's is absolute and on this same host — Traefik routes `/atlas*` to
 * the API, so it is one origin from a crawler's point of view and no
 * cross-domain sitemap rule applies.
 */
export function sitemapSources(): readonly SitemapSource[] {
  return [{ loc: `${ENTRY_POINTS.site}/sitemap-pages.xml` }, { loc: ATLAS_SITEMAP_URL }];
}

export function sitemapIndex(sources: readonly SitemapSource[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sources.map((source) => `<sitemap><loc>${xmlEscape(source.loc)}</loc></sitemap>`),
    "</sitemapindex>",
    "",
  ].join("\n");
}

/**
 * The site's own pages.
 *
 * Derived from the content collection, for the reason `/llms.txt` gives in its
 * own header: a hand-written index of pages is wrong the first time a page is
 * added, and nothing says so.
 *
 * **The root is added rather than derived, because it is not in the
 * collection.** The homepage is `src/pages/index.astro` and every other page is
 * an entry under `src/content/docs/`, so a sitemap built from the collection
 * alone omits the one URL every crawler starts at. `pathForEntryId` maps an
 * `index` entry to `/` and would cover this if one existed; none does.
 *
 * `/llms.txt` derives its page list the same way and has the same gap — the
 * homepage is missing from it too. That is a separate defect and is not fixed
 * here: its "Pages" section is deliberately *the docs collection*, and widening
 * it is a decision about that file rather than a consequence of this one.
 */
export function pagesSitemap(paths: readonly string[]): string {
  const all = paths.includes("/") ? paths : ["/", ...paths];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...all.map((path) => `<url><loc>${xmlEscape(`${ENTRY_POINTS.site}${path}`)}</loc></url>`),
    "</urlset>",
    "",
  ].join("\n");
}
