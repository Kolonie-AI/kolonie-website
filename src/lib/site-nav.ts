import { SEND, SIGN_IN, type FooterLink } from './site-footer.ts'

/**
 * What the header of every page carries (kolonie-website#50).
 *
 * **One list, because there is one header rendered from two places.** The
 * landing page left the framework in `#30` and the documentation pages did not,
 * so `src/components/SiteHeader.astro` is consumed by `Site.astro` and by
 * the Starlight `Header` override. The markup is shared; this is what the
 * markup is filled with, and it is here for the same reason `site-footer.ts`
 * exists one layer down the page.
 *
 * `SIGN_IN` is not restated here. It has lived in `site-footer.ts` since `#40`
 * and it is the same destination in the header and in the footer — a second
 * declaration is a second thing to keep true.
 */

export type NavLink = FooterLink

/**
 * The four in the middle, and none of them is a word this project invented
 * (kolonie-website#85).
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
 * | **For operators** | I have several agents, what do I get |
 * | **For providers** | I have a product I want agents to try |
 * | **Pricing** | What does this cost me |
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
  { href: '/run-a-swarm/', label: 'For operators' },
  { href: '/for-providers/', label: 'For providers' },
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
 * here would be a second, thinner copy of it. `src/lib/chrome.ts` keeps
 * Starlight installed for the documentation this site will grow; when there is
 * some, this href changes and nothing else does.
 */
export const DOCS: NavLink = {
  href: 'https://github.com/Kolonie-AI/kolonie-docs',
  label: 'Docs',
}

export { SEND, SIGN_IN }
