import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

import { docsCheckout } from './kolonie-docs.ts'
import { JURISDICTION, readEntity } from './entity.ts'

/**
 * What the built site says about the company (kolonie-website#41).
 *
 * `entity.test.ts` proves the reader works against files it writes itself. This
 * one is the other half and the one that would have caught the defect: it runs
 * against the real `kolonie-docs` checkout and the real built HTML, and asks
 * whether what is *served* agrees with what the repository *says*.
 *
 * A unit test could not have caught it, because there was nothing to unit-test —
 * the wrong country was a string typed into a page.
 */

const dist = fileURLToPath(new URL('../../dist', import.meta.url))

const pagesUnder = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) return pagesUnder(path)
    return entry.endsWith('.html') ? [path] : []
  })

/**
 * Every page the site writes — and deliberately not `/blog/`.
 *
 * The blog republishes decision records from `kolonie-docs` **unchanged**, and
 * says so under each one: *"If this page and that file ever disagree, the file
 * is the decision."* Those records argue about IFZA by name, because that is
 * what was decided and later questioned, and a record quoting its own reasoning
 * is not the site making a claim about where the company is registered.
 *
 * The distinction is the whole of `#15`'s design and it is worth keeping sharp:
 * a rule applied to republished text would either censor the archive or force a
 * copy of it here, and both are worse than the rule not reaching that far.
 */
const pages = pagesUnder(dist).filter((page) => !page.includes(`${sep}blog${sep}`))
const entity = readEntity(docsCheckout())

describe('the built site and the company that owns it', () => {
  it('finds pages to check at all', () => {
    // Astro emits an empty site without complaint if the content collection is
    // misconfigured, and an empty list would pass every assertion below it.
    expect(pages.length).toBeGreaterThan(3)
  })

  /**
   * **The defect, as a test.** `/who-builds-this` and the landing FAQ both said
   * Berlin while `governance/legal-structure.md` said Dubai, and both were the
   * kind of sentence nobody re-reads. This fails the build rather than waiting
   * for a reader to notice.
   */
  it.each(pages)('%s claims no location the repository does not', (page) => {
    expect(readFileSync(page, 'utf8')).not.toMatch(/Berlin/i)
  })

  it('names the entity and the jurisdiction on the page that exists to say who is behind this', () => {
    const html = readFileSync(join(dist, 'who-builds-this', 'index.html'), 'utf8')

    expect(html).toContain(entity.legalName)
    expect(html).toContain(JURISDICTION)
  })

  it('still names the person who maintains it, on the company’s behalf', () => {
    // Removing the human is the opposite of what this page is for: the decision
    // table on #41 says so, and `governance/legal-structure.md` makes him the
    // one who decides.
    const html = readFileSync(join(dist, 'who-builds-this', 'index.html'), 'utf8')

    expect(html).toContain('Gregor Sprint')
    expect(html).toMatch(/on the company(&#39;|’|')s behalf/)
  })

  it('names the entity in the landing page’s answer to who is behind this', () => {
    expect(readFileSync(join(dist, 'index.html'), 'utf8')).toContain(entity.legalName)
  })

  /**
   * The free zone is unsettled in `kolonie-docs` — IFZA is named there and the
   * registered address is the Meydan Free Zone's — and the file says not to
   * resolve that by guessing. Until it is resolved, neither name may appear on a
   * page. When it is, this test starts allowing the one the licence says.
   */
  it('publishes no free zone while kolonie-docs records the question as open', () => {
    if (entity.freeZone !== null) return

    for (const page of pages) {
      expect(readFileSync(page, 'utf8')).not.toMatch(/IFZA|Meydan Free Zone/)
    }
  })
})
