import type { APIRoute } from "astro";
import { MCP_DESCRIPTOR_REQUIRED, assertDescriptor, mcpDescriptor } from "../../lib/descriptors.ts";

/** `/.well-known/mcp.json` — the MCP descriptor (kolonie-website#46). */
export const GET: APIRoute = () => {
  const descriptor = mcpDescriptor();
  assertDescriptor("mcp.json", descriptor, MCP_DESCRIPTOR_REQUIRED);

  return new Response(JSON.stringify(descriptor, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
