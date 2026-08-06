import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { RecordTransformError } from './decision-record.ts'
import { GOVERNANCE_DIR, LEGAL_PAGES } from './legal-pages.ts'
import { rewriteGovernanceLinks, sourceUrl } from './legal-loader.ts'

/**
 * The one transform the legal pages need (kolonie-website#42).
 *
 * `privacy.md` is written to be read as the page and needs none of the rewriting
 * a decision record does — except for one thing. It links to
 * `legal-structure.md` beside it, which resolves in the repository and resolves
 * to nothing on a website. A legal page that promises where its facts come from
 * and then serves a 404 is worse than one that never offered.
 */

function checkoutWith(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'kolonie-docs-'))
  mkdirSync(join(root, GOVERNANCE_DIR), { recursive: true })
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(join(root, GOVERNANCE_DIR, name), body)
  }
  return root
}

const checkout = checkoutWith({
  'privacy.md': '',
  'legal-structure.md': '',
  'erasure.md': '',
})

describe('links out of a legal page', () => {
  it('sends a link to an unpublished governance file to the repository', () => {
    const out = rewriteGovernanceLinks(
      'the entity in [`legal-structure.md`](legal-structure.md)',
      checkout,
      'privacy',
    )

    expect(out).toContain(sourceUrl('legal-structure'))
  })

  it('keeps a fragment', () => {
    const out = rewriteGovernanceLinks('[x](erasure.md#2-what-is-deleted)', checkout, 'privacy')

    expect(out).toContain('erasure.md#2-what-is-deleted')
  })

  /**
   * A reader following a link to something this site *has* should stay on the
   * site rather than be sent to GitHub for it.
   */
  it('sends a link to a published legal page to the served page', () => {
    const slug = LEGAL_PAGES[0].slug
    const out = rewriteGovernanceLinks(`see [it](${slug}.md)`, checkout, 'other')

    expect(out).toBe(`see [it](/${slug}/)`)
  })

  it('leaves absolute links and anchors alone', () => {
    const source = '[a](https://example.com/x.md) and [b](#section-3)'

    expect(rewriteGovernanceLinks(source, checkout, 'privacy')).toBe(source)
  })

  /**
   * **The failure this exists for.** A renamed governance file would otherwise
   * publish a link to a page that is not there, from the one page on this site
   * whose entire purpose is that its facts can be checked against their source.
   */
  it('fails the build on a link the checkout cannot account for', () => {
    expect(() =>
      rewriteGovernanceLinks('[gone](treasury-plan.md)', checkout, 'privacy'),
    ).toThrow(RecordTransformError)
    expect(() =>
      rewriteGovernanceLinks('[gone](treasury-plan.md)', checkout, 'privacy'),
    ).toThrow(/does not resolve/)
  })
})

describe('the published list', () => {
  it('publishes only what it names, and never a whole directory', () => {
    // A glob over kolonie-docs/governance/ would put red-lines.md and
    // treasury.md on the public site the day somebody renamed a directory.
    for (const page of LEGAL_PAGES) {
      expect(page.slug).toMatch(/^[a-z][a-z0-9-]*$/)
      expect(page.description.length).toBeGreaterThan(20)
    }
  })
})
