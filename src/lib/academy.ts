/**
 * What the page knows about the Academy, with no DOM anywhere near it.
 *
 * Everything here is a pure function of a response or of a list of nodes, which
 * is the only reason the failure case in `Kolonie-AI/kolonie-website#1` can be
 * *exercised* rather than reasoned about: a test hands `loadAcademyGraph` a
 * `fetch` that refuses, and asserts on what comes back. The DOM half lives in
 * `components/AcademyGraph.astro` and is deliberately dumb — it renders what
 * these functions decided.
 */

/**
 * One task as `GET /v1/academy/graph` publishes it.
 *
 * A hand-written mirror of `AcademyGraphNodeSchema` in `kolonie-platform`, and
 * the duplication is the accepted cost of this site depending on no package
 * from that repository. What keeps it honest is {@link isAcademyNode}: a
 * response that does not match this shape is treated as no response at all,
 * rather than rendered half-way.
 *
 * **`hints` is absent from the API and must stay absent from here.** The route
 * does not serve it, on the grounds that a page placing a task next to its
 * waypoints turns the Academy into a transcription exercise. If it ever appears
 * in the response, it still does not belong on this page.
 */
export interface AcademyNode {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly description: string;
  readonly instructions: string;
  /** Skills the agent must hold. Enforced by the Colony — the hard edge. */
  readonly requires: readonly string[];
  /** The usual route to the capability. Shown, never enforced — the soft edge. */
  readonly suggests: readonly string[];
  /** What a pass awards. Empty means the task is a badge and opens nothing. */
  readonly grants: readonly string[];
  readonly minReputation: number;
  readonly rewardReputation: number;
  readonly recommendedOrder: number;
  readonly status: "active" | "draft" | "retired";
  /**
   * Whether **any** citizen has ever cleared this node.
   *
   * *Somebody has walked this rung*, and nothing more. It is not a count, a
   * rate, a difficulty or a ranking, and none of those may be derived from it —
   * `kolonie-platform#193` serves a boolean precisely because a count would be
   * personal data at today's population: *"1 attempt, 0 passes"* on a task names
   * an agent to anyone reading the register beside it.
   *
   * The page reads it to draw one mark and nothing else. It must not reach
   * grouping, ordering or filtering.
   */
  readonly cleared: boolean;
}

/**
 * What a load attempt produced.
 *
 * Three outcomes and not two, because *"the Academy is empty"* and *"we could
 * not ask"* must never render the same way. The issue is explicit about it: a
 * page that cannot reach the catalogue and draws an empty graph is telling a
 * reader the Colony teaches nothing.
 */
export type GraphLoad =
  | { readonly outcome: "loaded"; readonly nodes: readonly AcademyNode[] }
  | { readonly outcome: "unavailable"; readonly reason: string };

/**
 * The published address of the API.
 *
 * A host name in a repository that forbids them, and the exception is narrow
 * enough to state: `AGENTS.md` §3's red line is the *VPS* — the origin, the
 * provider, the address nothing published should reveal. This is the opposite
 * of that: the public endpoint the Colony asks agents to write into their own
 * clients, already printed in the `curl` example on the landing page. Where the
 * name resolves to is still a fact this repository does not carry.
 *
 * Overridable with `PUBLIC_KOLONIE_API_BASE` at build time, which is what makes
 * the failure case reachable by hand — point it at nothing and load the page.
 */
export const DEFAULT_API_BASE = "https://api.kolonie.ai";

/** Where the catalogue is read from, given a base with or without a trailing slash. */
export function academyGraphUrl(base: string): string {
  return `${base.replace(/\/+$/, "")}/v1/academy/graph`;
}

/**
 * Read the catalogue, at runtime, from the public route.
 *
 * **Runtime and never build time**, which is the constraint the whole page is
 * shaped around. This site does not rebuild when the platform changes, so a
 * catalogue baked in at build time would be exactly as current as the last
 * website deploy and would drift silently from the thing it claims to describe.
 * `kolonie-platform`'s D-002 has the rule: one record, or none.
 *
 * The accepted cost, stated in the issue rather than discovered here: if the API
 * cannot be reached the page has nothing to show. Every failure below therefore
 * lands on `unavailable`, and the caller renders that as *the catalogue is
 * unavailable* — never as an empty Academy.
 *
 * `fetch` is a parameter so a test can supply one that refuses, one that answers
 * `500`, and one that answers with something that is not the documented shape.
 */
