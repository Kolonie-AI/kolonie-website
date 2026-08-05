import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, join, normalize, resolve } from 'node:path'

import { RECORDS_DIR, RecordTransformError } from './decision-record.ts'

/**
 * Where the second checkout of `kolonie-docs` is (kolonie-website#15).
 *
 * The blog renders records that live in another repository, and **no copy of
 * one exists here** — that is the property the whole design turns on. So the
 * build needs the other repository present, and the interesting case is when it
 * is not: a build that quietly published an empty blog would look exactly like
 * a build that published nothing new.
 *
 * Three places are tried, in the order the three situations occur:
 *
 * - `KOLONIE_DOCS`, for anybody who keeps their checkouts somewhere of their own;
 * - `.kolonie-docs/` inside this repository, which is where CI and the image
 *   build put it — inside the tree because the Dockerfile's build context is
 *   this directory and nothing outside it can be copied in;
 * - `../kolonie-docs`, which is the ordinary sibling checkout.
 */
export function docsCheckout(
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
): string {
  const candidates = [
    env.KOLONIE_DOCS,
    join(cwd, '.kolonie-docs'),
    resolve(cwd, '..', 'kolonie-docs'),
  ].filter((path): path is string => Boolean(path))

  for (const candidate of candidates) {
    if (existsSync(join(candidate, RECORDS_DIR))) return candidate
  }

  throw new RecordTransformError(
    [
      'No checkout of Kolonie-AI/kolonie-docs was found, so the blog has nothing to',
      'render and the pages naming the legal entity have nothing to read.',
      `Looked in: ${candidates.join(', ')}.`,
      'Clone it beside this repository, or set KOLONIE_DOCS to where it is.',
      'This is a failure rather than an empty blog on purpose: an empty blog is',
      'indistinguishable from a build that had nothing new to publish.',
    ].join('\n'),
  )
}

/** One record's Markdown, or a refusal naming the file that is missing. */
export function readRecord(checkout: string, slug: string): string {
  const path = join(checkout, RECORDS_DIR, `${slug}.md`)
  if (!existsSync(path)) {
    throw new RecordTransformError(
      `${slug}: no such record at ${path}. It is named in src/lib/published-records.ts; ` +
        'either it was renamed in kolonie-docs or the name is a typo.',
    )
  }
  return readFileSync(path, 'utf8')
}

/**
 * A resolver that refuses a link the checkout cannot account for.
 *
 * This is the rejection case the issue asked for: a record pointing at a file
 * that no longer exists fails the build, where a naive rewrite would emit a
 * confident `404` on a site whose whole argument is that its claims are
 * checkable.
 */
export function relativeResolver(checkout: string, slug: string, blobBase: string) {
  return (relativePath: string): string => {
    const fromRecordsDir = normalize(join(RECORDS_DIR, relativePath))
    if (fromRecordsDir.startsWith('..') || isAbsolute(relativePath)) {
      throw new RecordTransformError(
        `${slug}: the link ${relativePath} points outside kolonie-docs, and this ` +
          'transform only knows how to rewrite links within it.',
      )
    }
    if (!existsSync(join(checkout, fromRecordsDir))) {
      throw new RecordTransformError(
        `${slug}: the link ${relativePath} resolves to ${fromRecordsDir}, which is not ` +
          'in the kolonie-docs checkout. Publishing it would emit a 404 that reads as a fact.',
      )
    }
    return `${blobBase}/${fromRecordsDir}`
  }
}
