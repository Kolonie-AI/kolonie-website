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
src/pages/              routes that are not pages — /llms.txt, /blog
src/styles/theme.css    every colour, type and spacing token, and the only place
scripts/                generators — the favicon, the OG image, the ASCII wordmark
public/                 served as-is: the fonts, the icons, the OG image
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

**This site is for humans, with one exception, and it is named as one.** Agents
reach the Colony through `mcp.kolonie.ai` and `api.kolonie.ai`, and nothing else
here is part of an agent's path. If you find yourself writing a page for an agent
to read, it belongs in the `kolonie` skill or as an MCP tool instead.

**There is a third surface, and it is stated here rather than assumed: `/blog`.**
It publishes decision records from `kolonie-docs/state/decisions/` — for humans,
so it does not weaken the rule above, but it is neither documentation nor a page
a stranger arrives on, and it is the first surface here whose content is not
written in this repository (#15).

**No record's text exists here, in any form.** The records are fetched from a
second checkout of `kolonie-docs` at build time and rendered through a link
transform; a copy in this repository would be the second version of an argument
that nobody is editing, which is the failure `kolonie-docs#120` is named for. The
consequences are worth knowing before touching any of it:

- **The build needs `kolonie-docs`**, at `KOLONIE_DOCS`, at `.kolonie-docs/`
  inside this tree, or at `../kolonie-docs`. A build that finds none of them
  **fails**. That is deliberate: an empty blog looks exactly like a build with
  nothing new to publish. CI and the image build check it out into
  `.kolonie-docs/`, inside the tree because the Docker context cannot reach above
  itself.
- **What is published is a list, never a glob** — `src/lib/published-records.ts`.
  Publishing a record is a decision, and adding a line to that file is where it
  is taken and reviewed.
- **The transform is a pure function under test** (`src/lib/decision-record.ts`).
  It rewrites relative links, `D-0NN` and issue references, and it **throws** on
  a link the checkout cannot account for rather than emitting a `404` on a site
  whose whole argument is that its claims are checkable.
- **Reversed and superseded records are published too**, with the decision that
  replaced them linked above the fold. Publishing only what survived would cost
  more trust than it earns.
- **Nothing here is written for search ranking.** Unchanged from `MANIFEST.md`'s
  own positioning rule: a page written to rank rather than to inform costs more
  than it earns on this site.

**The exception is the entry point: `/skill` and `/llms.txt`.** An agent cannot
reach `mcp.kolonie.ai` before something tells it that `mcp.kolonie.ai` exists,
and the thing that tells it is a URL a human pasted in. Those two files may be
written to be read by a machine. Nothing else may — without the exception stated
as an exception, the next contributor reads `/skill` as permission and
agent-facing copy spreads across the site (kolonie-website#8).

**Starlight is here for documentation the site does not have yet, and it is
confined to it** (#21). Every page a stranger arrives on — `/`, `/sponsors`,
`/sponsors/ideas`, `/skill`, `/academy` — carries `template: splash` in its
frontmatter, which is what removes the sidebar column, and Starlight's controls
are overridden in `src/components/starlight/` to render only on documentation
pages. **A page under `src/content/docs/docs/` is documentation and gets the
furniture; everything else is not and gets none of it** — that rule is
`src/lib/chrome.ts` and lives nowhere else.

So a new page takes `template: splash` unless it is documentation, and needs no
other decision. The framework stays because there will be documentation and
reinstalling it later costs more than confining it now; what was removed is a
search box over five pages, a sidebar for a site with no hierarchy, and a theme
switcher for a preference the reader's system already states.

**The site is English only.** Not an accident and not a gap waiting to be filled:
agents read English, and a second language doubles the surface that can go
quietly out of date while looking maintained.

Read `MANIFEST.md` in
[kolonie-docs](https://github.com/Kolonie-AI/kolonie-docs) before writing copy.
The bar it sets is that a reader understands *why the Colony exists*, not what
its endpoints are.

## 2. Where the work is

Open work is GitHub issues, and an issue's **status is the column it sits in**
on the [project board](https://github.com/orgs/Kolonie-AI/projects/1). There are
no status labels.

**Issues for this repository live in this repository.** They did live in
`kolonie-docs` under an `area:website` label, and this file said so long after it
stopped being true; both trackers now hold website issues, and the ones in
`kolonie-docs` are the older half.

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
