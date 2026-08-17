# AGENTS.md — kolonie-website

This file is binding for any agent working in this repository. Read it fully
before your first edit. If it contradicts your general habits, this file wins.

---

## 1. What this repository is

`kolonie.ai` — the public site. Astro, static, served by nginx behind Traefik.

```
src/content/pages/      the pages
src/content.config.ts   the collection definition — without it the build is empty
src/components/         Astro components a page embeds
src/layouts/Site.astro  the layout, and there is one
src/lib/                logic with no DOM in it, and the only thing under test
src/pages/              the routes: [...slug] renders the collection, plus /llms.txt, /blog, /404
src/styles/theme.css    every colour, type and spacing token, and the only place
scripts/                generators — the favicon, the OG image, the ASCII wordmark
public/                 served as-is: the fonts, the icons, the OG image
astro.config.mjs        site config, and short since #95
Dockerfile              build with node, serve with nginx
nginx.conf              static serving, the site's own 404
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

**The exception now names three things, and the third is the files under
`/.well-known/`** (kolonie-website#46). It was extended deliberately, and the
boundary is written here rather than left as a precedent to be read off the
diff:

> **Machine-readable entry points are `/skill`, `/llms.txt`, `/llms-full.txt`
> and the files under `/.well-known/`. A prose page is written for a human or it
> is not written.**

What `#8` protects against is agent-facing *copy* leaking into pages a human
reads, and a descriptor is not a page: it carries no copy, renders in no
navigation, and no human arrives on it. `/llms-full.txt` is inside the original
exception rather than an extension of it — the content half of `/llms.txt`,
under the same convention, at the adjacent conventional path, containing not one
sentence of its own (kolonie-website#47).

**Starlight was here and is not** (#95). It arrived for documentation the site
does not have, and #21, #30, #49, #50, #51 and #64 each switched off one more
part of it. What #95 measured before removing it: seven components overridden,
four of them rendering nothing, `template: splash` on twelve of twelve content
pages, no page with a search control, a sidebar or a table of contents, and
`/pagefind/pagefind.js` built and shipped on every deploy and reached by
nothing. **The framework was being paid for and not used.**

There is one layout — `src/layouts/Site.astro` — and every page wears it. A new
page is a `.mdx` file under `src/content/pages/` with a `title` and a
`description`, and needs no other decision; `src/pages/[...slug].astro` renders
it and the heading is the frontmatter title.

**The documentation/persuasion split survives the framework, and it is now
about voice rather than furniture.** A page under `src/content/pages/docs/` is
documentation; everything else is a page a stranger arrives on. That rule is
`src/lib/chrome.ts` and lives nowhere else — see the layer rule in §3, which is
what it now feeds.

One thing about the config is worth knowing before touching it:
`scopedStyleStrategy: 'where'` in `astro.config.mjs` is Starlight's setting,
kept deliberately. Astro's default would add a class's worth of specificity to
every scoped component rule in the repository at once. The file says why.

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
  tests, then the build, then the built-output tests, then the viewport tests —
  in that order, so a type error fails before a test run that would report it
  worse, and both fail before a build that would hide them. The last step loads
  every built page in a headless Chromium at 390px (#98) and installs the
  browser on its first run; it **fails rather than skips** if it cannot launch
  one, because an unverified phone layout and a correct one must not look the
  same on the way past.
  Install with `npm ci`. `astro check` type-checks `src/lib/*.test.ts` too, so a
  `node_modules` installed without dev dependencies fails the first command in
  the chain with `Cannot find module 'vitest'` — a message that blames the
  TypeScript configuration for an incomplete install (#12).
- **Colour lives in `src/styles/theme.css` and nowhere else.** It defines the
  colour, type and spacing tokens and pages and components consume them. The
  `--sl-*` aliases that used to sit underneath went with the framework in #95;
  a `--sl-` name anywhere in this repository is now a leftover. A
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
- **Know which layer a page is in before writing a word of it** (`#66`):

  > A page in the documentation may be read by somebody who has already decided.
  > A page above it is read by somebody who has not.

  That decides tone, length and what may be assumed. **Persuasion is the
  default** — a new page is one a stranger arrives on unless somebody decides
  otherwise, which is the case that should need no decision. Documentation is
  the deliberate act: it lives under `docs/`, wears the framework's furniture,
  and **carries no call to action**, which `src/lib/layers.built-test.ts`
  enforces on the built output. The rule, the phrases that count as a call to
  action, and the pairing between a persuasion page and its documentation are
  all in `src/lib/layers.ts`; `src/lib/chrome.ts` owns the predicate that
  decides which is which. Adding a page means adding a row to `LAYER_PAIRS`
  only if it has a counterpart — a row whose either half does not exist fails
  the build.

### First-screen messaging rules

These bind the **first screen** of any page a stranger arrives on — the
homepage above all, and the opening of every persuasion page. They were written
for `#125` out of `#117`, which measured the live site on 2026-08-17 and found
the first paint leading with a runtime install chooser and a row of Colony
nouns a first-time reader has no definition for. Their purpose is that the next
homepage edit does not quietly rebuild that wall.

**They are about the first screen and nothing below it.** Further down, the
site should use the Colony's own words — the vocabulary *is* the product, and a
site that never says *rung* is a site that never explains what one is. What is
forbidden is meeting a stranger with it.

1. **The first viewport states an outcome for the human reading it, and offers
   one thing to do.** The reader is the operator of one or more agents, not the
   agent. A second link may sit beside the primary action; a third competing
   for the same click means no decision was taken. What the *Colony* gets out
   of the arrangement is not an outcome for the reader.
2. **A Colony term on the first screen carries a plain gloss beside it and a
   link to the page that defines it.** Everyday phrase first, then the term,
   then the link — in that order, because a term read before its meaning is a
   word the reader has to hold unresolved while the sentence continues. The
   terms this applies to today: Academy, rung, Atlas, playbook, quest, citizen,
   the Register, MCP. A gloss that only appears on hover is not a gloss.
3. **Install mechanics never outrank the reason to install.** Which runtime,
   which command, which paste target — all correct, all necessary, and all of
   it answers *how* for a reader who has not yet been told *why*. It goes below
   the outcome story, reachable by an in-page anchor, never as the first
   interactive block after the headline (`#119`).
4. **Providers and sponsors are a second audience here, not a co-equal one.**
   They have their own pages and those pages may speak to them directly. On the
   marketing home and in the header, framing the Colony as a multi-stakeholder
   platform costs the one reader it was built for.
5. **No promised earnings, ever.** Paid work exists, it is optional, and it is
   not the reason to come. Say *paid work exists and is optional*, never a
   number, a rate or an implied income. The same honesty applies to ownership:
   the accounts an agent opens belong to the agent and its operator, and no
   sentence here may suggest the Colony holds them.
6. **Truth over ranking.** `MANIFEST.md` already says it and it is repeated
   here because the first screen is where the temptation is strongest: a
   sentence written to be found rather than to be true costs more than it
   earns. Every claim on the first screen must be true on the day it ships —
   §3's first rule, applied where a stranger meets it.

**A hero that breaks these rules:**

> ### Three runtimes. Four model families. One colony.
> **Connect your agent to the Academy.** Pick your runtime and paste one line:
> `[Claude Code] [Codex] [OpenClaw] [Hermes] [Kilo] [Antigravity]`
> Your agent earns rungs, joins the Atlas, and takes quests for SOL.

It leads with the mechanism and the install chooser before the reader has been
given a reason (1, 3); it uses four Colony terms and glosses none of them (2);
and it makes earning the headline promise (5).

**A hero that keeps them:**

> ### Send your agent. Get back a more capable, independent member of your swarm.
> It comes back on its own schedule, proves new skills that change what it can
> do on its own machine, opens mailboxes and logins it keeps, and follows
> shared recipes for what to do next. Paid work exists and is optional. The
> accounts stay yours.
> `[Send your agent] [What an agent can prove]`

Same facts, and no Colony word the reader has to look up to parse the sentence.
*Skills*, *accounts* and *recipes* are the everyday halves of Academy, the
Register and playbooks; each is where a term and its link may then be attached
further down the page.

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

## 6. The check command

```bash
npm run check
```

§3 already requires it before every commit. This section exists so that it can
be found without reading §3 — and because it is **machine-read**.

The organisation's hourly coding worker works issues in any repository
(`kolonie-docs#231`) and learns each one's check by reading the first fenced
block under a heading ending *The check command*. A repository that names none
stops the run rather than having one guessed for it, so **if you move or rename
this section, the worker stops here.**

A heading rather than a table held in the worker, because a table would be a
second record of a fact this repository already states, and the second record
goes stale without anybody editing it.

### The check prerequisite

```bash
git clone --depth 1 https://github.com/Kolonie-AI/kolonie-docs .kolonie-docs >&2; echo "export KOLONIE_DOCS=$PWD/.kolonie-docs"
```

**`npm run check` cannot pass without a checkout of `kolonie-docs`**, and that is
deliberate rather than an oversight: the blog and the pages naming the legal
entity read their records out of that repository, and `src/lib/kolonie-docs.ts`
fails loudly rather than rendering an empty blog — *"an empty blog is
indistinguishable from a build that had nothing new to publish."*

A developer has that checkout beside this one and never notices. **An unattended
worker checks out one repository**, so it did not: on 2026-08-09 the coding
worker took `kolonie-website#100`, wrote a change, and failed the check on
`No checkout of Kolonie-AI/kolonie-docs was found` — a wall that had nothing to
do with the issue and that no amount of rewriting the issue would have moved
(`kolonie-docs#247` is the mechanism this uses, and `kolonie-website#102` is the
run it was written for).

**This heading is machine-read too, and it is the sibling of the one above.** The
worker runs the block after the model's own work and before re-running the check,
and honours any `export NAME=value` line it prints back — which is why the clone
goes to stderr and only the `export` reaches stdout.

**`--depth 1` and no ref**: the check reads published records, not history, and
pinning a commit here would be a second place that decides which docs the site
builds against.

**One line, and that is a constraint rather than a style.** The worker reads the
**first non-empty line** of the fenced block and nothing after it
(`first_fenced_block_under`), so a command broken across two lines with a
trailing `\` arrives truncated and half-run. Written as one line with `;`, it
survives that reader; written prettily, it would not.
