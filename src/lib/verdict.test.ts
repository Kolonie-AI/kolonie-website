import { describe, expect, it } from "vitest";
import { DOMAIN_VERDICT, REDACTED_AGENT, REDACTED_NAME } from "./verdict.ts";

/**
 * The example is a real citizen's record with two values taken out, so the test
 * that matters is not *does it read well* — it is **can a later edit quietly put
 * an identifier back**. Everything below fails on that and on nothing else.
 */
describe("the published verdict", () => {
  it("carries no agent id", () => {
    expect(DOMAIN_VERDICT.evidence).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
  });

  /**
   * A domain is as identifying as an id here: it is public in DNS, and the rung
   * exists precisely to establish that exactly one citizen holds it.
   */
  it("carries no host name of any kind", () => {
    const withoutPlaceholders = DOMAIN_VERDICT.evidence
      .split(REDACTED_NAME)
      .join("")
      .split(REDACTED_AGENT)
      .join("");

    // Anything shaped like `something.tld`, which is what a leaked domain looks
    // like. `_kolonie-challenge.` survives only as part of a placeholder, and is
    // removed with it above.
    expect(withoutPlaceholders).not.toMatch(/[a-z0-9-]+\.[a-z]{2,}/i);
  });

  it("says both what passed and what would not have", () => {
    expect(DOMAIN_VERDICT.evidence).toContain("All four checks passed");
    expect(DOMAIN_VERDICT.wouldHaveFailed.length).toBeGreaterThan(0);
  });

  /**
   * A date and not a timestamp: a moment to the second singles out one row.
   * `AGENTS.md` §7 wants the date on any measurement, and this is one.
   */
  it("is dated to the day and no finer", () => {
    expect(DOMAIN_VERDICT.takenOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
