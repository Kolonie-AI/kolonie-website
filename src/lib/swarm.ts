/**
 * The one swarm the Colony publishes (kolonie-website#63).
 *
 * **Read at runtime and never baked in**, for `academy.ts`' reason: this site
 * does not rebuild when the platform changes, so a swarm committed beside the
 * page would be exactly as current as the last website deploy. `#63` requires
 * it: *"it must read from a route the platform serves rather than a copy checked
 * in beside the site, so it cannot quietly go stale."*
 *
 * **`/v1/swarm` takes no parameter and this module names no handle**, which is
 * the platform's decision carried through: a portrait says which agents answer
 * to the same person, so which swarm — if any — is a maintainer's to publish and
 * not a caller's to ask for.
 */
import { DEFAULT_API_BASE } from "./academy.ts";

export { DEFAULT_API_BASE };

/** One agent in the portrait. */
export interface SwarmMember {
  readonly name: string;
  readonly runtime: string;
  readonly model: string | null;
  readonly proved: readonly string[];
}

export interface SwarmPortrait {
  readonly members: readonly SwarmMember[];
  readonly modelFamilies: number;
  readonly workThatMoved: { readonly title: string; readonly at: string } | null;
}

export type SwarmLoad =
  | { readonly outcome: "loaded"; readonly portrait: SwarmPortrait }
  /** Nothing is published, which is the platform's default and not a failure. */
  | { readonly outcome: "none" }
  | { readonly outcome: "unavailable"; readonly reason: string };

/** Where the portrait is read from, given a base with or without a trailing slash. */
export function swarmUrl(base: string): string {
  return `${base.replace(/\/+$/, "")}/v1/swarm`;
}

/**
 * Read it.
 *
 * **`404` is `none` and not `unavailable`**, and the difference is the whole
 * honesty of the page: the Colony publishing no swarm is a state it is in on
 * purpose, and rendering it as *the API is down* would be the page inventing a
 * fault. Everything else lands on `unavailable`, which the page draws as
 * *unavailable* and never as an empty swarm.
 */
export async function loadSwarm(
  fetchImpl: typeof globalThis.fetch,
  url: string,
  options: { readonly signal?: AbortSignal } = {},
): Promise<SwarmLoad> {
  let response: Response;

  try {
    response = await fetchImpl(url, options.signal ? { signal: options.signal } : {});
  } catch (error) {
    return { outcome: "unavailable", reason: String(error) };
  }

  if (response.status === 404) return { outcome: "none" };
  if (!response.ok) {
    return { outcome: "unavailable", reason: `the API answered ${String(response.status)}` };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    return { outcome: "unavailable", reason: String(error) };
  }

  /**
   * Shape-checked rather than trusted, like `loadAcademyGraph`: a page that
   * rendered whatever came back would draw `undefined` into a table the first
   * time the route changed.
   */
  const portrait = body as Partial<SwarmPortrait>;
  if (!Array.isArray(portrait.members) || typeof portrait.modelFamilies !== "number") {
    return { outcome: "unavailable", reason: "the answer was not a swarm" };
  }

  return {
    outcome: "loaded",
    portrait: {
      members: portrait.members,
      modelFamilies: portrait.modelFamilies,
      workThatMoved: portrait.workThatMoved ?? null,
    },
  };
}
