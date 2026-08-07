/**
 * The `<head>` every page on this site carries, in one place
 * (kolonie-website#30).
 *
 * It lived in `astro.config.mjs`, inside Starlight's `head` option, which was
 * the only place a page could be described from while every page was a
 * Starlight page. `/` is not one any more — it is `src/pages/index.astro` — and
 * a landing page that quietly lost the Open Graph image or the theme colour
 * would fail in the place it costs most: the preview card of the link somebody
 * shared.
 *
 * So the tags are declared here and consumed twice — by the Starlight
 * integration for the four documentation-framework pages, and by
 * `src/layouts/Site.astro` for the one that left.
 *
 * **Nothing here is an analytics tag, and nothing guards one any more**
 * (`kolonie-website#58`). This block used to name `analytics.built-test.ts` as
 * the assertion that caught the tag drifting off a page;
 * `no-analytics.built-test.ts` now asserts the opposite over the same built
 * output, and it is the file to read before adding a script to this head.
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
 * The one sentence this project describes itself in (kolonie-website#51).
 *
 * **Quoted rather than written.** It is the opening sentence of `LLMS_SUMMARY`
 * in `src/lib/llms.ts` — what `/llms.txt` and `/llms-full.txt` serve, and the
 * same sentence the API's `kolonie.about` returns. `#51` asked for the footer's
 * description line to be an existing summary and for the source to be named,
 * because a third wording of what the Colony is is a third thing to keep true.
 *
 * It is declared here rather than imported from `llms.ts` because it is the
 * *first sentence* of that block and not the block, and a regular expression
 * over prose is a worse guarantee than a test. `head.test.ts` asserts
 * `LLMS_SUMMARY` still contains this string, so the two cannot drift apart
 * without something going red.
 */
export const SITE_DESCRIPTION =
  'A colony where AI agents learn to act, earn, and govern themselves.'

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

/**
 * The two font files a page needs before it paints (kolonie-website#48).
 *
 * `font-display: swap` alone means the page paints in a fallback and reflows
 * when the face arrives — which is the layout shift `#48` is explicit about not
 * accepting. A preload starts both fetches with the document rather than after
 * the stylesheet has been parsed and the first glyph has been asked for, so the
 * swap happens before there is anything to shift.
 *
 * **Latin only, and not the Latin Extended pair.** The site is English
 * (AGENTS.md); the extended files exist so that a name with a diacritic renders
 * rather than falls back, and preloading two files no page is likely to need
 * would cost every reader 100kB to save a few of them a swap.
 *
 * `crossorigin` is not optional on a font preload even for a same-origin file:
 * fonts are fetched in CORS mode, and a preload without it is a second,
 * unmatched request rather than a warm cache entry.
 */
export const FONT_PRELOADS = [
  '/fonts/inter-latin-wght-normal.woff2',
  '/fonts/jetbrains-mono-latin-wght-normal.woff2',
] as const

export const sharedHeadTags = (themeColor: string): HeadTag[] => [
  ...FONT_PRELOADS.map(
    (href): HeadTag => ({
      tag: 'link',
      attrs: {
        rel: 'preload',
        href,
        as: 'font',
        type: 'font/woff2',
        crossorigin: 'anonymous',
      },
    }),
  ),
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
  // The Android half of the same thing (kolonie-website#62): an icon and a
  // name for a home screen. It carries no `display` field, so nothing here
  // claims this documentation site is an application — `build-assets.mjs`
  // records that refusal beside the rest of the manifest.
  //
  // `/favicon.ico` is deliberately *not* declared beside these. It exists for
  // clients that request that path without reading this head at all, and
  // offering it here would let a browser prefer 48 fixed pixels to a vector.
  {
    tag: 'link',
    attrs: { rel: 'manifest', href: '/site.webmanifest' },
  },
  // So a mobile reader does not get a white bar above a near-black page.
  {
    tag: 'meta',
    attrs: { name: 'theme-color', content: themeColor },
  },
]
