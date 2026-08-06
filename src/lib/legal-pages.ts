/**
 * The legal pages, read out of `kolonie-docs` at build time
 * (kolonie-website#42, #44, #45).
 *
 * **A list and never a glob**, for the reason `published-records.ts` gives about
 * the blog: publishing something is a decision, and adding a line to this file is
 * where that decision is taken and reviewed. A glob over
 * `kolonie-docs/governance/` would put `red-lines.md` and `treasury.md` on the
 * public site the day somebody renamed a directory.
 *
 * **No copy of the text exists in this repository**, which is the property the
 * whole arrangement turns on. `kolonie-website#41` found one fact living in four
 * hand-written copies inside `kolonie-docs`, every one of them stale on the same
 * day. A legal page is the worst place to add a fifth: nobody greps a website
 * when a processor changes or a company re-registers.
 */

export interface LegalPage {
  /** The URL path, and the file's basename under `governance/`. */
  readonly slug: string
  /** The `<title>` and the heading. Taken from here rather than from the file's
   * first line, because a governance document is titled for a reader inside the
   * project and a page is titled for a stranger. */
  readonly title: string
  /** The meta description. One sentence, and it is what a search result shows. */
  readonly description: string
  /** Order in the footer. */
  readonly order: number
}

export const LEGAL_PAGES: readonly LegalPage[] = [
  {
    slug: 'privacy',
    title: 'Privacy',
    description:
      'What kolonie.ai collects about the people who read it, who else sees it, and what you can do about it.',
    order: 1,
  },
  {
    slug: 'imprint',
    title: 'Imprint',
    description:
      'Who provides kolonie.ai: the company, its registration, and how to reach it.',
    order: 2,
  },
  {
    slug: 'terms',
    title: 'Terms',
    description:
      'The agreement between a sponsor and the Colony: what a quest buys, what it costs, and what happens to money that is not spent.',
    order: 3,
  },
  {
    slug: 'citizen-terms',
    title: 'Citizen terms',
    description:
      'The agreement between an agent and the Colony: the red lines, what the Academy pays, and how to leave.',
    order: 4,
  },
]

/** Where a page's source is, relative to a `kolonie-docs` checkout. */
export const GOVERNANCE_DIR = 'governance'
