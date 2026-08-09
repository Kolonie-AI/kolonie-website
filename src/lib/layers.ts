/**
 * The two layers of this site, and which voice belongs in each
 * (kolonie-website#66).
 *
 * `/quests/`, `/skill` and `/academy/` were documentation pages doing a
 * persuasion job — in the docs layout, in the docs voice, and they are what a
 * stranger is sent to when they ask what the Colony is. Documentation answers
 * *how does this work*; a landing page answers *why would I*. A page asked to do
 * both does neither, and `kolonie-docs#217` is what that cost: the maintainer
 * read the skill's own pitch as an outsider and found no reason to join.
 *
 * ## The rule
 *
 * It is exported rather than paraphrased, because a rule that lives in prose in
 * one file gets restated slightly differently in the next one.
 */

/** `#66`'s rule, verbatim. Rendered where a reader needs it and asserted in tests. */
export const LAYER_RULE =
  "A page in the documentation may be read by somebody who has already decided. " +
  "A page above it is read by somebody who has not.";

/**
 * The two layers.
 *
 * **`persuasion` is the default and that is deliberate.** Adding a marketing
 * page should need no decision; adding documentation is the deliberate act,
 * because it is the smaller and more constrained category. This is the same
 * shape as `chrome.ts`'s directory rule and for the same reason.
 */
export type Layer = "persuasion" | "documentation";

/**
 * **What actually decides the layer is the directory, not this file.**
 * `chrome.ts` owns that predicate — a page under `docs/` is documentation;
 * everything else is a page a stranger arrives on. This module does not re-derive it, because two answers to one question is
 * the failure `#21` already wrote down.
 *
 * What this module adds is everything the predicate does not answer: what each
 * layer is *for*, which constraints apply to it, and how a reader crosses
 * between them.
 */
export { isDocumentation, DOCUMENTATION_PREFIX } from "./chrome.ts";

/**
 * What a documentation page may not do.
 *
 * `#66`: *"No documentation page carries a call to action."* A reader who has
 * reached the documentation has already decided; selling to them again is noise
 * at best, and at worst it is the thing that makes a reference page untrustworthy
 * — a page that wants something from you is read differently from one that does
 * not.
 *
 * These are matched case-insensitively against a documentation page's rendered
 * text. They are the phrasings this site actually uses, taken from the landing
 * page and from `Join.astro`, rather than a general list of marketing verbs: a
 * check that flags *"start"* would flag a sentence about starting a task.
 */
export const CALL_TO_ACTION_PHRASES: readonly string[] = [
  "send your agent",
  "join the colony",
  "get started",
  "sign up",
  "try it free",
  "no credit card",
  "no account, no card",
];

/**
 * Where a reader goes when a persuasion page has convinced them, and back.
 *
 * **One click each way is `#66`'s acceptance criterion, and only one direction
 * needs building.** The way *back* already exists and is not this module's to
 * invent: `#50` requires every page on the site to render the same header, so
 * the documentation pages carry the marketing navigation already. Building a
 * second "back to the overview" control would be a second answer to a question
 * that has one.
 *
 * **The table is empty of pairs today, and that is the honest state rather than
 * an oversight.** `/quests/` is the site's one documentation page
 * (`kolonie-website#71`, and `chrome.ts` holds the exception that says so);
 * `#68`, `#69` and `#70` are the persuasion pages that will point at their
 * counterparts. Adding a row here is what wires a pair, and
 * `layers.built-test.ts` fails on a row whose either half does not exist.
 */
export interface LayerPair {
  /** The persuasion page, by its built path. */
  readonly persuasion: string;
  /** The documentation it hands the reader to, by its built path. */
  readonly documentation: string;
  /** The link text on the persuasion page. Names the destination, never "learn more". */
  readonly label: string;
}

export const LAYER_PAIRS: readonly LayerPair[] = [];

/** The documentation a persuasion page hands its reader to, if it has one yet. */
export const documentationFor = (path: string): LayerPair | undefined =>
  LAYER_PAIRS.find((pair) => pair.persuasion === path);
