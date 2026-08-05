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
 * skip link, the keyboard order, and both colour themes. `#21` is explicit that
 * removing chrome must not remove accessibility.
 */

/** The one directory whose pages are documentation. */
export const DOCUMENTATION_PREFIX = "docs/";

/**
 * Whether this page is documentation, from the Starlight route id.
 *
 * The id is the content file's path without its extension — `index`,
 * `sponsors/ideas`, `docs/whatever`.
 */
export const isDocumentation = (routeId: string): boolean =>
  routeId.startsWith(DOCUMENTATION_PREFIX);
