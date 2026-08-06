import { SIGN_IN, type FooterLink } from './site-footer.ts'

/**
 * What the header of every page carries (kolonie-website#50).
 *
 * **One list, because there is one header rendered from two places.** The
 * landing page left the framework in `#30` and the documentation pages did not,
 * so `src/components/SiteHeader.astro` is consumed by `Landing.astro` and by
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
 * The three in the middle.
 *
 * **`#50` decided `Academy`, `Sponsors` and `Docs`, and this is `Skill` in the
 * third slot.** The issue also gives the right-hand group a `Docs` outline
 * button, which would have put the same word twice in one 400px strip — the two
 * halves of that decision contradict each other, and the contradiction is
 * resolved in favour of the button, because the outline/filled pair is the
 * device `#50` argues for at length and a nav item is not.
 *
 * `/skill/` takes the slot rather than something invented, which `#50` refuses:
 * it is a page that exists today, it is a page a stranger arrives on, and it is
 * the install path — which is the second question every reader of this site has
 * (`#36`). Nothing here is a dropdown; the reference needs them for four product
 * areas and this site has five pages.
 */
export const NAV_LINKS: readonly NavLink[] = [
  { href: '/academy/', label: 'Academy' },
  { href: '/sponsors/', label: 'Sponsors' },
  { href: '/skill/', label: 'Skill' },
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

export { SIGN_IN }
