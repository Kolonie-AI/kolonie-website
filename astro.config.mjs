// @ts-check
import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'

/**
 * The site is static. It explains the Colony to humans; agents use the API and
 * the MCP server and never load a page here. See ARCHITECTURE.md in kolonie-docs.
 *
 * **Starlight was configured here until kolonie-website#95**, with seven
 * component overrides — four of them rendering nothing — and a `head` list this
 * file had to keep in agreement with `src/layouts/Site.astro`. It is gone, and
 * with it the only reason this file was long.
 *
 * What the framework was providing and where each half went:
 *
 * | Starlight gave | Now |
 * |---|---|
 * | the content collection and its routes | `src/content.config.ts`, `src/pages/[...slug].astro` |
 * | the `<head>` on twelve pages | `src/layouts/Site.astro`, which already wrote it for `/` |
 * | the prose styles | `src/components/Prose.astro` |
 * | the header, the footer, the skip link | `SiteHeader.astro`, `SiteFooter.astro`, `Site.astro` — all three already existed and were being rendered *through* Starlight |
 * | a 404 page | `src/pages/404.astro` |
 * | a search index over twelve pages | nothing, deliberately — `src/lib/chrome.ts` had already switched it off everywhere it could render |
 *
 * The MDX integration is the one part of the stack that stays: the pages are
 * `.mdx` and embed this site's own components, which is the thing about them
 * that was never Starlight's.
 */
export default defineConfig({
  site: 'https://kolonie.ai',
  integrations: [mdx()],
  /**
   * **Kept, and it is the one setting Starlight was making that had to be
   * copied out rather than dropped** (kolonie-website#95).
   *
   * Starlight sets this to `where`; Astro's own default is `attribute`.
   * Removing the integration silently flipped every scoped component in the
   * repository from `class="site-header__mark astro-fzpbxy5g"` styled by
   * `.site-header__mark:where(.astro-fzpbxy5g)` to
   * `class="site-header__mark" data-astro-cid-fzpbxy5g` styled by
   * `.site-header__mark[data-astro-cid-fzpbxy5g]` — the same rules, a different
   * shape of output, on every element on every page.
   *
   * Two things made that worth pinning rather than accepting:
   *
   * - **Specificity.** `:where()` weighs nothing, so a scoped component rule
   *   counts as exactly the selector somebody wrote; an attribute selector adds
   *   a class's worth of weight to every one of them. Every rule in
   *   `theme.css` that a component is meant to be able to override would have
   *   been outranked at once, silently and everywhere. A migration that removes
   *   a framework must not also re-rank the stylesheet.
   * - **The built tests.** Roughly a hundred and forty assertions across
   *   `src/lib/*.built-test.ts` read the real output and match a class prefix,
   *   which is how they check the header is on every page and the footer links
   *   the legal pages. Rewriting them all to accept a second shape would have
   *   turned a migration into an edit of every test that guards it, in the same
   *   commit — and those tests are the only thing that proved the migration
   *   changed nothing.
   *
   * The output is byte-comparable across `#95` because of this line.
   */
  scopedStyleStrategy: 'where',
  markdown: {
    /**
     * Code blocks, dark only.
     *
     * Starlight configured Shiki with its own dual-theme setup and mapped the
     * result onto CSS variables. The site has one theme since `#64`, so one
     * theme is what is configured — and `github-dark-default` is the closest
     * built-in to a palette that is near-black with a green accent, which is
     * the nearest a syntax theme gets to being read out of `theme.css`.
     *
     * `wrap: false` on purpose: a wrapped code line is a line that lies about
     * where it ends. `Prose.astro` gives the block its own scroll container so
     * that costs the reader a swipe rather than the document its width
     * (kolonie-website#98).
     */
    shikiConfig: { theme: 'github-dark-default', wrap: false },
  },
})
