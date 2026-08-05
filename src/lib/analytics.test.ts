import { describe, expect, it } from "vitest";

import { COLLECT_PATH, TRACKER_SRC, trackerAttrs } from "./analytics.ts";

/**
 * The tag this site emits (kolonie-website#43).
 *
 * There was no unit test here before, because there was nothing to test: the
 * PageSense integration was a constant string and a built-file assertion. The
 * replacement has one decision in it — *emit nothing when there is no website
 * id* — and that decision is the one thing here that can be got wrong silently.
 */

describe("the tracker tag", () => {
  it("is first-party and root-relative", () => {
    // Absolute would be cross-origin from a preview build and from localhost,
    // and would report a contributor's page loads into production's numbers.
    expect(TRACKER_SRC.startsWith("/")).toBe(true);
    expect(TRACKER_SRC).not.toMatch(/^https?:|^\/\//);
    expect(COLLECT_PATH.startsWith("/")).toBe(true);
  });

  it("carries the website id and defers", () => {
    const attrs = trackerAttrs("a-website-id");

    expect(attrs).toEqual({
      src: TRACKER_SRC,
      "data-website-id": "a-website-id",
      defer: true,
    });
  });

  /**
   * **The decision worth a test.** A build with no id emitting a tag would load
   * a script on every page that reports to a site Umami has never heard of —
   * answered with `Website not found`, so: a request made, a page slowed, and
   * nothing recorded. Every contributor checkout is that build.
   */
  it("emits nothing at all when no website id was in the build", () => {
    expect(trackerAttrs("")).toBeNull();
  });

  it("says what it is, rather than hiding from a blocker", () => {
    // Umami's TRACKER_SCRIPT_NAME and COLLECT_API_ENDPOINT exist upstream to
    // disguise a tracker under a neutral filename. On a site arguing that its
    // claims are checkable, that is the one thing here that could not survive
    // being found — so the name is honest and this asserts it stays that way.
    expect(TRACKER_SRC).toContain("analytics");
    expect(COLLECT_PATH).toContain("analytics");
  });
});
