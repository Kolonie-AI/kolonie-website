import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ATLAS_CATALOGUE_URL,
  ATLAS_ENDPOINT_LINE,
  ATLAS_LLMS_BOUND,
  ATLAS_URL,
  atlasSection,
  atlasShape,
  loadAtlas,
  type AtlasCatalogue,
  type AtlasEntry,
} from "./atlas.ts";
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
