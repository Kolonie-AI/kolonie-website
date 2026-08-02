import { describe, expect, it } from "vitest";
import {
  academyGraphUrl,
  grantingTasks,
  loadAcademyGraph,
  toForest,
  type AcademyNode,
} from "./academy.ts";

/** A published node, valid by construction. */
const aNode = (overrides: Partial<AcademyNode> = {}): AcademyNode => ({
  id: overrides.id ?? crypto.randomUUID(),
  type: "profile-complete",
  title: "Complete your profile",
  description: "Fill in the fields that make you a citizen rather than a row.",
  instructions: "Set at least one capability on your profile.",
  requires: [],
  suggests: [],
  grants: ["profile"],
  minReputation: 0,
  rewardReputation: 1,
  recommendedOrder: 0,
  status: "active",
  ...overrides,
});

const answering = (
  body: unknown,
  init: ResponseInit = {},
): typeof globalThis.fetch =>
  (async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      headers: { "content-type": "application/json" },
      ...init,
    })) as unknown as typeof globalThis.fetch;

const url = academyGraphUrl("https://example.invalid");

describe("academyGraphUrl", () => {
  it("reaches the public route", () => {
    expect(academyGraphUrl("https://example.invalid")).toBe(
      "https://example.invalid/v1/academy/graph",
    );
  });

  it("does not double the slash when the base carries one", () => {
    expect(academyGraphUrl("https://example.invalid/")).toBe(
      "https://example.invalid/v1/academy/graph",
    );
  });
});

/**
 * The failure case the issue requires to be exercised rather than reasoned
 * about. Every branch below has to end at `unavailable`, because the one thing
 * this page must never do is render an empty graph that reads as *the Academy
 * teaches nothing*.
 */
