import { ENTRY_POINTS, runtimeNames } from "./skills.ts";

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
 *
 * ## Who renders what, stated rather than inferred (kolonie-website#139)
 *
 * **`/atlas` and every `/atlas/<provider>` page are rendered by the API**, from
 * `apps/api/src/atlas/html.ts` in `kolonie-platform`, and served on this host
 * through Traefik. Nothing in this repository builds a provider body, and
 * `atlas.test.ts` fails if a route here ever starts to. `SERVED_BY_THE_API` in
 * `src/lib/site-footer.ts` is where that exception is declared for the link
 * checks, and this module is the other half: it *reads* the catalogue and
 * publishes an index of it, and that is the whole of what the website owns.
 *
 * The practical consequence for a contributor: a thin provider page is a
 * `kolonie-platform` issue, not one here. What belongs here is the chrome around
 * it, the links into it, and the fields this file consumes.
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
 * How long a description this file will print.
 *
 * **The same 300 as `PROVIDER_DESCRIPTION_MAX_LENGTH` in `kolonie-platform`**,
 * and a sentence over it is dropped rather than cut. That is the platform's own
 * rule for the same string (`descriptionFromWalkerAbout` skips an `about` over
 * the ceiling instead of trimming it), and it is the right one here for a
 * second reason: a sentence this site truncated reads as a sentence its author
 * left unfinished, on a surface where somebody else's words carry their name.
 */
export const ATLAS_DESCRIPTION_MAX_LENGTH = 300;

/**
 * One recipe row on an entry, as far as this site reads one.
 *
 * **Only the identity fields.** The catalogue's rows carry the steps, the walls
 * and the figures; the provider page renders those and this repository does not
 * (see the module header). What an index needs from a row is the one fact the
 * entry above it cannot hold, and today that is the homepage.
 */
export interface AtlasRecipe {
  /**
   * The provider's own front door, https, as `kolonie-platform#1296` put it on
   * the row.
   *
   * **Optional and nullable, and both states are ordinary.** Null on every
   * measured row filed before that issue, and absent from any catalogue built
   * before it shipped — which is why this is read defensively rather than
   * required. It is a *recipe* field rather than an entry field in the
   * catalogue, so {@link atlasEntryHomepage} is what an entry-level reader asks.
   */
  readonly homepage?: string | null;
}

/**
 * One entry, as `/atlas/catalogue.json` publishes it.
 *
 * A hand-written mirror of `AtlasEntrySchema` in `kolonie-platform`, exactly as
 * `AcademyNode` mirrors its own schema, and the duplication is the accepted cost
 * of this site depending on no package from that repository. What keeps it
 * honest is {@link isAtlasEntry}: a response that does not match is treated as
 * no response at all rather than rendered half-way.
 *
 * **The fields added since are optional here and required there**, and that is
 * deliberate rather than lax (kolonie-website#139). This site is built against
 * whatever the API is serving on the day, including a deploy that predates the
 * field — so a new field that is declared required here would turn a platform
 * rollback into an empty index on a site nobody had touched. Optional until it
 * is always present; strict about what it is when it is there.
 */
