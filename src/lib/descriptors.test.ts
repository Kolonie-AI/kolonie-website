import { describe, expect, it } from "vitest";
import {
  AGENT_CARD_REQUIRED,
  AI_PLUGIN_REQUIRED,
  FORBIDDEN_KEYS,
  MCP_DESCRIPTOR_REQUIRED,
  agentCard,
  aiPluginManifest,
  assertDescriptor,
  mcpDescriptor,
} from "./descriptors.ts";
import { ENTRY_POINTS, MCP_ENDPOINT } from "./skills.ts";
import { LLMS_SUMMARY } from "./llms.ts";

/** `kolonie-website#46`. */

const descriptors = [
  ["agent.json", agentCard(), AGENT_CARD_REQUIRED],
  ["mcp.json", mcpDescriptor(), MCP_DESCRIPTOR_REQUIRED],
  ["ai-plugin.json", aiPluginManifest(), AI_PLUGIN_REQUIRED],
] as const;

describe.each(descriptors)("%s", (name, document, required) => {
  it("is complete", () => {
    expect(() => assertDescriptor(name, document, [...required])).not.toThrow();
  });

  it("fails the build when a required field is missing", () => {
    // The rejection case `#46` asks for. `assertDescriptor` runs inside the
    // route, so this throw is a build failure rather than a 200 with half a
    // document in it — which is the outcome worth preventing: a runtime reads
    // it, finds no endpoint, and concludes the Colony has none.
    for (const key of required) {
      const broken = { ...(document as Record<string, unknown>) };
      delete broken[key];
      expect(() => assertDescriptor(name, broken, [...required])).toThrow(key);
    }
  });

  it("fails the build when a required field is present but empty", () => {
    const [first] = required;
    const emptied = { ...(document as Record<string, unknown>), [first]: "" };
    expect(() => assertDescriptor(name, emptied, [...required])).toThrow(first);
  });

  it("carries no pricing block and no key-issue flow", () => {
    for (const key of FORBIDDEN_KEYS) {
      const smuggled = { ...(document as Record<string, unknown>), [key]: "x" };
      expect(() => assertDescriptor(name, smuggled, [...required])).toThrow(key);
    }
    expect(() => assertDescriptor(name, document, [...required])).not.toThrow();
  });

  it("names no origin host and no IP address", () => {
    const serialised = JSON.stringify(document);
    // Every host in a descriptor is one of the three published addresses, or
    // the organisation on GitHub — the skill repositories are public and
    // `/llms.txt` already lists them.
    const allowed = [ENTRY_POINTS.site, ENTRY_POINTS.mcp, ENTRY_POINTS.api, "https://github.com/Kolonie-AI"];
    for (const url of serialised.match(/https?:\/\/[^"\s]+/g) ?? []) {
      expect(allowed.some((prefix) => url.startsWith(prefix))).toBe(true);
    }
    expect(serialised).not.toMatch(/\b\d{1,3}(\.\d{1,3}){3}\b/);
  });

  it("points at the MCP endpoint under the path form that answers", () => {
    const serialised = JSON.stringify(document);
    expect(serialised).toContain(MCP_ENDPOINT);
    // The bare host returned 404 when measured on 2026-08-06, so a descriptor
    // naming it without the path has handed a runtime a dead endpoint.
    expect(serialised).not.toMatch(new RegExp(`"${ENTRY_POINTS.mcp}"`));
  });

  it("says registration needs no credential", () => {
    expect(JSON.stringify(document).toLowerCase()).toContain("no credential");
  });

  it("omits the openapi key until kolonie-platform#442 serves one", () => {
    // Not a preference: a descriptor that names a document a runtime cannot
    // fetch is worse than one that does not name it.
    expect(JSON.stringify(document)).not.toContain("openapi.json");
  });
});

describe("the agent card", () => {
  const card = agentCard();

  it("declares MCP as its transport rather than an A2A transport it does not speak", () => {
    // Declaring `JSONRPC` would validate and be false: a runtime would open an
    // A2A session against an MCP server and get nothing.
    expect(card.preferredTransport).toBe("MCP");
    expect(card.url).toBe(MCP_ENDPOINT);
    expect(card.additionalInterfaces).toContainEqual({ url: MCP_ENDPOINT, transport: "MCP" });
  });

  it("gives every skill the four fields the schema requires", () => {
    expect(card.skills.length).toBeGreaterThan(0);
    for (const skill of card.skills) {
      expect(skill.id).toBeTruthy();
      expect(skill.name).toBeTruthy();
      expect(skill.description).toBeTruthy();
      expect(skill.tags.length).toBeGreaterThan(0);
    }
  });
});

describe("the descriptors and /llms.txt", () => {
  it("describe the Colony with the same sentence", () => {
    // One source, checked rather than trusted: `COLONY_DESCRIPTION` is what
    // both are built from, and this fails if the summary is reworded past it.
    expect(LLMS_SUMMARY).toContain("learn to act, earn, and govern themselves");
    expect(agentCard().description).toContain("learn to act, earn, and govern themselves");
  });
});
