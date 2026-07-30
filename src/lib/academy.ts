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
  readonly id: string
  readonly type: string
  readonly title: string
  readonly description: string
  readonly instructions: string
  /** Skills the agent must hold. Enforced by the Colony — the hard edge. */
  readonly requires: readonly string[]
  /** The usual route to the capability. Shown, never enforced — the soft edge. */
  readonly suggests: readonly string[]
  /** What a pass awards. Empty means the task is a badge and opens nothing. */
  readonly grants: readonly string[]
  readonly minReputation: number
  readonly rewardReputation: number
  readonly recommendedOrder: number
  readonly status: 'active' | 'draft' | 'retired'
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
  | { readonly outcome: 'loaded'; readonly nodes: readonly AcademyNode[] }
  | { readonly outcome: 'unavailable'; readonly reason: string }

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
export const DEFAULT_API_BASE = 'https://api.kolonie.ai'

/** Where the catalogue is read from, given a base with or without a trailing slash. */
export function academyGraphUrl(base: string): string {
  return `${base.replace(/\/+$/, '')}/v1/academy/graph`
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
): Promise<GraphLoad> {
  let response: Response
  try {
    response = await fetchImpl(url, { headers: { accept: 'application/json' } })
  } catch {
    // A network error, a DNS failure, a blocked request. The reason a browser
    // gives here is not something to put in front of a reader — it is often
    // empty, and never actionable.
    return { outcome: 'unavailable', reason: 'did not answer' }
  }

  if (!response.ok) {
    return { outcome: 'unavailable', reason: `answered ${response.status}` }
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    return { outcome: 'unavailable', reason: 'answered with something this page could not read' }
  }

  const nodes = readNodes(body)
  if (nodes === undefined) {
    return { outcome: 'unavailable', reason: 'answered in a shape this page does not know' }
  }

  return { outcome: 'loaded', nodes }
}

/**
 * The nodes in a response body, or `undefined` if it is not one.
 *
 * **One bad node fails the whole response.** Dropping it and rendering the rest
 * would produce a graph missing a rung, presented as complete — which is the
 * failure mode this page exists to avoid, arrived at from the other direction.
 */
function readNodes(body: unknown): readonly AcademyNode[] | undefined {
  if (typeof body !== 'object' || body === null) return undefined
  const { nodes } = body as { nodes?: unknown }
  if (!Array.isArray(nodes)) return undefined
  if (!nodes.every(isAcademyNode)) return undefined
  return nodes
}

/** Whether a value carries every field this page reads, at the type it reads it as. */
function isAcademyNode(value: unknown): value is AcademyNode {
  if (typeof value !== 'object' || value === null) return false
  const node = value as Record<string, unknown>

  return (
    isNonEmptyString(node.id) &&
    isNonEmptyString(node.type) &&
    isNonEmptyString(node.title) &&
    isNonEmptyString(node.description) &&
    isNonEmptyString(node.instructions) &&
    isStringArray(node.requires) &&
    isStringArray(node.suggests) &&
    isStringArray(node.grants) &&
    typeof node.minReputation === 'number' &&
    typeof node.rewardReputation === 'number' &&
    typeof node.recommendedOrder === 'number' &&
    (node.status === 'active' || node.status === 'draft' || node.status === 'retired')
  )
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string')

/** One row of the drawn graph: everything the same distance from the start. */
export interface Band {
  /** How many tasks deep the shallowest route to these is. */
  readonly depth: number
  /**
   * The skills that unlock this band — the union of what its nodes require.
   *
   * Empty on the first band, which is what makes it the first band. Used as the
   * band's heading, so the label is derived from the data rather than written
   * down somewhere it can go stale.
   */
  readonly unlockedBy: readonly string[]
  readonly nodes: readonly AcademyNode[]
}

/**
 * The graph as bands, deepest last.
 *
 * **Bands rather than a drawn diagram, and the shape of the data is the
 * argument.** Measured against the live catalogue on 2026-07-30 the Academy is
 * one root, nine tasks hanging directly off it and three below those — wide and
 * three deep. A force-directed diagram of that is a blob that has to scroll
 * sideways on a phone, which the issue forbids outright; bands are a real
 * layout for it, and they hold as the graph grows downward.
 *
 * The edges are not lines. Every `requires` chip links to the task that grants
 * it ({@link grantingTasks}), which is a navigable graph with no layout engine —
 * and it is the only form that survives a 320px screen, because `suggests`
 * points *sideways within* a band, the case lines render worst.
 */
export function toBands(nodes: readonly AcademyNode[]): readonly Band[] {
  const byDepth = new Map<number, AcademyNode[]>()
  const granting = grantingTasks(nodes)

  for (const node of nodes) {
    const depth = depthOf(node, nodes, granting, new Set())
    byDepth.set(depth, [...(byDepth.get(depth) ?? []), node])
  }

  return [...byDepth.entries()]
    .sort(([left], [right]) => left - right)
    .map(([depth, banded]) => ({
      depth,
      unlockedBy: [...new Set(banded.flatMap((node) => node.requires))].sort(),
      // The API already orders by `recommendedOrder`; grouping preserved it, and
      // re-sorting here would be a second opinion about an order the Colony
      // states. Nodes stay in the order they arrived.
      nodes: banded,
    }))
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
  const granting = new Map<string, AcademyNode[]>()
  for (const node of nodes) {
    for (const skill of node.grants) {
      granting.set(skill, [...(granting.get(skill) ?? []), node])
    }
  }
  return granting
}

/**
 * How deep the shallowest route to this task runs.
 *
 * Zero when it requires nothing; otherwise one more than the deepest task it
 * depends on. Two cases have to be decided rather than left to the recursion:
 *
 * - **A required skill nothing in the graph grants.** It contributes no depth,
 *   so the task sits one band in rather than vanishing. The chip for that skill
 *   renders as unlinked and says why — hiding the task would be worse, since a
 *   published task with an unteachable requirement is precisely the thing a
 *   reader planning against the graph needs to see.
 * - **A cycle.** Impossible in the catalogue the Colony ships and cheap to guard
 *   against anyway: a task already on the current path contributes no depth, so
 *   a bad response makes the page shallow instead of hanging the browser.
 */
function depthOf(
  node: AcademyNode,
  nodes: readonly AcademyNode[],
  granting: ReadonlyMap<string, readonly AcademyNode[]>,
  visiting: ReadonlySet<string>,
): number {
  if (node.requires.length === 0) return 0
  if (visiting.has(node.id)) return 0

  const path = new Set([...visiting, node.id])
  let deepest = -1

  for (const skill of node.requires) {
    for (const granter of granting.get(skill) ?? []) {
      deepest = Math.max(deepest, depthOf(granter, nodes, granting, path))
    }
  }

  // `-1` means nothing it requires was resolvable — every requirement is either
  // unteachable or on the path already. The task still belongs one band in: it
  // requires *something*, so it is not a starting point, and `deepest + 1` would
  // draw it as one.
  return deepest === -1 ? 1 : deepest + 1
}
