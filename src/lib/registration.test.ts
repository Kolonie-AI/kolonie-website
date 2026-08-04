import { describe, expect, it } from "vitest";
import { healthUrl, loadRegistrationState } from "./registration.ts";

const answering = (
  body: unknown,
  init: ResponseInit = {},
): typeof globalThis.fetch =>
  (async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      headers: { "content-type": "application/json" },
      ...init,
    })) as unknown as typeof globalThis.fetch;

const refusing: typeof globalThis.fetch = (async () => {
  throw new TypeError("Failed to fetch");
}) as unknown as typeof globalThis.fetch;

const url = healthUrl("https://example.invalid");

describe("healthUrl", () => {
  it("builds the route from a bare base", () => {
    expect(healthUrl("https://api.example.invalid")).toBe(
      "https://api.example.invalid/health",
    );
  });

  it("does not double the slash on a base that carries one", () => {
    expect(healthUrl("https://api.example.invalid/")).toBe(
      "https://api.example.invalid/health",
    );
  });
});

describe("loadRegistrationState", () => {
  it("reads a healthy answer as open", async () => {
    expect(await loadRegistrationState(answering({ status: "ok" }), url)).toEqual(
      { outcome: "open" },
    );
  });

  /**
   * The case the issue was filed for, from the other side. Every assertion
   * below asserts the same thing: **nothing that is not a healthy answer may
   * come back as `open`**, because the page renders `open` as an invitation.
   */
  it("does not claim registration is open when the Colony cannot be reached", async () => {
    expect(await loadRegistrationState(refusing, url)).toEqual({
      outcome: "unknown",
      reason: "did not answer",
    });
  });

  it("does not claim registration is open on an error status", async () => {
    const result = await loadRegistrationState(
      answering({ status: "ok" }, { status: 503 }),
      url,
    );
    expect(result).toEqual({ outcome: "unknown", reason: "answered 503" });
  });

  it("does not claim registration is open on a body it cannot parse", async () => {
    const result = await loadRegistrationState(answering("not json"), url);
    expect(result.outcome).toBe("unknown");
  });

  /**
   * A proxy, a captive portal or a parked domain answers `200` with HTML all
   * day. Reading the body rather than the status is what stops any of them from
   * being rendered as the Colony inviting people in.
   */
  it("does not claim registration is open when something else answered 200", async () => {
    const result = await loadRegistrationState(
      answering("<html><body>hello</body></html>"),
      url,
    );
    expect(result.outcome).toBe("unknown");
  });

  it("does not claim registration is open when the Colony reports itself unhealthy", async () => {
    const result = await loadRegistrationState(
      answering({ status: "degraded" }),
      url,
    );
    expect(result).toEqual({
      outcome: "unknown",
      reason: "did not report itself healthy",
    });
  });

  it("never reports the Colony as closed, whatever went wrong", async () => {
    const outcomes = await Promise.all(
      [
        refusing,
        answering({ status: "ok" }, { status: 500 }),
        answering("not json"),
        answering({ status: "down" }),
      ].map((fetchImpl) => loadRegistrationState(fetchImpl, url)),
    );

    expect(outcomes.map((result) => result.outcome)).toEqual([
      "unknown",
      "unknown",
      "unknown",
      "unknown",
    ]);
  });
});
