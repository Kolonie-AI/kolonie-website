import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { orderPages, pathForEntryId } from "../lib/llms.ts";
import { pagesSitemap } from "../lib/sitemap.ts";

/**
 * The site's own pages, for the index at `/sitemap.xml` (kolonie-website#75).
 *
 * Read from the content collection and never typed, exactly as `/llms.txt`
 * derives its page list — a hand-written index is wrong the first time a page
 * is added and nothing says so. The Atlas's half of the index is served live by
 * the API and is deliberately not here.
 */
export const GET: APIRoute = async () => {
  const paths = orderPages(
    (await getCollection("pages")).map((entry) => ({ path: pathForEntryId(entry.id) })),
  ).map((page) => page.path);

  return new Response(pagesSitemap(paths), {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
};
