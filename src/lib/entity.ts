import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Who the company is, read from `kolonie-docs` at build time (kolonie-website#41).
 *
 * `/who-builds-this` said *"maintained by Gregor Sprint, in Berlin"* while
 * `governance/legal-structure.md` said the site belongs to a Dubai company. That
 * is `#9`'s defect on the one page that exists to be checkable — and the reason
 * it survived is the interesting part rather than the sentence itself.
 *
 * **The same fact lived in four hand-written copies inside `kolonie-docs`, and
 * every one of them was stale on the same day.** `legal-structure.md`,
 * `README.md`, `state/STATUS.md` and `state/decisions.md` all said *in formation*
 * about a company formed on 2026-08-04; `7242b54` corrected all four at once. A
 * website that types the entity name into a page is the fifth copy, with a longer
 * fuse than any of them, because nobody greps a website when a company registers.
 *
 * So the pages that carry entity facts — `/who-builds-this`, and the `/imprint/`
 * of `#44` — render from this module, and this module reads the licence. There is
 * no copy here to go stale: if the file changes, the next build changes with it,
 * and if the file changes *shape* the build fails rather than publishing a page
 * with a field silently missing.
 */

/** A refusal that names the file and the field, because both are needed to fix it. */
export class EntityFactError extends Error {}

/** Where the entity's facts are, relative to a `kolonie-docs` checkout. */
export const ENTITY_FILE = 'governance/legal-structure.md'

export interface Entity {
  /** `Kolonie AI FZ-LLC` — also the copyright holder in every repository's LICENSE. */
  readonly legalName: string
  /** `Free Zone Limited Liability Company`, spelled out rather than as the suffix. */
  readonly legalForm: string
  /** The trade licence number, as the licence writes it. */
  readonly licenceNumber: string
  /** The registered address, one line, as the licence writes it. */
  readonly registeredAddress: string
  /** ISO date of formation. */
  readonly formed: string
  /**
   * The free zone, or `null` while `kolonie-docs` records the question as open.
   *
   * **`null` is a real answer here and not a missing value.** The repository says
   * IFZA and the registered address is Meydan's; one of the two is wrong, and
   * `legal-structure.md` says in as many words not to resolve it by editing one
   * to match the other. A page that picked one would be publishing a guess about
   * a company registration, which is the one class of claim this site cannot make
   * cheaply. `#44` ships the imprint without the field and says so in the page.
   *
   * The day somebody reads the licence and adds a `Free zone` row to the table,
   * every page rendering this picks it up with no further change.
   */
  readonly freeZone: string | null
}

/**
 * The jurisdiction, which is certain whichever free zone turns out to be right.
 *
 * Both candidate zones are in Dubai, so this is not the same kind of claim as
 * {@link Entity.freeZone} and does not wait on it.
 */
export const JURISDICTION = 'Dubai, United Arab Emirates'

/**
 * Read the entity out of a `kolonie-docs` checkout.
 *
 * **Whitespace is normalised before anything is matched**, and that is not
 * tidiness. These files are hard-wrapped at eighty columns, so the sentence
 * naming the company spans two lines and the phrase *"formed **2026-08-04**"* is
 * split across them. A pattern written against the file as it looks in an editor
 * matches nothing.
 */
export function readEntity(checkout: string): Entity {
  const path = join(checkout, ENTITY_FILE)
  if (!existsSync(path)) {
    throw new EntityFactError(
      `${ENTITY_FILE} is not in the kolonie-docs checkout at ${checkout}. ` +
        'It is where this site reads the legal entity from; without it every page ' +
        'naming the company would have to hand-copy the facts, which is the failure ' +
        'kolonie-website#41 exists to prevent.',
    )
  }

  const source = readFileSync(path, 'utf8')
  const flowed = source.replace(/\s+/g, ' ')

  const named = flowed.match(
    /\*\*(Kolonie AI [^*]+?)\*\* — a (Free Zone [A-Za-z ]*?Company) in Dubai/,
  )
  if (!named) {
    throw new EntityFactError(
      missing('the legal name and form', '**<name>** — a <form> in Dubai'),
    )
  }

  return {
    legalName: named[1].trim(),
    legalForm: named[2].trim(),
    licenceNumber: row(flowed, 'Licence number'),
    registeredAddress: row(flowed, 'Registered address'),
    formed: formationDate(flowed),
    freeZone: optionalRow(flowed, 'Free zone'),
  }
}

/**
 * One cell of the entity table, with the emphasis the file writes it in stripped.
 *
 * `legal-structure.md` bolds the licence number and does not bold the address,
 * which is a difference in how a table was typed and not a difference in the
 * fact. Rendering `**16026**` on the imprint would publish the Markdown.
 */
function row(flowed: string, label: string): string {
  const value = optionalRow(flowed, label)
  if (value === null) throw new EntityFactError(missing(label, `| ${label} | <value> |`))
  return value
}

function optionalRow(flowed: string, label: string): string | null {
  const found = flowed.match(new RegExp(`\\| ${label} \\|([^|]+)\\|`, 'i'))
  if (!found) return null
  const value = found[1].replace(/\*\*/g, '').trim()
  return value === '' ? null : value
}

/**
 * The formation date, taken from the table rather than from the prose.
 *
 * Both carry it. The table is the one a person updates when a licence changes,
 * and the prose sentence around it — *"It was in formation from 2026-07-27"* —
 * carries a second date that a looser pattern would happily return instead.
 */
function formationDate(flowed: string): string {
  const formed = row(flowed, 'Formed')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(formed)) {
    throw new EntityFactError(
      `${ENTITY_FILE} has a "Formed" row reading ${JSON.stringify(formed)}, which is not ` +
        'an ISO date. The pages that render it state a formation date to the day, ' +
        'and a date they cannot parse is one they would print as prose from another repository.',
    )
  }
  return formed
}

function missing(what: string, shape: string): string {
  return (
    `${ENTITY_FILE} no longer states ${what} in the shape this site reads ` +
    `(${shape}). The file was restructured, or the fact moved. This is a failed build ` +
    'rather than a page with a blank where a company registration should be: ' +
    'kolonie-website#41 and #44 both publish these, and a silently empty legal ' +
    'disclosure is worse than no page at all.'
  )
}

/**
 * How the entity is named in running prose, on any page that mentions it once.
 *
 * The free zone stays out of it even when it is settled — a sentence in the
 * middle of an argument does not carry a registration; `/imprint/` does.
 */
export function entityLine(entity: Entity): string {
  return `${entity.legalName}, ${JURISDICTION}`
}
