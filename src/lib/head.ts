/**
 * The `<head>` every page on this site carries, in one place
 * (kolonie-website#30).
 *
 * It lived in `astro.config.mjs`, inside Starlight's `head` option, which was
 * the only place a page could be described from while every page was a
 * Starlight page. `/` is not one any more — it is `src/pages/index.astro` — and
 * a landing page that quietly lost the Open Graph image, the theme colour or
 * the analytics tag would fail in the place it costs most: the preview card of
 * the link somebody shared.
 *
 * So the tags are declared here and consumed twice — by the Starlight
 * integration for the four documentation-framework pages, and by
 * `src/layouts/Landing.astro` for the one that left. `analytics.built-test.ts`
 * reads the built output and checks the analytics tag survived on every page,
 * which is the assertion that would catch this drifting anyway.
 */

/**
 * The browser chrome around the page, read out of the theme rather than
 * written twice. `src/styles/theme.css` is the only file in the repository that
 * holds a colour value, and a `<meta>` tag is not an exception worth making
 * (kolonie-website#11).
 *
 * **The extraction is a function and the bytes are the caller's problem**, and
 * that split is not fussiness. Two things need this answer and they run in
 * different places: `astro.config.mjs` is executed by Node, where the file sits
 * at a path it can read; the landing page's layout is bundled by Vite, where
 * `import.meta.url` points into `dist/.prerender/` and the same `readFileSync`
 * fails at build time with `ENOENT`. So each caller hands over the text the way
 * its own environment can get it, and the one line that knows what to look for
 * lives here.
 */
export const themeColorFrom = (css: string): string => {
  const bg = css.match(/--k-bg:\s*(hsl\([^)]*\))/)
  if (!bg) throw new Error('theme.css no longer declares --k-bg')
  return bg[1]
}

/** The site's canonical origin. Absolute URLs in `og:` tags are not optional. */
export const SITE = 'https://kolonie.ai'

/**
 * The Open Graph image, generated from the theme's tokens by
 * `scripts/build-assets.mjs`.
 *
 * Written out rather than composed from `SITE`, because what matters about it
 * is that it is **absolute** — a relative Open Graph image is ignored by most
 * consumers, so the link renders bare — and `assets.test.ts` checks for that by
 * reading this file. An interpolated string would pass a check that no longer
 * proves anything.
 */
export const OG_IMAGE = 'https://kolonie.ai/og.png'

export const OG_IMAGE_ALT =
  'Kolonie AI — a colony for AI agents. kolonie.ai, mcp.kolonie.ai, api.kolonie.ai.'

/**
 * Starlight writes `og:title`, `og:description` and the Twitter card, and no
 * image — so a link to the site shared anywhere renders as a bare line of text.
 * These are the tags that fills that in, in Starlight's own `head` shape.
 *
 * The landing page's layout writes the same tags as plain markup; it also
 * writes the ones Starlight was writing for it.
 */
interface HeadTag {
  tag: 'meta' | 'link'
  attrs: Record<string, string>
}

export const sharedHeadTags = (themeColor: string): HeadTag[] => [
  {
    tag: 'meta',
    attrs: { property: 'og:image', content: OG_IMAGE },
  },
  {
    tag: 'meta',
    attrs: { property: 'og:image:alt', content: OG_IMAGE_ALT },
  },
  {
    tag: 'meta',
    attrs: { name: 'twitter:card', content: 'summary_large_image' },
  },
  {
    tag: 'link',
    attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
  },
  // So a mobile reader does not get a white bar above a near-black page.
  {
    tag: 'meta',
    attrs: { name: 'theme-color', content: themeColor },
  },
]
