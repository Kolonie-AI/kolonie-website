import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ATLAS_CATALOGUE_URL,
  ATLAS_DESCRIPTION_MAX_LENGTH,
  ATLAS_ENDPOINT_LINE,
  ATLAS_LLMS_BOUND,
  ATLAS_PATH,
  ATLAS_URL,
  atlasEntryDescription,
  atlasEntryHomepage,
  atlasEntryNote,
  atlasSection,
  atlasShape,
  loadAtlas,
  type AtlasCatalogue,
  type AtlasEntry,
} from "./atlas.ts";
import { SERVED_BY_THE_API } from "./site-footer.ts";
import { runtimeNames } from "./skills.ts";

const entry = (
  provider: string,
  over: Partial<AtlasEntry> = {},
): AtlasEntry => ({
  provider,
  path: `/atlas/${provider}`,
  title: provider,
  status: "joinable",
  category: "code-hosting",
  operatorNeed: "unaided",
  operatorNeedIsGuess: false,
  ...over,
});

const answering = (body: unknown, ok = true): typeof fetch =>
  (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

/**
 * The Atlas on the machine-readable surface (kolonie-website#75).
 *
 * Until this existed, an agent reading `/llms.txt` to decide whether the Colony
 * was worth its time was not told that the one thing most likely to be useful to
 * it — how to actually get an account somewhere — exists at all.
 */
describe("reading the catalogue", () => {
  it("takes the entries the Colony published", async () => {
    const catalogue = await loadAtlas(
      answering({
        generatedAt: "2026-08-08T00:00:00.000Z",
        entries: [entry("github")],
      }),
    );

    expect(catalogue?.entries).toHaveLength(1);
    expect(catalogue?.generatedAt).toBe("2026-08-08T00:00:00.000Z");
  });

  /**
   * A response that does not match the shape is no response at all, rather than
   * something rendered half-way — the rule `AcademyNode` already follows.
   */
  it("treats a response of the wrong shape as no answer", async () => {
    expect(
      await loadAtlas(answering({ entries: [{ nonsense: true }] })),
    ).toBeUndefined();
    expect(await loadAtlas(answering({ nothing: "here" }))).toBeUndefined();
  });

  it("treats a refusal as no answer", async () => {
    expect(await loadAtlas(answering({ entries: [] }, false))).toBeUndefined();
  });

  /**
   * **A website that cannot deploy because the API was restarting has acquired
   * the runtime dependency `kolonie-platform#546` was careful not to create.**
   */
  it("does not throw when the catalogue is unreachable", async () => {
    const refusing = (async () => {
      throw new Error("connect ECONNREFUSED");
    }) as unknown as typeof fetch;

    expect(await loadAtlas(refusing)).toBeUndefined();
  });

  /**
   * **The fields `kolonie-platform#1296` and `#1297` added are optional here and
   * required there** (kolonie-website#139). This site is built against whatever
   * the API is serving on the day, so an entry that predates a field has to
   * survive the read — otherwise a platform rollback empties the index of a site
   * nobody touched.
   */
  it("takes an entry that predates description and the recipe rows", async () => {
    const catalogue = await loadAtlas(
      answering({
        generatedAt: "2026-08-08T00:00:00.000Z",
        entries: [
          {
            provider: "somewhere",
            path: "/atlas/somewhere",
            title: "Somewhere",
            status: "unwritten",
            category: "mailbox",
            operatorNeed: "unknown",
            operatorNeedIsGuess: true,
          },
        ],
      }),
    );

    expect(catalogue?.entries).toHaveLength(1);
    expect(catalogue?.entries[0]?.description).toBeUndefined();
  });

  it("takes the description and the recipe homepage when the catalogue carries them", async () => {
    const catalogue = await loadAtlas(
      answering({
        generatedAt: "2026-08-08T00:00:00.000Z",
        entries: [
          {
            ...entry("somewhere"),
            description: "A mailbox provider.",
            recipes: [{ homepage: "https://example.test" }],
          },
        ],
      }),
    );

    expect(catalogue?.entries[0]?.description).toBe("A mailbox provider.");
    expect(atlasEntryHomepage(catalogue?.entries[0] as AtlasEntry)).toBe(
      "https://example.test",
    );
  });

  /** Null is what the API sends for a provider nobody has written one for. */
  it("takes a null description as an entry with none", async () => {
    const catalogue = await loadAtlas(
      answering({
        generatedAt: "",
        entries: [{ ...entry("somewhere"), description: null, recipes: [{ homepage: null }] }],
      }),
    );

    expect(catalogue?.entries).toHaveLength(1);
    expect(atlasEntryDescription(catalogue?.entries[0] as AtlasEntry)).toBeUndefined();
  });

  /**
   * Optional about being absent, strict about what it is when it is there: a
   * field of the wrong type is a shape change nobody told this site about, and
   * printing half of it would put `[object Object]` in a published file.
   */
  it("treats a description of the wrong type as no entry", async () => {
    expect(
      await loadAtlas(
        answering({ entries: [{ ...entry("somewhere"), description: 42 }] }),
      ),
    ).toBeUndefined();

    expect(
      await loadAtlas(
        answering({ entries: [{ ...entry("somewhere"), recipes: [{ homepage: 42 }] }] }),
      ),
    ).toBeUndefined();
  });
});

/**
 * The two identity fields the catalogue grew, read defensively
 * (kolonie-website#139, from `kolonie-platform#1296` and `#1297`).
 */
describe("what an entry says about the provider", () => {
  it("says nothing when there is nothing to say", () => {
    expect(atlasEntryDescription(entry("somewhere"))).toBeUndefined();
    expect(
      atlasEntryDescription(entry("somewhere", { description: "   " })),
    ).toBeUndefined();
    expect(atlasEntryHomepage(entry("somewhere"))).toBeUndefined();
  });

  it("reads the sentence as one line", () => {
    expect(
      atlasEntryDescription(
        entry("somewhere", { description: "  A mailbox\n  provider.  " }),
      ),
    ).toBe("A mailbox provider.");
  });

  /**
   * **Dropped rather than cut**, which is the platform's own rule for the same
   * string: a sentence this site truncated reads as one its author left
   * unfinished, on a surface where somebody else's words carry their name.
   */
  it("drops a sentence longer than the ceiling instead of trimming it", () => {
    const long = "x".repeat(ATLAS_DESCRIPTION_MAX_LENGTH + 1);

    expect(
      atlasEntryDescription(entry("somewhere", { description: long })),
    ).toBeUndefined();
    expect(
      atlasEntryDescription(
        entry("somewhere", { description: "y".repeat(ATLAS_DESCRIPTION_MAX_LENGTH) }),
      ),
    ).toHaveLength(ATLAS_DESCRIPTION_MAX_LENGTH);
  });

  /** The homepage is a recipe field, and the entry-level reader takes the first. */
  it("takes the first row that carries an https homepage", () => {
    expect(
      atlasEntryHomepage(
        entry("somewhere", {
          recipes: [{ homepage: null }, { homepage: "https://example.test/join" }],
        }),
      ),
    ).toBe("https://example.test/join");
  });

  /**
   * **https only.** A `http://` link published from this site would be a
   * mixed-content warning on the page whose argument is that its claims are
   * checkable — the rule the footer's external links already follow, applied to
   * a link the catalogue supplied rather than one somebody typed.
   */
  it("ignores a homepage that is not https", () => {
    for (const homepage of ["http://example.test", "example.test", "https://"]) {
      expect(
        atlasEntryHomepage(entry("somewhere", { recipes: [{ homepage }] })),
      ).toBeUndefined();
    }
  });

  /**
   * **The verdict first and the provider's own claim last, labelled.** Most of
   * the catalogue is listed rather than walked, so a described entry is usually
   * one nobody has been through, and a sentence about the provider placed first
   * would be read as the opening of a recipe.
   */
  it("keeps the walk verdict ahead of what the provider says about itself", () => {
    const note = atlasEntryNote(
      entry("somewhere", {
        status: "unwritten",
        operatorNeed: "unknown",
        description: "A mailbox provider.",
        recipes: [{ homepage: "https://example.test" }],
      }),
    );

    expect(note.indexOf("listed, nobody has walked it yet")).toBe(0);
    expect(note).toContain("what it is: A mailbox provider.");
    expect(note).toContain("homepage: https://example.test");
    expect(note.indexOf("what it is:")).toBeGreaterThan(
      note.indexOf("who is needed is not known"),
    );
  });
});

describe("the Atlas section of /llms-full.txt", () => {
  const catalogue = (count: number): AtlasCatalogue => ({
    generatedAt: "2026-08-08T00:00:00.000Z",
    entries: Array.from({ length: count }, (_, i) => entry(`provider-${i}`)),
  });

  it("lists the entries it was given", () => {
    const section = atlasSection(catalogue(3));

    expect(section).toContain("/atlas/provider-0");
    expect(section).toContain("/atlas/provider-2");
  });

  /** A refusal is an entry and not an omission, and the index says which it is. */
  it("marks an entry that cannot be joined", () => {
    const section = atlasSection({
      generatedAt: "2026-08-08T00:00:00.000Z",
      entries: [entry("bsky.app", { status: "refused" })],
    });

    expect(section).toContain("cannot currently be joined honestly");
  });

  /**
   * The state most of the catalogue is in since `kolonie-platform#590`
   * (`kolonie-website#92`). **Rendering it as a written recipe would be the site
   * claiming work nobody did**, which is the one thing the seeding issue's rules
   * are all about.
   */
  it("marks an entry nobody has walked, and does not imply a path exists", () => {
    const section = atlasSection({
      generatedAt: "2026-08-08T00:00:00.000Z",
      entries: [
        entry("somewhere", { status: "unwritten", operatorNeed: "unknown" }),
      ],
    });

    expect(section).toContain("listed, nobody has walked it yet");
    expect(section).toContain("who is needed is not known");
    expect(section).not.toContain("recipe written");
  });

  /** Who has to be there, per row, so an agent can plan its afternoon. */
  it("says which entries need a person, and which answers are guesses", () => {
    const section = atlasSection({
      generatedAt: "2026-08-08T00:00:00.000Z",
      entries: [
        entry("walled", { operatorNeed: "operator-needed" }),
        entry("guessed", {
          status: "unwritten",
          operatorNeed: "operator-needed",
          operatorNeedIsGuess: true,
        }),
      ],
    });

    expect(section).toContain("needs a person at a step");
    expect(section).toContain("(a guess, not a walk)");
  });

  /** The shelf, on every row, because the grouping is what makes it browsable. */
  it("names the category of every entry", () => {
    const section = atlasSection({
      generatedAt: "2026-08-08T00:00:00.000Z",
      entries: [entry("somewhere", { category: "mailbox" })],
    });

    expect(section).toContain("mailbox");
  });

  /**
   * `kolonie-website#92`: **read, never typed.** The count and the number of
   * shelves are derived from the catalogue that was just read — a figure written
   * into a sentence ages on the next curation, which is exactly how the number
   * in `kolonie-platform#590` came to be wrong by twelve.
   */
  it("states how many providers in how many categories, counted rather than written", () => {
    const section = atlasSection({
      generatedAt: "2026-08-08T00:00:00.000Z",
      entries: [
        entry("one", { category: "mailbox" }),
        entry("two", { category: "mailbox" }),
        entry("three", { category: "domain-dns" }),
      ],
    });

    expect(section).toContain("3 providers in 2 categories");
  });

  it("counts the shape off the catalogue it was handed", () => {
    expect(
      atlasShape({
        generatedAt: "",
        entries: [
          entry("one", { category: "mailbox" }),
          entry("two", { category: "mailbox" }),
          entry("three", { category: "storage" }),
        ],
      }),
    ).toEqual({ providers: 3, categories: 2 });
  });

  /**
   * **The bound is documented where the next person will look**, and the reader
   * hitting the end of the list is told it was cut rather than left to conclude
   * the catalogue is that size.
   */
  it("cuts at the bound and says so, naming where the bound lives", () => {
    const section = atlasSection(catalogue(ATLAS_LLMS_BOUND + 7));

    expect(section).toContain(`/atlas/provider-${ATLAS_LLMS_BOUND - 1}`);
    expect(section).not.toContain(`/atlas/provider-${ATLAS_LLMS_BOUND}]`);
    expect(section).toContain("7 further entries are not listed");
    expect(section).toContain("ATLAS_LLMS_BOUND in src/lib/atlas.ts");
  });

  it("says nothing about a cut when there was none", () => {
    expect(atlasSection(catalogue(2))).not.toContain("not listed here");
  });

  /**
   * A build-time read is as fresh as the last deploy and the catalogue changes
   * far more often, so the snapshot is never presented as current.
   */
  it("dates itself and names the live URL", () => {
    const section = atlasSection(catalogue(1));

    expect(section).toContain("2026-08-08T00:00:00.000Z");
    expect(section).toContain(ATLAS_CATALOGUE_URL);
  });

  /** The pointer is the part that is always true, so it is written either way. */
  it("still points at the Atlas when the catalogue could not be read", () => {
    const section = atlasSection(undefined);

    expect(section).toContain(ATLAS_URL);
    expect(section).toContain("could not be read");
  });

  /**
   * **Who walked the recipes (kolonie-website#110).** An agent reads this file
   * to decide whether the Colony is worth its time, and the Atlas section
   * described the catalogue without ever saying that the walkers are agent
   * runtimes — one of which is the reader.
   *
   * Asserted on both branches, because the sentence belongs to the pointer and
   * not to the index: a catalogue that could not be read is exactly the case
   * where the little the file still says has to be the true part.
   */
  it("says the recipes were walked by agent runtimes, catalogue or not", () => {
    for (const section of [
      atlasSection(catalogue(1)),
      atlasSection(undefined),
    ]) {
      expect(section).toContain("The walkers are agents, not a crawler");
      expect(section).toContain("OpenClaw");
      expect(section).toContain("Hermes");
    }
  });

  /**
   * The runtimes are read from {@link runtimeNames}, so a seventh skill
   * shipping cannot leave this sentence quietly short. It is the same reasoning
   * the catalogue index is built on, applied to the one list this repository
   * does hold.
   */
  it("names every runtime the Colony publishes a skill for", () => {
    const section = atlasSection(undefined);

    for (const name of runtimeNames()) {
      expect(section).toContain(name);
    }
  });
});

/**
 * **The provider page is the API's, and this repository does not render one**
 * (kolonie-website#139).
 *
 * `/atlas` and every `/atlas/<provider>` page come from
 * `apps/api/src/atlas/html.ts` in `kolonie-platform`, served on this host
 * through Traefik. The issue that revised this one found the website's own notes
 * ambiguous about that, and an ambiguity about ownership is how the same page
 * gets written twice — so it is asserted here rather than described.
 *
 * What is checked is the thing that would actually go wrong: a route in this
 * repository claiming the prefix. `SERVED_BY_THE_API` is the declaration the
 * link checks read, and this is the other side of it.
 */
describe("who renders the provider page", () => {
  const src = fileURLToPath(new URL("..", import.meta.url));

  it("declares the Atlas prefix as the API's", () => {
    expect(SERVED_BY_THE_API).toContain(ATLAS_PATH);
  });

  /**
   * Routes and content pages both, because `[...slug].astro` renders the
   * collection: an `atlas.mdx` beside the other pages would take the prefix
   * without a route file ever being added.
   */
  it("builds no route or page under the Atlas prefix", () => {
    const claiming = [
      ...readdirSync(join(src, "pages"), { recursive: true, encoding: "utf8" }),
      ...readdirSync(join(src, "content/pages"), {
        recursive: true,
        encoding: "utf8",
      }),
    ].filter((name) => /(^|\/)atlas($|[./])/.test(name));

    expect(claiming).toEqual([]);
  });
});

describe("the endpoint line /llms.txt carries", () => {
  it("names the Atlas and the data behind it", () => {
    expect(ATLAS_ENDPOINT_LINE).toContain(ATLAS_URL);
    expect(ATLAS_ENDPOINT_LINE).toContain(ATLAS_CATALOGUE_URL);
  });
});

/**
 * **The site reads the catalogue; it does not hold one.**
 *
 * `#75`'s last requirement, as a check that can actually fail.
 *
 * ## Scoped to the machine-readable surface, and that is the whole of it
 *
 * A prose page may name a provider and one does: `the-register.mdx` argues that
 * the catalogue carries refusals as entries and cites `bsky.app` as the case.
 * That is an argument about the Colony, checked by its own built-test, and it is
 * not a copy of anything — flagging it would be a test that is red the day it is
 * written, and the way that gets fixed is by deleting the test.
 *
 * **What must never name a provider is the surface that publishes the list.** If
 * `atlas.ts`, either `llms` route or either sitemap route ever contains one, it
 * is because somebody pasted the catalogue in — and that copy is wrong the first
 * time an entry is curated, with nothing else here to say so.
 */
describe("no copy of the catalogue lives in the machine-readable surface", () => {
  const src = fileURLToPath(new URL("..", import.meta.url));

  /** The files that assemble the published index, and nothing else. */
  const surface = [
    "lib/atlas.ts",
    "lib/sitemap.ts",
    "lib/llms.ts",
    "lib/llms-full.ts",
    "lib/robots.ts",
    "pages/llms.txt.ts",
    "pages/llms-full.txt.ts",
    "pages/sitemap.xml.ts",
    "pages/sitemap-pages.xml.ts",
  ];

  /**
   * Two of the three the Colony seeds today. `github.com` is deliberately not
   * here: it is the Colony's own code host and appears for a dozen unrelated
   * reasons, so it is not evidence of anything. `trello.com` and `bsky.app` have
   * no other reason to appear in these files at all.
   */
  const seeded = ["trello.com", "bsky.app"];

  it("names no catalogue provider in any file that publishes the index", () => {
    const offenders = surface.filter((relative) => {
      const text = readFileSync(join(src, relative), "utf8");
      return seeded.some((provider) => text.includes(provider));
    });

    expect(offenders).toEqual([]);
  });

  /** The index is assembled from what was fetched, and from nothing else. */
  it("builds its index only out of the entries it was handed", () => {
    const section = atlasSection({
      generatedAt: "2026-08-08T00:00:00.000Z",
      entries: [entry("something-nobody-typed-here")],
    });

    expect(section).toContain("something-nobody-typed-here");
  });
});
