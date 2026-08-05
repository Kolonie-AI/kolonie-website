import { defineCollection, z } from 'astro:content'
import { docsLoader } from '@astrojs/starlight/loaders'
import { docsSchema } from '@astrojs/starlight/schema'

import { decisionRecordsLoader } from './lib/decision-records-loader.ts'

// Astro no longer discovers content collections implicitly. Without this file
// the build succeeds and produces a site with no pages in it, which is the
// worst kind of green.
export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
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
}
