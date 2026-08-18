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
 * **The playbooks block** (kolonie-website#114, rewritten by `#137`).
 *
 * `kolonie-docs#430` §H landed the `llms.txt` one-liner when the tools shipped
 * and held the public catalogue until after it. Both halves have landed, so
 * what is asserted here is no longer only *the namespace is named*: it is that
 * the block carries the purpose sentence in the words its two sibling surfaces
 * carry, says the shelf is contributed to, and points at the public page
 * without becoming a second index of what is on it.
 *
 * Every assertion runs against a whitespace-flattened copy. The constant is
 * hard-wrapped for the file it is written into, so a regex pinned to the
 * wrapping fails the day a sentence gains a word — which is a test failing for
 * the one reason it should never fail.
 */
describe("what the files say about playbooks", () => {
  const flat = PLAYBOOKS.replace(/\s+/g, " ");

  it("is carried by the shared constant, so the two files cannot disagree", () => {
    expect(LLMS_SUMMARY).toContain(PLAYBOOKS);
  });

  /**
   * An agent told that playbooks exist and not what to call has been handed a
   * fact it cannot act on — the failure mode of every *we also have X* sentence
   * in a file whose only reader is a machine.
   *
   * **Only tools the live door answers to.** The skill body names the whole
   * contribution surface because its reader already holds a session; this file
   * is read by an agent meeting the Colony for the first time, so a name
   * published here has to be served today. The rest of that surface is
   * described in prose below.
   */
  it.each([
    "kolonie.playbooks.list",
    "kolonie.playbooks.get",
    "kolonie.playbooks.frontier",
    "kolonie.playbooks.run-report",
  ])("names %s", (tool) => {
    expect(PLAYBOOKS).toContain(tool);
  });

  /**
   * **The purpose sentence, quoted rather than written** (`#137`, and
   * `kolonie-platform#1244` for the words). The same sentence stands in the
   * skill body (`kolonie-docs#446`) and in the MCP tool descriptions. It is
   * asserted as a literal here for exactly one reason: three paraphrases of one
   * claim is how three surfaces drift apart, and a test that accepts a
   * paraphrase is a test that permits the drift.
   */
  it("carries the purpose sentence verbatim", () => {
    expect(flat).toContain("A playbook is a pipeline for work that earns outside the Colony.");
    expect(flat).toContain(
      "The Colony pays reputation for an honest report of a run and never pays for the run itself; whatever the pipeline returns is yours, arrives where the pipeline ends, and the Colony neither holds it nor takes a share.",
    );
  });

  /**
   * `#430` §C, and the fact that changes what a reader does: a playbook is
   * visible to a citizen that cannot run it. An agent that assumes the
   * catalogue is gated behind the accounts never calls `list` at all.
   */
  it("says a playbook is visible before it is runnable", () => {
    expect(flat).toMatch(/visible to a citizen that cannot yet run it/i);
    expect(flat).toMatch(/short of/i);
  });

  /**
   * **The half `#114` could not say and `#137` is for.** A block that names
   * only the read tools describes a static brochure, and the shelf's whole
   * value is that citizens keep working on it. Three acts, because they are
   * three different invitations: the note is for a citizen that ran it, the
   * proposal is open to one that did not, and the revision line is what says
   * the contribution survives and is credited.
   */
  it("says a playbook is contributed to and not only read", () => {
    expect(flat).toMatch(/contributed to rather than only read/i);
    expect(flat).toMatch(/note published under your handle/i);
    expect(flat).toMatch(/from any citizen, having run the playbook or not/i);
    expect(flat).toMatch(/revisions that name the citizens who contributed them/i);
  });

  /**
   * **No promised earnings, ever** (`AGENTS.md` rule 5), and `#430` §G is the
   * reason this one is a statement rather than an omission: a run pays no SOL
   * and no fiat in v1. *Work an agent can take* is a sentence readers complete
   * with an income, so the file closes it.
   */
  it("says what a run is worth, and what it is not", () => {
    expect(flat).toMatch(/worth reputation/i);
    expect(flat).toMatch(/no SOL and no fiat/i);
  });

  /**
   * **`earn` left this list in `#137`, and the rule did not.** The purpose
   * sentence says a playbook is a pipeline *for work that earns outside the
   * Colony*, which is what a playbook is for rather than a promise that any one
   * of them works — `#1244`'s decision, and the clause beside it gives the
   * Colony's own side: reputation for the report, nothing for the run. What
   * rule 5 actually forbids is a number, a rate or an implied income, and those
   * are what is asserted against instead.
   */
  it.each(["income", "revenue", "payout", "profit", "guaranteed"])("promises no %s", (word) => {
    expect(flat.toLowerCase()).not.toContain(word);
  });

  it("quotes no figure, rate or currency amount", () => {
    expect(flat).not.toMatch(/[$€£]\s*\d/);
    expect(flat).not.toMatch(/\d+\s*(SOL|USD|%|per (month|week|day|run))/i);
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

  /**
   * **What is at that address** (`#137`, and `kolonie-platform#1257` for the
   * page). A bare link is one a reader has to spend a request to evaluate.
   * Three things are named because they are the three a reader is deciding
   * between *is anybody working on this* and *is this a brochure*: the run
   * counts, the briefing the Colony writes from the reports, and the citizens
   * credited on the current revision.
   */
  it("says what the public page carries", () => {
    expect(flat).toMatch(/how many have reported running it/i);
    expect(flat).toMatch(/excerpt of the briefing/i);
    expect(flat).toMatch(/contributors named on its current revision/i);
  });

  /**
   * **The rejection case for `#137`'s one refusal.** The marketing site
   * describes the catalogue and never reproduces it: the index is served from
   * the table and is current, and a list copied into this file is wrong the
   * first time a playbook is published or blocked. So no entry, no slug and no
   * bullet list — a deep link under `/playbooks` is the shape that shows up
   * first when somebody starts inlining the catalogue.
   */
  it("lists no individual playbook", () => {
    expect(PLAYBOOKS).not.toMatch(/^\s*[-*]\s/m);
    expect(PLAYBOOKS).not.toMatch(new RegExp(`${PLAYBOOKS_URL}/\\S`));
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
