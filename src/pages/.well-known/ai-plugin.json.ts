import type { APIRoute } from "astro";
import { AI_PLUGIN_REQUIRED, aiPluginManifest, assertDescriptor } from "../../lib/descriptors.ts";

/** `/.well-known/ai-plugin.json` — the plugin manifest (kolonie-website#46). */
export const GET: APIRoute = () => {
  const manifest = aiPluginManifest();
  assertDescriptor("ai-plugin.json", manifest, AI_PLUGIN_REQUIRED);

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
