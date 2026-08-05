import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { RECORDS_DIR, RecordTransformError, DOCS_BLOB } from './decision-record.ts'
import { docsCheckout, readRecord, relativeResolver } from './kolonie-docs.ts'

/** A checkout with the shape the loader looks for, and nothing else in it. */
function fakeCheckout(files: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'kolonie-docs-'))
  mkdirSync(join(root, RECORDS_DIR), { recursive: true })
  for (const [path, body] of Object.entries(files)) {
    const full = join(root, path)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, body)
  }
  return root
}

describe('finding the kolonie-docs checkout', () => {
  it('takes KOLONIE_DOCS first, for a checkout kept somewhere of its own', () => {
    const root = fakeCheckout()
    expect(docsCheckout({ KOLONIE_DOCS: root }, '/nowhere')).toBe(root)
  })

  it('finds the one CI and the image build put inside this tree', () => {
    const parent = mkdtempSync(join(tmpdir(), 'site-'))
    mkdirSync(join(parent, '.kolonie-docs', RECORDS_DIR), { recursive: true })
    expect(docsCheckout({}, parent)).toBe(join(parent, '.kolonie-docs'))
  })

  /**
   * **The failure this exists for.** A build that shipped an empty blog would
   * be indistinguishable from a build with nothing new to publish, and would
   * stay that way for as long as nobody happened to open the page.
   */
  it('fails, rather than publishing an empty blog, when there is no checkout', () => {
    const empty = mkdtempSync(join(tmpdir(), 'site-'))

    expect(() => docsCheckout({ KOLONIE_DOCS: '/nonexistent' }, empty)).toThrow(
      /No checkout of Kolonie-AI\/kolonie-docs was found/,
    )
  })
})

describe('reading a record', () => {
  it('names the file and the list that asked for it when it is gone', () => {
    const root = fakeCheckout()

    expect(() => readRecord(root, 'renamed-away')).toThrow(
      /published-records\.ts/,
    )
  })
})

describe('resolving a record’s relative links against the checkout', () => {
  it('rewrites a link whose target is there', () => {
    const root = fakeCheckout({ 'state/decisions.md': '# register\n' })
    const resolve = relativeResolver(root, 'a-record', DOCS_BLOB)

    expect(resolve('../decisions.md')).toBe(`${DOCS_BLOB}/state/decisions.md`)
  })

  it('refuses a link whose target has been renamed away', () => {
    const root = fakeCheckout()
    const resolve = relativeResolver(root, 'a-record', DOCS_BLOB)

    expect(() => resolve('../decisions.md')).toThrow(RecordTransformError)
    expect(() => resolve('../decisions.md')).toThrow(/reads as a fact/)
  })

  it('refuses a link that climbs out of the repository entirely', () => {
    const root = fakeCheckout()
    const resolve = relativeResolver(root, 'a-record', DOCS_BLOB)

    expect(() => resolve('../../../etc/passwd')).toThrow(/points outside kolonie-docs/)
  })
})
