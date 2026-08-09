import type { APIRoute } from "astro";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
// The pages are MDX, so the container needs the renderer that knows what that
// is. Without it every page renders as `NoMatchingRenderer` — which is a build
// failure rather than a silent empty file, and that is the right way round.
import mdxRenderer from "@astrojs/mdx/server.js";
import { getCollection, render } from "astro:content";
import { ENTRY_POINTS } from "../lib/skills.ts";
import { LLMS_SUMMARY, orderPages, pathForEntryId } from "../lib/llms.ts";
import { htmlToText, renderLlmsFull, type FullPage } from "../lib/llms-full.ts";
import { atlasSection, loadAtlas } from "../lib/atlas.ts";

/**
 * `/llms-full.txt` — the content half of `/llms.txt` (kolonie-website#47).
 *
 * The two answer different questions. `/llms.txt` is an index: what is here and
 * where do I go, for an agent deciding whether to bother. This is what it
 * actually says, for one that has decided and would otherwise fetch every page
 * and reassemble the site itself.
 *
 * Generated, for the reason `/llms.txt` gives in its own header: a hand-written
 * copy of the site's pages is wrong the first time a page is added, and nothing
 * says so. Both files read the same collection in the same order, and
 * `llms-full.built-test.ts` fails if a page reaches one and not the other.
 *
 * This is inside the entry-point exception in AGENTS.md rather than an
 * extension of it: the same convention, the adjacent conventional path, and not
 * a word of copy of its own — every sentence in it comes from a page that
 * already passed the site's own bar.
 */
export const GET: APIRoute = async () => {
  const container = await AstroContainer.create();
  container.addServerRenderer({ name: "astro:jsx", renderer: mdxRenderer });

  const entries = orderPages(
    (await getCollection("pages")).map((entry) => ({
      path: pathForEntryId(entry.id),
      title: entry.data.title,
      entry,
    })),
  );

  const pages: FullPage[] = [];
  for (const { path, title, entry } of entries) {
    const { Content } = await render(entry);
    const html = await container.renderToString(Content);
    pages.push({ path, title, text: htmlToText(html) });
  }

  /**
   * The Atlas, appended after the site's own pages (kolonie-website#75).
   *
   * **After rather than among them**, because it is not a page of this site: it
   * is a bounded index of somebody else's running catalogue, read at build time
   * and dated in the file for that reason. Interleaving it with the pages would
   * make the one section that can be stale look like the four that cannot.
   */
  const catalogue = await loadAtlas(fetch);

  return new Response(
    `${renderLlmsFull(LLMS_SUMMARY, pages, ENTRY_POINTS.site)}\n---\n\n${atlasSection(catalogue)}\n`,
    {
    headers: {
      // Plain text, and explicitly UTF-8, for the same reason `/llms.txt` says
      // so: the pages quote typographic punctuation throughout and a consumer
      // guessing latin-1 renders the whole document as noise.
        "content-type": "text/plain; charset=utf-8",
      },
    },
  );
};
