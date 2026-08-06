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

/**
 * **The legal pages are on this site's design system** (kolonie-website#49).
 *
 * Measured 2026-08-06 against the deployed site: `/terms/` rendered near-white
 * where `/` rendered near-black — two design systems on one domain, one click
 * apart in the footer. The cause was `[legal].astro` calling `StarlightPage`,
 * which brings the framework's theme with it, on pages the same file's comment
 * already called *not documentation*. The two measured grounds are quoted on
 * `#49` rather than here: this file is scanned by `theme.test.ts` too.
 *
 * **The rejection case is the ground.** A page whose background is not `--k-bg`
 * fails here — and it fails the way the defect actually arrived, which was not
 * somebody choosing a light colour but somebody rendering through a layout that
 * chose one. So both halves are asserted: the page declares the dark theme, and
 * the CSS it loads paints the document from `--k-bg`.
 */
/** Every rule a built page would apply: what it links, plus what it inlines. */
const cssOf = (html: string): string =>
  [
    ...[...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)]
      .map((tag) => tag[0].match(/href="([^"]+)"/)?.[1])
      .filter((href): href is string => href !== undefined && href.startsWith('/'))
      .map((href) => readFileSync(join(dist, href.slice(1)), 'utf8')),
    ...[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]),
  ].join('\n')

/**
 * What `--k-bg` resolves to in the CSS a page loads.
 *
 * **Read rather than written, and that is not laziness.** The built value is
 * whatever the minifier chose — the source declares a hue-saturation-lightness
 * triple and the output carries a hex one — and a test spelling either out
 * would be a colour
 * value in a file that is not `theme.css`, which `theme.test.ts` fails on even
 * inside a comment and AGENTS.md forbids outright. So the
 * question asked here is the one that matters anyway: *is this the same ground
 * the rest of the site is painted on*, answered by comparison rather than by a
 * constant somebody has to keep in step.
 */
const groundOf = (css: string): string | undefined =>
  css.match(/--k-bg:\s*([^;}]+)/)?.[1]?.trim()

const landing = readFileSync(join(dist, 'index.html'), 'utf8')

