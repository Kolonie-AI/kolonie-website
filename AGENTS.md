# AGENTS.md — kolonie-website

This file is binding for any agent working in this repository. Read it fully
before your first edit. If it contradicts your general habits, this file wins.

---

## 1. What this repository is

`kolonie.ai` — the public site. Astro + Starlight, static, served by nginx
behind Traefik.

```
src/content/docs/       the pages
src/content.config.ts   the collection definition — without it the build is empty
src/components/         Astro components a page embeds
src/lib/                logic with no DOM in it, and the only thing under test
astro.config.mjs        site config and Starlight integration
Dockerfile              build with node, serve with nginx
nginx.conf              static serving, Starlight's own 404
```

**`/academy` reads the Colony's API in the browser, at page load.** It is the one
page here that is not wholly static, and it is deliberate: this site does not
rebuild when the platform changes, so a catalogue baked in at build time would
drift from the thing it claims to describe. The cost is that the graph is
invisible to a reader without JavaScript, and to a crawler that does not run it.

`PUBLIC_KOLONIE_API_BASE` overrides where it reads from, at build time. Point it
at something unreachable and load the page to see the failure state by hand.

**This site is for humans.** Agents reach the Colony through `mcp.kolonie.ai`
and `api.kolonie.ai`; nothing here is part of an agent's path. If you find
yourself writing a page for an agent to read, it belongs in the `kolonie` skill
or as an MCP tool instead.

Read `MANIFEST.md` in
[kolonie-docs](https://github.com/Kolonie-AI/kolonie-docs) before writing copy.
The bar it sets is that a reader understands *why the Colony exists*, not what
its endpoints are.

## 2. Where the work is

Open work is GitHub issues, and an issue's **status is the column it sits in**
on the [project board](https://github.com/orgs/Kolonie-AI/projects/1). There are
no status labels. Issues for this repository live in `kolonie-docs` with the
`area:website` label until there is enough here to warrant its own tracker.

The full process is in
[`AGENTS.md` in kolonie-docs](https://github.com/Kolonie-AI/kolonie-docs/blob/main/AGENTS.md).
Read it before creating an issue or moving one. **Do not record task state in a
Markdown file here** — that is the one thing that file forbids everywhere.

## 3. Rules

- **Every claim on this site must be true today.** It is the first thing a
  stranger sees, and a site that promises a working registration before one
  exists costs more trust than it buys. Where something is not ready, say so in
  the page rather than omitting it.
- **No checkboxes, no roadmaps, no status tables in the content.** Those drift
  within a week and this is the most public place they could drift in.
- **`npm run check` before every commit.** It runs `astro check`, then the unit
  tests, then the build — in that order, so a type error fails before a test run
  that would report it worse, and both fail before a build that would hide them.
  Install with `npm ci`. `astro check` type-checks `src/lib/*.test.ts` too, so a
  `node_modules` installed without dev dependencies fails the first command in
  the chain with `Cannot find module 'vitest'` — a message that blames the
  TypeScript configuration for an incomplete install (#12).
- **Colour lives in `src/styles/theme.css` and nowhere else.** It defines the
  colour, type and spacing tokens; pages and components consume them, and
  Starlight's own `--sl-*` names are assigned there once so the sidebar, the
  search dialog, the asides and the 404 page follow without being touched. A
  colour value in any other file fails `src/styles/theme.test.ts`, which also
  computes every text-on-background pair in both themes and fails under WCAG AA.
  The favicon and the Open Graph image are generated from the same tokens by
  `node scripts/build-assets.mjs` — regenerate them when the palette changes,
  and `src/styles/assets.test.ts` will say so if you forget.
- **A green build is not a working site.** Astro emits an empty site without
  complaint if the content collection is misconfigured — that is what
  `src/content.config.ts` is for, and why CI asserts that `dist/index.html`
  exists and mentions the Colony. Keep that assertion.
- **No secrets, no host names, no IPs.** The VPS address is a standing red line
  across every repository in this organisation.

## 4. Deployment

Push to `main` builds `ghcr.io/kolonie-ai/kolonie-website` through
`.github/workflows/build-image.yml`, path-filtered so a README change does not
rebuild an image, and then calls the reusable deploy workflow in `kolonie-infra`
with the tag it just pushed. One commit, one build, one deploy.

The two prerequisites this section used to list as pending are both done:
`kolonie-infra` holds read access to the package, and `detect_profile()` passes
`--profile website`. The website still sits outside the `full` profile
deliberately — `docker compose pull` fails the entire command for one missing
image, and this one took the two working images down with it once already.

The image carries `org.opencontainers.image.revision`, `source`, `created` and
`version` (#4), so *which commit is this container running* is one
`docker inspect` on the host:

```bash
docker inspect kolonie-website \
  --format '{{index .Config.Labels "org.opencontainers.image.revision"}}'
```

That label is also what the drift check in `kolonie-infra` reads to decide
whether this host is serving the newest build of the site. Remove it and the
service goes back to reporting `unknown` — quiet, honest, and not watched.

It carries **no** `ai.kolonie.required-env` (`kolonie-infra#42`). That label
declares what a process refuses to start without; nginx serving static files
refuses nothing, and an absent label is correctly read as declaring nothing.

## 5. Confirm with the maintainer before

- Changing anything about the domain, DNS, or Cloudflare
- Publishing claims about the legal entity, the treasury, or the coin
- Making this repository public — it opens together with the others at MVP, not
  before
