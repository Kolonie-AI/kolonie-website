/**
 * A decision record, rendered rather than rewritten (kolonie-website#15).
 *
 * The Colony's decision records live in `kolonie-docs/state/decisions/` and are
 * written for somebody inside the project: they open with a relative link back
 * to the register, and they refer to issues and to `D-` records by number. Both
 * are a `404` or a shrug the moment the file is read anywhere but the
 * repository.
 *
 * **The transform is the whole design.** A rewrite would give the Colony two
 * copies of every argument, and the one nobody is editing is the one that goes
 * wrong invisibly — `kolonie-docs#120` is named for exactly that. So there is
 * one source, and this file is a pure function over it: if it is wrong, it is
 * wrong the same way on every post, and a test catches it once.
 */

/** Where the records are read from, and where a reader is sent to check one. */
export const ORG = 'https://github.com/Kolonie-AI'
export const DOCS_REPO = `${ORG}/kolonie-docs`
export const DOCS_BLOB = `${DOCS_REPO}/blob/main`
export const RECORDS_DIR = 'state/decisions'

/**
 * `D-0NN` records live in the platform repository, not here.
 *
 * The link is to the file and carries no fragment on purpose. GitHub's anchor
 * for `## D-039 — Citizenship is written by the verdict…` is the whole heading
 * slugified, so `#d-039` matches nothing and lands the reader at the top of the
 * file anyway — with the difference that it looks like a promise that was kept.
 * Resolving the real anchor would mean checking out `kolonie-platform` to build
 * a website, which is a dependency this does not need.
 */
export const PLATFORM_DECISIONS =
  'https://github.com/Kolonie-AI/kolonie-platform/blob/main/docs/decisions.md'

/** The organisation's repositories, so `repo#12` only links where a repo exists. */
export const KNOWN_REPOS = [
  'kolonie-antigravity',
  'kolonie-claude',
  'kolonie-codex',
  'kolonie-dns',
  'kolonie-docs',
  'kolonie-email',
  'kolonie-hermes',
  'kolonie-infra',
  'kolonie-kilo',
  'kolonie-openclaw',
  'kolonie-platform',
  'kolonie-skill',
  'kolonie-website',
] as const

export class RecordTransformError extends Error {}

/**
 * Resolves a link relative to a record, or refuses.
 *
 * The build passes one that checks the docs checkout, which is what turns a
 * broken link into a failed build rather than a published `404`. A test passes
 * one that answers from a fixture.
 */
export type ResolveRelative = (path: string) => string

export interface SupersededBy {
  /** Where the decision that replaced this one is written down. */
  readonly href: string
  /** What to call it, in the reader's terms rather than by number. */
  readonly label: string
}

export interface RecordSource {
  readonly slug: string
  readonly markdown: string
}

export interface TransformedRecord {
  readonly title: string
  /** Markdown, links rewritten, ready to be rendered. */
  readonly markdown: string
}

/**
 * The one heading a record carries, and the one place its title exists.
 *
 * A title written in the curated list instead would be a second copy of the
 * record's first line, and the two would drift — which is the failure this
 * whole approach exists to avoid.
 */
export function titleOf(markdown: string, slug: string): string {
  const heading = markdown.match(/^#\s+(.+?)\s*$/m)
  if (!heading?.[1]) {
    throw new RecordTransformError(
      `${slug}: no level-one heading, so the record has no title to publish under`,
    )
  }
  return heading[1]
}

/**
 * Everything outside a fenced code block, with the fences left alone.
 *
 * A fence in a record is a command, a schema or a check constraint. Rewriting
 * `#42` inside one would corrupt the thing the record is quoting.
 */
function outsideFences(markdown: string, rewrite: (chunk: string) => string): string {
  const parts = markdown.split(/(^```[\s\S]*?^```\s*$)/m)
  return parts.map((part) => (part.startsWith('```') ? part : rewrite(part))).join('')
}

/** `[text](../decisions.md#anchor)` → the same link on GitHub. */
function rewriteRelativeLinks(markdown: string, resolve: ResolveRelative): string {
  return markdown.replace(
    /\]\((\.\.?\/[^)\s]+)\)/g,
    (_whole: string, target: string) => {
      const [path, fragment] = splitFragment(target)
      return `](${resolve(path)}${fragment})`
    },
  )
}

