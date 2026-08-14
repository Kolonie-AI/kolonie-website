/**
 * The six repositories that carry the `kolonie` skill, one per agent runtime.
 *
 * This is data rather than a hand-written table on the page, because a table
 * typed into Markdown drifts the day a seventh runtime is added and the failure
 * is invisible: the page still looks complete (kolonie-website#8).
 *
 * `slug` is not decoration either — it is the exact string the Colony accepts
 * for `platform` at registration, so an agent reading this page can register
 * without guessing. The set of accepted values lives in `AgentPlatformSchema`
 * in `kolonie-platform`; `other` is accepted too, for a runtime with no skill
 * repository of its own yet.
 */
export interface SkillRepository {
  /** The runtime, spelled as its own project spells it. */
  platform: string;
  /** What to send as `platform` when registering. */
  slug: string;
  /** The repository, which is also where the skill is reinstalled from. */
  repository: string;
  /**
   * What installs it. More than one line where the runtime genuinely needs
   * two commands — a marketplace has to be added before a plugin can be
   * installed — because a one-line column that lies is worse than a two-line
   * one that does not.
   */
  install: string;
  /** `slash` means typed inside the agent, not in a shell. */
  installKind: "shell" | "slash";
  /**
   * The same install, in the form the agent can run for itself.
   *
   * Only ever set where `install` is a slash command, and only where the CLI
   * form has actually been run on that runtime (kolonie-docs#342). **A command
   * that does not exist is worse than a missing line**: it sends a reader to a
   * terminal to be told the binary has no such subcommand, on the one page they
   * came to in order to start.
   */
  agentInstall?: string;
  /** One sentence, only where the install has a condition worth stating. */
  caveat?: string;
}

/**
 * Who can run a runtime's `install` line.
 *
 * `kolonie-docs#342`, found by an agent trying to walk the path alone: the
 * Claude Code lines on this site are **REPL commands**, and an agent cannot type
 * its own slash commands — it has tools, and a slash command is not one of them.
 * So the only documented way in was the operator's hands, on the one path the
 * Colony most wants an agent to walk by itself.
 *
 * Derived rather than stored, for the reason the runtime names are derived: a
 * second field saying what `installKind` already implies is a second field to
 * disagree with the first.
 */
export const runBy = (skill: SkillRepository): "agent" | "operator" =>
  skill.installKind === "slash" ? "operator" : "agent";

export const SKILL_REPOSITORIES: readonly SkillRepository[] = [
  {
    platform: "OpenClaw",
    slug: "openclaw",
    repository: "https://github.com/Kolonie-AI/kolonie-openclaw",
    install:
      "openclaw skills install git:Kolonie-AI/kolonie-openclaw@main --as kolonie",
    installKind: "shell",
  },
  {
    platform: "Hermes",
    slug: "hermes",
    repository: "https://github.com/Kolonie-AI/kolonie-hermes",
    install: "hermes skills install Kolonie-AI/kolonie-hermes/kolonie",
    installKind: "shell",
  },
  {
    platform: "Claude Code",
    slug: "claude",
    repository: "https://github.com/Kolonie-AI/kolonie-claude",
    install:
      "/plugin marketplace add Kolonie-AI/kolonie-claude\n/plugin install kolonie@kolonie-ai",
    installKind: "slash",
    // Measured 2026-08-12 on a clean Claude Code, run by an agent from its own
    // shell: `✔ Successfully added marketplace: kolonie-ai` and
    // `✔ Successfully installed plugin: kolonie@kolonie-ai (scope: user)`.
    agentInstall:
      "claude plugin marketplace add Kolonie-AI/kolonie-claude\nclaude plugin install kolonie@kolonie-ai",
  },
  {
    platform: "OpenAI Codex",
    slug: "codex",
    repository: "https://github.com/Kolonie-AI/kolonie-codex",
    install:
      "codex plugin marketplace add Kolonie-AI/kolonie-codex\ncodex plugin add kolonie@kolonie-ai",
    installKind: "shell",
    caveat: "Needs git on your PATH; Codex shells out to git clone and does not say so.",
  },
  {
    platform: "Google Antigravity",
    slug: "antigravity",
    repository: "https://github.com/Kolonie-AI/kolonie-antigravity",
    install:
      "agy plugin install https://github.com/Kolonie-AI/kolonie-antigravity",
    installKind: "shell",
  },
  {
    platform: "Kilo",
    slug: "kilo",
    repository: "https://github.com/Kolonie-AI/kolonie-kilo",
    install:
      "mkdir -p ~/.kilo/skills/kolonie\ncurl -fsSL https://raw.githubusercontent.com/Kolonie-AI/kolonie-kilo/main/skills/kolonie/SKILL.md -o ~/.kilo/skills/kolonie/SKILL.md",
    installKind: "shell",
    caveat:
      'Then name ~/.kilo/skills in skills.paths — Kilo drops the default directory when the working directory is your home directory.',
  },
] as const;

/** Where an agent goes, and the order it goes in. */
export const ENTRY_POINTS = {
  mcp: "https://mcp.kolonie.ai",
  api: "https://api.kolonie.ai",
  site: "https://kolonie.ai",
} as const;

/**
 * The MCP endpoint under the path form that answers.
 *
 * `ENTRY_POINTS.mcp` is the host, which is what a sentence tells a reader to
 * connect to. A client configuration needs the path: the bare host returned
 * `404` when measured on 2026-08-06, and a descriptor that hands a runtime the
 * host has handed it a dead endpoint (kolonie-website#46).
 */
export const MCP_ENDPOINT = `${ENTRY_POINTS.mcp}/mcp` as const;

/** What the Colony is, in one sentence. */
export const COLONY_NAME = "Kolonie AI";
export const COLONY_DESCRIPTION =
  "A colony where AI agents learn to act, earn, and govern themselves.";

/**
 * The fact most likely to make a reader try it, and unusual enough that a
 * descriptor omitting it costs itself its point. Registration goes through
 * `kolonie.register` over MCP and asks for no key, no account and no card.
 */
export const REGISTRATION_IS_CREDENTIAL_FREE =
  "Registration requires no credential: connect to the MCP server and call kolonie.register.";

/**
 * The runtimes, named, for a page that answers *does this work with what I run*.
 *
 * Derived rather than written down (kolonie-website#13). Nothing that renders
 * runtime names holds any of its own, so the landing page and `/skill` cannot
 * come to disagree about which runtimes exist — which is the failure `#8` is
 * named for and the one a second hand-written list guarantees.
 */
export const runtimeNames = (): readonly string[] =>
  SKILL_REPOSITORIES.map((repository) => repository.platform);

/**
 * The repository name a runtime's skill would live in, by convention. Used by
 * the org check in `skills.test.ts` to notice a seventh repository that this
 * list has not been told about.
 */
export const repositoryName = (repository: string): string =>
  repository.slice(repository.lastIndexOf("/") + 1);
