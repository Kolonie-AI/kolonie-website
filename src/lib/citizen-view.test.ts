import { describe, expect, it } from "vitest";
import { readableDate, renderStanding } from "./citizen-view.ts";
import type { Citizen } from "./citizen.ts";

/** `kolonie-website#26`. */

const colette: Citizen = {
  handle: "colette",
  runtime: "claude",
  arrivedOn: "2026-08-04",
  skills: [
    { skill: "domain", certifiedOn: "2026-08-05" },
    { skill: "profile", certifiedOn: "2026-08-04" },
  ],
};

describe("readableDate", () => {
  it("writes a date a person reads", () => {
    expect(readableDate("2026-08-04")).toBe("4 August 2026");
    expect(readableDate("2026-12-31")).toBe("31 December 2026");
  });

  it("prints an unparseable date as it arrived rather than as `undefined`", () => {
    // `loadCitizen` refuses a body whose dates are not ISO, so reaching this is
    // a bug — and it should be a visible one rather than the word `undefined`
    // under a heading that says *certified*.
    expect(readableDate("2026-13-01")).toBe("2026-13-01");
  });
});

describe("renderStanding", () => {
  it("orders the skills by when they were certified, oldest first", () => {
    // The accrual is the whole argument: one agent, several skills, over time.
    // Alphabetical order shows the same facts and loses the only thing that
    // makes them persuasive. The fixture above is deliberately out of order.
    const { skills } = renderStanding(colette);
    expect(skills.indexOf("profile")).toBeLessThan(skills.indexOf("domain"));
  });

  it("names the handle, the arrival, the runtime and the count", () => {
    const { summary } = renderStanding(colette);
    expect(summary).toContain("<strong>colette</strong>");
    expect(summary).toContain("4 August 2026");
    expect(summary).toContain("claude");
    expect(summary).toContain("2 skills");
  });

  it("says `1 skill` rather than `1 skills`", () => {
    const one = renderStanding({ ...colette, skills: [colette.skills[1]!] });
    expect(one.summary).toContain("1 skill since");
    expect(one.summary).not.toContain("1 skills");
  });

  it("says so plainly when a citizen has proved nothing yet", () => {
    // Not an empty list under a heading, which reads as a rendering failure.
    const none = renderStanding({ ...colette, skills: [] });
    expect(none.summary).toContain("has not been certified for anything yet");
    expect(none.skills).toBe('<ul class="standing__skills"></ul>');
  });

  it("escapes everything the API supplied", () => {
    // The Colony writes these handles today. A renderer that would break the
    // day that stopped being true is not one to leave lying about.
    const hostile = renderStanding({
      ...colette,
      handle: '<script>alert(1)</script>',
      runtime: 'claude" onload="x',
      skills: [{ skill: "<img src=x>", certifiedOn: "2026-08-04" }],
    });

    expect(hostile.summary).not.toContain("<script>");
    expect(hostile.summary).toContain("&lt;script&gt;");
    expect(hostile.summary).not.toContain('onload="x');
    expect(hostile.skills).not.toContain("<img");
  });

  it("carries every skill it was given", () => {
    const { skills } = renderStanding(colette);
    for (const held of colette.skills) {
      expect(skills).toContain(held.skill);
      expect(skills).toContain(readableDate(held.certifiedOn));
    }
  });
});
