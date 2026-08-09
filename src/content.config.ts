import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

import { decisionRecordsLoader } from './lib/decision-records-loader.ts'
import { legalPagesLoader } from './lib/legal-loader.ts'

// Astro no longer discovers content collections implicitly. Without this file
// the build succeeds and produces a site with no pages in it, which is the
// worst kind of green.
export const collections = {
  /**
   * The site's own pages (kolonie-website#95).
   *
   * **This was Starlight's `docsLoader()` and `docsSchema()` until `#95`.** The
   * measurement that ended it: seven components overridden, four of them to
   * render nothing, and `template: splash` on twelve of twelve content pages —
   * every visible part of the framework switched off, one override at a time,
   * while the framework was still built, shipped and paid for. What it left was
   * a content column this site does not want and a search index nothing reached.
   *
   * A glob loader and a four-field schema are what was actually being used. The
   * schema is deliberately small: `title` and `description` are the two things
   * every page must have because the `<head>` needs both, and the two optional
   * fields below each earn their place by being read somewhere.
   *
   * **The directory is `pages/`, not `docs/`.** It was Starlight's required
   * name; keeping it would have left the collection named after the framework
   * that no longer renders it. The nested `docs/` directory *inside* it still
   * means documentation — that rule is `src/lib/chrome.ts` and is unchanged.
   */
  pages: defineCollection({
    loader: glob({ base: './src/content/pages', pattern: '**/*.{md,mdx}' }),
    schema: z.object({
      title: z.string(),
      description: z.string(),
      /**
       * The heading shown on the page, when it must differ from `title`.
       *
       * `title` is a sentence, because it is the `<title>` tag and a search
       * result; a heading sometimes wants to be shorter. Starlight had the same
       * split under the name `hero.title` and every page that needed it said so
       * in prose instead — so this exists rather than being a field nobody set.
       */
      heading: z.string().optional(),
      /**
       * Excluded from `/llms.txt`, `/llms-full.txt` and the sitemap.
       *
       * Nothing sets it today. It is here because the alternative to a flag is
       * a list of exclusions in three generators, which is the shape
       * `src/lib/llms.ts` already refuses for the page list itself.
       */
      unlisted: z.boolean().default(false),
    }),
  }),
  // The blog is the site's third surface (kolonie-website#15). Its entries are
  // decision records read out of `kolonie-docs` at build time; no copy of one
  // exists in this repository, which is the property that keeps the published
  // version and the maintained version from drifting apart.
  blog: defineCollection({
    loader: decisionRecordsLoader(),
    schema: z.object({
      title: z.string(),
      order: z.number(),
      source: z.string().url(),
      superseded: z.boolean(),
    }),
  }),
  // The legal pages — /privacy/, and whatever #44 and #45 add beside it
  // (kolonie-website#42). Read out of `kolonie-docs/governance/` on the same
  // terms as the blog: one source, no copy here, and a build that fails rather
  // than serving a legal disclosure with nothing on it.
  legal: defineCollection({
    loader: legalPagesLoader(),
    schema: z.object({
      title: z.string(),
      description: z.string(),
      order: z.number(),
      source: z.string().url(),
    }),
  }),
}
