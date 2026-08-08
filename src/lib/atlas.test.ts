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
  loadAtlas,
  type AtlasCatalogue,
} from "./atlas.ts";

const entry = (provider: string, joinable = true) => ({
  provider,
  path: `/atlas/${provider}`,
  title: provider,
  joinable,
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
      answering({ generatedAt: "2026-08-08T00:00:00.000Z", entries: [entry("github")] }),
    );

    expect(catalogue?.entries).toHaveLength(1);
    expect(catalogue?.generatedAt).toBe("2026-08-08T00:00:00.000Z");
  });

  /**
   * A response that does not match the shape is no response at all, rather than
   * something rendered half-way — the rule `AcademyNode` already follows.
   */
  it("treats a response of the wrong shape as no answer", async () => {
    expect(await loadAtlas(answering({ entries: [{ nonsense: true }] }))).toBeUndefined();
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
      entries: [entry("bsky.app", false)],
    });

    expect(section).toContain("cannot currently be joined honestly");
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
