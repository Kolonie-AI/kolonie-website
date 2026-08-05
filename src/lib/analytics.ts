/**
 * Analytics that need no consent, because they collect nothing that requires it
 * (kolonie-website#43).
 *
 * This file used to load Zoho PageSense, requested in `#17` and built carefully:
 * one URL in one place, deliberately kept off every host that serves a magic
 * link, asserted onto every page by a test. **What it never had was a legal
 * basis.** PageSense is behavioural analytics with cookies; ePrivacy Art. 5(3)
 * requires prior consent for that, and there was no banner, no consent record
 * and no privacy policy naming it. It ran on every page of `kolonie.ai` for as
 * long as it took somebody to ask.
 *
 * `#43` had two ways out and they were not equal. A consent banner is correct,
 * and it lands a modal in front of the one page `#24`, `#25`, `#26`, `#27`,
 * `#30`, `#36` and `#39` were spent making inviting — to buy session recordings
 * the Colony has never opened. So the tracker was replaced rather than gated:
 * self-hosted Umami, no cookies, no cross-site identifier, nothing stored on the
 * reader's device, and therefore nothing to ask permission for.
 *
 * ## Why the script is first-party, and it is not about ad blockers
 *
 * Both paths below are on `kolonie.ai` itself. Traefik routes exactly those two
 * to the analytics container and everything else to this site — see
 * `traefik/dynamic/routes.yml` in `kolonie-infra`. A tracker on a hostname of
 * its own would be a third-party origin in the page's connection list, a second
 * DNS record, a second certificate, and one more name for `#42` to disclose.
 *
 * The file is called `analytics.js` and it says what it is. Umami provides the
 * two variables that rename these paths precisely so a tracker can hide from a
 * blocker, and this deployment declines to use them that way: on a site whose
 * whole argument is that its claims are checkable, a tracker under a neutral
 * filename is the one thing here that could not survive being found.
 *
 * ## What was measured, rather than read off the vendor's page
 *
 * Against `postgresql-v2.15.1` on 2026-08-06 — the version `kolonie-infra` pins
 * by digest:
 *
 * - no `Set-Cookie` on the script, and none on a successful collect;
 * - the tracker's only contact with client-side storage is
 *   `localStorage.getItem("umami.disabled")`, a read of a flag the reader sets to
 *   opt out — it writes nothing;
 * - the visitor id is a hash computed on the server from the address, the user
 *   agent and a rotating salt, so nothing on the device recognises a return;
 * - no column in Umami's schema holds an IP address or a user-agent string.
 *
 * `analytics.built-test.ts` checks what the served page can be held to on every
 * build. The rest are properties of the deployment, re-measured when the pin
 * moves, and `kolonie-infra`'s compose comment is where that is written down.
 */

/**
 * The tracker, served from this site's own origin.
 *
 * Root-relative and not absolute, which is the one detail worth stating: an
 * absolute `https://kolonie.ai/…` would be a cross-origin request from every
 * preview build and from `localhost`, and would quietly report a contributor's
 * page loads into production's numbers.
 */
export const TRACKER_SRC = "/analytics.js";

/**
 * Where the tracker reports to.
 *
 * Not referenced by the tag — the script derives it from its own `src` — and
 * exported because a path that exists only inside a container's environment
 * variable is a path nobody here can find when it stops answering.
 */
export const COLLECT_PATH = "/analytics/send";

/**
 * The site's id in Umami, from the environment at build time.
 *
 * **Absent is a supported state and not a misconfiguration.** A checkout with no
 * id — a contributor's, a preview build, a host where `kolonie-infra`'s step 10
 * has not been run — emits no tag at all, rather than a script that would load
 * and report to a site the server has never heard of. Umami answers such a hit
 * with `Website not found`: a request made, a reader's page slowed, and nothing
 * gained.
 *
 * `PUBLIC_` because Astro exposes only that prefix to a build, and because it is
 * genuinely public — the id is served to every visitor in the tag below. It
 * identifies a *site* rather than a person and it grants nothing; the dashboard
 * behind it is not exposed to the internet at all.
 */
export const WEBSITE_ID = readWebsiteId();

/**
 * The id, from whichever of the two environments this module was loaded in.
 *
 * **This file is imported from both sides of the build and they do not share an
 * environment.** `src/layouts/Landing.astro` is bundled by Vite, where the value
 * is on `import.meta.env`. `astro.config.mjs` is evaluated by Node before Vite
 * exists, where it is on `process.env` and `import.meta.env` is undefined. Same
 * problem `src/lib/head.ts` documents for `theme.css`: one fact, two ways of
 * getting at it.
 *
 * Reading only the first is not a half-solution, it is the drift the single
 * source of truth was built to prevent — the tag lands on the landing page and
 * on none of the Starlight pages, and the site looks configured. That happened
 * while writing `#43` and `analytics.built-test.ts` is what caught it, which is
 * the argument for that test running per page rather than once.
 *
 * Both accesses are guarded by `typeof`, because each identifier is genuinely
 * absent in the other context rather than merely empty.
 */
function readWebsiteId(): string {
  const fromVite =
    typeof import.meta.env === "undefined"
      ? undefined
      : import.meta.env.PUBLIC_UMAMI_WEBSITE_ID;
  const fromNode =
    typeof process === "undefined"
      ? undefined
      : process.env?.PUBLIC_UMAMI_WEBSITE_ID;

  return fromVite ?? fromNode ?? "";
}

/**
 * The script tag's attributes, or `null` for no tag at all.
 *
 * Attributes rather than markup so the two places that emit it cannot drift into
 * two different tags: `astro.config.mjs` for the Starlight pages, and
 * `src/layouts/Landing.astro` for the landing page, which left the framework in
 * `#30`. That was `#17`'s reasoning for this shape and it survives the change of
 * vendor.
 *
 * `defer` for the reason `#17` had to learn the hard way: a classic
 * `<script src>` in `<head>` **is** render-blocking, so a hung request gives a
 * blank page for as long as the connection takes to time out. It cost nothing to
 * keep and is cheaper still now that the script comes from the page's own origin.
 */
export function trackerAttrs(
  websiteId: string = WEBSITE_ID,
): Record<string, string | boolean> | null {
  if (!websiteId) return null;

  return {
    src: TRACKER_SRC,
    "data-website-id": websiteId,
    defer: true,
  };
}

/**
 * The rule `#17` set, restated because it outlived the tool it was written for.
 *
 * **No analytics on any host that serves a token in a URL.** `console.kolonie.ai`
 * serves `/sign-in/redeem?token=…`, `/operator/page/<token>` and
 * `/operator/autonomy/<token>`, and that token *is* the credential. Anything
 * recording the address of the page a visitor is on would be recording a working
 * sign-in link for somebody's account.
 *
 * It held for PageSense and it holds here, with one thing changed and worth
 * naming: Umami records the URL path of every page view, so the rule is if
 * anything more load-bearing than before, not less. `kolonie.ai` serves no
 * token-bearing URL, so nothing is excluded in practice — the rule is a standing
 * constraint on where this tag may go **next**, and the reason the console does
 * not get it. That console runs no JavaScript by design and its policy is
 * `default-src 'none'`.
 */
export const TOKEN_BEARING_HOSTS = [
  "console.kolonie.ai",
] as const;
