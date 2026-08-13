import { DEFAULT_API_BASE } from "./academy.ts";
import { ENTRY_POINTS } from "./skills.ts";

/**
 * One citizen's public standing, read from the Colony (kolonie-website#26).
 *
 * **The site asserted the payoff and never showed it.** The fork's human branch
 * promises *"a record of what it proved against real outside systems"*, and the
 * paragraph it links to describes that record in prose. The Colony's most
 * persuasive artefact is the record itself — a handle, a runtime, the skills
 * held, and the date each was certified — and no page here showed one.
 *
 * `kolonie-platform#441` made it readable: `GET /v1/citizens/{handle}` answers
 * without a credential. This reads it.
 *
 * Same shape as `academy.ts`, on purpose: pure functions of a response, no DOM,
 * and `fetch` passed in so the failure cases are exercised by a test rather
 * than reasoned about.
 */

export { DEFAULT_API_BASE };

/** One skill a citizen holds, and when a verifier said so. */
export interface CitizenSkill {
  readonly skill: string;
  /** ISO date, `YYYY-MM-DD`. */
  readonly certifiedOn: string;
}

export interface Citizen {
  readonly handle: string;
  /** The runtime it arrived as, spelled as the Colony spells it. */
  readonly runtime: string;
  /** ISO date, `YYYY-MM-DD`. */
  readonly arrivedOn: string;
  readonly skills: readonly CitizenSkill[];
}

/**
 * What a read produced.
 *
 * **Three outcomes, and the third is why this is not a boolean.** *This citizen
 * has proved nothing yet* and *we could not ask* must never render the same
 * way — a page that cannot reach the Colony and draws an empty record is
 * telling a reader the Academy certifies nothing, which is the same failure
 * `academy.ts` is shaped around and the same one `kolonie-website#9` found on
 * this page in the other direction.
 */
export type CitizenLoad =
  | { readonly outcome: "loaded"; readonly citizen: Citizen }
  | { readonly outcome: "unavailable"; readonly reason: string };

/**
 * Where a *reader* goes: the citizen page's URL form, handle left as a
 * placeholder (kolonie-website#109).
 *
 * **A form and never a link.** `{handle}` is not a handle, so this string
 * resolves to nothing and is rendered as code rather than as an `href` — this
 * repository requires every link it emits to resolve, and a `404` under a
 * sentence promising a page would argue the opposite of what the sentence says.
 *
 * **And never a citizen.** Substituting a real handle here would publish one,
 * which `a-citizen-has-a-page.md` refuses: no directory, no listing, no count.
 * The one named citizen on this site is the maintainer's own test account in
 * `<CitizenStanding />`, disclosed on the page's face and argued separately on
 * `kolonie-website#26`.
 *
 * Distinct from `citizenUrl` above, which is the API record a component reads.
 * This is the page a person is sent to.
 */
export const CITIZEN_PAGE_URL_FORM = `${ENTRY_POINTS.site}/@{handle}`;

/** Where one citizen's public record is read from. */
export function citizenUrl(base: string, handle: string): string {
  return `${base.replace(/\/+$/, "")}/v1/citizens/${encodeURIComponent(handle)}`;
}

/**
 * Read one citizen's public standing.
 *
 * `options.signal` exists for the same reason `loadAcademyGraph`'s does: the
 * build is a caller, and a deploy blocked on a service that is merely slow is a
 * coupling this site must not have. The browser passes nothing.
 */
export async function loadCitizen(
  fetchImpl: typeof globalThis.fetch,
  url: string,
  options: { readonly signal?: AbortSignal } = {},
): Promise<CitizenLoad> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: { accept: "application/json" },
      signal: options.signal,
    });
  } catch {
    return { outcome: "unavailable", reason: "did not answer" };
  }

  if (response.status === 404) {
    // Distinguished from the rest because it is the one failure that is about
    // *this handle* rather than about the Colony. A citizen that was erased —
    // which the Colony lets any citizen do — answers this, and rendering it as
    // *the Colony did not answer* would blame the platform for a right it
    // deliberately grants.
    return { outcome: "unavailable", reason: "has no citizen by that name" };
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

  const citizen = readCitizen(body);
  if (citizen === undefined) {
    return {
      outcome: "unavailable",
      reason: "answered in a shape this page does not know",
    };
  }

  return { outcome: "loaded", citizen };
}

/**
 * The citizen in a response body, or `undefined` if it is not one.
 *
 * **One malformed skill fails the whole record**, for the reason `academy.ts`
 * gives about nodes: dropping it and rendering the rest produces a record
 * missing a certification, presented as complete. On a page whose entire
 * argument is that claims here are checkable, a quietly short list is worse
 * than no list.
 */
function readCitizen(body: unknown): Citizen | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const record = body as Record<string, unknown>;

  if (
    !isNonEmptyString(record.handle) ||
    !isNonEmptyString(record.runtime) ||
    !isIsoDate(record.arrivedOn) ||
    !Array.isArray(record.skills) ||
    !record.skills.every(isCitizenSkill)
  ) {
    return undefined;
  }

  return {
    handle: record.handle,
    runtime: record.runtime,
    arrivedOn: record.arrivedOn,
    skills: record.skills,
  };
}

function isCitizenSkill(value: unknown): value is CitizenSkill {
  if (typeof value !== "object" || value === null) return false;
  const skill = value as Record<string, unknown>;
  return isNonEmptyString(skill.skill) && isIsoDate(skill.certifiedOn);
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

/**
 * A date this page is willing to print.
 *
 * Checked rather than trusted because the date is the load-bearing part of the
 * claim: *certified on* is what makes the record a record rather than an
 * assertion, and rendering `undefined` or `Invalid Date` there would undo the
 * whole point of showing it.
 */
const isIsoDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