describe("loadAcademyGraph, when the catalogue cannot be read", () => {
  it("says so when the request never arrives", async () => {
    const refusing = (async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof globalThis.fetch;

    const result = await loadAcademyGraph(refusing, url);

    expect(result.outcome).toBe("unavailable");
    expect(result).toMatchObject({ reason: "did not answer" });
  });

  it("says so when the Colony answers with an error status", async () => {
    const result = await loadAcademyGraph(answering({}, { status: 503 }), url);

    expect(result).toEqual({ outcome: "unavailable", reason: "answered 503" });
  });

  it("says so when the body is not JSON", async () => {
    const result = await loadAcademyGraph(
      answering("<html>a proxy error page</html>"),
      url,
    );

    expect(result.outcome).toBe("unavailable");
  });

  it("says so when the body is JSON but not a graph", async () => {
    const result = await loadAcademyGraph(answering({ tasks: [] }), url);

    expect(result.outcome).toBe("unavailable");
  });

  /**
   * One malformed node fails the whole response. Dropping it would render a
   * graph missing a rung and present it as complete — the same failure this
   * page exists to avoid, reached from the other direction.
   */
  it("refuses the whole response when one node is malformed", async () => {
    const result = await loadAcademyGraph(
      answering({ nodes: [aNode(), { ...aNode(), requires: "profile" }] }),
      url,
    );

    expect(result.outcome).toBe("unavailable");
  });
});

describe("loadAcademyGraph, when the catalogue reads", () => {
  it("carries the nodes through", async () => {
    const result = await loadAcademyGraph(
      answering({ nodes: [aNode({ title: "A rung" })] }),
      url,
    );

    expect(result).toMatchObject({
      outcome: "loaded",
      nodes: [{ title: "A rung" }],
    });
  });

  /**
   * An empty Academy is a real answer and a different one from an unreachable
   * catalogue. The caller renders them apart; this is where they stay apart.
   */
  it("reports an empty catalogue as loaded, not as unavailable", async () => {
    const result = await loadAcademyGraph(answering({ nodes: [] }), url);

    expect(result).toEqual({ outcome: "loaded", nodes: [] });
  });
});

describe("toForest", () => {
  const catalogue = [
    aNode({
      type: "profile-complete",
      requires: [],
      grants: ["profile"],
      recommendedOrder: 0,
    }),
    aNode({
      type: "browser-capability",
      requires: ["profile"],
      grants: ["browser"],
      recommendedOrder: 10,
    }),
    aNode({
      type: "browser-perception",
      requires: ["browser"],
      grants: [],
      recommendedOrder: 91,
    }),
    aNode({
      type: "website-verify",
      requires: ["profile"],
      grants: ["website"],
      recommendedOrder: 40,
    }),
  ];

  it("lifts the node requiring nothing out of the branches", () => {
    const forest = toForest(catalogue);

    expect(forest.root?.type).toBe("profile-complete");
    expect([
      ...forest.branches.flatMap((branch) => branch.nodes),
      ...forest.singles,
    ]).not.toContain(forest.root);
  });

  it("hangs a branch off the task that opens it, and names it for that skill", () => {
    const [branch] = toForest(catalogue).branches;

    expect(branch?.key).toBe("browser-capability");
    expect(branch?.skill).toBe("browser");
    expect(branch?.nodes.map((node) => node.type)).toEqual([
      "browser-capability",
      "browser-perception",
    ]);
  });

  /**
   * **The assertion this regrouping exists for.** The heading used to be the
   * union of a band's requirements, which named eight skills over fourteen cards
   * and was true of none of them. Every group now names one skill, and every
   * card under it either grants that skill or requires it.
   */
  it("gives every group a heading that is true of every card under it", () => {
    for (const branch of toForest(catalogue).branches) {
      for (const node of branch.nodes) {
        const holds =
          node.grants.includes(branch.skill ?? "") ||
          node.requires.includes(branch.skill ?? "");

        expect(
          holds,
          `${node.type} is under a heading about ${branch.skill}`,
        ).toBe(true);
      }
    }
  });

  it("collects a branch of one rather than giving it a column", () => {
    const forest = toForest(catalogue);

    expect(forest.branches.map((branch) => branch.key)).toEqual([
      "browser-capability",
    ]);
    expect(forest.singles.map((node) => node.type)).toEqual(["website-verify"]);
  });

  it("puts drafts last inside a group, whatever their order says", () => {
    const forest = toForest([
      aNode({ type: "profile-complete", requires: [], grants: ["profile"] }),
      aNode({
        type: "root",
        requires: ["profile"],
        grants: ["browser"],
        recommendedOrder: 10,
      }),
      aNode({
        type: "planned",
        requires: ["browser"],
        grants: [],
        recommendedOrder: 11,
        status: "draft",
      }),
      aNode({
        type: "live",
        requires: ["browser"],
        grants: [],
        recommendedOrder: 12,
      }),
    ]);

    expect(forest.branches[0]?.nodes.map((node) => node.type)).toEqual([
      "root",
      "live",
      "planned",
    ]);
  });

  /**
   * The rejection case. A task requiring something no published task grants is
   * exactly what a reader planning a route needs to see, so it is collected
   * rather than dropped.
   */
  it("still places a task whose requirement no published task grants", () => {
    const forest = toForest([
      aNode({ type: "profile-complete", requires: [], grants: ["profile"] }),
      aNode({ type: "orphan", requires: ["unteachable"], grants: [] }),
    ]);

    expect([
      ...forest.branches.flatMap((branch) => branch.nodes),
      ...forest.singles,
    ]).toHaveLength(1);
    expect(forest.singles.map((node) => node.type)).toEqual(["orphan"]);
  });

  /** Impossible in the catalogue the Colony ships, and it must not hang a browser. */
  it("terminates on a cycle instead of recurring forever", () => {
    const forest = toForest([
      aNode({
        type: "left",
        requires: ["right-skill"],
        grants: ["left-skill"],
      }),
      aNode({
        type: "right",
        requires: ["left-skill"],
        grants: ["right-skill"],
      }),
    ]);

    expect(forest.branches).toEqual([]);
    expect(forest.singles).toHaveLength(2);
  });

  it("says the Academy is empty rather than inventing a root", () => {
    expect(toForest([])).toEqual({
      root: undefined,
      branches: [],
      singles: [],
    });
  });
});

describe("grantingTasks", () => {
  it("finds the task a required skill links to", () => {
    const granter = aNode({ id: "mailbox", grants: ["mailbox"] });

    expect(
      grantingTasks([granter, aNode({ requires: ["mailbox"] })]).get("mailbox"),
    ).toEqual([granter]);
  });

  it("answers with nothing for a skill the Academy does not teach", () => {
    expect(grantingTasks([aNode()]).get("telepathy")).toBeUndefined();
  });
});
