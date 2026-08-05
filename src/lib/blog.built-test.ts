import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { PUBLISHED_RECORDS } from './published-records.ts'

/**
 * Run **after** `astro build`, on what it produced (kolonie-website#15).
 *
 * The transform's own tests are pure and prove the rules. What only the output
 * can answer is whether the records actually arrived: a loader that read
 * nothing would leave a blog index with no links under it, and a site that
 * built cleanly. That is the *"worst kind of green"* the content collection was
 * commented against, one surface along.
 */

const dist = fileURLToPath(new URL('../../dist', import.meta.url))
const read = (path: string) => readFileSync(join(dist, path), 'utf8')

describe('the blog in the built site', () => {
  it('built one page per published record, and not a page more', () => {
    for (const record of PUBLISHED_RECORDS) {
      expect(() => read(`blog/${record.slug}/index.html`)).not.toThrow()
    }
    expect(read('blog/index.html')).toContain('/blog/monorepo-reversed/')
  })

  it('carries no relative link out of a record, on any post', () => {
    for (const record of PUBLISHED_RECORDS) {
      const html = read(`blog/${record.slug}/index.html`)
      // `../decisions.md` is the line 62 of 63 records open with, and it is a
      // 404 the moment the file is rendered anywhere but the repository.
      expect(html, record.slug).not.toMatch(/href="\.\.?\/[^"]*\.md/)
    }
  })

  it('sends every post back to the file it was rendered from', () => {
    for (const record of PUBLISHED_RECORDS) {
      expect(read(`blog/${record.slug}/index.html`), record.slug).toContain(
        `kolonie-docs/blob/main/state/decisions/${record.slug}.md`,
      )
    }
  })

  it('tells a reader, above the fold, when a decision no longer stands', () => {
    const superseded = PUBLISHED_RECORDS.filter((record) => record.supersededBy)
    // Publishing only decisions that survived is the thing this blog refuses to
    // do, so at least one has to be there to prove the notice renders.
    expect(superseded.length).toBeGreaterThan(0)

    for (const record of superseded) {
      const html = read(`blog/${record.slug}/index.html`)
      expect(html, record.slug).toContain('This decision no longer stands')
      expect(html, record.slug).toContain(record.supersededBy!.href)
    }
  })
})
