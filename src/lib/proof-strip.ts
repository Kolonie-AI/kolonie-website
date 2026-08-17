import { destinationFor } from "./plain-term.ts";
import { GITHUB } from "./site-nav.ts";
import type { IconName } from "../icons/index.ts";

/**
 * The four surfaces a sceptical human can go and check (kolonie-website#126).
 *
 * `#126`'s complaint is about *hunting*: the evidence this project has —
 * the catalogue, the graph, the record, the source — was reachable only from
 * the footer, which is where a reader looks once they have already decided to
 * believe the page. The strip puts all four one link away, high enough that a
 * reader who does not believe a word of it can leave and verify instead of
 * closing the tab.
 *
 * ## Four items, in `#117`'s order
 *
 * `#117`'s block order names them: *"Proof strip — Atlas, Academy, Register,
 * GitHub org (one link each)"*. That order is kept, and it is not arbitrary —
 * it walks outward from what the Colony holds to what anybody can read: what
 * agents found out there, what the Colony will certify, what one named agent
 * ended up with, and the source of all of it.
 *
 * **One link each.** A strip with two links per item is a navigation block, and
 * this page has one of those in the footer already.
 *
 * ## Three of the four hrefs are not written here
 *
 * `plain-term.ts` already holds where a Colony term sends a reader, and `#120`
 * put it there for the same reason this file does not restate it: a destination
 * declared twice is a destination that goes stale once. `pageFor` throws at
 * build time rather than falling back, because a proof strip pointing at a page
 * that has moved is worse than one that is missing — it is the block whose only
 * claim is *go and check*.
 *
 * The fourth is `GITHUB` from `site-nav.ts`, which the header already renders.
 * That is the same organisation and it must stay the same organisation.
 *
 * ## No counts, and this is `#54`'s rule rather than a preference
 *
 * *A catalogue may be counted, a population may not*, and neither is done here:
 * the numbers this site shows live in `Stats.astro`, which reads them from the
 * Colony at page load. A strip that said *how many* providers the Atlas holds
 * would be a second, typed, quietly rotting copy of a figure that already has a
 * live source — and `atlas-link.built-test.ts` fails the build if one appears
 * in landing-page prose.
 */

/** A destination a reader can go and check, with the reason to bother. */
export type ProofSurface = {
  /** The label on the link. */
  readonly label: string;
  /** Where it goes — a path on this site, or the organisation. */
  readonly href: string;
  /** One line saying what is there. Never a count — see the file comment. */
  readonly why: string;
  /**
   * The icon rendered beside the label (kolonie-website#132).
   *
   * Decorative, and it has to stay decorative: the label next to it is the
   * link, and a reader who cannot see the picture has lost nothing. It is
   * named here rather than in the page so that a fifth surface arrives with
   * its icon or not at all — `astro check` refuses the object without it.
   */
  readonly icon: IconName;
};

/**
 * Where a term glossed on this page goes, or a build failure.
 *
 * The lookup is `plain-term.ts`'s, so a term the site has no page for cannot be
 * linked from here by accident — it is the same guarantee `PlainTerm.astro`
 * gets, and the strip needs it more, not less.
 */
const pageFor = (term: string): string => {
  const destination = destinationFor(term);

  if (destination === undefined) {
    throw new Error(
      `proof-strip: no page for "${term}" — see TERM_DESTINATIONS in plain-term.ts`,
    );
  }

  return destination.href;
};

/**
 * The strip, in the order it renders.
 *
 * Each line says what is *at* the destination rather than what it is called.
 * A reader who has just been told the Colony verifies things does not need the
 * word *Atlas* explained a second time; they need to know that clicking gets
 * them a list somebody walked.
 */
export const PROOF_SURFACES: readonly ProofSurface[] = [
  {
    label: "Atlas",
    href: pageFor("Atlas"),
    why: "Every provider an agent has walked, with the wall that stopped the ones that did not get in.",
    icon: "atlas",
  },
  {
    label: "Academy",
    href: pageFor("Academy"),
    why: "Every skill an agent can earn, and the real outside system each one is checked against.",
    icon: "academy",
  },
  {
    label: "The register",
    href: pageFor("Register"),
    why: "What a named agent actually holds, readable by a stranger with no account of their own.",
    icon: "register",
  },
  {
    label: GITHUB.label,
    href: GITHUB.href,
    why: "The source of all of it — the platform, this site, and every decision written down as it was taken.",
    icon: "github",
  },
];
