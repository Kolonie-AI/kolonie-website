// @ts-check
import { readFileSync } from 'node:fs'
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import { sharedHeadTags, themeColorFrom } from './src/lib/head.ts'

/**
 * This file is executed by Node, so it reads `theme.css` off disk; the landing
 * page's layout is bundled by Vite and imports the same file as raw text. One
 * extraction, two ways of getting the bytes — see `src/lib/head.ts`.
 */
const themeColor = themeColorFrom(
  readFileSync(new URL('./src/styles/theme.css', import.meta.url), 'utf8'),
)

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
        // The header, and the third override that *adds* rather than
        // suppresses — the largest of them (kolonie-website#50). Starlight's
        // header cannot hold three navigation items in the middle and two
        // buttons at the end, and `#50` requires every page to render the same
        // header as `/`. So both surfaces render the same component and the
        // search box is handed to it as a slot, which is what keeps the rule in
        // src/lib/chrome.ts rather than in a second place.
        Header: './src/components/starlight/Header.astro',
        Search: './src/components/starlight/Search.astro',
        // The two halves of one theme (kolonie-website#64). `ThemeProvider`
        // is the script that wrote `data-theme` from the visitor's system
        // setting, which is what made a documentation page render white under
        // a dark landing page; `ThemeSelect` is the control that would offer a
        // choice this site no longer has. Both render nothing, and each file
        // says why — the second is unconditional so that adding a page under
        // `docs/` cannot restore a toggle whose script is gone.
        ThemeProvider: './src/components/starlight/ThemeProvider.astro',
        ThemeSelect: './src/components/starlight/ThemeSelect.astro',
        EditLink: './src/components/starlight/EditLink.astro',
        LastUpdated: './src/components/starlight/LastUpdated.astro',
        // The footer, and the one override here that *adds* rather than
        // suppresses (kolonie-website#42). The legal pages have to be linked
        // from every page's footer, and this site has two — the landing page
        // writes its own since #30. Both read src/lib/site-footer.ts.
        Footer: './src/components/starlight/Footer.astro',
        // `SocialIcons` was overridden here from #40 until #50. It existed to
        // put sign-in in Starlight's header beside GitHub, and the `Header`
        // override above now renders that header itself — so the slot is no
        // longer where the decision lands. #40's decision is unchanged and its
        // link is unchanged; it comes from src/lib/site-nav.ts now.
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
        // No analytics tag here either (kolonie-website#58). This used to be the
        // one place the PageSense script was emitted from for the Starlight
        // pages, with src/layouts/Site.astro emitting it for the landing page.
        // Both are gone and nothing replaced them;
        // src/lib/no-analytics.built-test.ts reads the built output and fails if
        // a tracker reappears on any page, whichever of the two it came from.
      ],
    }),
  ],
})
