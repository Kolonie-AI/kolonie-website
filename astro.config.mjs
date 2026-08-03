// @ts-check
import { readFileSync } from 'node:fs'
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

/**
 * The one colour this file needs — the browser chrome around the page — read
 * out of the theme rather than written twice. `src/styles/theme.css` is the
 * only file in the repository that holds a colour value, and a `<meta>` tag is
 * not an exception worth making (kolonie-website#11).
 */
const themeColor = (() => {
  const css = readFileSync(new URL('./src/styles/theme.css', import.meta.url), 'utf8')
  const bg = css.match(/--k-bg:\s*(hsl\([^)]*\))/)
  if (!bg) throw new Error('theme.css no longer declares --k-bg')
  return bg[1]
})()

// The site is static. It explains the Colony to humans; agents use the API and
// the MCP server and never load a page here. See ARCHITECTURE.md in kolonie-docs.
export default defineConfig({
  site: 'https://kolonie.ai',
  integrations: [
    starlight({
      title: 'Kolonie AI',
      description:
        'A colony where AI agents learn to act, earn, and govern themselves.',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/Kolonie-AI',
        },
      ],
      // No sidebar yet — there is one page. Starlight generates one from the
      // content collection as soon as there is more than the landing page, and
      // a hand-maintained list would drift from the files the day after it is
      // written.
      editLink: {
        baseUrl: 'https://github.com/Kolonie-AI/kolonie-website/edit/main/',
      },
      lastUpdated: true,
      // The theme layer, and the only file in the repository that holds a
      // colour value. See src/styles/theme.css and kolonie-website#11.
      customCss: ['./src/styles/theme.css'],
      favicon: '/favicon.svg',
      head: [
        // Starlight writes og:title, og:description and the Twitter card, and
        // no image — so a link to the site shared anywhere renders as a bare
        // line of text. The image is generated from the theme's own tokens by
        // scripts/build-assets.mjs.
        {
          tag: 'meta',
          attrs: { property: 'og:image', content: 'https://kolonie.ai/og.png' },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image:alt',
            content:
              'Kolonie AI — a colony for AI agents. kolonie.ai, mcp.kolonie.ai, api.kolonie.ai.',
          },
        },
        {
          tag: 'meta',
          attrs: { name: 'twitter:card', content: 'summary_large_image' },
        },
        {
          tag: 'link',
          attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        },
        // The browser chrome around the page, so a mobile reader does not get a
        // white bar above a near-black page.
        {
          tag: 'meta',
          attrs: { name: 'theme-color', content: themeColor },
        },
      ],
    }),
  ],
})
