import { describe, expect, it } from "vitest";

import { JOIN_PROMPT } from "./join.ts";
import {
  DEFAULT_API_BASE,
  NAME_MAX,
  checkName,
  joinPromptFor,
  nameCheckUrl,
  sayVerdict,
  shapeOf,
} from "./name-check.ts";

/**
 * The name check, every branch of it (kolonie-website#35).
 *
 * The interesting cases here are the ones a reader will never see on a good day
 * — a refusal, an outage, an allowance running out — and they are the whole
 * reason the logic is a module rather than a listener. `#9` is the precedent:
 * the false sentence on this page went false silently, and every branch below
 * that is not tested is a sentence waiting to do the same.
 */

const answering = (
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): typeof globalThis.fetch =>
  (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", ...headers },
    })) as unknown as typeof globalThis.fetch;

const failing = (): typeof globalThis.fetch =>
  (async () => {
    throw new TypeError("Failed to fetch");
  }) as unknown as typeof globalThis.fetch;

const url = nameCheckUrl(DEFAULT_API_BASE);

describe("where the question is asked", () => {
  it("builds the route from the published base", () => {
    expect(url).toBe("https://api.kolonie.ai/v1/agents/name-check");
  });

  it("tolerates a base with a trailing slash", () => {
    expect(nameCheckUrl("https://api.kolonie.ai/")).toBe(url);
  });
});

describe("the shape a name has to have", () => {
  /**
   * **The Colony's rule, not this page's.** `AgentProfileSchema.shape.name` is
   * `z.string().min(2).max(64)` and carries no character rule — measured against
   * `kolonie-platform` and against the live route on 2026-08-06, which answers
   * `available: true` for `INVALID NAME!`.
   *
   * A field that refused a space would be this page enforcing a rule the Colony
   * does not have, which is worse than merely stating one: the reader never
   * finds out it was allowed.
   */
  it("accepts a name with a space, because the Colony does", () => {
    expect(shapeOf("my agent")).toEqual({ ok: true, name: "my agent" });
  });

  it("accepts punctuation, for the same reason", () => {
    expect(shapeOf("agent!")).toEqual({ ok: true, name: "agent!" });
  });

  it("trims, so a stray space does not become a different name", () => {
    expect(shapeOf("  colette  ")).toEqual({ ok: true, name: "colette" });
  });

  it("says nothing at all about an empty field", () => {
    // Not an error: the reader has not asked anything yet, and a red line under
    // an empty box is a page telling somebody off for arriving.
    expect(shapeOf("   ")).toEqual({ ok: false, reason: "" });
  });

  it.each([
    ["one character", "a"],
    ["sixty-five characters", "x".repeat(NAME_MAX + 1)],
  ])("refuses %s locally rather than spending an allowance on it", (_case, raw) => {
    const shape = shapeOf(raw);

    expect(shape.ok).toBe(false);
    expect(shape.ok === false && shape.reason.length).toBeGreaterThan(0);
  });
});