function splitFragment(target: string): [string, string] {
  const hash = target.indexOf('#')
  return hash === -1 ? [target, ''] : [target.slice(0, hash), target.slice(hash)]
}

/**
 * `kolonie-docs#143`, `#143` and `D-039`, linked where they are already named.
 *
 * The code span is kept inside the link rather than stripped: the record wrote
 * `` `kolonie-docs#143` `` because it is an identifier, and it still is one.
 * Anything already inside a link is left alone — `[…](…#39)` is a fragment, not
 * an issue.
 */
function rewriteReferences(markdown: string): string {
  const repos = KNOWN_REPOS.join('|')

  return (
    markdown
      // repo#123 and `repo#123`
      .replace(
        new RegExp(`(?<![\\[(\\w/])(\`?)(${repos})#(\\d+)\\1`, 'g'),
        (_whole, tick: string, repo: string, number: string) =>
          `[${tick}${repo}#${number}${tick}](${ORG}/${repo}/issues/${number})`,
      )
      // A bare hash and a number is this repository's issue. Not one already
      // inside a link, not a heading, and not a colour — the theme's own test
      // keeps the last of those honest.
      .replace(
        /(?<![\[(\w/#-])(`?)#(\d{1,4})\1(?![\w-])/g,
        (_whole, tick: string, number: string) =>
          `[${tick}#${number}${tick}](${DOCS_REPO}/issues/${number})`,
      )
      // D-039 and `D-039`
      .replace(
        /(?<![\[(\w-])(`?)(D-\d{3})\1(?![\w-])/g,
        (_whole, tick: string, record: string) =>
          `[${tick}${record}${tick}](${PLATFORM_DECISIONS})`,
      )
  )
}

/**
 * The standing preface, generated rather than written per post.
 *
 * Written once here so that a reader who has never heard of the Colony is told
 * what they are reading before the first sentence of it, and so that no post
 * gains an author the Colony did not intend it to have.
 */
export function preface(slug: string, supersededBy?: SupersededBy): string {
  const source = `${DOCS_BLOB}/${RECORDS_DIR}/${slug}.md`
  const lines = [
    `> This is a decision record from the Colony's own repository, published unchanged.`,
    `> It was written for somebody inside the project — its links and its \`D-\` numbers`,
    `> point back at [the repository it lives in](${source}), and nothing has been`,
    `> softened for an outside reader.`,
  ]
  if (supersededBy) {
    lines.push(
      `>`,
      `> **This decision no longer stands.** It was replaced by`,
      `> [${supersededBy.label}](${supersededBy.href}), and it is published anyway:`,
      `> a site whose argument is that its claims are checkable cannot publish only`,
      `> the decisions that survived.`,
    )
  }
  return lines.join('\n')
}

/**
 * A record as it is published: preface, then the record, links rewritten.
 *
 * The record's own `# Heading` is removed, because the page renders the title
 * itself — two of them is what a naive concatenation produces.
 */
export function transformRecord(
  source: RecordSource,
  resolve: ResolveRelative,
  supersededBy?: SupersededBy,
): TransformedRecord {
  const title = titleOf(source.markdown, source.slug)
  const withoutHeading = source.markdown.replace(/^#\s+.+?\s*$/m, '').trimStart()
  const body = outsideFences(withoutHeading, (chunk) =>
    rewriteReferences(rewriteRelativeLinks(chunk, resolve)),
  )
  return {
    title,
    markdown: `${preface(source.slug, supersededBy)}\n\n${body.trim()}\n`,
  }
}
