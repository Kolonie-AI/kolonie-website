import type { APIRoute } from "astro";
import { AGENT_CARD_REQUIRED, agentCard, assertDescriptor } from "../../lib/descriptors.ts";

/**
 * `/.well-known/agent.json` — the A2A agent card (kolonie-website#46).
 *
 * The validation is deliberately in the route: it runs at build time, so an
 * incomplete card fails the build instead of being served as a well-formed
 * document with nothing in it.
 */
export const GET: APIRoute = () => {
  const card = agentCard();
  assertDescriptor("agent.json", card, AGENT_CARD_REQUIRED);

  return new Response(JSON.stringify(card, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