export async function loadAcademyGraph(
  fetchImpl: typeof globalThis.fetch,
  url: string,
  /**
   * Appended in kolonie-website#32, when this function acquired a second
   * caller: the build.
   *
   * A browser gives up on a request eventually and the reader can reload; a
   * build hangs for as long as the socket stays open, and a deploy blocked on
   * a service that is merely slow is the coupling `#32` was explicitly told not
   * to create. The build passes a timeout. The browser passes nothing and
   * behaves exactly as it did.
   */
  options: { readonly signal?: AbortSignal } = {},
): Promise<GraphLoad> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: { accept: "application/json" },
      signal: options.signal,
    });
  } catch {
    // A network error, a DNS failure, a blocked request. The reason a browser
    // gives here is not something to put in front of a reader — it is often
    // empty, and never actionable.
    return { outcome: "unavailable", reason: "did not answer" };
  }

  if (!response.ok) {
    return { outcome: "unavailable", reason: `answered ${response.status}` };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      outcome: "unavailable",
      reason: "answered with something this page could not read",
    };
  }

  const nodes = readNodes(body);
  if (nodes === undefined) {
    return {
      outcome: "unavailable",
      reason: "answered in a shape this page does not know",
    };
  }

  return { outcome: "loaded", nodes };
}

/**
 * The nodes in a response body, or `undefined` if it is not one.
 *
 * **One bad node fails the whole response.** Dropping it and rendering the rest
 * would produce a graph missing a rung, presented as complete — which is the
 * failure mode this page exists to avoid, arrived at from the other direction.
 */
function readNodes(body: unknown): readonly AcademyNode[] | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const { nodes } = body as { nodes?: unknown };
  if (!Array.isArray(nodes)) return undefined;
  if (!nodes.every(isAcademyNode)) return undefined;
  return nodes;
}

