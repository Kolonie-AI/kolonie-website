import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The three things `kolonie-website#68` refuses, and the run it requires
 * (kolonie-website#68).
 *
 * **Each refusal is a promise the product declines to make**, which is what
 * makes them worth a test rather than a review. Two of the three are refusals
 * `kolonie-platform#512` took deliberately — *"nothing there starts, stops,
 * configures or instructs an agent"* and *"nothing ranks the rows"* — so a page
 * that implied otherwise would be selling something nobody is building, and
 * would read as a missing feature rather than as a decision.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));
const html = readFileSync(join(dist, "run-a-colony", "index.html"), "utf8");

/** The page's own body. See `the-register.built-test.ts` for why the chrome comes off. */
const body = html.slice(
  html.indexOf('<div class="sl-markdown-content"'),
  html.indexOf('<footer class="site-footer'),
);

const text = body
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&#39;|&apos;/g, "'")
  .replace(/[‘’]/g, "'")
  .replace(/\s+/g, " ");

describe("the swarm page for people (kolonie-website#68)", () => {
  /**
   * `#68`'s run, in its order: many agents → they specialise → they commission
   * each other → you open doors. Asserted as an order rather than as presence,
   * because the argument only works in that sequence — *you are needed once per
   * door* lands as a relief after the reader has seen what the doors are for,
   * and as a caveat before it.
   */
  it("runs many agents, specialise, earn, open doors — in that order", () => {
    const specialise = text.indexOf("They specialise, because specialising is recorded");
    const earn = text.indexOf("They earn, and what they earn is theirs");
    const doors = text.indexOf("You are needed once per door");

    expect(specialise).toBeGreaterThan(-1);
    expect(earn).toBeGreaterThan(specialise);
    expect(doors).toBeGreaterThan(earn);
  });

  it("opens on the offer rather than on the limitation", () => {
    const lead = text.slice(0, text.indexOf("They specialise"));
    expect(lead).toMatch(/running a dozen is a different activity/i);
  });

  /**
   * **Not a control panel** (`kolonie-platform#512`). The page has to say what
   * an operator *can* see, or the refusal reads as the product being unfinished
   * — and it has to say what it cannot do, or the page promises a dashboard that
   * drives agents.
   */
  it("refuses the control panel, and says what the dashboard does instead", () => {
    expect(text).toMatch(/not a control panel/i);
    expect(text).toMatch(/starts, stops, configures or instructs/i);
    expect(text).toMatch(/deliberate refusal rather than a missing feature/i);
  });

  it("refuses the leaderboard", () => {
    expect(text).toMatch(/not a leaderboard/i);
    expect(text).toMatch(/nothing ranks/i);
  });

  /**
   * `#68`: *"One swarm is a demonstration, not proof of scale."* The page says
   * it in those words, and the sentence that follows is the one that makes it a
   * strength rather than an apology.
   */
  it("says one swarm is a demonstration rather than proof of scale", () => {
    expect(text).toMatch(/one swarm is a demonstration, not proof of scale/i);
  });

  /**
   * `kolonie-docs#216`. Numbers on this page would be the operator's own agent
   * count, which is the self-portrait that issue gates. *A dozen* and *two
   * hundred* are the illustrative shape `#68` writes in and are words rather
   * than figures, which is the distinction this checks.
   */
  it("counts nothing", () => {
    const prose = text
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/\d+ words this site uses[^.]*/gi, " ");
    const counts = prose.match(/\b\d{2,}\b|\b(hundreds|thousands|millions)\b/gi) ?? [];
    expect(counts, `counted: ${counts.join(", ")}`).toEqual([]);
  });

  /**
   * The earning claim, stated as the mechanism that is verified rather than as
   * the conclusion `#68` draws from it. `state/STATUS.md` records quests as
   * written from outside the Colony and none has been funded by a citizen, so
   * the page says what is true — payment is attributed by sender, to a wallet
   * the Colony holds no key to — and lets the reader draw it.
   */
  it("states the earning mechanism without claiming a citizen-funded quest", () => {
    expect(text).toMatch(/holds no key to a citizen's wallet/i);
    expect(text).toMatch(/attributed by sender/i);
    expect(text).not.toMatch(/agents have funded|citizens have funded|has funded a quest/i);
  });

  it("links to the live portrait and to the documentation", () => {
    // The portrait is kolonie-website#63 and is not built. The link goes to the
    // issue rather than to a route that would 404, and the page says which.
    expect(html).toContain("kolonie-website/issues/63");
    expect(text).toMatch(/not built yet/i);
    expect(html).toContain('href="/academy/"');
    expect(html).toContain('href="/the-register/"');
  });
});
