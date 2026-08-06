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
 * It lives in this file rather than in `Landing.astro` because the landing page
 * left the framework in `#30` and the Starlight pages did not, so there are two
 * headers to keep in agreement — the same argument this file already makes about
 * the two footers, one layer up the page.
 */
export const SIGN_IN: FooterLink = {
  href: 'https://console.kolonie.ai/',
  label: 'Sign in',
}

/** The links that are not legal pages, and were in the footer before there were any. */
export const projectLinks: readonly FooterLink[] = [
  {
    href: 'https://github.com/Kolonie-AI',
    label: 'The code, and every decision behind it',
  },
  { href: '/who-builds-this/', label: 'Who builds this' },
]
