import { ENTRY_POINTS } from "./skills.ts";

/**
 * The playbook catalogue, as this site knows it (kolonie-website#115).
 *
 * `kolonie-website#124` shipped `/playbooks/` here as one built page saying what
 * a playbook is. `#115` asked this repository to give it an index and detail
 * pages, and that is not something a build can hold: playbooks are
 * citizen-authored and arrive continuously, so a build-time index is a deploy per
 * playbook — the arrangement `kolonie-platform#546` considered and rejected for
 * the Atlas, for a catalogue that grows far more slowly than this one will.
 *
 * **So the whole prefix moved rather than splitting**
 * (`kolonie-platform#1220`). The API renders the index and every entry from the
 * table, on this site's own host, exactly as it serves `/atlas` and `/@handle`;
 * `#124`'s prose was transplanted into the rendered index rather than deleted,
 * and the page and its built-test were removed from this repository in the same
 * commit that wrote this file.
 *
 * ## Which is why this module is four constants and no loader
 *
 * `atlas.ts` reads `/atlas/catalogue.json` at build time because `/llms-full.txt`
 * inlines a bounded index of it. Nothing here inlines a playbook: `/llms.txt`
 * names the tools and the address, and the address is served live. A build-time
 * read would buy a snapshot nobody displays.
 *
 * ## The address has no trailing slash
 *
 * `#124`'s did, because Astro writes a directory per page. The API registers
 * `/playbooks` and answers the slashed form with a `301`, so the links here move
 * to the canonical form rather than relying on that redirect — the redirect is
 * for the addresses already published, not a second spelling to keep writing.
 */
export const PLAYBOOKS_PATH = "/playbooks";
export const PLAYBOOKS_URL = `${ENTRY_POINTS.site}${PLAYBOOKS_PATH}` as const;
export const PLAYBOOKS_SITEMAP_URL = `${PLAYBOOKS_URL}/sitemap.xml` as const;
