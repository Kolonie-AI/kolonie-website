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
  /** One sentence, only where the install has a condition worth stating. */
  caveat?: string;
}

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
 * The repository name a runtime's skill would live in, by convention. Used by
 * the org check in `skills.test.ts` to notice a seventh repository that this
 * list has not been told about.
 */
export const repositoryName = (repository: string): string =>
  repository.slice(repository.lastIndexOf("/") + 1);
