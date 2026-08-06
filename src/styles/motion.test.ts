import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * What moves on this site, and what removes it (kolonie-website#34).
 *
 * The page had zero `transition`, `animation` and `@keyframes` rules across
 * eight components before `#34`. What it has now is small on purpose, and both
 * halves of *small* are checked here: that every duration comes from a token, so
 * the site cannot drift into feeling inconsistent for reasons nobody can point
 * at, and that `prefers-reduced-motion: reduce` removes all of it.
 *
 * **The second is a test rather than a courtesy**, and `#34` says so. This
 * repository already computes every text-on-background contrast pair rather than
 * believing the palette; motion is the one accessibility guarantee that would
 * otherwise be taken on trust.
 */

const src = fileURLToPath(new URL('..', import.meta.url))
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const theme = read('./theme.css')

const sources = readdirSync(src, { recursive: true, encoding: 'utf8' })
  .filter((file) => /\.(astro|css|mdx|ts)$/.test(file))
  .filter((file) => !file.endsWith('.test.ts') && file !== 'styles/theme.css')

describe('the motion tokens', () => {
  it.each(['--k-quick', '--k-settle', '--k-ease', '--k-transition'])(
    'theme.css defines %s',
    (token) => {
      expect(theme).toContain(`${token}:`)
    },
  )

  it('is two durations and one curve, and not a scale', () => {
    // A motion scale is a thing to consult; two values are a thing to remember.
    // If a third is ever needed, theme.css is where the argument happens — the
    // same rule the colour tokens have.
    const durations = theme.match(/^\s*--k-(?:quick|settle|[a-z-]*duration[a-z-]*):/gm) ?? []
    expect(durations).toHaveLength(2)
  })
})

describe('no raw duration in a component', () => {
  /**
   * `transition: color 150ms` in one component and `200ms` in another is how a
   * site ends up feeling inconsistent for a reason nobody can name. Durations
   * come from `theme.css` or they do not exist.
   *
   * Matches a time unit only where CSS would read it as one — after a colon or
   * inside a `transition`/`animation` value — so prose about `4000ms` in a
   * comment, and `setTimeout(…, 4000)`, are not styling decisions.
   */
  const rawDuration = /(?:transition|animation)(?:-duration)?\s*:[^;]*?\b\d+(?:\.\d+)?m?s\b/

  it.each(sources)('%s has none', (file) => {
    const offending = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
      .split('\n')
      .map((line, index) => [index + 1, line] as const)
      .filter(([, line]) => rawDuration.test(line))

    expect(offending.map(([n, line]) => `${file}:${n} ${line.trim()}`)).toEqual([])
  })
})

describe('prefers-reduced-motion removes all of it', () => {
  const block = theme.slice(theme.indexOf('@media (prefers-reduced-motion: reduce)'))

  it('exists at all', () => {
    expect(theme).toContain('@media (prefers-reduced-motion: reduce)')
  })

  /**
   * **Against `*`, and with `!important`.** The blunt form is the point: a
   * component author cannot forget to opt in, and there is nothing on this site
   * whose motion is load-bearing enough to want an exception.
   */
  it('applies to every element rather than to a list of them', () => {
    expect(block).toMatch(/\*,\s*\*::before,\s*\*::after/)
  })

  it.each([
    'animation-duration: 0.01ms !important',
    'transition-duration: 0.01ms !important',
    'animation-iteration-count: 1 !important',
    'scroll-behavior: auto !important',
  ])('neutralises %s', (declaration) => {
    expect(block.replace(/\s+/g, ' ')).toContain(declaration)
  })

  /**
   * **The bug this caught, and it would have shipped.** Neutralising the
   * transition leaves `[data-reveal]`'s *initial* state alone — `opacity: 0` —
   * so a reader asking for less motion got a page whose content still depended
   * on an IntersectionObserver firing. Measured in a browser with the
   * preference emulated: every marked section reported `opacity: 0`.
   *
   * That is not reduced motion, it is hidden content. Under this preference
   * there is no reveal at all.
   */
  it('leaves the revealed content visible rather than merely unanimated', () => {
    const collapsed = block.replace(/\s+/g, ' ')

    expect(collapsed).toContain('[data-reveal-ready] [data-reveal] { opacity: 1 !important')
    expect(collapsed).toContain('transform: none !important')
  })
})

describe('what must not move', () => {
  /**
   * `#32` removed the reflow the live reads caused, and an animation on the same
   * elements re-adds the movement under a nicer name. `#34`'s decision table is
   * explicit that the Academy graph stays still: it is the one live artefact on
   * the page and the argument is that it is real data rather than a display.
   */
  it.each(['AcademyGraph.astro', 'Verdict.astro', 'StatusChip.astro'])(
    '%s declares no transition or animation of its own',
    (component) => {
      const body = read(`../components/${component}`)

      expect(body).not.toMatch(/^\s*(transition|animation)\s*:/m)
      expect(body).not.toContain('@keyframes')
      expect(body).not.toContain('data-reveal')
    },
  )

  it('the landing page does not reveal the section holding the live reads', () => {
    const page = read('../pages/index.astro')
    const liveSection = page.slice(
      page.indexOf('what-an-agent-can-prove-here'),
      page.indexOf('<Verdict />'),
    )

    expect(liveSection).not.toContain('data-reveal>')
  })

  /**
   * No carousel. Both references have one, both are showing testimonials `#22`
   * refused, and there is nothing here to rotate.
   */
  it.each(sources)('%s has no carousel and no infinite loop', (file) => {
    const body = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

    expect(body).not.toMatch(/animation:[^;]*\binfinite\b/)
    expect(body).not.toMatch(/\bcarousel\b/i)
  })
})

describe('the scroll reveal fails open', () => {
  /**
   * **The property that makes hiding content acceptable at all.** The hidden
   * state is gated on `html[data-reveal-ready]`, which only a script sets — so a
   * reader with JavaScript blocked never has anything hidden, and the page is
   * exactly the page it would otherwise be.
   *
   * The failure this prevents is a bare `[data-reveal] { opacity: 0 }`, which
   * would blank most of the landing page for anybody without scripts and would
   * look, in every developer's browser, completely fine.
   */
  it('hides nothing unless a script has said so', () => {
    const hidden = theme.match(/^\[data-reveal[^\]]*\]\s*\{/gm) ?? []

    expect(hidden).toEqual([])
    expect(theme).toContain('[data-reveal-ready] [data-reveal] {')
  })

  it('is armed before first paint rather than by the bundled module', () => {
    // A deferred module would paint the section, then hide it, then reveal it.
    const layout = read('../layouts/Site.astro')
    const head = layout.slice(0, layout.indexOf('</head>'))

    expect(head).toContain('revealReady')
    expect(head).toContain('is:inline')
  })
})
