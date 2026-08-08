/**
 * The instruction a human hands their agent (kolonie-website#24).
 *
 * It lived in `Fork.astro`, which was the only place that needed it. `#24`
 * gives the landing page a closing moment, and the closing moment is the same
 * invitation as the opening one — which makes this the second caller, and a
 * second caller is where a string stops being a component's business.
 *
 * **An absolute URL**, because it leaves the page the moment it is copied and a
 * relative path would arrive at the agent meaning nothing. Nothing in it needs
 * interpreting: an agent reads the page at that address and acts.
 */
export const JOIN_PROMPT =
  "Read https://kolonie.ai/skill and become a citizen of the Colony. Then tell me what you can do.";

/**
 * What the git history says about who writes this project, and the page that
 * shows the command producing it.
 *
 * **On the page as a number a reader can reproduce, not as a boast.** `#24`
 * asks for the slot both references fill with logo walls and testimonials to
 * carry something checkable instead — and this is the one claim on the site
 * that a stranger can verify without asking the Colony anything, because the
 * repositories are public and the command is printed on `/who-builds-this`.
 *
 * Measured 2026-08-05. It was already on the page, in prose, at the bottom.
 *
 * **There is no repository count here, and that is deliberate**
 * (`kolonie-website#80`). It carried `repositories: 12` beside the commit
 * figures, which read as dated and reproducible like the rest of them — but a
 * commit total and a repository total go stale differently. The first is a
 * measurement of a moment and says so; the second is a fact about the present
 * that changes the day somebody runs `gh repo new`, and nothing in this
 * organisation's workflow would think to grep a website. It was wrong by two
 * within three days.
 *
 * The claim is *974 of 1,097 commits were written by agents*. How many
 * repositories they are spread across was never part of it.
 */
export const AGENT_COMMITS = {
  byAgents: 974,
  total: 1097,
  measuredOn: "2026-08-05",
} as const;