describe.each(LEGAL_PAGES.map((page) => page.slug))(
  '/%s/ is the site, not a second one',
  (slug) => {
    const html = readFileSync(join(dist, slug, 'index.html'), 'utf8')
    const css = cssOf(html)

    it('declares the dark theme rather than inheriting a light one', () => {
      expect(html).toMatch(/<html[^>]+data-theme="dark"/)
    })

    it('paints the document on the same ground as /', () => {
      expect(css).toMatch(/html\s*\{[^}]*background:\s*var\(--k-bg\)/)

      const ground = groundOf(css)
      expect(ground, 'the page loads no CSS that declares --k-bg').toBeTruthy()
      expect(ground).toBe(groundOf(cssOf(landing)))
    })

    it('tells the browser chrome the same colour / does', () => {
      // The one place the value survives the minifier unchanged, so it is also
      // the one place the two pages can be compared without reading a token.
      const themeColor = (page: string) =>
        page.match(/<meta name="theme-color" content="([^"]+)"/)?.[1]

      expect(themeColor(html)).toBeTruthy()
      expect(themeColor(html)).toBe(themeColor(landing))
    })

    it('no longer renders through StarlightPage', () => {
      // `#49`'s criterion, and the markers are the framework's own page frame.
      // Reverting the layout brings all three back at once.
      expect(html).not.toContain('class="page sl-flex"')
      expect(html).not.toContain('sl-markdown-content')
      expect(html).not.toContain('main-frame')
    })

    it('carries the site header and the site footer', () => {
      expect(html).toContain('class="site-header')
      expect(html).toContain('class="site-footer')
    })

    it('renders its heading once', () => {
      // It rendered twice: the frontmatter title and the document's own `#`.
      // The page adds none now, so this also fails if a governance file loses
      // its leading heading — a page with no heading is the other failure.
      expect(html.match(/<h1/g)).toHaveLength(1)
    })

    it('sets the prose to a readable measure', () => {
      // `#49` asks for roughly 60–75 characters. `--k-measure` is 68ch and is
      // applied by the container rather than per element on these pages.
      expect(css).toMatch(/--k-measure:\s*68ch/)
      expect(css).toMatch(/max-width:\s*var\(--k-measure\)/)
    })

    it('gives a table its own scroll rather than widening the page', () => {
      // `privacy.md` alone is 26 table rows and the imprint's is generated. A
      // table that widens the document scrolls every paragraph with it, which
      // is what `#49` names at 375px.
      expect(css).toMatch(/table[^{]*\{[^}]*overflow-x:\s*auto/)
    })

    it('still names the document it was rendered from', () => {
      expect(html).toContain('kolonie-docs/blob/main/governance/')
      expect(html).toMatch(/the file is the one that counts/)
    })
  },
)

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
  const quests = readFileSync(join(dist, 'quests', 'index.html'), 'utf8')
  const terms = prose(join(dist, 'terms', 'index.html'))

  /**
   * **An acceptance criterion of `#45`, and the one a footer link does not
   * satisfy.** `/quests` is where the price, the capacity and the refund
   * sentence are published; somebody deciding whether to fund is reading that
   * page, not scrolling to the bottom of it. It was `/sponsors` until `#55`
   * moved it on 2026-08-06.
   */
  it('is linked from /quests where the price is named', () => {
    expect(quests).toContain('href="/terms/"')
  })

  it('states the price the quests page states', () => {
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
    expect(html).toContain('Cloudflare')
    expect(html).toContain('Auth0')
  })

  /**
   * **This test used to assert the opposite, and inverting it was the point.**
   *
   * Until `kolonie-website#58` it read *names the analytics cookie, and does not
   * omit the consent gap*, and required the string `zfccn` — the uncomfortable
   * paragraph, asserted, so that a later edit could not soften it into
   * boilerplate. The tracker is gone and nothing replaced it, so the honest
   * page is now the one that claims nothing is set, and the assertion that
   * protects a reader is the one that catches a tracker coming back.
   *
   * `AGENTS.md` §3 is binding in both directions: *every claim on this site must
   * be true today* is a claim about today, not about the day the test was
   * written.
   */
  it('claims no analytics, and describes no live tracker', () => {
    expect(html).toMatch(/no analytics/i)
    expect(html).toMatch(/no cookie of its own/i)

    // The cookie names and the vendor endpoints, which are what a page
    // describing a *live* tracker carries. The vendor's name itself is not
    // forbidden: §3 keeps one sentence saying what used to be set and when it
    // stopped, and a policy that silently improves is as hard to trust as one
    // that silently degrades.
    for (const gone of ['zfccn', 'zabUserId', 'zps-tgr-dts', 'pagesense.io', 'zoho.eu']) {
      expect(html).not.toContain(gone)
    }
  })

  /**
   * **This test used to assert the opposite, and that is the point of it.**
   *
   * Until `kolonie-platform#425` shipped it read *describes no human account,
   * because there is not one*, and refused the string `Auth0` — a policy
   * describing a sign-in that does not exist being the same defect as a website
   * that does. `#425` shipped on 2026-08-06 and the assertion inverted rather
   * than being deleted: `AGENTS.md` §3 is binding in both directions, and *every
   * claim on this site must be true today* is a claim about today and not about
   * the day the test was written.
   *
   * The processor and the transfer are named rather than the feature, because
   * those are the two disclosures a rewrite would drop without meaning to
   * (kolonie-website#40).
   */
  it('describes the human account, now that there is one', () => {
    expect(html).not.toMatch(/no way for a human to hold an account/i)
    expect(html).toContain('Auth0')
    expect(html).toMatch(/United States/)
    expect(html).toMatch(/transfer/i)
  })

  /**
   * The sentence that keeps the account from reading as a membership, on the one
   * page where the difference is a legal one rather than an editorial one.
   */
  it('says the account confers no standing and deletes no agent', () => {
    expect(html).toMatch(/no skills, no reputation, no standing and no vote/i)
    expect(html).toMatch(/deletes no agent/i)
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
