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
- **A green build is not a working site.** Astro emits an empty site without
  complaint if the content collection is misconfigured — that is what
  `src/content.config.ts` is for, and why CI asserts that `dist/index.html`
  exists and mentions the Colony. Keep that assertion.
- **No secrets, no host names, no IPs.** The VPS address is a standing red line
  across every repository in this organisation.

## 4. Deployment

Push to `main` builds `ghcr.io/kolonie-ai/kolonie-website` through
`.github/workflows/build-image.yml`, path-filtered so a README change does not
rebuild an image.

Two things are needed once, before the site actually serves:

1. `kolonie-infra` needs read access to the package under **Manage Actions
   access**, the same grant the `api` and `verifier-runner` images required.
2. `detect_profile()` in `kolonie-infra/scripts/deploy.sh` needs
   `--profile website`. The website deliberately sits outside the `full`
   profile, because `docker compose pull` fails the entire command for one
   missing image and this image did not exist — it took the two working images
   down with it once already.

Until both are done the image builds and `kolonie.ai` keeps answering 502. That
is expected, not a fault.

## 5. Confirm with the maintainer before

- Changing anything about the domain, DNS, or Cloudflare
- Publishing claims about the legal entity, the treasury, or the coin
- Making this repository public — it opens together with the others at MVP, not
  before
