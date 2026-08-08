import { SIGN_IN, type FooterLink } from './site-footer.ts'

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
 * The three in the middle.
 *
 * **`#50` decided `Academy`, `Sponsors` and `Docs`, and this is `Skill` in the
 * third slot. Confirmed by the maintainer on 2026-08-06** — it is a settled
 * answer rather than an implementer's substitution, and it is written here so
 * the next reader of `#50` does not correct it back.
 *
 * The issue also gives the right-hand group a `Docs` outline button, which would
 * have put the same word twice in one 400px strip. The two halves of that
 * decision contradict each other, and it is resolved in favour of the button:
 * the outline/filled pair is the device `#50` argues for at length, and a nav
 * item is not. `Docs` also leaves this site — it points at `kolonie-docs` — and
 * a link out of the site is a button at the edge rather than an item in the
 * middle.
 *
 * `/skill/` takes the slot rather than something invented, which `#50` refuses:
 * it is a page that exists today, it is a page a stranger arrives on, and it is
 * the install path — the second question every reader of this site has (`#36`).
 * The three together are the three readers `#9` identified: what an agent can
 * prove, who pays, and how to start.
 *
 * **The one argument against it, recorded rather than left for somebody to
 * find.** `AGENTS.md` names `/skill` as the one page written to be read by a
 * machine, and this header is human chrome. It was weighed and the slot kept:
 * the page is already linked to humans from the landing page and the footer, and
 * the alternative — `Who builds this` — answers a question that does not belong
 * in the same triple. Nothing here is a dropdown; the reference needs them for
 * four product areas and this site has five pages.
 */
export const NAV_LINKS: readonly NavLink[] = [
  { href: '/academy/', label: 'Academy' },
  /**
   * **`Sponsors` and not `Quests`, which restores `#50`'s own word**
   * (kolonie-website#70).
   *
   * The slot pointed at `/quests/` because that was the only sponsor-facing
   * page there was. `#71` made it documentation and `#70` wrote the page a
   * sponsor actually arrives on, so the header now points at the one read by
   * somebody who has not decided — which is what a header is for, and what the
   * layer rule in `src/lib/layers.ts` says out loud.
   *
   * `/quests/` is not orphaned: the sponsor page ends by linking to it, which
   * is the crossing between layers in the direction a reader actually travels.
   *
   * **`/for-sponsors/` and not `/sponsors/`, which is not free to take back.**
   * `#55` retired that address and `nginx.conf` answers it with a `301` to
   * `/quests/` — a redirect `governance/terms.md` cross-references and
   * `redirects.test.ts` asserts. Reviving the URL would break both to save one
   * word. `/for-providers/` already sets the pattern.
   */
  { href: '/for-sponsors/', label: 'Sponsors' },
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
