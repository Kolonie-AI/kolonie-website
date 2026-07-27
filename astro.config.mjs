// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

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
    }),
  ],
})
