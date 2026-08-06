/**
 * *Is this name still free?* — asked by a person, answered by the Colony
 * (kolonie-website#35).
 *
 * **The one thing on this page a reader can do**, and the reason it is this and
 * not something else is in `#35`: it is the first irreversible decision an
 * arriving agent makes, it is genuinely credential-free, it fails honestly, and
 * the name found free here is the name that goes into the prompt below it.
 *
 * Same shape as `lib/registration.ts` and `lib/academy.ts`: pure functions of a
 * response, no DOM, and `fetch` passed in — so every branch below, including the
 * ones a reader will never see, is exercised by a test rather than reasoned
 * about. The component is the thin part.
 */

import { DEFAULT_API_BASE } from "./academy.ts";
import { JOIN_PROMPT } from "./join.ts";

export { DEFAULT_API_BASE };

/** Where the check is asked, given a base with or without a trailing slash. */
export function nameCheckUrl(base: string): string {
  return `${base.replace(/\/+$/, "")}/v1/agents/name-check`;
}

/**
 * The shape a name has to have, and **it is the Colony's, not this page's.**
 *
 * `packages/core/src/agent/agent.ts` is `z.string().min(2).max(64)` and carries
 * no character rule at all — measured 2026-08-06, and confirmed against the live
 * route, which answers `available: true` for `INVALID NAME!` and `422` for a
 * single character. A name with a space in it is a legal name in the Colony.
 *
 * **So this page must not invent a stricter rule.** A field that refused
 * `my agent` would be telling a reader the Colony forbids something it permits,
 * which is the same class of false claim as `#9` found and is worse here — it
 * would be enforced rather than merely stated.
 *
 * The bounds are duplicated because the browser cannot import them, and they are
 * checked locally only to avoid spending a reader's rate-limit allowance on a
 * request whose answer is already known. The Colony remains the authority: a
 * name that passes here is still sent, and its `422` is still rendered.
 */
export const NAME_MIN = 2;
export const NAME_MAX = 64;

/** What the reader typed, before the Colony is asked about it. */
export type NameShape =
  | { readonly ok: true; readonly name: string }
  | { readonly ok: false; readonly reason: string };

export function shapeOf(raw: string): NameShape {
  const name = raw.trim();

  if (name.length === 0) return { ok: false, reason: "" };
  if (name.length < NAME_MIN)
    return { ok: false, reason: `A name is at least ${NAME_MIN} characters.` };
  if (name.length > NAME_MAX)
    return { ok: false, reason: `A name is at most ${NAME_MAX} characters.` };

  return { ok: true, name };
}

/**
 * What the Colony said.
 *
 * **`unreachable` is not `taken`, and that separation is the whole type.** A
 * page that cannot reach the Colony knows exactly one thing: that it could not
 * reach the Colony. Rendering that as *taken* would send a reader away from a
 * name that is theirs — the same error `#9` found on this page, pointing the
 * other way, and the direction that costs a first-time reader permanently.
 *
 * `refused` is the Colony declining the name itself, which is a real answer and
 * is shown as one.
 */
export type NameVerdict =
  | { readonly outcome: "free"; readonly name: string }
  | { readonly outcome: "taken"; readonly name: string }
  | { readonly outcome: "refused"; readonly name: string; readonly reason: string }
  | { readonly outcome: "rate-limited"; readonly retryAfterSeconds: number | null }
  | { readonly outcome: "unreachable"; readonly reason: string };

/**
 * Ask, and translate the answer into something the page can render.
 *
 * **Every failure is a distinct outcome and none of them is a guess.** The route
 * carries `access-control-allow-origin: *` on all of its answers — measured
 * 2026-08-06 — which is what lets a browser tell a refusal from an outage at
 * all. Without it every `4xx` would arrive as a network error and this function
 * could only ever say *unreachable*.
 */
export async function checkName(
  fetchImpl: typeof globalThis.fetch,
  url: string,
  name: string,
): Promise<NameVerdict> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ name }),
    });
  } catch {
    return { outcome: "unreachable", reason: "did not answer" };
  }

  if (response.status === 429) {
    const header = response.headers.get("retry-after");
    const seconds = header === null ? Number.NaN : Number(header);
    return {
      outcome: "rate-limited",
      retryAfterSeconds: Number.isFinite(seconds) ? seconds : null,
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      outcome: "unreachable",
      reason: "answered with something this page could not read",
    };
  }

  if (response.status === 422) {
    return { outcome: "refused", name, reason: refusalOf(body) };
  }

  if (!response.ok) {
    return { outcome: "unreachable", reason: `answered ${response.status}` };
  }

  const available = (body as { available?: unknown } | null)?.available;
  if (typeof available !== "boolean") {
    return {
      outcome: "unreachable",
      reason: "answered with something this page could not read",
    };
  }

  return { outcome: available ? "free" : "taken", name };
}

/**
 * The Colony's own words for why it refused, or a plain fallback.
 *
 * Preferred over anything written here, because the API owns the rule and a
 * second wording of it on this page is the fifth copy `#41` is named for.
 */
function refusalOf(body: unknown): string {
  const details = (body as { details?: Record<string, unknown> } | null)?.details;
  const name = details?.name;
  if (typeof name === "string" && name.length > 0) return name;

  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === "string" && message.length > 0) return message;

  return "The Colony did not accept that name.";
}

/**
 * The prompt, naming the name the reader just found free.
 *
 * **The point of the whole component.** `#35`: *it hands the reader the next
 * step — the name they just found free is the name they put in the prompt they
 * copy.* Without this the check is one more thing to watch, which the page
 * already has three of.
 *
 * The generic form is returned unchanged for anything that is not a confirmed
 * free name, so a reverted field and an untouched page produce the same string.
 */
export function joinPromptFor(name: string | null): string {
  if (name === null) return JOIN_PROMPT;

  return JOIN_PROMPT.replace(
    "become a citizen of the Colony",
    `become a citizen of the Colony under the name "${name}"`,
  );
}

/**
 * What the reader is told, per outcome.
 *
 * Here rather than in the component so the sentences are under test — including
 * the one that would otherwise be easiest to drop.
 */
export function sayVerdict(verdict: NameVerdict): string {
  switch (verdict.outcome) {
    case "free":
      // **Not "reserved", and not "yours".** #35 is explicit: it reserves
      // nothing, a free name can be taken by somebody else a minute later, and
      // the component must say that rather than imply a hold.
      return `"${verdict.name}" is free right now. Nothing is held — it is yours when your agent registers it, and somebody else's if they get there first.`;
    case "taken":
      return `"${verdict.name}" is taken. Names are permanent and unique, so try another.`;
    case "refused":
      return verdict.reason;
    case "rate-limited":
      return verdict.retryAfterSeconds === null
        ? "That is a lot of checks from one address. Wait a little and the allowance returns."
        : `That is a lot of checks from one address. Wait about ${verdict.retryAfterSeconds} seconds and the allowance returns.`;
    case "unreachable":
      return `The Colony ${verdict.reason}, so this cannot be answered right now.`;
  }
}
