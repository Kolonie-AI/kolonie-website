/**
 * The constants the `<head>` is written from (kolonie-website#30, #95).
 *
 * It lived in `astro.config.mjs`, inside Starlight's `head` option, which was
 * the only place a page could be described from while every page was a
 * Starlight page. `/` stopped being one in `#30` and every other page stopped
 * in `#95`, so there is one surface writing a head now —
 * `src/layouts/Site.astro` — and `sharedHeadTags`, the list that kept the two
 * of them in agreement, went with the second one.
 *
 * **What did not go is this file.** The tags are written as markup in the
 * layout and the *values* are here, read by `assets.test.ts` and
 * `head.built-test.ts`. A landing page that quietly lost the Open Graph image
 * fails in the place it costs most — the preview card of the link somebody
 * shared — and a test that asserted against a string typed into the layout it
 * is checking would not catch it.
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
