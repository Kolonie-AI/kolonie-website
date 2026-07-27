import { defineCollection } from 'astro:content'
import { docsLoader } from '@astrojs/starlight/loaders'
import { docsSchema } from '@astrojs/starlight/schema'

// Astro no longer discovers content collections implicitly. Without this file
// the build succeeds and produces a site with no pages in it, which is the
// worst kind of green.
export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
}
