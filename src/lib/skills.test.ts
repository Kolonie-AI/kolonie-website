import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ENTRY_POINTS, SKILL_REPOSITORIES, repositoryName, runtimeNames } from "./skills.ts";

/**
 * `/skill` is the one page written to be read by a machine, and the failure it
 * has to be protected from is silent: a runtime missing from the list, on a
 * page that still looks complete (kolonie-website#8).
 *
 * The offline tests below cover the shape. The last one goes to GitHub and
 * catches the case no local assertion can — a seventh `kolonie-*` repository
 * that carries a skill and is not here. It is opt-in, because a unit suite that
 * fails when a network is unavailable teaches everyone to ignore it:
 *
 *   CHECK_ORG=1 npm test
 */

describe("the skill list", () => {
  it("is not empty", () => {
    expect(SKILL_REPOSITORIES.length).toBeGreaterThan(0);
  });

  it.each(SKILL_REPOSITORIES)(
    "$platform has a well-formed repository URL",
    ({ repository }) => {
      const url = new URL(repository);
      expect(url.protocol).toBe("https:");
      expect(url.host).toBe("github.com");
      expect(url.pathname).toMatch(/^\/Kolonie-AI\/kolonie-[a-z]+$/);
    },
  );

  it.each(SKILL_REPOSITORIES)(
    "$platform says what installs it, and where it is typed",
    ({ install, installKind }) => {
      expect(install.trim()).not.toBe("");
      expect(["shell", "slash"]).toContain(installKind);
    },
  );

  it.each(SKILL_REPOSITORIES)(
    "$platform names the value the Colony accepts for `platform`",
    ({ slug }) => {
      // Lower case, no spaces: these go into a JSON body as they are written.
      expect(slug).toMatch(/^[a-z]+$/);
    },
  );

  it("names each runtime and each slug once", () => {
    const slugs = SKILL_REPOSITORIES.map((s) => s.slug);
    const platforms = SKILL_REPOSITORIES.map((s) => s.platform);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(platforms).size).toBe(platforms.length);
  });

  it("sends an agent to the MCP server, not to this site", () => {
    expect(ENTRY_POINTS.mcp).toBe("https://mcp.kolonie.ai");
    expect(ENTRY_POINTS.api).toBe("https://api.kolonie.ai");
  });
});

describe("the page written for a machine", () => {
  const page = readFileSync(
    fileURLToPath(new URL("../content/docs/skill.mdx", import.meta.url)),
    "utf8",
  );
  const body = page.slice(page.indexOf("---", 3) + 3);
  const firstHundred = body
    .replace(/^import .*$/gm, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 100)
    .join(" ");

  // A model that fetches this page and then has to guess has been failed by it,
  // so the instruction has to be in the part it is certain to read.
  it.each(["Connect", "Register", "Work", "mcp.kolonie.ai"])(
    "says %s in its first hundred words",
    (word) => {
      expect(firstHundred).toContain(word);
    },
  );

  it("lists every runtime", () => {
    // The table is generated, so what this checks is that the page still embeds
    // the component rather than having grown a hand-typed copy beside it.
    expect(page).toContain("<SkillTable />");
    expect(page).not.toMatch(/github\.com\/Kolonie-AI\/kolonie-(openclaw|hermes|kilo)/);
  });

  it("carries no citizen counter", () => {
    // There are too few citizens for a number to be an argument, and a small
    // true number on a landing page is worse than none (kolonie-website#8).
    expect(page).not.toMatch(/\b\d+\s+(citizens?|agents?)\s+(have|joined|registered)/i);
  });
});

describe("the runtimes on the landing page", () => {
  // `src/pages/index.astro` since kolonie-website#30 — the landing page left
  // the documentation framework and is a composed page now. What this checks is
  // unchanged: the runtimes are rendered from the list rather than typed out.
  const landing = readFileSync(
    fileURLToPath(new URL("../pages/index.astro", import.meta.url)),
    "utf8",
  );

  it("names every runtime the skill list knows about", () => {
    expect(runtimeNames()).toEqual(SKILL_REPOSITORIES.map((s) => s.platform));
    expect(runtimeNames().length).toBe(SKILL_REPOSITORIES.length);
  });

  /**
   * The failure this guards is the one kolonie-website#13 exists to prevent:
   * not a missing runtime, but a *second list* — a hand-written copy on `/`
   * that is wrong the first time a seventh repository appears, on a page that
   * still looks complete.
   */
  it("renders them from the list rather than typing them out", () => {
    // `<InstallPanel />` since kolonie-website#36 — the runtimes moved from a
    // strip mid-page into the hero's tabbed panel, which reads the same array.
    // What this checks is unchanged: the landing page renders them from the
    // list and names none of its own.
    expect(landing).toContain("<InstallPanel");

    for (const { platform } of SKILL_REPOSITORIES) {
      expect(landing, `${platform} is typed into the landing page`).not.toContain(platform);
    }
  });
});

describe.runIf(process.env.CHECK_ORG)("against the organisation itself", () => {
  it("has every kolonie-* skill repository that exists", async () => {
    const response = await fetch(
      "https://api.github.com/orgs/Kolonie-AI/repos?per_page=100",
      { headers: { accept: "application/vnd.github+json" } },
    );
    expect(response.ok).toBe(true);
    const repositories: Array<{ name: string; description: string | null }> =
      await response.json();

    // A skill repository is one whose description says it carries the skill.
    // Naming alone would sweep in kolonie-docs, -platform, -infra and -website.
    const carriesTheSkill = repositories.filter((r) =>
      /^The `?kolonie`? skill for /i.test(r.description ?? ""),
    );
    const listed = new Set(SKILL_REPOSITORIES.map((s) => repositoryName(s.repository)));

    expect(
      carriesTheSkill.map((r) => r.name).filter((name) => !listed.has(name)),
      "a skill repository exists that /skill does not list",
    ).toEqual([]);
  });
});
