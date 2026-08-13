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
 *
 * ## There is no third entry for citizen pages, and that is decided
 *
 * Every citizen has a page at `kolonie.ai/@{handle}`, and this index does not
 * point at a sitemap of them because **no such sitemap exists** — not on this
 * host and not on the API's. The decision record `a-citizen-has-a-page.md` in
 * `kolonie-docs` settles both halves of that in its section 6:
 *
 * > **Refused, unchanged: any route that answers *who exists*, any ordering of
 * > citizens by anything, and any total.**
 *
 * and, for the one file that would be permitted:
 *
 * > With `noindex` as the default, a sitemap can only contain citizens who
 * > turned indexing on — so **what it publishes is a set of volunteers, not the
 * > population.** … **It is deliberately not built in the first pass.** On the
 * > day the feature ships nobody has switched indexing on, so the file is
 * > empty, and an empty file is not a decision anybody can review.
 *
 * `kolonie-platform#820` holds that file until there are real opt-ins to put in
 * it. **The omission is the state of the world, not a gap to close from here**:
 * a sitemap of volunteers can only be written by the process that knows who
 * volunteered, which is the API and never this build. When it exists, it joins
 * this list as a third `loc` and nothing else here changes.
 * `kolonie-website#109`.
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
 * an entry under `src/content/pages/`, so a sitemap built from the collection
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
