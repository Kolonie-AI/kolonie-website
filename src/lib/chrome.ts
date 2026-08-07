/**
 * Which pages wear a documentation framework's furniture, and which do not
 * (kolonie-website#21).
 *
 * The site is Starlight, and every page carried its chrome: rendered on the
 * landing page, a reader met *"Skip to content · Kolonie AI · Search Ctrl K ·
 * Cancel · GitHub · Select theme · Dark · Light · Auto"* before a single word
 * about the Colony.
 *
 * **The arithmetic is the argument.** The site is five pages. A search box
 * searches five pages, and it occupies the most valuable position on the page to
 * answer a question nobody has — while signalling *documentation* to somebody who
 * arrived to find out what this is.
 *
 * **Starlight stays, and is confined.** It keeps whatever documentation the site
 * grows, and there will be some; replacing it outright is a rewrite, and throwing
 * it away now means installing it again later. So the chrome is decided per page
 * rather than switched off globally.
 *
 * **The rule is the directory, because a list of page ids is a list somebody has
 * to remember to edit.** A page under `docs/` is documentation and gets the
 * furniture — sidebar, search, table of contents, edit link, last updated.
 * Everything else is a page a stranger arrives on and gets none of it. Adding a
 * marketing page is then the default, which is the case that should need no
 * decision.
 *
 * What is **not** decided here, because it is not chrome and not optional: the
 * skip link and the keyboard order. `#21` is explicit that removing chrome must
 * not remove accessibility.
 *
 * **Colour themes were on that list until `#64` and are not any more.** `#21`
 * read *both themes* as an accessibility guarantee, and on a site that offered
 * a choice it was one. The site did not offer it: the landing page has been a
 * single theme since `#30`, so what the Starlight pages actually provided was a
 * second theme the rest of the site could not follow — a visitor on a light
 * system read a dark page and then a white one. `#64` settled the site on the
 * theme it already committed to, and the guarantee that replaces *both themes*
 * is the contrast test, which computes every text-on-background pair in the
 * remaining set rather than trusting the palette.
 *
 * The theme is now applied by absence — nothing writes `data-theme`, so
 * `theme.css`'s dark `:root` block is what matches. The two files that make
 * that true are `../components/starlight/ThemeProvider.astro` and
 * `ThemeSelect.astro` beside it, and both carry the reasoning.
 */

/** The one directory whose pages are documentation. */
export const DOCUMENTATION_PREFIX = "docs/";

/**
 * Whether this page is documentation, from the Starlight route id.
 *
 * The id is the content file's path without its extension — `index`,
 * `quests/ideas`, `docs/whatever`.
 */
export const isDocumentation = (routeId: string): boolean =>
  routeId.startsWith(DOCUMENTATION_PREFIX);
