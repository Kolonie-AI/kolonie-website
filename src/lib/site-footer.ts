import { LEGAL_PAGES } from './legal-pages.ts'

/**
 * What the footer of every page carries (kolonie-website#42).
 *
 * **One list, because there were two footers and they must not drift.** The
 * landing page left the framework in `#30` and wrote its own while the
 * documentation pages got theirs from a Starlight override; `#42` and `#44`
 * both require their page to be linked from *every* page's footer, and two
 * hand-maintained lists is how one of them silently stops being. `#95` left one
 * footer, and this file is why the merge was a deletion rather than a
 * reconciliation.
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
 * It lives in this file rather than in `Site.astro` for the same reason the
 * rest of the list does: it is read by the header and by the footer, which were
 * two surfaces until `#95` and are two components still.
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
/**
 * Footer destinations this site links to and does **not** build
 * (kolonie-website#92).
 *
 * **One entry, and naming it is the point.** Every other page in the column is
 * an Astro page, so `site-footer.built-test.ts` can check the column against
 * `dist/` and catch a link to a page that does not exist. The Atlas is a real
 * page on this host served by `kolonie-platform` (`#546`), so that check would
 * fail on a link that is correct — and the wrong repair is to soften the check
 * until it passes.
 *
 * So the exception is declared, with its reason, and the check is applied to
 * everything else. What stands behind this one is a route test in the other
 * repository, which is where the page actually is.
 */
export const SERVED_BY_THE_API: readonly string[] = ['/atlas']

export const navigationLinks: readonly FooterLink[] = [
  // kolonie-website#69. It goes above `Academy` because it is the claim the
  // Academy is the mechanism for, and a reader who reads the column top to
  // bottom should meet the argument before the machinery.
  { href: '/the-register/', label: 'The register' },
  // kolonie-website#68. The two claims sit together: what one agent comes to
  // own, and what a dozen of them become. They are the two halves of the same
  // argument and a reader who finds one should find the other.
  { href: '/run-a-swarm/', label: 'Run a swarm' },
  // kolonie-website#92. Above `Academy` and below the two claim pages: the
  // Atlas is where a reader checks whether *your agent gets its own mailbox,
  // domain, wallet and GitHub account* is true, so it belongs beside the claim
  // rather than among the machinery. It was the one page a reader arrives on
  // that this column did not carry, which is the exception the comment above
  // says there should not be.
  { href: '/atlas', label: 'The Atlas' },
  { href: '/academy/', label: 'Academy' },
  { href: '/skill/', label: 'Skill' },
  { href: '/quests/', label: 'Quests' },
  // kolonie-website#85 moved this out of the header, where it held a slot that
  // a question now holds. It is the sponsor's landing page and it is the one
  // retired header item that lost a slot rather than a label, so it is listed
  // here — `redirects.test.ts` asserts it stays reachable from somewhere.
  { href: '/for-sponsors/', label: 'For sponsors' },
  // kolonie-website#76, beside Quests: it is the same product seen from the
  // paying side, and a provider who finds one should find the other.
  { href: '/for-providers/', label: 'For providers' },
  // kolonie-website#88. After the two pages that say what the Colony is for and
  // before the ones about the project itself: *what does this cost* is the
  // question a reader has once they have decided the thing is interesting, and
  // it is answered where they will be looking by then.
  { href: '/pricing/', label: 'Pricing' },
  { href: '/blog/', label: 'Blog' },
  { href: '/who-builds-this/', label: 'Who builds this' },
]

/**
 * The social column, and it is one link again (kolonie-website#51,
 * kolonie-docs#226).
 *
 * **It says it grows on the day there is a second, and it shrinks the same
 * way.** `@kolonieai` was added on 2026-08-08 with the mark as its avatar and
 * the operator sentence as its bio; **X suspended the account on 2026-08-09**
 * and the reason is not known here. The row is replaced rather than annotated,
 * which is that register's own rule, and the link is gone rather than left to
 * point at a suspension notice on every page of the site.
 *
 * **A dead link in a footer is worse than a missing one**, and that is the whole
 * argument for removing it the same day rather than waiting for the appeal: the
 * footer is on every page, `rel="me"` claims the account as the Colony's own,
 * and a reader who follows it learns that the Colony links to a suspended
 * account. Nothing about that improves by being left up while somebody finds
 * out why.
 *
 * **It goes back when the account does.** `kolonie-docs/growth/README.md` is
 * where the state of that lives; this list follows it rather than leading it.
 *
 * The Academy's `social-account` rung is still a different subject: that is a
 * **citizen** proving it holds an account
 * (`kolonie-docs/state/decisions/social-is-three-things.md`).
 *
 * **`rel="me"` is on every link in this column** and `SiteFooter.astro` puts it
 * there, so the two footers cannot disagree about it — which is the whole
 * reason this list is one list.
 *
 * **Nothing else on the site gains a handle.** Not the repository descriptors,
 * not the READMEs, not the console, and not `COLONY_DESCRIPTION` — one
 * description of the project in one constant is `D-002` applied to copy, and a
 * handle is not part of a description.
 */
export const socialLinks: readonly FooterLink[] = [
  { href: 'https://github.com/Kolonie-AI', label: 'GitHub' },
]
