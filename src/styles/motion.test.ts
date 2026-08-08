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
  it.each(['--k-quick', '--k-settle', '--k-drift', '--k-ease', '--k-transition'])(
    'theme.css defines %s',
    (token) => {
      expect(theme).toContain(`${token}:`)
    },
  )

  /**
   * **Three durations, and the third had to argue for itself**
   * (kolonie-website#83).
   *
   * This asserted two and said *"if a third is ever needed, theme.css is where
   * the argument happens"*. `--k-drift` is that third and the argument is in
   * `theme.css` beside it: `--k-quick` and `--k-settle` are **responses** —
   * something happened and the duration is how long the page takes to answer —
   * and a reader watches the whole of one. Ambience is the opposite: nothing
   * caused it and nobody watches it end.
   *
   * **The count is still the guard.** A scale is a thing to consult; three
   * values with three arguments are a thing to remember. A fourth is a fourth
   * argument, in that comment's shape, and this number goes up with it.
   *
   * **The pattern names them rather than matching a shape**, which it did not
   * before: `--k-drift` contains neither *quick*, *settle* nor *duration*, so
   * the old regex would have counted two and reported a passing test about a
   * file that had three. A guard that cannot see the thing it guards against is
   * worse than none.
   */
  it('is three durations and one curve, and not a scale', () => {
    const durations = theme.match(/^\s*--k-[a-z-]+:\s*[\d.]+m?s\s*;/gm) ?? []
    expect(durations.map((line) => line.trim())).toHaveLength(3)
  })

  /**
   * The ambient one is slow enough to read as presence rather than as movement.
   * `#83`: *"Slow, low contrast"* — and the failure it guards is somebody
   * reaching for this token for a hover, where 90 seconds is a broken control.
   */
  it('keeps the ambient duration in a different order of magnitude', () => {
    const seconds = (token: string): number => {
      const value = theme.match(new RegExp(`${token}:\\s*([\\d.]+)(m?s)`))
      return Number(value![1]) * (value![2] === 'ms' ? 0.001 : 1)
    }

    expect(seconds('--k-drift')).toBeGreaterThan(seconds('--k-settle') * 50)
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
   * **No carousel.** Both references have one, both are showing testimonials
   * `#22` refused, and there is nothing here to rotate.
   *
   * **`infinite` was the proxy for that, and `kolonie-website#83` needed it
   * narrowed rather than dropped.** The maintainer asked on 2026-08-07 for the
   * reference's slow field behind the hero, which is a loop that by definition
   * never ends — so a blanket ban on `infinite` would have refused the thing
   * that was decided, and deleting the guard would have let a carousel back in
   * under the same edit.
   *
   * So the rule is now the one that was meant: **nothing that carries content
   * rotates.** One decorative loop is allowed, it is named, and it has to be
   * on the ambient field's own layers and drawn on the ambient token — which
   * is what makes it recognisable as ambience rather than as something a reader
   * is expected to wait through.
   */
  it.each(sources)('%s has no carousel', (file) => {
    expect(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'))
      .not.toMatch(/\bcarousel\b/i)
  })

  it.each(sources)('%s loops nothing but the ambient field', (file) => {
    const body = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

    for (const [declaration] of body.matchAll(/animation:[^;]*\binfinite\b[^;]*/g)) {
      // The selector this sits under, which is the whole of what is allowed.
      const selector = body
        .slice(0, body.indexOf(declaration))
        .match(/([^{}]*)\{[^{}]*$/)?.[1]
        ?.trim()

      expect(selector, `an infinite loop outside the ambient field: ${declaration}`)
        .toMatch(/\.hero__field::(before|after)$/)
      expect(declaration, 'an infinite loop not drawn on the ambient token')
        .toContain('--k-drift')
    }
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

/**
 * **The one ambient element** (kolonie-website#83).
 *
 * `agentmail.to` carries a slow field behind its hero; this page was entirely
 * still, and the maintainer asked for the same effect on 2026-08-07.
 *
 * `#83` says its constraints *are the whole issue*, and every one of them is
 * invisible to a reviewer looking at the page: a canvas loop looks identical
 * and drains a battery, a field that ignores `prefers-reduced-motion` looks
 * identical to everybody who has not set it, and one that intercepts a click
 * looks identical until somebody tries to select the headline.
 */
describe('the ambient field behind the hero (kolonie-website#83)', () => {
  const page = read('../pages/index.astro')
  const field = page.slice(page.indexOf('.hero__field {'), page.indexOf('@keyframes hero-drift-far'))

  it('is one element, and it is the only ambient thing on the page', () => {
    expect(page.match(/class="hero__field"/g)).toHaveLength(1)
  })

  /**
   * `#83`: *"CSS or SVG, never a video and never a canvas loop that runs
   * forever. A landing page that spins a GPU is a landing page that drains a
   * laptop."*
   */
  it('is CSS, not a canvas and not a video', () => {
    expect(page).not.toMatch(/<canvas|<video|requestAnimationFrame/)
    expect(field).toContain('radial-gradient')
  })

  /**
   * `#83`: *"It must not shift layout or intercept a click. Decorative,
   * `aria-hidden`, pointer-events off."*
   */
  it('is decorative, out of flow, and takes no pointer', () => {
    expect(page).toContain('<div class="hero__field" aria-hidden="true">')
    expect(field).toMatch(/position:\s*absolute/)
    expect(field).toMatch(/pointer-events:\s*none/)
  })

  /**
   * `#83`: *"It must not delay the first paint. If it costs anything before the
   * headline is readable, it is the wrong implementation."*
   *
   * So: no file to fetch. A `url(…)` here would be a request the headline waits
   * behind, which is the one thing this element may not do.
   */
  it('fetches nothing', () => {
    expect(field).not.toMatch(/url\(/)
  })

  /**
   * `#83`: *"Behind, not near. Low enough contrast that the headline never
   * competes with it."*
   */
  it('sits behind the argument, faintly', () => {
    expect(field).toMatch(/z-index:\s*0/)

    const opacities = [...page.matchAll(/\.hero__field::(?:before|after)\s*\{[^}]*opacity:\s*([\d.]+)/g)]
      .map((match) => Number(match[1]))

    expect(opacities).toHaveLength(2)
    for (const opacity of opacities) expect(opacity).toBeLessThan(0.3)
  })

  /**
   * **`#83`: *"`prefers-reduced-motion` stops it dead. Not slows it — stops
   * it."***
   *
   * `theme.css`'s blanket rule is what does it, and it stops an animation by
   * collapsing it onto its **last** keyframe. That makes the end state the
   * whole of whether *stopped* means *resting* or *frozen mid-drift* — and both
   * layers travel exactly one tile, so the last frame is pixel-identical to the
   * first. Verified in Chromium with the preference emulated on 2026-08-08:
   * `animation-duration` reads `1e-05s`, `animation-iteration-count` reads `1`,
   * and the field renders as an unmoving constellation rather than disappearing.
   *
   * Asserted as the equality between the travel and the tile, because that is
   * the property, and a later edit tuning one of the two numbers is exactly how
   * it would break.
   */
  it.each([
    ['near', 'before'],
    ['far', 'after'],
  ])('%s layer travels exactly one tile, so stopping it looks like resting', (name, pseudo) => {
    const layer = page.match(
      new RegExp(`\\.hero__field::${pseudo}\\s*\\{[^}]*background-size:\\s*([\\d.]+)rem`),
    )
    const keyframe = page.match(
      new RegExp(`@keyframes hero-drift-${name}[^@]*?to\\s*\\{[^}]*translate3d\\(\\s*(-?[\\d.]+)rem,\\s*(-?[\\d.]+)rem`, 's'),
    )

    expect(layer, `no background-size for the ${name} layer`).not.toBeNull()
    expect(keyframe, `no end keyframe for the ${name} layer`).not.toBeNull()

    const tile = Number(layer![1])
    expect(Math.abs(Number(keyframe![1]))).toBe(tile)
    expect(Math.abs(Number(keyframe![2]))).toBe(tile)
  })

  /**
   * `#83`: *"It is invisible in a screenshot taken for the Open Graph image, or
   * explicitly accounted for there."*
   *
   * It is invisible, by construction rather than by care: the generator
   * screenshots its own document off the filesystem and never loads this page.
   */
  it('cannot reach the Open Graph image', () => {
    const generator = readFileSync(
      new URL('../../scripts/build-assets.mjs', import.meta.url),
      'utf8',
    )

    expect(generator).toContain("goto('file://' + source)")
    expect(generator).not.toMatch(/goto\(\s*['"`]https?:\/\//)
  })
})
