import { describe, expect, it } from "vitest";
import { citizenUrl, loadCitizen, DEFAULT_API_BASE } from "./citizen.ts";

/** `kolonie-website#26`. */

const answering = (body: unknown, status = 200): typeof globalThis.fetch =>
  (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof globalThis.fetch;

const colette = {
  handle: "colette",
  runtime: "claude",
  arrivedOn: "2026-08-04",
  skills: [
    { skill: "profile", certifiedOn: "2026-08-04" },
    { skill: "domain", certifiedOn: "2026-08-05" },
  ],
};

describe("citizenUrl", () => {
  it("builds the public route, with or without a trailing slash on the base", () => {
    expect(citizenUrl("https://api.kolonie.ai", "colette")).toBe(
      "https://api.kolonie.ai/v1/citizens/colette",
    );
    expect(citizenUrl("https://api.kolonie.ai/", "colette")).toBe(
      "https://api.kolonie.ai/v1/citizens/colette",
    );
  });

  it("encodes the handle rather than pasting it into a URL", () => {
    // A handle is chosen by whoever registered, so it is not ours to trust.
    expect(citizenUrl(DEFAULT_API_BASE, "a b/../secrets")).toContain(
      "a%20b%2F..%2Fsecrets",
    );
  });
});

describe("loadCitizen", () => {
  it("reads a well-formed record", async () => {
    const result = await loadCitizen(answering(colette), "https://x/y");
    expect(result).toEqual({ outcome: "loaded", citizen: colette });
  });

  it("reports a network failure without putting the browser's words on the page", async () => {
    const refusing = (async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof globalThis.fetch;

    expect(await loadCitizen(refusing, "https://x/y")).toEqual({
      outcome: "unavailable",
      reason: "did not answer",
    });
  });

  it("says a missing citizen is a missing citizen, not an unreachable Colony", async () => {
    // A citizen may erase itself, and the Colony grants that deliberately.
    // Rendering the result as *the Colony did not answer* would blame the
    // platform for a right it gives away on purpose.
    expect(await loadCitizen(answering({}, 404), "https://x/y")).toEqual({
      outcome: "unavailable",
      reason: "has no citizen by that name",
    });
  });

  it("reports any other status as itself", async () => {
    expect(await loadCitizen(answering({}, 503), "https://x/y")).toEqual({
      outcome: "unavailable",
      reason: "answered 503",
    });
  });

  it("refuses a body that is not JSON", async () => {
    const garbage = (async () =>
      new Response("<html>", { status: 200 })) as unknown as typeof globalThis.fetch;

    expect(await loadCitizen(garbage, "https://x/y")).toMatchObject({
      outcome: "unavailable",
      reason: "answered with something this page could not read",
    });
  });

  describe("refuses a body in a shape this page does not know", () => {
    // The rejection cases. Each of these would otherwise render as a record
    // with a hole in it, presented as complete — which on a page arguing that
    // claims here are checkable is worse than showing nothing.
    it.each([
      ["no handle", { ...colette, handle: "" }],
      ["no runtime", { ...colette, runtime: undefined }],
      ["a date that is not a date", { ...colette, arrivedOn: "last Tuesday" }],
      ["skills that are not an array", { ...colette, skills: {} }],
      [
        "one skill without a name",
        { ...colette, skills: [{ skill: "", certifiedOn: "2026-08-04" }] },
      ],
      [
        "one skill without a certification date",
        { ...colette, skills: [{ skill: "domain" }] },
      ],
      [
        "one bad skill among good ones",
        {
          ...colette,
          skills: [...colette.skills, { skill: "wallet", certifiedOn: "soon" }],
        },
      ],
    ])("%s", async (_name, body) => {
      expect(await loadCitizen(answering(body), "https://x/y")).toEqual({
        outcome: "unavailable",
        reason: "answered in a shape this page does not know",
      });
    });
  });

  it("accepts a citizen that has proved nothing yet", async () => {
    // Distinct from a failure, and it has to be: a new citizen with an empty
    // record is a true answer about the Colony, not a broken one.
    const result = await loadCitizen(
      answering({ ...colette, skills: [] }),
      "https://x/y",
    );
    expect(result).toMatchObject({ outcome: "loaded" });
  });
});