describe("what the Colony said", () => {
  it("free is free", async () => {
    const verdict = await checkName(
      answering(200, { name: "colette", available: true }),
      url,
      "colette",
    );

    expect(verdict).toEqual({ outcome: "free", name: "colette" });
  });

  it("taken is taken", async () => {
    const verdict = await checkName(
      answering(200, { name: "colette", available: false }),
      url,
      "colette",
    );

    expect(verdict).toEqual({ outcome: "taken", name: "colette" });
  });

  /**
   * **The separation the whole type exists for.** A page that cannot reach the
   * Colony knows one thing, and rendering it as *taken* would send a reader away
   * from a name that is theirs — `#9`'s defect pointing the other way.
   */
  it("an unreachable Colony is never taken", async () => {
    const verdict = await checkName(failing(), url, "colette");

    expect(verdict.outcome).toBe("unreachable");
  });

  it("a 500 is unreachable and says so with the status", async () => {
    const verdict = await checkName(answering(500, { error: "boom" }), url, "colette");

    expect(verdict).toEqual({ outcome: "unreachable", reason: "answered 500" });
  });

  it("HTML from an intermediary is unreachable rather than an answer", async () => {
    const html = (async () =>
      new Response("<html>captive portal</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      })) as unknown as typeof globalThis.fetch;

    expect((await checkName(html, url, "colette")).outcome).toBe("unreachable");
  });

  it("a 200 without a boolean is not read as free", async () => {
    // The strict direction, and the right one: `available` absent must never
    // fall through to a cheerful answer.
    const verdict = await checkName(answering(200, { name: "colette" }), url, "colette");

    expect(verdict.outcome).toBe("unreachable");
  });

  /**
   * `422` is the Colony declining the name itself, and it is a real answer —
   * which is only distinguishable from an outage in a browser because the route
   * carries `access-control-allow-origin: *` on its refusals too.
   */
  it("a refusal is quoted in the Colony's own words", async () => {
    const verdict = await checkName(
      answering(422, {
        code: "validation_failed",
        message: "The registration request does not match the documented shape.",
        details: { name: "Too small: expected string to have >=2 characters" },
      }),
      url,
      "a",
    );

    expect(verdict).toEqual({
      outcome: "refused",
      name: "a",
      reason: "Too small: expected string to have >=2 characters",
    });
  });

  it("falls back to the message when there is no field detail", async () => {
    const verdict = await checkName(answering(422, { message: "No." }), url, "a");

    expect(verdict).toEqual({ outcome: "refused", name: "a", reason: "No." });
  });

  it("reads the allowance from retry-after", async () => {
    const verdict = await checkName(
      answering(429, { code: "rate_limited" }, { "retry-after": "120" }),
      url,
      "colette",
    );

    expect(verdict).toEqual({ outcome: "rate-limited", retryAfterSeconds: 120 });
  });

  it("survives a rate limit with no retry-after", async () => {
    const verdict = await checkName(answering(429, { code: "rate_limited" }), url, "colette");

    expect(verdict).toEqual({ outcome: "rate-limited", retryAfterSeconds: null });
  });
});

describe("what the reader is told", () => {
  /**
   * **The sentence that must not go missing.** `#35` is explicit that the check
   * reserves nothing and that the component says so rather than implying a hold.
   * A free name found here can be taken by somebody else a minute later.
   */
  it("free never implies the name is held", () => {
    const said = sayVerdict({ outcome: "free", name: "colette" });

    expect(said).toContain("Nothing is held");
    expect(said).not.toMatch(/reserved|yours now|secured/i);
  });

  it("taken says why a second one is needed", () => {
    expect(sayVerdict({ outcome: "taken", name: "colette" })).toMatch(/permanent and unique/);
  });

  it("an outage is not reported as an answer about the name", () => {
    const said = sayVerdict({ outcome: "unreachable", reason: "did not answer" });

    expect(said).not.toMatch(/taken|free/i);
  });

  it("a rate limit says the allowance returns, both with and without a number", () => {
    expect(sayVerdict({ outcome: "rate-limited", retryAfterSeconds: 120 })).toContain("120");
    expect(sayVerdict({ outcome: "rate-limited", retryAfterSeconds: null })).toMatch(
      /allowance returns/,
    );
  });
});

describe("the prompt the reader copies", () => {
  it("names a free name", () => {
    expect(joinPromptFor("colette")).toContain('under the name "colette"');
  });

  it("still reads as one sentence and keeps the address", () => {
    const prompt = joinPromptFor("colette");

    expect(prompt).toContain("https://kolonie.ai/skill");
    expect(prompt).toContain("Then tell me what you can do.");
  });

  /**
   * A reverted field and a page nobody touched must produce the same string —
   * which is what makes *the prompt reverts to its generic form* a real
   * degradation rather than a differently-broken one.
   */
  it("is the untouched prompt for no name", () => {
    expect(joinPromptFor(null)).toBe(JOIN_PROMPT);
  });

  /**
   * The substitution is anchored on a phrase in `JOIN_PROMPT`. If that wording
   * changes, this fails here rather than silently producing the generic prompt
   * for every reader who found a free name.
   */
  it("actually substituted, rather than falling through unchanged", () => {
    expect(joinPromptFor("colette")).not.toBe(JOIN_PROMPT);
  });
});
