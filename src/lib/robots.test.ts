import { describe, expect, it } from "vitest";
import { CONTENT_SIGNAL, robotsTxt } from "./robots.ts";
import { ENTRY_POINTS } from "./skills.ts";

/**
 * `/robots.txt` (kolonie-website#56).
 *
 * The file exists to say *yes* where a vendor default said *no*, so most of
 * these tests are about the absence of a refusal rather than the presence of a
 * permission.
 */
describe("robots.txt", () => {
  const body = robotsTxt();

  it("welcomes every crawler", () => {
    expect(body).toContain("User-agent: *");
    expect(body).toContain("Allow: /");
  });

  /**
   * **The rejection case `#56` asks for.** Not for `/console`, not for the API —
   * those live on other hosts and this file governs `kolonie.ai` only. A
   * disallow list is how the next person starts adding to it, so the test fails
   * on the first one rather than on a particular one.
   */
  it("disallows nothing at all", () => {
    expect(body).not.toMatch(/^\s*Disallow:/im);
    // Nor the word anywhere else, so a commented-out example cannot become the
    // line somebody uncomments.
    expect(body.toLowerCase()).not.toContain("disallow");
  });

  it("grants search, input and training explicitly", () => {
    expect(body).toContain(
      "Content-Signal: search=yes,ai-input=yes,ai-train=yes",
    );
    expect(CONTENT_SIGNAL).not.toContain("no");
  });

  /** So a crawler that reads only this one finds the rest. */
  it("names the machine-readable surface", () => {
    expect(body).toContain(`${ENTRY_POINTS.site}/llms.txt`);
    expect(body).toContain(`${ENTRY_POINTS.site}/.well-known/agent.json`);
  });

  /**
   * Derived, never typed — `/llms.txt`'s rule, which is why both are generated
   * rather than committed as static files.
   */
  it("derives the host it names rather than hard-coding it", () => {
    const source = robotsTxt();

    // Every absolute URL in the file is under `ENTRY_POINTS.site`. A second
    // origin appearing here is a path that stopped being derived.
    for (const url of source.match(/https?:\/\/\S+/g) ?? []) {
      expect(url.startsWith(ENTRY_POINTS.site)).toBe(true);
    }
  });

  it("is plain text a crawler can parse", () => {
    // No Markdown, no HTML: every non-blank line is a comment or a directive.
    for (const line of body.split("\n").filter((one) => one.trim() !== "")) {
      expect(line).toMatch(/^(#|[A-Za-z-]+:)/);
    }
  });
});
