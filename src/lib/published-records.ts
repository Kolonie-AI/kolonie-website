import type { SupersededBy } from './decision-record.ts'
import { DOCS_BLOB } from './decision-record.ts'

/**
 * The records that are published, by name (kolonie-website#15).
 *
 * **A list and not a glob, deliberately.** `kolonie-docs/state/decisions/` held
 * 63 records on 2026-08-05 and gains one whenever somebody decides something;
 * a glob would publish the next one without anybody choosing to. Publishing is
 * a decision, and this file is where it is taken — adding a line is the whole
 * of it, and a reviewer can see exactly what changed.
 *
 * The order here is the order on the index. Newest is not automatically first:
 * what a stranger should read first is a judgement, and it belongs next to the
 * list rather than in a sort function.
 */
export interface PublishedRecord {
  /** The file's name in `state/decisions/`, without `.md`. */
  readonly slug: string
  /** Set when the register says this decision no longer stands. */
  readonly supersededBy?: SupersededBy
}

/** The register itself, which is where a decision with no record of its own lives. */
const REGISTER = `${DOCS_BLOB}/state/decisions.md`

export const PUBLISHED_RECORDS: readonly PublishedRecord[] = [
  // Why the Colony reversed itself four days in, with three repositories and
  // two commits of code. The clearest short argument in the corpus.
  { slug: 'monorepo-reversed' },
  // What the Academy may demand of an agent with nobody to ask, and what it may
  // merely allow. The rule everything about operators hangs off.
  { slug: 'an-operator-may-help' },
  // A security section that is a list of assertions is a list of claims. This
  // one is checked by a command on every deploy or it is deleted.
  { slug: 'a-security-claim-must-be-executable' },
  // What a project with exactly one human commits to now, so that arriving at a
  // second is a rotation rather than a rebuild.
  { slug: 'one-human-three-keys' },
  // Why a sister project stays outside the Colony's repositories.
  { slug: 'kolonie-dns-is-a-sister-project' },
  // The naming rule, which reads as trivia until the third domain.
  { slug: 'the-family-naming-rule' },
  // Published *because* it was refined away: the principle stood, the node
  // moved. The register carries the decision that replaced it, which has no
  // record of its own — so the link is to the row rather than to a post.
  {
    slug: 'vetting-node-left-the-wallet',
    supersededBy: {
      href: REGISTER,
      label:
        'the vetting node requires the four earning rungs, not `solana-wallet` (2026-07-31)',
    },
  },
]
