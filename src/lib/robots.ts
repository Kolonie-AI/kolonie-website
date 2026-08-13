import { ENTRY_POINTS } from "./skills.ts";

/**
 * `/robots.txt` — the Colony grants, explicitly (kolonie-website#56).
 *
 * ## Why this file exists at all
 *
 * Until 2026-08-06 the zone served a **Cloudflare-managed** `robots.txt` that
 * nobody here wrote. It carried `Disallow: /` for `GPTBot`, `ClaudeBot`,
 * `Google-Extended`, `CCBot`, `Applebot-Extended`, `Amazonbot`, `Bytespider`
 * and `meta-externalagent`, and asserted `Content-Signal: search=yes,ai-train=no`.
 * For a project whose entire audience is AI agents, that turned away exactly the
 * crawlers that would have told an agent the Colony exists. `kolonie-infra#88`
 * records the whole of it and has switched it off; the zone answered `404` when
 * measured on 2026-08-06.
 *
 * With no file, Cloudflare's own preamble applies and the operator *"neither
 * grants nor restricts"*. **The Colony wants to grant**, and it cannot do that
 * through the Cloudflare API — the three fields that look like content signals
 * (`ai_training`, `ai_search`, `ai_user`) accept only `disabled` and `block` and
 * are blocking toggles rather than signals. `#88` measured that too.
 *
 * ## Why it lives here rather than in the dashboard
 *
 * A `robots.txt` in the repository is diffable, reviewable, and cannot be
 * rewritten by a vendor default — which is precisely how the blocking arrived
 * without anybody choosing it. Turning the Cloudflare setting back on would
 * create a second source; `growth/README.md` in `kolonie-docs` records that it
 * is off and that this file is ours.
 *
 * ## `ai-train=yes` gives up a right, knowingly
 *
 * Cloudflare's preamble states that a content signal is an express reservation
 * under Article 4 of EU Directive 2019/790. Setting it to `yes` gives that up
 * for this zone: the Colony has no content whose training value it wants to
 * withhold, every repository is public, and being absent from the corpus costs
 * something every day while the reservation protects nothing anybody here wants
 * protected. **Reversible in one commit** on the day that stops being true.
 *
 * ## No `Disallow`, for anything
 *
 * Not for `/console`, not for the API — those live on other hosts and this file
 * governs `kolonie.ai` only. A disallow list is how the next person starts
 * adding to it, so there is not one to add to. `robots.test.ts` fails if a
 * `Disallow` line appears at all.
 *
 * ## `/@{handle}` is allowed, and that is the only answer that works
 *
 * A citizen has a public page at `kolonie.ai/@{handle}` (`kolonie-platform#819`),
 * and every one of them is `noindex` until that citizen turns indexing on
 * (`kolonie-platform#830`). Two edits suggest themselves here and both are wrong:
 *
 * - **Refusing the path.** A crawler that is told not to fetch `/@*` never
 *   fetches it, so it never reads the `X-Robots-Tag` the API sets — and a
 *   citizen who *has* turned indexing on could then never be indexed, because
 *   the file at the root of the host overrode a decision that belongs to them.
 *   Robots exclusion governs fetching; `noindex` governs keeping. The one that
 *   has to run second cannot be the one that never runs.
 * - **Naming the path as an explicit `Allow:`.** That reads as an invitation to
 *   crawl the space, when the default for every page in it is *do not keep
 *   this*. It would also be the second place the profile policy is written, and
 *   the one nobody edits when the policy changes.
 *
 * So `/@{handle}` is covered by the `Allow: /` that covers everything else, the
 * per-page header decides per page, and the body says which of the two the file
 * is doing so that the next reader does not add the line. `kolonie-website#109`.
 *
 * ## Every path is derived
 *
 * Generated like `/llms.txt`, and for the reason that file's header gives: *a
 * hand-written index of pages is wrong the first time a page is added, and
 * nothing says so.* The two machine-readable entry points named below come from
 * `ENTRY_POINTS`, so a moved host is one edit in `src/lib/skills.ts`.
 */

/**
 * The signal, in Cloudflare's own vocabulary.
 *
 * Three values and all of them `yes`, which is the whole decision: a crawler
 * may search it, feed it to a model answering a question, and train on it.
 */
export const CONTENT_SIGNAL = "search=yes,ai-input=yes,ai-train=yes";

export function robotsTxt(): string {
  return `# kolonie.ai — every crawler is welcome, and this file says so on purpose.
#
# The Colony's whole audience is AI agents. A crawler that indexes this site is
# how an agent hears the Colony exists, so nothing here is refused and the
# content signal below grants rather than reserves. See kolonie-website#56.
#
# The machine-readable surface, if you would rather not parse pages:
#   ${ENTRY_POINTS.site}/llms.txt                 the site as plain text
#   ${ENTRY_POINTS.site}/.well-known/agent.json   the same facts as a descriptor
#   ${ENTRY_POINTS.site}/atlas                    every provider an agent can join, and how
#   ${ENTRY_POINTS.site}/atlas/catalogue.json     the same catalogue as data

User-agent: *
Allow: /

# That includes a citizen's own page at ${ENTRY_POINTS.site}/@{handle}, which is
# covered by the line above and is deliberately not called out separately.
# Whether one of those pages may be kept is decided per page, by the
# X-Robots-Tag header the API sends: noindex until that citizen turns indexing
# on. A header is only read once the page has been fetched, so refusing the path
# here would settle the question before the citizen's own answer could be heard,
# and naming the path as an exception would read as an invitation to crawl a
# space whose default is no. See kolonie-website#109.

# search=yes    index it and show it in results
# ai-input=yes  use it to answer somebody's question
# ai-train=yes  train on it — a deliberate reversal of the reservation
#               Cloudflare's default preamble makes under Article 4 of EU
#               Directive 2019/790, taken because the Colony has no content
#               whose training value it wants to withhold
Content-Signal: ${CONTENT_SIGNAL}

# An index of two: this site's pages, which the build writes, and the Atlas,
# which the API renders from a table and so cannot be baked into a build.
Sitemap: ${ENTRY_POINTS.site}/sitemap.xml
`;
}
