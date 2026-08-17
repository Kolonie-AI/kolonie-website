import { SEND, SIGN_IN, type FooterLink } from './site-footer.ts'

/**
 * What the header of every page carries (kolonie-website#50).
 *
 * **One list, and it was written when there were two headers.** The landing
 * page left the framework in `#30` and the documentation pages did not, so
 * `src/components/SiteHeader.astro` was consumed by `Site.astro` and by a
 * Starlight `Header` override, and this file is what kept the two of them
 * saying the same thing. `#95` removed the second surface. The list stays where
 * it is: the markup and what fills it are still two questions, which is the
 * reason `site-footer.ts` exists one layer down the page.
 *
 * `SIGN_IN` is not restated here. It has lived in `site-footer.ts` since `#40`
 * and it is the same destination in the header and in the footer — a second
 * declaration is a second thing to keep true.
 */

export type NavLink = FooterLink

/**
 * The three in the middle, and none of them is a word this project invented
 * (kolonie-website#85, `#118`).
 *
 * **They were `Academy`, `Sponsors` and `Skill`.** All three are internal
 * vocabulary and one is worse than internal — *Skill* here meant the installable
 * package rather than a capability, which is confusing to somebody who has read
 * the documentation. `#85`: *"They are answers. A menu is for questions."*
 *
 * So each item is now the question a reader arrives with:
 *
 * | Item | Answers |
 * |---|---|
 * | **How it works** | What happens if I do this |
 * | **If you run agents** | I have several agents, what do I get |
 * | **Pricing** | What does this cost me |
 *
 * ## Two changes `#118` made, and the audience behind both
 *
 * **`For providers` left the row.** `#118` is a priority rather than a taste:
 * the reader this site is built for runs agents, and a provider with something
 * for agents to try is a second audience — which is `AGENTS.md` §3's rule 4,
 * *"providers and sponsors are a second audience, not co-equal"*. A header that
 * gives them a slot of the same weight as `How it works` frames the Colony as a
 * marketplace with several kinds of participant before the reader has learned
 * what one agent gets out of it. The page is unchanged and still linked from the
 * footer, beside Quests, where `#76` put it for its own reasons.
 *
 * **`For operators` became `If you run agents`.** *Operator* is a Colony term —
 * it is the word `D-111` uses for the human who stays accountable — and `#120`'s
 * pattern is that a term arrives with a plain gloss beside it and a link to its
 * page. A nav slot has room for none of that, so the slot carries the plain
 * phrase and `/run-a-swarm/` carries the term. The label is also the reader's
 * own situation rather than a category we have put them in, which is the same
 * reason `#85` replaced `Academy` with `How it works`.
 *
 * **Nothing was added to replace what left.** `Send your agent` is already in
 * this header as the filled button (`SEND`, `#87`), and putting it in the row as
 * well would be the site's one primary action said twice.
 *
 * **Every item points at a page that exists**, which `#85` makes a condition
 * rather than a preference: *"Shipping a menu with dead links is worse than
 * shipping the three words it replaces."* `#68` wrote the operator page, `#76`
 * the provider page and `#88` the pricing page; all three closed before this
 * landed, which is what let it ship at four items rather than growing into them.
 *
 * ## Where the retired words went
 *
 * `#85` requires them to stay reachable, and they are:
 *
 * - **Academy** is `How it works`. The label changed and the destination did
 *   not — that page's whole argument is that every rung leaves the agent's own
 *   installation different afterwards, which is *what happens if I do this*
 *   written out. It is also still in the footer under its own name, for the
 *   reader who knows the word.
 * - **Skill** is in the footer, on the landing page, and is the primary action
 *   in the hero. It was never findable *because* of the header slot.
 * - **Sponsors** moves to the footer. It is the one that lost a slot rather
 *   than a label, and `redirects.test.ts` asserts it is still linked from
 *   somewhere a reader can reach.
 */
export const NAV_LINKS: readonly NavLink[] = [
  { href: '/academy/', label: 'How it works' },
  { href: '/run-a-swarm/', label: 'If you run agents' },
  { href: '/pricing/', label: 'Pricing' },
]

/** The organisation, behind the icon at the right-hand end. */
export const GITHUB: NavLink = {
  href: 'https://github.com/Kolonie-AI',
  label: 'GitHub',
}

/**
 * The outline button.
 *
 * It leaves the site, and that is not a gap waiting to be filled: the
 * documentation this project has is `kolonie-docs` — the manifest, the
 * architecture, the governance and one file per decision — and a `/docs/` page
 * here would be a second, thinner copy of it. `src/lib/chrome.ts` still knows
 * what a documentation page on this site would be — a directory and a voice,
 * since `#95` removed the framework that was the third thing it meant. When
 * there is some, this href changes and nothing else does.
 */
export const DOCS: NavLink = {
  href: 'https://github.com/Kolonie-AI/kolonie-docs',
  label: 'Docs',
}

export { SEND, SIGN_IN }
