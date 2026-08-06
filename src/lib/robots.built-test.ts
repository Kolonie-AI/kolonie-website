import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `/robots.txt` as the build produced it (kolonie-website#56).
 *
 * Run **after** `astro build`, which is why this is `*.built-test.ts`. The unit
 * test beside it asserts what the function returns; this one asserts that the
 * route actually emitted a file, because a page that fails to build answers
 * `404` and a `404` here is exactly the state `#88` left behind and this issue
 * exists to end.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));

describe("the built /robots.txt", () => {
  const body = readFileSync(join(dist, "robots.txt"), "utf8");

  it("is there, and welcomes everything", () => {
    expect(body).toContain("User-agent: *");
    expect(body).toContain("Allow: /");
  });

  it("carries the content signal", () => {
    expect(body).toContain(
      "Content-Signal: search=yes,ai-input=yes,ai-train=yes",
    );
  });

  /** The rejection case, asserted against what ships rather than what compiles. */
  it("ships no Disallow line", () => {
    expect(body.toLowerCase()).not.toContain("disallow");
  });

  /**
   * The two files it points at have to exist, or the pointer is worse than no
   * pointer — the same property `llms-full.built-test.ts` asserts for its pair.
   */
  it("names two files the build actually produced", () => {
    expect(body).toContain("/llms.txt");
    expect(body).toContain("/.well-known/agent.json");
    expect(readFileSync(join(dist, "llms.txt"), "utf8").length).toBeGreaterThan(
      0,
    );
    expect(
      readFileSync(join(dist, ".well-known/agent.json"), "utf8").length,
    ).toBeGreaterThan(0);
  });
});
