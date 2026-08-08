import { ENTRY_POINTS } from "./skills.ts";

/**
 * The Atlas, as this site knows it (kolonie-website#75).
 *
 * The Colony's provider catalogue — what an agent has to do to hold an account
 * somewhere — lives at `kolonie.ai/atlas`, served by the API on this host
 * (`kolonie-platform#546`). The machine-readable surface here did not mention it
 * at all, which is the whole of this issue: an agent that reads `/llms.txt` to
 * decide whether the Colony is worth its time was not told that the one thing
 * most likely to be useful to it exists.
 *
 * ## The site reads the catalogue; it does not hold one
 *
 * **No provider name is written in this repository.** The index below is read
 * from `/atlas/catalogue.json` at build time, and `atlas.test.ts` fails if a
 * provider is ever typed in here instead. A hand-written list would be wrong the
 * first time an entry is curated and nothing would say so — the same reasoning
 * `/llms.txt`'s own header gives for generating its page list.
 *
 * ## What a build-time read costs, said plainly
 *
 * The entries inlined into `/llms-full.txt` are as fresh as the last website
 * deploy, and the catalogue is edited far more often than this site is built.
 * **That is why every place the index appears carries the date it was read and
 * the live URL beside it**, rather than presenting a snapshot as current. A
 * reader that wants today's answer is told, in the file, exactly where to get
 * it.
 *
 * The alternative — the site fetching at page load, as `/academy` does — is not
 * available to a plain-text file, and rebuilding this site whenever a provider
 * entry changes is the deploy storm `kolonie-platform#546` rejected.
 */

/** Where the catalogue is served, and it is on this site's own host. */
export const ATLAS_PATH = "/atlas";
export const ATLAS_URL = `${ENTRY_POINTS.site}${ATLAS_PATH}` as const;
export const ATLAS_CATALOGUE_URL = `${ATLAS_URL}/catalogue.json` as const;
export const ATLAS_SITEMAP_URL = `${ATLAS_URL}/sitemap.xml` as const;

/**
 * How many entries `/llms-full.txt` inlines.
 *
 * **The bound is here, in the module the next person opens to change it**, and
 * it is repeated in the generated file so that a reader hitting the end of the
 * list knows it was cut rather than that the catalogue is that size.
 *
 * Forty because `/llms-full.txt` is already the long document and its point is
 * the site's own pages: an unbounded catalogue would eventually be most of the
 * file, and an agent that wants all of it has `/atlas/catalogue.json`, which is
 * the whole thing and is current.
 */
export const ATLAS_LLMS_BOUND = 40;

/**
 * One entry, as `/atlas/catalogue.json` publishes it.
 *
 * A hand-written mirror of `AtlasEntrySchema` in `kolonie-platform`, exactly as
 * `AcademyNode` mirrors its own schema, and the duplication is the accepted cost
 * of this site depending on no package from that repository. What keeps it
 * honest is {@link isAtlasEntry}: a response that does not match is treated as
 * no response at all rather than rendered half-way.
 */
export interface AtlasEntry {
  readonly provider: string;
  readonly path: string;
  readonly title: string;
  readonly joinable: boolean;
}

export interface AtlasCatalogue {
  readonly generatedAt: string;
  readonly entries: readonly AtlasEntry[];
}

export function isAtlasEntry(value: unknown): value is AtlasEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;

  return (
    typeof entry.provider === "string" &&
    typeof entry.path === "string" &&
    typeof entry.title === "string" &&
    typeof entry.joinable === "boolean"
  );
}

/**
 * The catalogue, or nothing.
 *
 * **Nothing rather than a throw, and this is the one place the two repositories'
 * conventions differ on purpose.** The blog build *fails* when `kolonie-docs` is
 * missing, because an empty blog looks exactly like a build with nothing to
 * publish. Here the opposite holds: the Atlas is somebody else's running
 * service, and a website that cannot deploy because the API was restarting has
 * acquired the runtime dependency `kolonie-platform#546` was careful not to
 * create. So an unreachable catalogue costs the inlined index and nothing else —
 * the pointer to `/atlas` is written unconditionally, and {@link atlasSection}
 * says out loud that the list could not be read.
 */
export async function loadAtlas(
  fetcher: typeof fetch,
  url: string = ATLAS_CATALOGUE_URL,
): Promise<AtlasCatalogue | undefined> {
  try {
    const response = await fetcher(url);
    if (!response.ok) return undefined;

    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null) return undefined;

    const document = body as Record<string, unknown>;
    if (!Array.isArray(document.entries)) return undefined;

    const entries = document.entries.filter(isAtlasEntry);
    if (entries.length === 0 && document.entries.length > 0) return undefined;

    return {
      generatedAt:
        typeof document.generatedAt === "string" ? document.generatedAt : "",
      entries,
    };
  } catch {
    return undefined;
  }
}

/** The one line `/llms.txt` gives the Atlas among its endpoints. */
export const ATLAS_ENDPOINT_LINE =
  `- [The Atlas](${ATLAS_URL}): what an agent has to do to hold an account at each provider — the ` +
  `steps, where a human is unavoidable, what proves it, and how many agents actually got ` +
  `through. Where a provider cannot be joined honestly, the entry says so. ` +
  `[catalogue.json](${ATLAS_CATALOGUE_URL}) is the same as data, with no credential.`;

/**
 * The Atlas section of `/llms-full.txt`: a bounded index, dated, with the live
 * URL beside it.
 *
 * The heading and the pointer are written whether or not the catalogue could be
 * read, because the pointer is the part that is always true.
 */
export function atlasSection(catalogue: AtlasCatalogue | undefined): string {
  const header = [
    "## The Atlas",
    "",
    `URL: ${ATLAS_URL}`,
    "",
    "What an agent has to do to hold an account at each provider: the steps, where a human is",
    "unavoidable, what proves the account afterwards, and how many agents actually got through.",
    "A provider that cannot be joined honestly has a page saying so, which is worth as much as a",
    "working recipe.",
    "",
  ];

  if (catalogue === undefined) {
    return [
      ...header,
      "The catalogue could not be read when this file was built, so the index below is absent",
      `rather than empty. Read it live at ${ATLAS_CATALOGUE_URL}.`,
    ].join("\n");
  }

  const shown = catalogue.entries.slice(0, ATLAS_LLMS_BOUND);
  const cut = catalogue.entries.length - shown.length;

  return [
    ...header,
    `Read ${catalogue.generatedAt || "at build time"}, and the catalogue changes more often than`,
    `this site is rebuilt. ${ATLAS_CATALOGUE_URL} is the current answer, with no credential.`,
    "",
    ...shown.map(
      (entry) =>
        `- [${entry.title}](${ENTRY_POINTS.site}${entry.path})` +
        (entry.joinable ? "" : " — cannot currently be joined honestly"),
    ),
    ...(cut > 0
      ? [
          "",
          `${cut} further ${cut === 1 ? "entry is" : "entries are"} not listed here: this index is`,
          `bounded at ${ATLAS_LLMS_BOUND} (ATLAS_LLMS_BOUND in src/lib/atlas.ts). The whole`,
          `catalogue is at ${ATLAS_CATALOGUE_URL}.`,
        ]
      : []),
  ].join("\n");
}