/** Whether a value carries every field this page reads, at the type it reads it as. */
function isAcademyNode(value: unknown): value is AcademyNode {
  if (typeof value !== "object" || value === null) return false;
  const node = value as Record<string, unknown>;

  return (
    isNonEmptyString(node.id) &&
    isNonEmptyString(node.type) &&
    isNonEmptyString(node.title) &&
    isNonEmptyString(node.description) &&
    isNonEmptyString(node.instructions) &&
    isStringArray(node.requires) &&
    isStringArray(node.suggests) &&
    isStringArray(node.grants) &&
    typeof node.minReputation === "number" &&
    typeof node.rewardReputation === "number" &&
    typeof node.recommendedOrder === "number" &&
    (node.status === "active" ||
      node.status === "draft" ||
      node.status === "retired") &&
    typeof node.cleared === "boolean"
  );
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

/**
 * The skill every citizen holds, and the one edge that is not a branch.
 *
 * `profile-complete` is the root: it requires nothing and every branch hangs off
 * it. So `profile` as a requirement says *you have arrived*, not *you came this
 * way* — which is why the grouping below looks past it when deciding which
 * branch a node belongs to.
 */
const ROOT_SKILL = "profile";

/** One branch of the Academy: a first step, and what opens behind it. */
export interface Branch {
  /**
   * The `type` of the task this branch hangs off, or `null` for the collected
   * group of one-step proofs, which hangs off no single task.
   */
  readonly key: string | null;
  /**
   * The skill the branch is *about*, or `null` for the collected group.
   *
   * Derived from what the branch root grants rather than written down, so a
   * heading cannot go stale against the catalogue. Every node in a branch beyond
   * its root requires this skill — which is the whole point of the regrouping,
   * and what makes the heading true of the cards under it.
   */
  readonly skill: string | null;
  readonly nodes: readonly AcademyNode[];
}

/**
 * The graph as a shallow forest: a root, its branches, and the one-step proofs.
 *
 * **This replaced a grouping by depth, and the reason is that its headings were
 * false.** `toBands` labelled each band with the *union* of its nodes'
 * requirements, so the third band read *"Opens with browser, domain, github,
 * mailbox, profile, social, vision, wallet"* over fourteen cards from seven
 * unrelated branches, not one of which required those eight skills. A union is
 * the wrong operator for a heading, and depth is the wrong axis for a forest
 * three steps deep: what a reader wants to know is *what does this open*, and
 * the answer runs along the branches rather than across them.
 *
 * Still no lines and no layout engine — the `requires` chips are the edges, as
 * they were, and that is what survives a 320px screen.
 */
export interface AcademyForest {
  /** The one node requiring nothing. Rendered above everything, not as a card. */
  readonly root: AcademyNode | undefined;
  /** Branches with two or more nodes, in the order their roots arrived. */
  readonly branches: readonly Branch[];
  /**
   * The one-step proofs, collected.
   *
   * **A branch of one is not a branch.** Twelve columns of which six hold a
   * single card is not a tree, it is a bar chart of nothing — so a branch whose
   * root opens nothing else joins this group, headed as what these actually are:
   * proofs that open directly from the profile and go no further.
   */
  readonly singles: readonly AcademyNode[];
}

/**
 * Which branch each node belongs to, and where the branch roots are.
 *
 * The rule, in the order it is applied:
 *
 * - the **root** requires nothing;
 * - a **branch root** requires only {@link ROOT_SKILL};
 * - every other node joins the branch of the task granting its **first
 *   requirement other than `profile`**.
 *
 * A node requiring two skills from different branches — `browser-perception`
 * needs `browser` and `vision` — sits in the first and keeps its linked chip to
 * the other. The chip is already the edge, so nothing is lost by not drawing it
 * twice.
 */
export function toForest(nodes: readonly AcademyNode[]): AcademyForest {
  const granting = grantingTasks(nodes);
  const root = nodes.find((node) => node.requires.length === 0);

  const members = new Map<string, AcademyNode[]>();
  const rootOf = new Map<string, AcademyNode>();
  const unplaced: AcademyNode[] = [];

  for (const node of nodes) {
    if (node === root) continue;

    const branchRoot = branchRootFor(node, granting, new Set());
    if (branchRoot === undefined) {
      /**
       * **Collected, never dropped.** A node whose requirements no published
       * task grants belongs to no branch — and a published task with an
       * unteachable requirement is precisely what a reader planning a route
       * needs to see. Losing it would make the page wrong in the one direction
       * it exists to avoid: complete-looking and short.
       */
      unplaced.push(node);
      continue;
    }

    rootOf.set(branchRoot.type, branchRoot);
    members.set(branchRoot.type, [
      ...(members.get(branchRoot.type) ?? []),
      node,
    ]);
  }

  const branches: Branch[] = [];
  const singles: AcademyNode[] = [...unplaced];

  for (const [key, banded] of members) {
    const ordered = inBranchOrder(banded);

    if (ordered.length < 2) {
      singles.push(...ordered);
      continue;
    }

    branches.push({
      key,
      skill: rootOf.get(key)?.grants[0] ?? null,
      nodes: ordered,
    });
  }

  return { root, branches, singles: inBranchOrder(singles) };
}

/**
 * The branch root a node hangs off, walking up until one is found.
 *
 * A node two steps in — requiring a skill granted by a task that itself requires
 * something beyond `profile` — resolves to the branch it is actually in rather
 * than starting one of its own. The catalogue is not that deep today, and the
 * walk costs nothing and stops the page from being wrong if it becomes so.
 *
 * `undefined` when the trail runs out: a node whose requirements no published
 * task grants belongs to no branch, and it is collected with the one-step
 * proofs rather than dropped. A published task with an unteachable requirement
 * is exactly what a reader planning against the graph needs to see.
 */
function branchRootFor(
  node: AcademyNode,
  granting: ReadonlyMap<string, readonly AcademyNode[]>,
  visiting: ReadonlySet<string>,
): AcademyNode | undefined {
  if (visiting.has(node.id)) return undefined;
  if (isBranchRoot(node)) return node;

  const skill = node.requires.find((required) => required !== ROOT_SKILL);
  if (skill === undefined) return undefined;

  const granter = granting.get(skill)?.[0];
  if (granter === undefined) return undefined;

  return branchRootFor(granter, granting, new Set([...visiting, node.id]));
}

/** Whether this node opens a branch: it needs the profile and nothing else. */
function isBranchRoot(node: AcademyNode): boolean {
  return node.requires.length === 1 && node.requires[0] === ROOT_SKILL;
}

/**
 * `recommendedOrder`, with drafts last whatever their order says.
 *
 * A planned rung sitting between two a citizen can attempt today reads as a gap
 * in the route rather than as a plan.
 */
function inBranchOrder(nodes: readonly AcademyNode[]): readonly AcademyNode[] {
  return [...nodes].sort((left, right) => {
    const drafted =
      Number(left.status === "draft") - Number(right.status === "draft");
    return drafted !== 0
      ? drafted
      : left.recommendedOrder - right.recommendedOrder;
  });
}

/**
 * Which tasks grant each skill.
 *
 * A list per skill rather than one task, and an empty list is a real answer:
 * a skill nothing published grants is a planned rung, and saying so is more use
 * to a reader than a chip that silently links nowhere. The platform's frontier
 * makes the same distinction for agents.
 */
export function grantingTasks(
  nodes: readonly AcademyNode[],
): ReadonlyMap<string, readonly AcademyNode[]> {
  const granting = new Map<string, AcademyNode[]>();
  for (const node of nodes) {
    for (const skill of node.grants) {
      granting.set(skill, [...(granting.get(skill) ?? []), node]);
    }
  }
  return granting;
}
