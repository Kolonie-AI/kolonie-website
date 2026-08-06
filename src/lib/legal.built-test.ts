import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { LEGAL_PAGES } from './legal-pages.ts'

/**
 * The legal pages are served, and linked from every page (kolonie-website#42).
 *
 * **The acceptance criterion is the link, not the page.** A privacy policy that
 * exists at a URL nobody can reach discharges no information duty, and the way
 * that happens is not somebody deleting the link — it is somebody adding a page
 * and the second of two hand-maintained footers not gaining it. This site has
 * two footers, because the landing page left the framework in `#30`.
 *
 * Runs after `astro build`, against the built HTML, because a link and the page
 * it points at are only both visible there.
 */

const dist = fileURLToPath(new URL('../../dist', import.meta.url))

const pagesUnder = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) return pagesUnder(path)
    return entry.endsWith('.html') ? [path] : []
  })

const pages = pagesUnder(dist)

describe('the legal pages', () => {
  it('found pages to check at all', () => {
    expect(pages.length).toBeGreaterThan(3)
  })

  it.each(LEGAL_PAGES.map((page) => page.slug))('/%s/ is served', (slug) => {
    const html = readFileSync(join(dist, slug, 'index.html'), 'utf8')

    // Not merely present: a page that rendered an empty document would exist,
    // return 200, and disclose nothing.
    expect(html.length).toBeGreaterThan(2000)
    expect(html).toContain('kolonie-docs/blob/main/governance/')
  })

  /**
   * Every page, and that includes `/404.html` and the blog. A reader who lands
   * on a page that does not exist is exactly as entitled to find the policy as
   * one who did not.
   */
  it.each(
    pages.flatMap((page) =>
      LEGAL_PAGES.map((legal) => [page.slice(dist.length), legal.slug] as const),
    ),
  )('%s links to /%s/', (page, slug) => {
    expect(readFileSync(join(dist, page), 'utf8')).toContain(`href="/${slug}/"`)
  })
})

describe('the imprint discloses the provider', () => {
  const html = readFileSync(join(dist, 'imprint', 'index.html'), 'utf8')

  /**
   * Every field the e-Commerce Directive Art. 5 wants, and the DDG after it.
   * Asserted against the *served* page because the point of `#44` is that the
   * facts are read out of `kolonie-docs` at build time — a test over the source
   * would only prove that a marker is still in a Markdown file.
   */
  it('carries the entity, the registration and a working contact', () => {
    expect(html).toContain('Kolonie AI FZ-LLC')
    expect(html).toContain('Free Zone Limited Liability Company')
    expect(html).toContain('Meydan Grandstand')
    expect(html).toContain('16026')
    expect(html).toContain('2026-08-04')
    expect(html).toContain('hello@kolonie.ai')
    expect(html).toContain('Gregor Sprint')
  })

  /**
   * **The field that is missing says so, in the page.** `#44`'s decision was to
   * ship what is known and name what is not — literally — rather than leave a
   * blank that reads as an oversight or a placeholder that reads as an answer.
   */
  it('says the free zone is unpublished rather than leaving a gap', () => {
    expect(html).toMatch(/Free zone/)
    expect(html).toMatch(/unsettled|not named here/i)
  })

  it('is one screen of facts and not a second /who-builds-this/', () => {
    // Two pages making the same argument is how one of them goes stale. The
    // imprint carries the disclosure; the argument stays where it was.
    expect(html).not.toContain('most of the commits are written by AI')
  })
})

describe('what the privacy policy has to say to be one', () => {
  const html = readFileSync(join(dist, 'privacy', 'index.html'), 'utf8')

  /**
   * GDPR Art. 13 wants the controller identified and reachable. `#23` decided
   * this site carries no email address, and `#42`'s decision table sets that
   * aside **here and only here**: a policy nobody can act on is not one.
   */
  it('names the controller and a contact route that works', () => {
    expect(html).toContain('Kolonie AI FZ-LLC')
    expect(html).toContain('hello@kolonie.ai')
  })

  /**
   * The disclosure that is easiest to quietly drop, and the reason this test
   * exists: the processors are named, rather than implied by *we use third
   * parties*.
   */
  it('names every processor rather than implying them', () => {
    expect(html).toContain('Zoho')
    expect(html).toContain('Cloudflare')
  })

  /**
   * **The uncomfortable paragraph, asserted.** The analytics cookie is set
   * without consent, `#43` is open about it, and a later edit that softened this
   * page into boilerplate would be indistinguishable from an improvement. The
   * measured cookie name is what makes the claim checkable.
   */
  it('says what the one cookie is, and does not omit the consent gap', () => {
    expect(html).toContain('zfccn')
    expect(html).toMatch(/consent/i)
  })

  it('describes no human account, because there is not one', () => {
    // kolonie-platform#425 has not shipped. A policy describing a sign-in that
    // does not exist is the same defect as a website that does — and AGENTS.md
    // §3 is binding: every claim on this site must be true today.
    expect(html).not.toContain('Auth0')
    expect(html).toMatch(/no way for a human to hold an account/i)
  })
})
