import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * `.github/dependabot.yml` routes its pull requests to a label that exists
 * (kolonie-website#140).
 *
 * The failure being prevented is quiet: **Dependabot does not create a label
 * that is not there, and it does not fail either — it drops the name and
 * opens the pull request unrouted** (`kolonie-platform#687`). Nothing is red,
 * nothing is logged, and the board reader never sees the card.
 *
 * So the vocabulary is written out here and joined to the file. It is
 * deliberately easy to extend: add the label here when it is added to the
 * repository. What is refused is this file inventing a name of its own.
 * Measured against `gh label list --repo Kolonie-AI/kolonie-website` on
 * 2026-08-27.
 */
const REPOSITORY_LABELS = new Set([
  "bug",
  "enhancement",
  "idea",
  "decision",
  "p1",
  "p2",
  "area:docs",
  "area:governance",
  "area:infra",
  "area:platform",
  "area:skills",
  "area:website",
  "blocked:human",
  "ci:failed",
  "from:agent",
  "from:citizen",
  "from:maintainer",
  "from:non-member",
  "from:outside",
  "from:watcher",
  "needs-clearance",
  "queue:maintainer",
  "queue:operator",
  "queue:worker",
  "worker:failed",
  "worker:forbidden",
]);

const config = readFileSync(
  fileURLToPath(new URL("../../.github/dependabot.yml", import.meta.url)),
  "utf8",
);

/**
 * The package that declares the Node built-ins the checked TypeScript imports
 * (kolonie-website#145). Named once here so the assertion and the rejection
 * case cannot drift apart.
 */
const NODE_TYPES = "@types/node";

type Manifest = { devDependencies?: Record<string, string> };

const packageManifest = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../package.json", import.meta.url)),
    "utf8",
  ),
) as Manifest;

function assertNodeTypesDeclared(manifest: Manifest): void {
  if (!(NODE_TYPES in (manifest.devDependencies ?? {}))) {
    throw new Error(
      `${NODE_TYPES} is not a direct development dependency: the checked TypeScript files import Node built-ins, and a lockfile rewrite is free to drop an undeclared optional peer.`,
    );
  }
}

function labelsIn(document: string): readonly string[] {
  const labels: string[] = [];
  for (const line of document.split("\n")) {
    if (line.trimStart().startsWith("#")) continue;
    const match = line.match(/^\s*labels:\s*\[(.*)\]\s*$/);
    if (!match) continue;
    for (const quoted of match[1].matchAll(/'([^']*)'|"([^"]*)"/g)) {
      labels.push(quoted[1] ?? quoted[2]);
    }
  }
  return labels;
}

function assertKnownLabels(document: string): void {
  for (const label of labelsIn(document)) {
    if (!REPOSITORY_LABELS.has(label)) {
      throw new Error(`Unknown Dependabot label: ${label}`);
    }
  }
}

/**
 * The Node type contract survives a lockfile rewrite (kolonie-website#145).
 *
 * The failure being prevented is quiet in the same way the label one is, and
 * it stops the check before a single test runs. Checked TypeScript here
 * imports `node:fs`, `node:path` and `node:url` directly — this file does, on
 * its first two lines — but `@types/node` was only ever arriving as an
 * *optional peer* of Vite/Vitest. Nothing declared it, so a resolution that
 * chose not to install it was allowed to: both grouped npm Dependabot pull
 * requests of 2026-08-27 dropped `@types/node` and `undici-types` from the
 * lockfile, and `astro check` then reported 291 errors led by
 * `Cannot find module 'node:fs'` (#142 run 33064979165, #144 run
 * 33064996192).
 *
 * A direct development dependency is the whole fix. The alternatives — a
 * `skipLibCheck`, an ambient `declare module`, an exclusion from `astro check`
 * — all hide the errors while leaving the contract undeclared, which is the
 * state that produced them.
 */
describe("the dependency contracts a lockfile rewrite must preserve", () => {
  it("declares the Node types the checked TypeScript files import", () => {
    expect(() => assertNodeTypesDeclared(packageManifest)).not.toThrow();
  });

  /**
   * **The rejection case.** The assertion above passes against a checker that
   * never looks, so this one proves it has teeth: a manifest with the
   * declaration removed — exactly the shape #142 and #144 installed against —
   * fails it, and the failure names the package.
   */
  it("rejects a manifest that has lost the declaration", () => {
    const devDependencies = { ...packageManifest.devDependencies };
    delete devDependencies[NODE_TYPES];
    expect(() => assertNodeTypesDeclared({ devDependencies })).toThrow(
      NODE_TYPES,
    );
  });
});

describe("the labels dependabot.yml applies", () => {
  it("are all in this repository's vocabulary", () => {
    const labels = labelsIn(config);
    expect(labels.length).toBeGreaterThan(0);
    expect(() => assertKnownLabels(config)).not.toThrow();
  });

  /**
   * Routing only, and nothing else. `from:` is derived from the author by the
   * board reader; a `from:` label asserted here would be this file speaking
   * for a bot it does not speak for (#140).
   */
  it("are `area:website` and nothing else, on every entry", () => {
    expect([...new Set(labelsIn(config))]).toEqual(["area:website"]);
    expect(labelsIn(config)).toHaveLength(2);
  });

  /**
   * **The rejection case `#140` asks for.** The test above passes just as
   * happily against a checker that never looks, so this one proves the check
   * has teeth: an invented label fails, and the failure names it.
   */
  it("rejects an invented label", () => {
    const invented = config.replace(
      "labels: ['area:website']",
      "labels: ['area:web-site']",
    );
    expect(invented).not.toEqual(config);
    expect(() => assertKnownLabels(invented)).toThrow("area:web-site");
  });
});
