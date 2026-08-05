import { describe, expect, it } from "vitest";
import { escapeHtml, renderForest, renderShape } from "./academy-view.ts";
import type { AcademyNode } from "./academy.ts";

/**
 * The renderer both the build and the browser call (kolonie-website#32).
 *
 * Two properties matter more than the markup itself:
 *
 * 1. **It is a function.** The build embeds what it returns and the client
 *    replaces it with what it returns; if the same catalogue produced different
 *    markup on the two paths, the refresh would move the page — which is the
 *    layout shift `#32` exists to remove. That is checked here rather than
 *    measured in a browser, because it is a property of the code and not of a
 *    rendering.
 * 2. **Nothing the API returns is parsed as markup.** The renderer this
 *    replaced built DOM nodes and was safe by construction; a string builder is
 *    not, so every interpolated value goes through `escapeHtml`.
 */

const node = (over: Partial<AcademyNode> = {}): AcademyNode => ({
  id: "a0000000-0000-4000-8000-000000000001",
  type: "profile-complete",
  title: "Say who you are",
  description: "Write your own profile.",
  instructions: "…",
  requires: [],
  suggests: [],
  grants: ["profile"],
  minReputation: 0,
  rewardReputation: 5,
  recommendedOrder: 0,
  status: "active",
  cleared: false,
  ...over,
});

/** A root, one branch of two, and a one-step proof: every shape in one list. */
const catalogue: AcademyNode[] = [
  node(),
  node({
    id: "…2",
    type: "mailbox-verified",
    title: "Prove a mailbox",
    requires: ["profile"],
    grants: ["mailbox"],
    recommendedOrder: 1,
  }),
  node({
    id: "…3",
    type: "mailbox-threaded",
    title: "Hold a thread",
    requires: ["mailbox"],
    grants: [],
    recommendedOrder: 2,
    cleared: true,
  }),
  node({
    id: "…4",
    type: "github-verified",
    title: "Prove a GitHub account",
    requires: ["profile"],
    grants: ["github"],
    recommendedOrder: 3,
  }),
];

describe("escapeHtml", () => {
  it("escapes the five characters that can leave text", () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  });

  it("escapes the ampersand first, so nothing is double-escaped", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });
});

describe("the same catalogue renders the same markup", () => {
  // The property that makes the client refresh free of layout shift: the build
  // and the browser call this function, and it is a function.
  it.each([
    ["the shape", renderShape],
    ["the forest", renderForest],
  ])("%s is deterministic", (_name, render) => {
    expect(render(catalogue)).toEqual(render([...catalogue]));
  });
});

describe("the compact shape", () => {
  const view = renderShape(catalogue);

  it("names each branch and links it into the full graph", () => {
    expect(view.forest).toContain('href="/academy/#mailbox-verified"');
    expect(view.forest).toContain(">mailbox<");
  });

  it("collects the branches of one rather than drawing them", () => {
    // `github-verified` opens nothing else, so it is a one-step proof and not a
    // branch — twelve columns of which six hold a single card is not a tree.
    expect(view.forest).toContain("one-step proofs");
    expect(view.forest).not.toContain('href="/academy/#github-verified"');
  });

  it("carries no count of anything", () => {
    // kolonie-website#8 refused counts on this site and #19 refused them again.
    expect(view.summary + view.forest).not.toMatch(/\d+\s+(tasks?|branches|branch)\b/);
  });

  it("names the first step, because that is what a first screen is for", () => {
    expect(view.summary).toContain("Every route starts at Say who you are");
  });
});

describe("the full forest", () => {
  const view = renderForest(catalogue);

  it("summarises what is there, drafts included", () => {
    const drafted = renderForest([...catalogue, node({ id: "…5", type: "x", status: "draft" })]);

    expect(view.summary).toBe("4 tasks in 1 branch off one first step.");
    expect(drafted.summary).toContain("designed but not yet live");
  });

  it("marks a rung a citizen has cleared, and only that one", () => {
    expect(view.forest.match(/node__cleared-text/g)).toHaveLength(1);
  });

  it("says so when a requirement no published task grants", () => {
    const orphan = renderForest([node({ requires: ["wallet"], grants: [] })]);

    expect(orphan.forest).toContain("not taught yet");
  });
});

describe("what the API sends is never markup", () => {
  it("escapes a title", () => {
    const hostile = renderForest([node({ title: '<script>alert("x")</script>' })]);

    expect(hostile.forest).not.toContain("<script>");
    expect(hostile.forest).toContain("&lt;script&gt;");
  });

  it("escapes a value that lands in an attribute", () => {
    const hostile = renderForest([node({ type: '" onload="alert(1)' })]);

    expect(hostile.forest).not.toContain('onload="alert(1)"');
    expect(hostile.forest).toContain("&quot;");
  });
});
