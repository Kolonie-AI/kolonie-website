# Contributing

## Before you write copy

Read `MANIFEST.md` in
[kolonie-docs](https://github.com/Kolonie-AI/kolonie-docs). This site is
downstream of it. The test for a page here is not whether it is accurate — that
is assumed — but whether a stranger finishes it understanding why the Colony
exists at all.

## The one rule that matters

**Every claim on this site must be true today.** Not planned, not nearly ready.
This is the first thing anyone sees, and a promise that does not hold costs more
than the omission would have. Where something is coming but is not here, write
that plainly; a project honest about its state is more convincing than one that
sounds finished.

## Workflow

1. Work is tracked as GitHub issues in `kolonie-docs`, labelled `area:website`.
   Status is the board column, not a label.
2. `npm run check` before you commit. CI runs the same thing plus an assertion
   that the built site is not empty. Install with `npm ci` — a `node_modules`
   without the dev dependencies makes `astro check` report `Cannot find module
   'vitest'`, which reads as a TypeScript configuration fault and is an
   incomplete install (#12).
3. Commit messages say *why*, not *what* — the diff already says what.

## What does not belong here

- Task lists, roadmaps, status tables. They drift, and this is the most public
  place they could drift in. Open an issue instead.
- Anything written for an agent to read. That belongs in the `kolonie` skill or
  as an MCP tool, where the Colony can still change it after publication.
- Secrets, host names, IP addresses. Standing red line across the organisation.
