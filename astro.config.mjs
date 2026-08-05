// @ts-check
import { readFileSync } from 'node:fs'
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import { trackerAttrs } from './src/lib/analytics.ts'
import { sharedHeadTags, themeColorFrom } from './src/lib/head.ts'

/**
 * This file is executed by Node, so it reads `theme.css` off disk; the landing
 * page's layout is bundled by Vite and imports the same file as raw text. One
 * extraction, two ways of getting the bytes — see `src/lib/head.ts`.
 */
const themeColor = themeColorFrom(
  readFileSync(new URL('./src/styles/theme.css', import.meta.url), 'utf8'),
)

/**
 * The analytics tag, or `null` for no tag at all (kolonie-website#43).
 *
 * Bound once rather than called at the point of use: two calls are two values as
 * far as the type checker is concerned, and the second cannot be narrowed by a
 * test of the first.
 */
const TRACKER = trackerAttrs()

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
      /**
       * Starlight's controls, on documentation pages and nowhere else
       * (kolonie-website#21).
       *
       * Each override is three lines that ask `src/lib/chrome.ts` one question
       * and render the framework's own component or nothing. The rule lives
       * there; these files hold no judgement, so a change of policy is a change
       * in one file.
       *
       * **The sidebar and the table of contents are not here, and that is not an
       * omission.** They are layout rather than controls: emptying them leaves
       * the column they sit in, so a page with an emptied sidebar has a wide
       * blank gutter instead of a sidebar, which is worse than what it replaced.
       * What removes the column is `template: splash` in the page's own
       * frontmatter, which is Starlight's own switch for it — so each marketing
       * page carries that line and says why.
       *
       * The comment this replaces said there was one page and no sidebar yet.
       * There are five, all of them pages a stranger arrives on, and the sidebar
       * Starlight generated for them was the problem rather than the thing not
       * yet built.
       */
      components: {
        Search: './src/components/starlight/Search.astro',
        ThemeSelect: './src/components/starlight/ThemeSelect.astro',
        EditLink: './src/components/starlight/EditLink.astro',
        LastUpdated: './src/components/starlight/LastUpdated.astro',
      },
      editLink: {
        baseUrl: 'https://github.com/Kolonie-AI/kolonie-website/edit/main/',
      },
      // Both are configured and both are suppressed on marketing pages by the
      // overrides above: *last updated* under a landing page reads as neglect
      // the moment it is a month old, and it is not the reader's question.
      lastUpdated: true,
      // The theme layer, and the only file in the repository that holds a
      // colour value. See src/styles/theme.css and kolonie-website#11.
      customCss: ['./src/styles/theme.css'],
      favicon: '/favicon.svg',
      head: [
        // The Open Graph image, the Twitter card, the touch icon and the theme
        // colour — declared in src/lib/head.ts, because `/` left this framework
        // in #30 and its layout has to write the same ones. Two lists disagree
        // within a month and the disagreement is invisible until somebody
        // shares the link that renders wrong.
        ...sharedHeadTags(themeColor),
        // Self-hosted, cookieless analytics, on every page of this site and on
        // no host that serves a token (kolonie-website#43, keeping #17's rule).
        // The paths and the reasoning are in src/lib/analytics.ts; this is the
        // one place it is emitted from for the framework's pages, so a page
        // added later carries it without anybody remembering.
        //
        // `?? []` rather than a tag with an empty id: a build with no
        // PUBLIC_UMAMI_WEBSITE_ID emits nothing at all, because a script that
        // loads and reports to a site the server does not know is a request made
        // for nothing. Spread, so the absent case adds no element.
        // The annotation keeps `tag` a literal type. Inside a conditional spread
        // it is no longer contextually typed by the array it lands in, so it
        // widens to `string` and Starlight's head type rejects it.
        ...(TRACKER
          ? [{ tag: /** @type {const} */ ('script'), attrs: TRACKER }]
          : []),
      ],
    }),
  ],
})
