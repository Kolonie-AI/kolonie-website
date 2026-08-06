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

/** The links that are not legal pages, and were in the footer before there were any. */
export const projectLinks: readonly FooterLink[] = [
  {
    href: 'https://github.com/Kolonie-AI',
    label: 'The code, and every decision behind it',
  },
  { href: '/who-builds-this/', label: 'Who builds this' },
]
