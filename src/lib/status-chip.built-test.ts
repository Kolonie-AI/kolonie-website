import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The liveness chip, on every page and exactly once (kolonie-website#38).
 *
 * The line it replaces was on the landing page only, which is what `#38` is
 * about: `/skill`, `/quests` and `/academy` asserted nothing about liveness,
 * and `/skill` is the page an agent is handed.
 *
 * Runs after `astro build`, because *on every page* is a property of the output
 * and of nothing else.
 */

const dist = fileURLToPath(new URL('../../dist', import.meta.url))

const pagesUnder = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) return pagesUnder(path)
    return entry.endsWith('.html') ? [path] : []
  })

const pages = pagesUnder(dist)
const named = pages.map((page) => page.slice(dist.length))

describe('the liveness chip', () => {
  it('found pages to check at all', () => {
    expect(pages.length).toBeGreaterThan(3)
  })

  it.each(named)('is on %s', (page) => {
    expect(readFileSync(join(dist, page), 'utf8')).toContain('liveness__dot')
  })

  /**
   * **Exactly one, and this is the failure the count exists to catch.** The site
   * has two footers — the landing page left the framework in `#30` — and a page
   * that rendered both would carry two reads of one fact. This is also what
   * caught `.chip` colliding with `<AcademyGraph />`'s 146 skill chips. `#38`'s decision table
   * calls that the page arguing with itself, and the day they disagree is the
   * day it is visible.
   */
  it.each(named)('is on %s exactly once', (page) => {
    const html = readFileSync(join(dist, page), 'utf8')
    const chips = html.match(/class="liveness[ "]/g) ?? []

    // Ordinary pages carry the live chip and its noscript fallback. The chrome
    // fragment is the one static consumer and carries one settled chip (issue 107).
    expect(chips.length).toBe(page === '/site-chrome/index.html' ? 1 : 2)
  })

  /**
   * `<RegistrationState />` is gone rather than hidden. `#38` decided the chip
   * replaces the line entirely, and a component left in the tree is one somebody
   * re-adds to a page later without knowing why it left.
   */
  it.each(named)('has no trace of the line it replaced on %s', (page) => {
    expect(readFileSync(join(dist, page), 'utf8')).not.toContain('reg__dot')
  })
})

describe('what the chip may never say', () => {
  /**
   * **Two states and never a third.** *Could not be reached* is not *closed*: a
   * page that cannot reach the Colony knows exactly one thing, and rendering
   * that as a closed door is `#9`'s false sentence pointing the other way — which
   * costs a first-time reader permanently, because they leave.
   *
   * Checked against the bundled script, because the third state would arrive as
   * a string in the component rather than in the HTML.
   */
  it('never renders the Colony as closed', () => {
    const assets = readdirSync(join(dist, '_astro'))
      .filter((entry) => entry.endsWith('.js'))
      .map((entry) => readFileSync(join(dist, '_astro', entry), 'utf8'))
      .join('\n')

    const chip = assets + pages.map((page) => readFileSync(page, 'utf8')).join('\n')

    expect(chip).not.toMatch(/registration is closed/i)
    expect(chip).not.toMatch(/the colony is closed/i)
  })

  /**
   * One request per page load, and no polling. A landing page that heartbeats
   * against the API is load the Colony did not ask for, from readers who are not
   * customers — `#38`'s decision table.
   */
  it('sets no timer to ask again', () => {
    const assets = readdirSync(join(dist, '_astro'))
      .filter((entry) => entry.endsWith('.js'))
      .map((entry) => readFileSync(join(dist, '_astro', entry), 'utf8'))

    const chipScript = assets.filter((asset) => asset.includes('liveness__dot') || asset.includes('[data-liveness-text]'))
    expect(chipScript.length).toBeGreaterThan(0)

    for (const asset of chipScript) {
      expect(asset).not.toMatch(/setInterval|setTimeout/)
    }
  })
})