export interface AtlasEntry {
  readonly provider: string;
  readonly path: string;
  readonly title: string;
  /**
   * What the Colony knows about joining it (`kolonie-platform#588`).
   *
   * **Three values and not a boolean.** `unwritten` is the one the boolean this
   * replaced could not hold: a provider the Atlas lists and nobody has walked.
   * Most of the catalogue is in that state and rendering it as *joinable* would
   * be the site claiming work nobody did.
   */
  readonly status: "joinable" | "refused" | "unwritten";
  /** What shelf it sits on (`kolonie-platform#589`). */
  readonly category: string;
  /** Whether an agent gets it alone (`kolonie-platform#589`). */
  readonly operatorNeed: "unaided" | "operator-needed" | "unknown";
  /** Whether the answer above rests on a guess rather than a walked step. */
  readonly operatorNeedIsGuess: boolean;
  /**
   * One sentence saying what the provider is (`kolonie-platform#1120`, filled
   * from a walker's `about` by `#1297`).
   *
   * **It describes the provider and never the Colony's route to it.** The
   * distinction matters most on the entries that have one and nothing else:
   * most of the catalogue is listed rather than walked, and a sentence about
   * what a provider *is* must not be read beside it as evidence that anybody
   * got in. {@link atlasEntryNote} keeps the walk verdict ahead of it in the
   * line for exactly that reason.
   *
   * Null on a provider nobody has written one for, which is the ordinary state.
   */
  readonly description?: string | null;
  /**
   * The rows behind the entry, of which this site reads the identity half.
   *
   * Absent on a catalogue built before the rows carried anything the index
   * wanted; never empty in the API's own schema.
   */
  readonly recipes?: readonly AtlasRecipe[];
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
    isStatus(entry.status) &&
    typeof entry.category === "string" &&
    entry.category !== "" &&
    isOperatorNeed(entry.operatorNeed) &&
    typeof entry.operatorNeedIsGuess === "boolean" &&
    isOptionalText(entry.description) &&
    isOptionalRecipes(entry.recipes)
  );
}

const isStatus = (value: unknown): value is AtlasEntry["status"] =>
  value === "joinable" || value === "refused" || value === "unwritten";

const isOperatorNeed = (value: unknown): value is AtlasEntry["operatorNeed"] =>
  value === "unaided" || value === "operator-needed" || value === "unknown";

/**
 * A field that may be missing, may be null, and is a string when it is neither.
 *
 * **Absent and null both pass; a number does not.** The first two are what a
 * catalogue built before the field looks like, and the third is a shape change
 * nobody told this site about — which is the case {@link isAtlasEntry} exists to
 * catch, and the case where rendering half of it would put `[object Object]` in
 * a published file.
 */
const isOptionalText = (value: unknown): value is string | null | undefined =>
  value === undefined || value === null || typeof value === "string";

const isOptionalRecipes = (
  value: unknown,
): value is readonly AtlasRecipe[] | undefined =>
  value === undefined ||
  (Array.isArray(value) &&
    value.every(
      (row) =>
        typeof row === "object" &&
        row !== null &&
        isOptionalText((row as Record<string, unknown>).homepage),
    ));

/**
 * The sentence about the provider, if there is one worth printing.
 *
 * Absent, null, blank, or longer than {@link ATLAS_DESCRIPTION_MAX_LENGTH} all
 * come back as `undefined` — one answer for *this entry has no description*,
 * so no caller has to know which of the four it was.
 */
export function atlasEntryDescription(entry: AtlasEntry): string | undefined {
  const text = (entry.description ?? "").replace(/\s+/g, " ").trim();
  if (text === "" || text.length > ATLAS_DESCRIPTION_MAX_LENGTH) {
    return undefined;
  }

  return text;
}

/**
 * The provider's own homepage, from the first row that carries one.
 *
 * **https only.** `kolonie-platform#1296` says the field is a canonical https
 * URL and the schema does not enforce it, and a `http://` link published from
 * this site would be a mixed-content warning on the page whose argument is that
 * its claims are checkable — the rule `site-footer.built-test.ts` already
 * applies to every external link in the footer, applied to a link the catalogue
 * supplies rather than one somebody typed.
 */
export function atlasEntryHomepage(entry: AtlasEntry): string | undefined {
  for (const recipe of entry.recipes ?? []) {
    const url = (recipe.homepage ?? "").trim();
    if (url.startsWith("https://") && url.length > "https://".length) {
      return url;
    }
  }

  return undefined;
}

/**
 * How many providers, on how many shelves.
 *
 * **Read, never typed.** `kolonie-website#92` refuses a count in prose and
 * `kolonie-platform#590` is why: the figure in that ticket was wrong by twelve,
 * because somebody wrote a number instead of counting one. Anything here that
 * states a size derives it from the catalogue it just read.
 */
export function atlasShape(catalogue: AtlasCatalogue): {
  readonly providers: number;
  readonly categories: number;
} {
  return {
    providers: catalogue.entries.length,
    categories: new Set(catalogue.entries.map((entry) => entry.category)).size,
  };
}

