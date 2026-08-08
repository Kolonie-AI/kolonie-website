import type { APIRoute } from "astro";
import { sitemapIndex, sitemapSources } from "../lib/sitemap.ts";

/**
 * `/sitemap.xml` — a sitemap index, and the site had neither (kolonie-website#75).
 *
 * See `src/lib/sitemap.ts` for why this is an index rather than one file: two
 * generators produce these URLs, and a single file would mean baking a copy of
 * the Atlas catalogue into the build.
 */
export const GET: APIRoute = () =>
  new Response(sitemapIndex(sitemapSources()), {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
