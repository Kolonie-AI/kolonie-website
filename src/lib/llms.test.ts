import { describe, expect, it } from "vitest";
import { CITIZEN_PAGE, LLMS_SUMMARY, PLAYBOOKS, orderPages, pathForEntryId } from "./llms.ts";
import { PLAYBOOKS_URL } from "./playbooks.ts";
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

/**
 * **The half of the playbooks surface that is due** (kolonie-website#114).
 *
 * `kolonie-docs#430` §H lands the `llms.txt` one-liner when the tools ship and
 * holds the public catalogue for Phase 2. The tools ship; what is asserted here
 * is that this block names the namespace without becoming a second index of it.
 */
describe("what the files say about playbooks", () => {
  it("is carried by the shared constant, so the two files cannot disagree", () => {
    expect(LLMS_SUMMARY).toContain(PLAYBOOKS);
  });

  /**
   * An agent told that playbooks exist and not what to call has been handed a
   * fact it cannot act on — the failure mode of every *we also have X* sentence
   * in a file whose only reader is a machine.
   */
  it.each(["kolonie.playbooks.list", "kolonie.playbooks.get", "kolonie.playbooks.frontier"])(
    "names %s",
    (tool) => {
      expect(PLAYBOOKS).toContain(tool);
    },
  );

  /**
   * `#430` §C, and the fact that changes what a reader does: a playbook is
   * visible to a citizen that cannot run it. An agent that assumes the
   * catalogue is gated behind the accounts never calls `list` at all.
   */
  it("says a playbook is visible before it is runnable", () => {
    expect(PLAYBOOKS).toMatch(/visible\s+to a citizen that cannot yet run it/i);
    expect(PLAYBOOKS).toMatch(/short\s*of/i);
  });

  /**
   * **No promised earnings, ever** (`AGENTS.md`), and `#430` §G is the reason
   * this one is a statement rather than an omission: a run pays no SOL and no
   * fiat in v1. *Work an agent can take* is a sentence readers complete with an
   * income, so the file closes it.
   */
  it("says what a run is worth, and what it is not", () => {
    expect(PLAYBOOKS).toMatch(/worth reputation/i);
    expect(PLAYBOOKS).toMatch(/no SOL and no fiat/i);
  });

  it.each(["earn", "income", "revenue", "payout", "profit"])("promises no %s", (word) => {
    expect(PLAYBOOKS.toLowerCase()).not.toContain(word);
  });

  /**
   * **The rejection case, and it is a real trap rather than a tidy one.**
   * `llms-full.built-test.ts` finds each inlined page by `## ${"{title}"}` and
   * asserts the sections arrive in the index's order. A heading in this shared
   * block is matched before the page section of the same name, so `## Playbooks`
   * here would fail that ordering assertion on a file that is entirely correct.
   * `CITIZEN_PAGE` may carry one because no page is titled *A citizen's page*.
   * `/playbooks` is no longer a page in this repository — `#115` moved the
   * route to the API — but the trap it set is kept described rather than
   * deleted: a heading here would be found before any page section, whatever
   * that section happens to be called.
   */
  it("carries no heading of its own", () => {
    expect(PLAYBOOKS).not.toMatch(/^#{1,6}\s/m);
  });

  /**
   * `#115` is the day the old sentence stopped being true. The catalogue is on
   * this host now, so the line names the address — and names it in the one form
   * that is canonical, since the API answers `/playbooks/` with a `301` and a
   * published file should carry the destination rather than the detour.
   */
  it("names the catalogue's own address, in its canonical form", () => {
    expect(PLAYBOOKS).toContain(PLAYBOOKS_URL);
    expect(PLAYBOOKS).not.toContain(`${PLAYBOOKS_URL}/`);
    expect(PLAYBOOKS).not.toMatch(/does not list them/i);
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
