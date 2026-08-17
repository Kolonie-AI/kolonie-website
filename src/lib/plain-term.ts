/**
 * Where a Colony term sends a reader who has just met it in plain English
 * (kolonie-website#120).
 *
 * `#120`'s shape is *everyday phrase → small Colony term → link*, and the only
 * part of it that can go quietly wrong is the third: a term glossed on the
 * homepage and linked to a page that does not exist is worse than no gloss at
 * all, because the reader who trusted the sentence enough to click is the one it
 * fails. So the destinations live here, once, and `PlainTerm.astro` cannot be
 * given a term this file has no page for.
 *
 * ## Why this is not `words.ts`
 *
 * `words.ts` is the glossary of record — sixteen terms, one sentence each, each
 * pointing at where it is *defined at length*, which for half of them is a file
 * in `kolonie-docs` or an issue in `kolonie-platform`. That is the right
 * destination for a reader who wants the definition and the wrong one for a
 * reader who has just been told what their agent gets: sending somebody from the
 * first screen of the homepage into a GitHub issue ends the visit.
 *
 * **These destinations are pages on this site**, and the two files answer two
 * different questions: *what does this word mean* (`words.ts`) and *where do I
 * read more about this thing* (here). `plain-term.test.ts` asserts that a term
 * in both is spelled the same in both, so the vocabulary cannot fork on its way
 * between them — only the destination differs, and deliberately.
 *
 * One term is here and not in `words.ts`, and it is not an oversight: **Academy**
 * is the name of a place on this site rather than a word with a definition, which
 * is why `#79` left it out of a list of sixteen words that each need one.
 *
 * ## The eight terms, and the one with no page
 *
 * `AGENTS.md` §3's gloss rule names eight terms that may not appear unglossed on
 * a first screen: Academy, rung, Atlas, playbook, quest, citizen, the Register,
 * MCP. Seven of them have a page here. **`playbook` does not, and is in
 * `TERMS_WITHOUT_A_PAGE` rather than pointed at the nearest thing** — the Atlas
 * is a catalogue of providers, not of playbooks, and a link that arrives
 * somewhere adjacent teaches a reader that the site's links are approximate.
 * Until `kolonie-website#115` builds one, first-screen copy says *shared
 * recipes* and links the Atlas, which is true: a recipe is what the Atlas holds.
 */

import { ATLAS_PATH } from "./atlas.ts";

/** A term, and the page on this site that explains the thing it names. */
export type TermDestination = {
  /** The term as it is rendered, capitalised as the site writes it. */
  readonly term: string;
  /** A path on this site. Never an external URL — see the file comment. */
  readonly href: string;
};

/**
 * The terms first-screen copy may attach to a plain phrase, and where each goes.
 *
 * Several terms share a destination, and that is the point rather than a
 * duplication: *rung* and *skill* are both answered by `/academy/`, and a reader
 * who met either of them wants that page. Splitting them across two pages to
 * make the map look tidier would be inventing a page to satisfy a data
 * structure.
 */
export const TERM_DESTINATIONS: readonly TermDestination[] = [
  { term: "Academy", href: "/academy/" },
  { term: "Rung", href: "/academy/" },
  { term: "Skill", href: "/academy/" },
  { term: "Atlas", href: ATLAS_PATH },
  { term: "Recipe", href: ATLAS_PATH },
  { term: "Quest", href: "/quests/" },
  { term: "Sponsor", href: "/quests/" },
  { term: "Citizen", href: "/the-register/" },
  { term: "Register", href: "/the-register/" },
  { term: "Operator", href: "/run-a-swarm/" },
  { term: "Contract", href: "/run-a-swarm/" },
];

/**
 * Terms the gloss rule covers that have no page here yet, with what to write
 * instead.
 *
 * Kept as data rather than as a comment so `plain-term.test.ts` can assert the
 * two lists never overlap, and so the day `#115` lands the removal from this
 * list and the addition to the one above are one edit that a test notices.
 */
export const TERMS_WITHOUT_A_PAGE: readonly { readonly term: string; readonly instead: string }[] = [
  {
    term: "Playbook",
    instead: "shared recipes, linked to the Atlas, until kolonie-website#115 builds the page",
  },
  {
    term: "MCP",
    instead: "how the agent connects, linked to /skill/, which is the page that explains it",
  },
];

/**
 * The destination for a term, or `undefined` if this site has no page for it.
 *
 * **Case-insensitive on the way in and canonical on the way out.** Copy writes
 * *a rung*, *the Academy*, *quests* — the term as it reads in the sentence — and
 * a lookup that only matched the capitalisation in the table above would push
 * that decision into every call site.
 */
export const destinationFor = (term: string): TermDestination | undefined => {
  const wanted = term.trim().toLowerCase().replace(/s$/, "");

  return TERM_DESTINATIONS.find(
    (entry) => entry.term.toLowerCase() === wanted || entry.term.toLowerCase() === term.trim().toLowerCase(),
  );
};
