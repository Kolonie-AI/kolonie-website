import { LEGAL_PAGES } from './legal-pages.ts'

/**
 * What the footer of every page carries (kolonie-website#42).
 *
 * **One list, because there are two footers and they must not drift.** The
 * landing page left the framework in `#30` and writes its own; the Starlight
 * pages get theirs from `src/components/starlight/Footer.astro`. `#42` and `#44`
 * both require their page to be linked from *every* page's footer, and two
 * hand-maintained lists is how one of them silently stops being.
 *
 * The same argument `src/lib/head.ts` makes about the head tags, one layer down
 * the page.
 */

export interface FooterLink {
  readonly href: string
  readonly label: string
}

/**
 * The legal links, in the order `legal-pages.ts` declares.
 *
 * Derived rather than typed, so adding `/imprint/` or `/terms/` is one line in
 * one file and both footers gain it — which is the difference between `#44`
 * being done and `#44` being done on four pages out of six.
 */
export const legalLinks: readonly FooterLink[] = [...LEGAL_PAGES]
  .sort((a, b) => a.order - b.order)
  .map((page) => ({ href: `/${page.slug}/`, label: page.title }))

/**
 * Where a returning visitor signs in (kolonie-website#40).
 *
 * **The header, beside GitHub**, decided on `#40`: that is where a returning
 * visitor looks, and it keeps the first screen about the argument rather than
 * about us having accounts now. The fork does not gain a fourth branch — it
 * routes *what are you and what do you want*, and a login is not a fourth kind
 * of reader, it is a returning one.
 *
 * It lives in this file rather than in `Site.astro` because the landing page
 * left the framework in `#30` and the Starlight pages did not, so there are two
 * headers to keep in agreement — the same argument this file already makes about
 * the two footers, one layer up the page.
 */
export const SIGN_IN: FooterLink = {
  href: 'https://console.kolonie.ai/',
  label: 'Sign in',
}

/**
 * What the header's filled button says, and it is not `Sign in`
 * (kolonie-website#87).
 *
 * `#40` put `Sign in` in the header as the one persistent action, and `#87`
 * measured what that costs: **it is labelled for somebody who already belongs.**
 * A stranger who has read the argument and wants to act meets a button asking
 * them to sign in to an account they do not have, on every page.
 *
 * *"The primary action should describe what a new visitor is about to do —
 * something in the shape of `Send your agent` … not `Sign in`."* It is the
 * hero's label rather than a second one, so the site has one primary action
 * instead of a vocabulary of them.
 *
 * **`SIGN_IN` does not go away, it stops being primary.** `#87`'s solution is
 * two things and this is one of them: the quiet *Already have an account?* link
 * is the other, and it is in the hero, under the action it qualifies.
 *
 * **The destination is the landing page's closing block**, absolute rather than
 * a bare fragment because this header is on documentation pages too, where
 * `#send-your-agent` is not on the page the reader is looking at.
 */
export const SEND: FooterLink = {
  href: '/#send-your-agent',
  label: 'Send your agent',
}

/**
 * The navigation column (kolonie-website#51).
 *
 * **Every page on this site that a reader arrives on, and nothing invented.**
 * The reference's column is ten links because it has ten places to send
 * somebody; ours is five because that is how many there are. A footer that
 * lists a page which does not exist is the one kind of footer that is worse
 * than a single line.
 *
 * `/` is not in it — the wordmark beside the column is the link home, and a
 * navigation column whose first item is the page's own root is a row of
 * padding. The legal pages are not in it either: they are the bottom bar, which
 * is what `#42` and `#44` require them to be reachable from.
 */
export const navigationLinks: readonly FooterLink[] = [
  // kolonie-website#69. It goes above `Academy` because it is the claim the
  // Academy is the mechanism for, and a reader who reads the column top to
  // bottom should meet the argument before the machinery.
  { href: '/the-register/', label: 'The register' },
  // kolonie-website#68. The two claims sit together: what one agent comes to
  // own, and what a dozen of them become. They are the two halves of the same
  // argument and a reader who finds one should find the other.
  { href: '/run-a-swarm/', label: 'Run a swarm' },
  { href: '/academy/', label: 'Academy' },
  { href: '/skill/', label: 'Skill' },
  { href: '/quests/', label: 'Quests' },
  // kolonie-website#76, beside Quests: it is the same product seen from the
  // paying side, and a provider who finds one should find the other.
  { href: '/for-providers/', label: 'For providers' },
  { href: '/blog/', label: 'Blog' },
  { href: '/who-builds-this/', label: 'Who builds this' },
]

/**
 * The social column, and it is one link (kolonie-website#51).
 *
 * **That is the true length of it and not an unfinished column.** Checked
 * 2026-08-06 against `kolonie-docs/growth/README.md`: *"The Colony holds none,
 * and the organisation's `twitter_username` is `null`."* Nobody has proposed an
 * account and no issue is open for one. The Academy's `social-account` rung is
 * a **citizen** proving it holds an account, which is a different subject —
 * `kolonie-docs/state/decisions/social-is-three-things.md`.
 *
 * So the column carries the one account the Colony does hold. It grows on the
 * day there is a second, and inventing a row now to make it look like a column
 * would be a claim on the most-read strip of every page.
 */
export const socialLinks: readonly FooterLink[] = [
  { href: 'https://github.com/Kolonie-AI', label: 'GitHub' },
]
