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
  /**
   * The words an agent actually reads, which is not the same as the first
   * hundred words of the file.
   *
   * **The import lines were already stripped and MDX comments were not**, and
   * `#28` is what found the difference: adding a `{/* … *\/}` block explaining a
   * paragraph pushed the three steps out of a budget the *rendered* page never
   * spent, and the test failed on text no agent is served. A comment costs a
   * model nothing because it never reaches one.
   *
   * So both come out, along with the JSX component tags around them. What is
   * measured is prose — which is what the rule below was always about.
   */
  const body = page
    .slice(page.indexOf("---", 3) + 3)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^import .*$/gm, "")
    // **`export const` comes out for the same reason as the imports above it,
    // and this is not the threshold being raised** (kolonie-website#73). The
    // page reads its argument from `kolonie-docs` at build time, so it declares
    // what it read before using it. Those declarations are evaluated by the
    // build and never rendered — a model that fetches this page is served the
    // paragraphs, not the three lines that fetched them. Counting them would
    // charge the page for text no agent is served, which is the exact mistake
    // the comment above says was made once already with comments.
    .replace(/^export const .*$/gm, "");

  /**
   * **150, and it was 100 until `#28`.** Raising a threshold to make a change
   * pass is the move that deserves suspicion, so here is the whole of the
   * reasoning.
   *
   * The rule is *a model that fetches this page must not have to guess what to
   * do*. The number is a proxy for it, and it was sized against a page where
   * nothing at all came before the three steps. `#28` — approved by the
   * maintainer — puts one paragraph there, saying what an agent gets and what it
   * does not, on the argument that an agent should know that before deciding to
   * spend its operator's tokens. Forty-one words of it makes step 3 the 130th,
   * and the old number would forbid a paragraph the issue requires.
   *
   * What keeps this honest is the assertion below, which the word count never
   * made: **the three steps come before any heading on the page.** That is the
   * property actually worth protecting — a model that has read to the first `##`
   * has read the instruction — and it cannot be satisfied by trimming prose
   * until a number is met.
   */
  const firstHundred = body.split(/\s+/).filter(Boolean).slice(0, 150).join(" ");
  it.each(["Connect", "Register", "Work", "mcp.kolonie.ai"])(
    "says %s before a reader could reasonably stop",
    (word) => {
      expect(firstHundred).toContain(word);
    },
  );

  /**
   * The rule the count is a proxy for, asserted directly (`#28`).
   *
   * Whatever precedes the three steps, it is prose and it is short enough that
   * the instruction still arrives before the page's first section. A change that
   * pushed the steps below a `##` would move them past the point a model can be
   * relied on to have read, and no word count catches that on its own.
   */
  it("puts all three steps before the page's first heading", () => {
    const beforeFirstHeading = body.slice(0, body.search(/^## /m));

    for (const word of ["Connect", "Register", "Work", "mcp.kolonie.ai"]) {
      expect(beforeFirstHeading).toContain(word);
    }
  });

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
