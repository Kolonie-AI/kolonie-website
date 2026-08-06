import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { Loader } from 'astro/loaders'

import { RecordTransformError } from './decision-record.ts'
import { docsCheckout } from './kolonie-docs.ts'
import { GOVERNANCE_DIR, LEGAL_PAGES } from './legal-pages.ts'

/**
 * The legal pages' content, read out of `kolonie-docs` at build time
 * (kolonie-website#42).
 *
 * Same shape as `decision-records-loader.ts` and for the same reason: a file in
 * `src/content/` would be a second copy of a document maintained somewhere else,
 * and the un-edited copy is the one that goes wrong invisibly.
 *
 * **What is different from the blog is what happens to links.** A decision
 * record is written for somebody inside the project and its relative links are
 * rewritten to GitHub by `decision-record.ts`. These documents are written to be
 * *read as the page* — they already address a stranger — so the transform here is
 * one rule rather than five, and it exists because a governance file linking to
 * `legal-structure.md` must not become a `404` on a website that does not serve
 * one.
 */
export function legalPagesLoader(): Loader {
  return {
    name: 'kolonie-legal-pages',
    load: async ({ store, renderMarkdown, logger }) => {
      const checkout = docsCheckout()
      logger.info(`Rendering ${LEGAL_PAGES.length} legal page(s) from ${checkout}`)
      store.clear()

      for (const page of LEGAL_PAGES) {
        const path = join(checkout, GOVERNANCE_DIR, `${page.slug}.md`)
        if (!existsSync(path)) {
          throw new RecordTransformError(
            `${page.slug}: no such document at ${path}. It is named in ` +
              'src/lib/legal-pages.ts; either it was renamed in kolonie-docs or the ' +
              'name is a typo. This fails the build rather than serving a legal page ' +
              'with nothing on it.',
          )
        }

        store.set({
          id: page.slug,
          data: {
            title: page.title,
            description: page.description,
            order: page.order,
            source: sourceUrl(page.slug),
          },
          rendered: await renderMarkdown(
            rewriteGovernanceLinks(readFileSync(path, 'utf8'), checkout, page.slug),
          ),
        })
      }
    },
  }
}

/** Where a reader is sent to check the document against its source. */
export function sourceUrl(slug: string): string {
  return `https://github.com/Kolonie-AI/kolonie-docs/blob/main/${GOVERNANCE_DIR}/${slug}.md`
}

/**
 * Relative links to other governance files become links to the repository.
 *
 * `privacy.md` links to `legal-structure.md` beside it, which resolves in the
 * repository and resolves to nothing on the website — a legal page that promises
 * where its facts come from and then serves a `404` is worse than one that never
 * offered.
 *
 * **A link this cannot account for fails the build**, the same rule
 * `relativeResolver` applies to the blog. On a site whose whole argument is that
 * its claims are checkable, a published `404` is a broken promise that nothing
 * warns about.
 *
 * A link to a governance file that *is itself published here* is left alone and
 * pointed at the served page instead — a reader following it should stay on the
 * site rather than be sent to GitHub for something the site has.
 */
export function rewriteGovernanceLinks(
  markdown: string,
  checkout: string,
  slug: string,
): string {
  const published = new Set(LEGAL_PAGES.map((page) => page.slug))

  return markdown.replace(
    /\]\((?!https?:|#|\/)([^)\s]+\.md)(#[^)\s]*)?\)/g,
    (_match, relative: string, fragment = '') => {
      const target = relative.replace(/^\.\//, '')
      const name = target.replace(/\.md$/, '')

      if (published.has(name) && !target.includes('/')) return `](/${name}/${fragment})`

      if (!existsSync(join(checkout, GOVERNANCE_DIR, target))) {
        throw new RecordTransformError(
          `${slug}: the link ${relative} does not resolve inside ` +
            `${GOVERNANCE_DIR}/ in the kolonie-docs checkout. Publishing it would ` +
            'emit a 404 from a page whose entire purpose is that its facts can be ' +
            'checked against their source.',
        )
      }

      return `](${sourceUrl(target.replace(/\.md$/, ''))}${fragment})`
    },
  )
}
