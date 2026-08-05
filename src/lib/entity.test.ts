import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { ENTITY_FILE, EntityFactError, entityLine, readEntity } from './entity.ts'

/**
 * The entity is read, never typed (kolonie-website#41).
 *
 * Every test here writes a `legal-structure.md` and reads it back, because the
 * property under test is *this module tracks that file* — and a test that
 * asserted the licence number is `16026` would be the fifth hand-written copy
 * the module exists to prevent, sitting inside its own guard.
 *
 * The one test that reads the real checkout is `entity.built-test.ts`, which
 * runs against whatever `kolonie-docs` actually says on the day of the build.
 */

/** The file as `kolonie-docs` writes it: hard-wrapped, bold in some cells. */
const LEGAL_STRUCTURE = `# Legal Structure: Dubai Company + DAO

## The Entity

**Kolonie AI FZ-LLC** — a Free Zone Limited Liability Company in Dubai, formed
**2026-08-04**. It was *in formation* from 2026-07-27.

| | |
|---|---|
| Licence number | **16026** |
| Registered address | Meydan Grandstand, 6th Floor, Meydan Road, Nad Al Sheba, Dubai, United Arab Emirates |
| Formed | 2026-08-04 |

### Which free zone — open, and not to be guessed at

This file says IFZA and the registered address is Meydan's.
`

function checkoutWith(body: string): string {
  const root = mkdtempSync(join(tmpdir(), 'kolonie-docs-'))
  mkdirSync(join(root, 'governance'), { recursive: true })
  writeFileSync(join(root, ENTITY_FILE), body)
  return root
}

describe('reading the entity out of kolonie-docs', () => {
  it('reads a name and a form that the file wraps across two lines', () => {
    const entity = readEntity(checkoutWith(LEGAL_STRUCTURE))

    expect(entity.legalName).toBe('Kolonie AI FZ-LLC')
    expect(entity.legalForm).toBe('Free Zone Limited Liability Company')
  })

  it('strips the emphasis one cell is bolded with and the next is not', () => {
    const entity = readEntity(checkoutWith(LEGAL_STRUCTURE))

    expect(entity.licenceNumber).toBe('16026')
    expect(entity.registeredAddress).toMatch(/^Meydan Grandstand, 6th Floor/)
  })

  /**
   * The prose carries a second date — *in formation from 2026-07-27* — one line
   * below the one that matters, and it is the wrong answer to *when was this
   * company formed*.
   */
  it('takes the formation date from the table and not from the prose beside it', () => {
    expect(readEntity(checkoutWith(LEGAL_STRUCTURE)).formed).toBe('2026-08-04')
  })
})

describe('the free zone, which kolonie-docs records as unsettled', () => {
  /**
   * **`null` is the answer, and publishing a guess is the failure.**
   * `legal-structure.md` says IFZA, the registered address is the Meydan Free
   * Zone's, and the file says in as many words not to resolve that by editing
   * one to match the other.
   */
  it('is null while the file states no free zone', () => {
    expect(readEntity(checkoutWith(LEGAL_STRUCTURE)).freeZone).toBeNull()
  })

  it('is picked up with no further change the day a row appears', () => {
    const settled = LEGAL_STRUCTURE.replace(
      '| Formed | 2026-08-04 |',
      '| Formed | 2026-08-04 |\n| Free zone | Meydan Free Zone |',
    )

    expect(readEntity(checkoutWith(settled)).freeZone).toBe('Meydan Free Zone')
  })
})

describe('refusing rather than publishing a blank', () => {
  it('names the file when the checkout does not have it', () => {
    const empty = mkdtempSync(join(tmpdir(), 'kolonie-docs-'))

    expect(() => readEntity(empty)).toThrow(EntityFactError)
    expect(() => readEntity(empty)).toThrow(/governance\/legal-structure\.md/)
  })

  it('refuses when the sentence naming the company has been restructured', () => {
    const renamed = LEGAL_STRUCTURE.replace(
      '**Kolonie AI FZ-LLC** — a Free Zone Limited Liability Company in Dubai',
      'The entity is Kolonie AI FZ-LLC, registered in Dubai',
    )

    expect(() => readEntity(checkoutWith(renamed))).toThrow(/the legal name and form/)
  })

  it('refuses when a row this site publishes has gone', () => {
    const withoutLicence = LEGAL_STRUCTURE.replace('| Licence number | **16026** |\n', '')

    expect(() => readEntity(checkoutWith(withoutLicence))).toThrow(/Licence number/)
  })

  /**
   * A build that printed a formation date it could not parse would put another
   * repository's prose on a legal page, which is the shape of mistake that reads
   * as deliberate to anybody who finds it.
   */
  it('refuses a formation date that is not a date', () => {
    const vague = LEGAL_STRUCTURE.replace('| Formed | 2026-08-04 |', '| Formed | August 2026 |')

    expect(() => readEntity(checkoutWith(vague))).toThrow(/not an ISO date/)
  })
})

describe('naming the entity in prose', () => {
  it('gives the jurisdiction and never the unsettled free zone', () => {
    const line = entityLine(readEntity(checkoutWith(LEGAL_STRUCTURE)))

    expect(line).toBe('Kolonie AI FZ-LLC, Dubai, United Arab Emirates')
    expect(line).not.toMatch(/IFZA|Meydan/)
  })
})
