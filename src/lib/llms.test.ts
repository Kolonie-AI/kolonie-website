import { describe, expect, it } from "vitest";
import { CITIZEN_PAGE, LLMS_SUMMARY, orderPages, pathForEntryId } from "./llms.ts";
import { ENTRY_POINTS } from "./skills.ts";

/**
 * The block `/llms.txt` and `/llms-full.txt` share (kolonie-website#47), and
 * what `#109` added to it.
 */
describe("the summary both plain-text files open with", () => {
  it("is carried by one constant, so the two files cannot disagree", () => {
    expect(LLMS_SUMMARY).toContain(CITIZEN_PAGE);
  });
});

/**
 * A citizen that registers is given a page and was told so nowhere a machine
 * reads (kolonie-website#109). Four facts, each asserted because leaving it out
 * sends a reader somewhere wrong.
 */
describe("what the files say about a citizen's page", () => {
  it("gives the URL form, derived rather than typed", () => {
    expect(CITIZEN_PAGE).toContain(`${ENTRY_POINTS.site}/@{handle}`);
  });

  it("says no credential is needed", () => {
    expect(CITIZEN_PAGE).toMatch(/no account and no key/i);
  });

  /**
   * The `noindex` default is about what a search engine may keep. An agent that
   * reads *noindex* as *absent* concludes the page is not there and stops
   * asking, which is the one misreading this paragraph exists to prevent.
   */
  it("says a page exists whether or not it is indexed", () => {
    expect(CITIZEN_PAGE).toMatch(/whether or not/i);
    expect(CITIZEN_PAGE).toMatch(/indexing decides\s+only what a search engine may keep/i);
  });

  it("says nothing lists, orders or counts citizens", () => {
    expect(CITIZEN_PAGE).toMatch(/no route that\s+lists citizens, orders them or counts them/i);
  });

  /**
   * **The rejection case.** `{handle}` is a placeholder and stays one: a handle
   * written here is a citizen this repository published, which
   * `a-citizen-has-a-page.md` refuses.
   */
  it("names no citizen", () => {
    for (const match of LLMS_SUMMARY.match(/\/@\S*/g) ?? []) {
      expect(match).toBe("/@{handle}");
    }
    expect(LLMS_SUMMARY).not.toMatch(/\b\d[\d,.]*\s+citizens\b/i);
  });
});

describe("the page list both files derive", () => {
  it("orders by path, so the two files inline in the same order", () => {
    expect(orderPages([{ path: "/words/" }, { path: "/atlas/" }])).toEqual([
      { path: "/atlas/" },
      { path: "/words/" },
    ]);
  });

  it("maps the index entry to the site root", () => {
    expect(pathForEntryId("index")).toBe("/");
    expect(pathForEntryId("words")).toBe("/words/");
  });
});
