import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The site states no repository count (kolonie-website#80).
 *
 * `/who-builds-this/` said *"twelve public repositories"* twice while there were
 * fourteen, on the one page whose entire argument is that its claims are
 * checkable rather than asserted — and which tells the reader, in as many words,
 * *"re-measure before quoting this."* A reader who followed that instruction on
 * the very first figure found the page wrong about its own subject.
 *
 * ## Why a count is different from the other numbers on that page
 *
 * The commit figures beside it are offered **with the command that reproduces
 * them** and a date, which is what makes them honest. A repository count cannot
 * be honest that way: it changes on the day somebody creates a repository, and
 * nothing in this organisation's workflow would think to grep a website. It had
 * already gone stale in three files at once — this page, `state/STATUS.md`
 * (*"eleven"*) and `AGENTS.md` (`kolonie-docs#205`).
 *
 * So `#80` dropped it rather than wiring it to a build-time read. *"Every
 * repository in the organisation"* is true on every day and needs nothing to
 * keep it true, and the claim — **the history is public and countable** — loses
 * nothing: the count was never what made it persuasive.
 *
 * ## What this guards
 *
 * Re-introduction, which is the only way the fix stops holding. It is deliberately
 * narrow: a number **immediately before the word** *repositories* or *repos*.
 * *"twelve agents"*, *"fourteen red flags"* and *"one repository per runtime"*
 * are all left alone, because none of them is a claim about how many
 * repositories exist.
 *
 * Digits and spelled-out words both, because the sentence that broke was spelled
 * out and a digit would read as more precise rather than less.
 */

const dist = fileURLToPath(new URL('../../dist', import.meta.url))

const pagesUnder = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) return pagesUnder(path)
    return entry.endsWith('.html') ? [path] : []
  })

/**
 * `/blog/` is excluded for the reason `entity.built-test.ts` excludes it: it
 * republishes decision records from `kolonie-docs` unchanged, and a record that
 * counted the repositories on the day it was written is an archive rather than
 * the site making a claim.
 */
const pages = pagesUnder(dist).filter((page) => !page.includes(`${sep}blog${sep}`))

const COUNT_BEFORE_REPOSITORIES =
  /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s+(?:public\s+|open\s+)?(?:repositories|repos)\b/i

describe('the built site counts no repositories', () => {
  it('finds pages to check at all', () => {
    // An empty list passes every assertion below it, which is how this check
    // would go quiet rather than red. The same floor `entity.built-test.ts` has.
    expect(pages.length).toBeGreaterThan(3)
  })

  it.each(pages)('%s states no repository count', (page) => {
    const html = readFileSync(page, 'utf8')
    const match = html.match(COUNT_BEFORE_REPOSITORIES)
    expect(
      match?.[0],
      `${page} says "${match?.[0]}". A repository count on a web page is stale the ` +
        'day somebody runs `gh repo new` — write "every repository in the ' +
        'organisation" instead (kolonie-website#80).',
    ).toBeUndefined()
  })
})
