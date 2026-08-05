import type { Loader } from 'astro/loaders'

import { DOCS_BLOB, RECORDS_DIR, transformRecord } from './decision-record.ts'
import { docsCheckout, readRecord, relativeResolver } from './kolonie-docs.ts'
import { PUBLISHED_RECORDS } from './published-records.ts'

/**
 * The blog's content, read out of `kolonie-docs` at build time
 * (kolonie-website#15).
 *
 * A loader rather than files in `src/content/`, because a file here would be a
 * second copy of a record that is maintained somewhere else — and two copies of
 * an argument drift, with the un-edited one going wrong invisibly. Nothing this
 * loader reads is in this repository, and nothing it produces is written to it.
 */
export function decisionRecordsLoader(): Loader {
  return {
    name: 'kolonie-decision-records',
    load: async ({ store, renderMarkdown, logger }) => {
      const checkout = docsCheckout()
      logger.info(`Rendering ${PUBLISHED_RECORDS.length} decision records from ${checkout}`)
      store.clear()

      for (const [index, entry] of PUBLISHED_RECORDS.entries()) {
        const markdown = readRecord(checkout, entry.slug)
        const record = transformRecord(
          { slug: entry.slug, markdown },
          relativeResolver(checkout, entry.slug, DOCS_BLOB),
          entry.supersededBy,
        )
        store.set({
          id: entry.slug,
          data: {
            title: record.title,
            order: index,
            source: `${DOCS_BLOB}/${RECORDS_DIR}/${entry.slug}.md`,
            superseded: Boolean(entry.supersededBy),
          },
          rendered: await renderMarkdown(record.markdown),
        })
      }
    },
  }
}
