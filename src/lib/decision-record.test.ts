import { describe, expect, it } from 'vitest'

import {
  DOCS_BLOB,
  PLATFORM_DECISIONS,
  RecordTransformError,
  preface,
  titleOf,
  transformRecord,
} from './decision-record.ts'

/**
 * A resolver that answers for a fixed set of files, so these tests measure the
 * transform rather than a checkout. The build passes one that asks the disk —
 * see `relativeResolver` in `kolonie-docs.ts`.
 */
const resolves = (present: string[]) => (path: string) => {
  const normalised = path.replace(/^\.\.\/\.\.\//, '').replace(/^\.\.\//, 'state/')
  if (!present.includes(normalised)) {
    throw new RecordTransformError(`no such file: ${normalised}`)
  }
  return `${DOCS_BLOB}/${normalised}`
}

/** Every shape the corpus actually contains, in one fixture. */
const FIXTURE = `# Why the vetting node left the wallet

[← the register](../decisions.md)

The rule is in [AGENTS.md](../../AGENTS.md) and the exception is
[an operator may help](../../onboarding/academy.md#an-operator-may-help).

Decided on \`kolonie-docs#143\`, against kolonie-platform#45 and #107. D-039 says
citizenship is written by the verdict, and \`D-102\` narrows it.

\`\`\`bash
# 42 markers, and #107 is a comment rather than an issue
grep -c "#39" file
\`\`\`
`

const PRESENT = [
  'state/decisions.md',
  'AGENTS.md',
  'onboarding/academy.md',
]

describe('the decision record transform', () => {
  it('takes the title from the record rather than from a list beside it', () => {
    expect(titleOf(FIXTURE, 'x')).toBe('Why the vetting node left the wallet')
  })

  it('refuses a record with no heading rather than publishing an untitled page', () => {
    expect(() => titleOf('no heading here\n', 'orphan')).toThrow(RecordTransformError)
  })

  it('rewrites every relative link, including the one 62 of 63 records carry', () => {
    const { markdown } = transformRecord(
      { slug: 'vetting-node-left-the-wallet', markdown: FIXTURE },
      resolves(PRESENT),
    )

    expect(markdown).toContain(`[← the register](${DOCS_BLOB}/state/decisions.md)`)
    expect(markdown).toContain(`[AGENTS.md](${DOCS_BLOB}/AGENTS.md)`)
    // The fragment survives the rewrite: it is the half that makes the link useful.
    expect(markdown).toContain(
      `${DOCS_BLOB}/onboarding/academy.md#an-operator-may-help`,
    )
    expect(markdown).not.toMatch(/\]\(\.\.\//)
  })

  it('links an issue reference in whichever of its three shapes it appears', () => {
    const { markdown } = transformRecord(
      { slug: 'x', markdown: FIXTURE },
      resolves(PRESENT),
    )

    expect(markdown).toContain(
      '[`kolonie-docs#143`](https://github.com/Kolonie-AI/kolonie-docs/issues/143)',
    )
    expect(markdown).toContain(
      '[kolonie-platform#45](https://github.com/Kolonie-AI/kolonie-platform/issues/45)',
    )
    // A bare number is this repository's issue, which is what a record means by it.
    expect(markdown).toContain('[#107](https://github.com/Kolonie-AI/kolonie-docs/issues/107)')
  })

  it('links a D- record to the platform register, in prose and in a code span', () => {
    const { markdown } = transformRecord(
      { slug: 'x', markdown: FIXTURE },
      resolves(PRESENT),
    )

    expect(markdown).toContain(`[D-039](${PLATFORM_DECISIONS})`)
    expect(markdown).toContain(`[\`D-102\`](${PLATFORM_DECISIONS})`)
  })

  it('leaves a fenced block alone, because a fence is a quotation', () => {
    const { markdown } = transformRecord(
      { slug: 'x', markdown: FIXTURE },
      resolves(PRESENT),
    )

    const fence = markdown.slice(markdown.indexOf('```'), markdown.lastIndexOf('```'))
    expect(fence).toContain('# 42 markers, and #107 is a comment rather than an issue')
    expect(fence).toContain('grep -c "#39" file')
    expect(fence).not.toContain('github.com')
  })

  /**
   * **The rejection case.** A record pointing at a file that has been renamed
   * must stop the build. The alternative is a confident `404` on a site whose
   * entire argument is that its claims are checkable.
   */
  it('fails rather than emitting a link the checkout cannot account for', () => {
    const broken = '# A record\n\nSee [the register](../decisions.md).\n'

    expect(() =>
      transformRecord({ slug: 'broken', markdown: broken }, resolves([])),
    ).toThrow(RecordTransformError)
  })

  it('drops the record’s own heading, because the page renders the title', () => {
    const { markdown } = transformRecord(
      { slug: 'x', markdown: FIXTURE },
      resolves(PRESENT),
    )

    expect(markdown).not.toContain('# Why the vetting node left the wallet')
  })
})

describe('the generated preface', () => {
  it('names where the record came from and says it is unchanged', () => {
    const text = preface('monorepo-reversed')

    expect(text).toContain(`${DOCS_BLOB}/state/decisions/monorepo-reversed.md`)
    expect(text).toContain('published unchanged')
    expect(text).not.toContain('no longer stands')
  })

  it('puts a superseded record’s replacement above the fold', () => {
    const text = preface('vetting-node-left-the-wallet', {
      href: 'https://example.invalid/register',
      label: 'the decision that replaced it',
    })

    expect(text).toContain('**This decision no longer stands.**')
    expect(text).toContain('[the decision that replaced it](https://example.invalid/register)')
  })

  it('is generated rather than written per post, so every post says the same thing', () => {
    expect(preface('a').replace('a.md', 'b.md')).toBe(preface('b'))
  })
})
