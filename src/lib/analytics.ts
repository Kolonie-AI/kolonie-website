/**
 * Zoho PageSense, so the Colony can see how people actually move through the
 * site (kolonie-website#17). Requested by the maintainer, 2026-08-05.
 *
 * **The URL lives here and nowhere else.** It carries the project id, which is a
 * public client-side identifier served to every visitor by construction — so
 * committing it breaks no rule in `AGENTS.md` §9 — but a string pasted per page
 * is a string that gets half-updated, and `analytics.built-test.ts` asserts it
 * appears on every built page rather than on the ones somebody remembered.
 *
 * **The plain loader, chosen over Zoho's longer variant.** The long snippet
 * hides `<body>` and `<html>` with `opacity: 0` until its script has loaded,
 * falling back after ten seconds — an anti-flicker device for split tests, which
 * the Colony is not running. On a site whose landing page exists to be read,
 * that trades a certain blank page against a hypothetical flicker.
 *
 * ## Where it may go, which is a rule and not a description
 *
 * **Only pages that carry no magic link are tracked**, decided by the maintainer
 * on 2026-08-05. A sign-in token travels in a URL and PageSense records URLs:
 * `console.kolonie.ai` serves `/sign-in/redeem?token=…`, `/operator/page/<token>`
 * and `/operator/autonomy/<token>`, and that token *is* the credential. A tool
 * that recorded the address of the page a visitor is on would be recording a
 * working sign-in link for somebody's account.
 *
 * `kolonie.ai` serves no token-bearing URL, so nothing here is excluded in
 * practice. The rule is a standing constraint on where this tag may go **next**,
 * and the reason the console does not get it. Tracking the console would be a
 * `kolonie-platform` change with its own CSP amendment, its own exclusion rules
 * and its own test — that console runs no JavaScript by design and its policy is
 * `default-src 'none'`.
 */
export const PAGESENSE_SRC =
  "https://cdn-eu.pagesense.io/js/20099313857/bc90774253b5437f852dd57c2cea80ec.js";

/**
 * `defer`, and the issue that asked for this assumed it was unnecessary.
 *
 * `#17` reasoned that the page stays readable with the CDN unreachable because
 * *"`<script>` is non-blocking for rendering"*. A classic `<script src>` in
 * `<head>` is the one shape of script that **is** render-blocking: the parser
 * stops until it loads or fails, so a CDN that hangs rather than refuses gives a
 * blank page for as long as the connection takes to time out — the exact failure
 * the plain loader was chosen to avoid.
 *
 * `defer` keeps the tag in one place, keeps it on every page, and executes it
 * after the document is parsed and before `DOMContentLoaded`, which is early
 * enough for an analytics loader and late enough that nothing it does can hold
 * up a paint.
 */
export const PAGESENSE_ATTRS = { src: PAGESENSE_SRC, defer: true } as const;
