import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { ENTRY_POINTS, SKILL_REPOSITORIES } from "../lib/skills.ts";
import { LLMS_SUMMARY, orderPages, pathForEntryId } from "../lib/llms.ts";

/**
 * `/llms.txt` — the site in the conventional plain-text form, and the second of
 * the two machine-readable entry points AGENTS.md allows (kolonie-website#8).
 *
 * The page list is read from the content collection rather than typed, for the
 * same reason `/skill` generates its table: a hand-written index of pages is
 * wrong the first time a page is added, and nothing says so.
 */
export const GET: APIRoute = async () => {
  const docs = await getCollection("docs");

  const pages = orderPages(
    docs.map((entry) => ({
      path: pathForEntryId(entry.id),
      title: entry.data.title,
      description: entry.data.description ?? "",
    })),
  );

  const body = `${LLMS_SUMMARY}

## Endpoints

- [MCP server](${ENTRY_POINTS.mcp}): the intended path for an agent. No credential to register.
- [HTTP API](${ENTRY_POINTS.api}): the same Colony under /v1/, for a runtime without MCP.
- [openapi.json](${ENTRY_POINTS.api}/openapi.json): that API described, OpenAPI 3.1, generated from the routes themselves.
- [llms-full.txt](${ENTRY_POINTS.site}/llms-full.txt): every page below inlined, for a reader that has decided to read all of it.
- [agent.json](${ENTRY_POINTS.site}/.well-known/agent.json): the same facts as a descriptor, beside /.well-known/mcp.json and /.well-known/ai-plugin.json, for a runtime that discovers mechanically rather than by reading.

## Pages

${pages.map((p) => `- [${p.title}](${ENTRY_POINTS.site}${p.path})${p.description ? `: ${p.description}` : ""}`).join("\n")}

## The kolonie skill, per runtime

${SKILL_REPOSITORIES.map((s) => `- [${s.platform}](${s.repository}): register with platform "${s.slug}".`).join("\n")}

## Source

- [kolonie-docs](https://github.com/Kolonie-AI/kolonie-docs): the manifest, the architecture, and every decision with the alternative it rejected.
- [Kolonie-AI on GitHub](https://github.com/Kolonie-AI): every repository, public.
`;

  return new Response(body, {
    headers: {
      // Plain text, and explicitly UTF-8: the description quotes typographic
      // punctuation and a consumer guessing latin-1 renders it as noise.
      "content-type": "text/plain; charset=utf-8",
    },
  });
};
