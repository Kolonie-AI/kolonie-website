/**
 * Which pages are documentation, and which are read by somebody who has not
 * decided yet (kolonie-website#21, #66, #95).
 *
 * **This file decided what chrome a page wore until `#95`.** The site was
 * Starlight, and every page carried its furniture: rendered on the landing
 * page, a reader met *"Skip to content · Kolonie AI · Search Ctrl K · Cancel ·
 * GitHub · Select theme · Dark · Light · Auto"* before a single word about the
 * Colony. `#21` took that off the pages a stranger arrives on; `#95` removed
 * the framework that was still generating it, so there is no chrome left to
 * decide about.
 *
 * **The predicate outlived the thing it was switching.** What it answers now is
 * the question `src/lib/layers.ts` asks — which *voice* a page is written in:
 *
 * > A page in the documentation may be read by somebody who has already
 * > decided. A page above it is read by somebody who has not.
 *
 * That decides tone, length, and whether the page may carry a call to action;
 * `layers.built-test.ts` enforces the last of those against the built output.
 * None of it is layout, which is why this survived a migration that deleted
 * everything it used to be consulted by.
 *
 * **The rule is the directory, because a list of page ids is a list somebody
 * has to remember to edit.** A page under `docs/` is documentation. Everything
 * else is a page a stranger arrives on. Adding a marketing page is then the
 * default, which is the case that should need no decision.
 *
 * **Colour themes were on this file's list until `#64`.** `#21` read *both
 * themes* as an accessibility guarantee, and on a site that offered a choice it
 * was one. The site did not offer it: the landing page has been a single theme
 * since `#30`, so what the Starlight pages actually provided was a second theme
 * the rest of the site could not follow — a visitor on a light system read a
 * dark page and then a white one. `#64` settled the site on the theme it
 * already committed to, and the guarantee that replaces *both themes* is the
 * contrast test, which computes every text-on-background pair rather than
 * trusting the palette.
 */

/** The one directory whose pages are documentation. */
export const DOCUMENTATION_PREFIX = "docs/";

/**
 * The routes that are documentation despite not living under that directory.
 *
 * **This set exists because the directory rule did not survive its first real
 * member** (kolonie-website#71). `/quests/` became documentation when `#71`
 * rewrote it as the reference for the SOL flow, and moving it under `docs/` to
 * satisfy the predicate would have changed a published URL — one linked from the
 * landing page, from `Join.astro`, from `/skill` and from the header — in order
 * to tidy an internal classification. That is the wrong way round.
 *
 * **The default the directory rule was protecting is unchanged**, and it was the
 * important half: a page is persuasion unless something says otherwise, so
 * adding a marketing page still needs no decision. What changed is that making a
 * page documentation is now one line here rather than a move, which matches
 * `layers.ts` calling documentation the deliberate act.
 *
 * **It is a set of exceptions and should not grow into the rule.** A page
 * written as documentation from the start belongs under `docs/` and needs no
 * entry; this is for URLs that predate the split.
 */
export const DOCUMENTATION_ROUTES: ReadonlySet<string> = new Set(["quests"]);

/**
 * Whether this page is documentation, from its entry id in the `pages`
 * collection.
 *
 * The id is the content file's path under `src/content/pages/` without its
 * extension — `academy`, `quests/ideas`, `docs/whatever`.
 *
 * Note that `quests` and `quests/ideas` are deliberately on opposite sides:
 * the first is the reference for commissioning, and the second is a gallery of
 * examples written for somebody who has not decided yet. Membership is exact
 * rather than by prefix for that reason.
 */
export const isDocumentation = (routeId: string): boolean =>
  routeId.startsWith(DOCUMENTATION_PREFIX) || DOCUMENTATION_ROUTES.has(routeId);
