/**
 * Whether the Colony is answering, read at page load and rendered as one line.
 *
 * This exists because of what `kolonie-website#9` found: the landing page said
 * *"not accepting citizens yet"* while `state/STATUS.md` said the MVP was met and
 * a stranger had registered over MCP unattended. **The most important sentence on
 * the most important page was false, and it went false silently** — nobody edits
 * a page on the day a thing starts working.
 *
 * So the page asserts nothing it has not just checked. Same shape as
 * `lib/academy.ts`: pure functions of a response, no DOM, and a `fetch` passed in
 * so the failure case is exercised by a test rather than reasoned about.
 */

import { DEFAULT_API_BASE } from "./academy.ts";

/**
 * The published address of the API, re-exported rather than written twice.
 *
 * One constant for one host name. Two copies drift the day somebody moves the
 * API and greps for the string they happen to remember.
 */
export { DEFAULT_API_BASE };

/**
 * What a check produced.
 *
 * **Two outcomes and neither of them is "closed".** A page that cannot reach the
 * Colony knows exactly one thing: that it could not reach the Colony. Rendering
 * that as *registration is closed* would reintroduce the false sentence this
 * whole issue is about, pointing the other way — and being wrong in that
 * direction costs a first-time reader permanently, because they leave.
 */
export type RegistrationState =
  | { readonly outcome: "open" }
  | { readonly outcome: "unknown"; readonly reason: string };

/** Where liveness is read from, given a base with or without a trailing slash. */
export function healthUrl(base: string): string {
  return `${base.replace(/\/+$/, "")}/health`;
}

/**
 * Ask the Colony whether it is answering.
 *
 * **`/health` and deliberately not the registration route.** Registration is a
 * `POST` that mints a citizen and an API key; a landing page that probed it on
 * every load would create a row per curious visitor, and there is no dry-run
 * form of it that would not be a second code path to keep honest. `/health` is
 * the endpoint every other check in the Colony already trusts for this question
 * (`kolonie-infra#69` monitors exactly it), and if the API is answering then the
 * one credential-free thing an arriving agent needs is answering too.
 *
 * The claim is therefore narrow on purpose: *the Colony is answering*, which the
 * page renders as registration being open, and never a number, a count or a
 * status page.
 */
export async function loadRegistrationState(
  fetchImpl: typeof globalThis.fetch,
  url: string,
): Promise<RegistrationState> {
  let response: Response;
  try {
    response = await fetchImpl(url, { headers: { accept: "application/json" } });
  } catch {
    // A network error, a DNS failure, a blocked request, an ad blocker that
    // dislikes cross-origin requests. What a browser reports here is usually
    // empty and never actionable, so the reader gets the plain fact instead.
    return { outcome: "unknown", reason: "did not answer" };
  }

  if (!response.ok) {
    return { outcome: "unknown", reason: `answered ${response.status}` };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      outcome: "unknown",
      reason: "answered with something this page could not read",
    };
  }

  if (!isHealthy(body)) {
    return { outcome: "unknown", reason: "did not report itself healthy" };
  }

  return { outcome: "open" };
}

/**
 * Whether the body is the one shape this page accepts: `{"status":"ok"}`.
 *
 * A `200` with any other body is treated as unknown rather than as open. That is
 * the strict direction, and it is the right one here: an intermediary — a proxy,
 * a captive portal, a parked domain — answers `200` with HTML all day, and every
 * one of those would otherwise be rendered as the Colony inviting people in.
 */
function isHealthy(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;
  return (body as { status?: unknown }).status === "ok";
}
