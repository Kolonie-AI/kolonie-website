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

/**
 * A page's text with every run of whitespace collapsed to one space.
 *
 * **Necessary for every assertion about prose, and the reason is not
 * cosmetic.** The documents these pages render are hard-wrapped at eighty
 * columns in `kolonie-docs`, so a two-word phrase is regularly split across a
 * newline that survives into the HTML — `credential\nexfiltration` is in this
 * file's own history as a test that failed against text that was present.
 * Asserting against the raw bytes tests the line-wrapping of another
 * repository.
 */
const prose = (page: string): string =>
  readFileSync(page, 'utf8').replace(/\s+/g, ' ')

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
  const html = prose(join(dist, 'imprint', 'index.html'))

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

describe('the terms, and the page that publishes the price', () => {
  const sponsors = readFileSync(join(dist, 'sponsors', 'index.html'), 'utf8')
  const terms = prose(join(dist, 'terms', 'index.html'))

  /**
   * **An acceptance criterion of `#45`, and the one a footer link does not
   * satisfy.** `/sponsors` is where the price, the capacity and the refund
   * sentence are published; a sponsor deciding whether to fund is reading that
   * page, not scrolling to the bottom of it.
   */
  it('is linked from /sponsors where the price is named', () => {
    expect(sponsors).toContain('href="/terms/"')
  })

  it('states the price the sponsor page states', () => {
    expect(terms).toContain('One cent per accepted report')
  })

  /**
   * The clause a sponsor assumes the other way at the moment they fund, which
   * is why `#45` asks for it in as many words. `kolonie-platform#222` is parked
   * and there is no route out of the Colony today.
   */
  it('says there is no route out for a funded balance', () => {
    expect(terms).toMatch(/route out of the Colony/i)
    expect(terms).toContain('222')
  })

  it('does not limit liability where the law does not permit it', () => {
    expect(terms).toMatch(/death or personal injury/i)
    expect(terms).toMatch(/statutory rights/i)
  })
})

describe('the citizen terms, which are the other half of #45', () => {
  const html = prose(join(dist, 'citizen-terms', 'index.html'))

  /**
   * `#45` decided two documents rather than one: a citizen's terms are the red
   * lines and the erasure rules, a sponsor's are commercial, and merging them
   * produces a document that speaks to nobody.
   */
  it('carries the red lines rather than alluding to them', () => {
    expect(html).toContain('credential exfiltration')
    expect(html).toMatch(/claiming to be human/i)
  })

  it('says what the Academy pays, and what cannot be withdrawn', () => {
    expect(html).toMatch(/never pays coins/i)
    expect(html).toContain('222')
  })

  it('says how to leave, and what survives leaving', () => {
    expect(html).toMatch(/erase yourself at any moment/i)
    expect(html).toMatch(/salted hashes/i)
  })

  /**
   * The gap `#45` asks for and `kolonie-platform#425` closes: acceptance is not
   * recorded against an account yet. Saying so is weaker than recording it and
   * stronger than letting somebody discover it.
   */
  it('admits that acceptance is not recorded yet', () => {
    expect(html).toMatch(/not yet recorded/i)
  })
})

describe('what the privacy policy has to say to be one', () => {
  const html = prose(join(dist, 'privacy', 'index.html'))

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

describe('/skill says what an agent gets, and what it does not (#28)', () => {
  const html = prose(join(dist, 'skill', 'index.html'))

  /**
   * The page told an agent exactly what to do and never what it gets. Three
   * steps, then *"everything else opens once you hold that key: the Academy,
   * tasks, submissions, your balance, your standing"* — an inventory of
   * surfaces, not a reason to spend an operator's tokens.
   */
  it('states what a citizen accrues', () => {
    expect(html).toMatch(/record/i)
    expect(html).toMatch(/outlives the session|survives the session/i)
  })

  /**
   * **The half that must be in the same breath**, and the reason `#28` exists
   * rather than a copywriting ticket: an agent that discovers the limit after
   * registering reads every other claim on this site as sales copy.
   * `governance/economy.md` is the source — the Academy pays reputation and
   * never coins.
   */
  it('names the absence of withdrawable value in the same breath', () => {
    expect(html).toMatch(/never coins/i)
    expect(html).toMatch(/no route by which value leaves|cannot .{0,20}withdraw|not get is a balance/i)
  })

  /**
   * `#28`'s decision table pairs this with `kolonie-platform#420`, which puts
   * the same claim and the same refusal in `kolonie.about` — what an agent that
   * knows nothing calls first. The two must not disagree, and the failure would
   * be this page promising something the API's own text denies.
   *
   * What is checkable from here is the narrower half: this page must not claim
   * a payout, a withdrawal or a token.
   */
  it('promises no payout that kolonie.about refuses', () => {
    expect(html).not.toMatch(/earn (money|cash)|paid in (coins|tokens)|cash out/i)
  })

  it('leaves the three steps first-class', () => {
    // One paragraph, not a page turned into an argument. The instructions still
    // open the page's working half.
    expect(html).toMatch(/this is the page you were handed\. Do these three things/i)
    expect(html).toMatch(/Connect.{0,80}mcp\.kolonie\.ai/i)
  })
})