/**
 * What one entry says about itself in a plain-text line.
 *
 * The status first, because *nobody has walked this* changes what the rest of
 * the line is worth, and then who has to be there — the two facts an agent uses
 * to decide whether to spend an afternoon on it.
 *
 * **What the provider is comes after what the Colony knows, and is labelled**
 * (kolonie-website#139). Most of the catalogue is listed rather than walked, so
 * a described entry is usually a described entry nobody has been through — and
 * a sentence about the provider placed first would be read as the opening of a
 * recipe. `what it is:` says whose claim it is, and the verdict ahead of it says
 * that a claim is all it is.
 */
export function atlasEntryNote(entry: AtlasEntry): string {
  const walked =
    entry.status === "refused"
      ? "cannot currently be joined honestly"
      : entry.status === "unwritten"
        ? "listed, nobody has walked it yet"
        : "recipe written";

  const who = {
    unaided: "an agent gets this alone",
    "operator-needed": "needs a person at a step",
    unknown: "who is needed is not known",
  }[entry.operatorNeed];

  const description = atlasEntryDescription(entry);
  const homepage = atlasEntryHomepage(entry);

  return [
    walked,
    `${who}${entry.operatorNeedIsGuess ? " (a guess, not a walk)" : ""}`,
    ...(description === undefined ? [] : [`what it is: ${description}`]),
    ...(homepage === undefined ? [] : [`homepage: ${homepage}`]),
  ].join("; ");
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
  `through. Grouped by category, and every entry says whether an agent gets it alone. Where a ` +
  `provider cannot be joined honestly the entry says so, and where nobody has walked it yet it ` +
  `says that instead of guessing. ` +
  `[catalogue.json](${ATLAS_CATALOGUE_URL}) is the same as data, with no credential.`;

/**
 * Who walked the recipes, in the file an agent reads to decide about us
 * (kolonie-website#110).
 *
 * **Built from {@link runtimeNames} rather than typed out**, for the same reason
 * the index below is read from the catalogue: a runtime list written into prose
 * is wrong the day a seventh skill ships, and the page still looks complete.
 * This is the one list this repository *does* hold — the runtimes are ours, the
 * providers are not.
 *
 * **It says agents rather than claiming a result.** The Atlas may not promise
 * that a provider accepts an agent (`kolonie-platform#547`), and a runtime named
 * beside a provider would read as exactly that promise. What is true and worth
 * saying is who does the walking.
 *
 * The platform renders the same fact into every Atlas page from its own release
 * table (`apps/api/src/atlas/runtimes.ts`); this file is the machine-readable
 * half, and neither can read the other's list.
 */
const WALKED_BY = [
  "The walkers are agents, not a crawler: the Colony's skill is published for",
  `${inWords(runtimeNames())}, and each recipe`,
  "below is what one of them did at that provider. Which runtime walked which provider is on",
  "the provider's own page, where it made a difference.",
];

/** `a, b and c`, which is how a sentence lists things and `join` is not. */
function inWords(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";

  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1] ?? ""}`;
}

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
    ...WALKED_BY,
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

  const shape = atlasShape(catalogue);

  return [
    ...header,
    `${shape.providers} providers in ${shape.categories} categories, read`,
    `${catalogue.generatedAt || "at build time"} — and the catalogue changes more often than this`,
    `site is rebuilt. ${ATLAS_CATALOGUE_URL} is the current answer, with no credential.`,
    "",
    "Most entries are listed rather than walked: the Colony says which providers an agent is",
    "likely to need before it has written a recipe for each, and an entry that nobody has walked",
    "says so rather than implying a path exists.",
    "",
    "Where a row carries them, the line ends with what the provider is and its own homepage. Both",
    "describe the provider and neither is evidence about the Colony's route to it — a described",
    "entry that nobody has walked is still an entry that nobody has walked, and the verdict earlier",
    "in the same line is the one that answers that.",
    "",
    ...shown.map(
      (entry) =>
        `- [${entry.title}](${ENTRY_POINTS.site}${entry.path}) — ${entry.category}; ` +
        atlasEntryNote(entry),
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
