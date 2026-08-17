import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SKILL_REPOSITORIES } from "./skills.ts";

/**
 * The install panel, read out of the built pages (kolonie-website#36).
 *
 * It was the *hero's* panel until `#119` moved the runtime chooser below the
 * outcome story; the properties below are about the panel wherever it renders,
 * and the two places it now renders are the joining block and the closing call
 * to action.
 *
 * Three of that issue's acceptance criteria are properties of the *output* and
 * cannot be checked anywhere else:
 *
 * - **One source for the install lines, shared with `/skill`.** Two copies
 *   disagree within a month, and the copy that is wrong is always the one being
 *   read. Both pages render `SKILL_REPOSITORIES`; this is what proves they
 *   still do.
 * - **The tabs work without JavaScript.** They are radios and labels, so the
 *   check is that the panel ships no script and that every tab's body is in the
 *   HTML rather than fetched when clicked.
 * - **Seven tabs.** `/skill` says `other` is accepted and is not a lesser
 *   citizen; a tab set that omits it turns six supported runtimes into a
 *   requirement.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));
const page = (path: string) => readFileSync(join(dist, path), "utf8");

const landing = page("index.html");
const skillPage = page("skill/index.html");

/** Text as a reader sees it: tags stripped, entities resolved. */
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

describe("the install panel", () => {
  it("names every runtime, and `other` as a seventh", () => {
    for (const { platform } of SKILL_REPOSITORIES) {
      expect(landing, `${platform} is missing a tab`).toContain(
        `>${platform}<`,
      );
    }

    expect(landing).toContain(">other<");
    // The word boundary matters: `panel__tabs` is the fieldset around them.
    expect(landing.match(/class="panel__tab[ "]/g)?.length).toBe(
      // Two panels — the join block's and the closing one — of seven tabs each
      // (kolonie-website#36, #53, and kolonie-website#119). It was three until
      // the last of those took the hero's out: the runtime chooser is complete
      // and correct, and no longer competes with the reason to join on first
      // paint.
      (SKILL_REPOSITORIES.length + 1) * 2,
    );
  });

  it("shows the line that runtime's own repository documents", () => {
    // The same array `/skill` renders. A line that appeared here and not there
    // would be a second source, which is the failure #8 is named for.
    const landingText = text(landing);
    const skillText = text(skillPage);

    for (const { platform, install } of SKILL_REPOSITORIES) {
      for (const line of install.split("\n")) {
        expect(landingText, `${platform}: not on the landing page`).toContain(
          line,
        );
        expect(skillText, `${platform}: not on /skill`).toContain(line);
      }
    }
  });

  it("needs no JavaScript, because the state is a radio", () => {
    const panel = landing.slice(landing.indexOf('class="panel '));

    expect(panel).toContain('type="radio"');
    // One tab checked in the markup, per panel: the reader lands on the first,
    // and there is no detection — guessing a reader's runtime and guessing
    // wrong is worse than letting them click.
    //
    // Counted by the runtime group rather than by every checked radio on the
    // page (kolonie-website#53). The join block's two-state switch is a checked
    // radio too and is not a runtime tab; matching the bare attribute counted
    // it, which is a test measuring the page rather than the panel it is about.
    //
    // Two panels since `#119`: the join block's and the closing one. It was
    // three — `#36` put one in the hero and repeated it as the closing call to
    // action, and `#53` added the switch's — and `#119` removed the hero's.
    // One set of tabs per panel either way, which is what `#53`'s *not
    // duplicated* is about.
    expect(landing.match(/name="[a-z]+-runtime"[^>]*\schecked/g)).toHaveLength(
      2,
    );
  });

  it("carries each panel in its own radio group", () => {
    // Sharing a `name` would make them one group, and a click on a tab at the
    // foot of the page would silently change the tab in the joining block.
    expect(landing).toContain('name="join-runtime"');
    expect(landing).toContain('name="closing-runtime"');
    // And the hero's group is gone with the hero's panel (kolonie-website#119).
    expect(landing).not.toContain('name="hero-runtime"');
  });

  /**
   * The step after the install, on both surfaces (`kolonie-platform#1010`).
   *
   * The reporting citizen's complaint was about the *page*: the install line
   * was there, the MCP wiring was a URL in prose, and the runtime's own trap
   * was documented only in `kolonie-hermes` — which an agent reads after it has
   * already run the wrong command. So this asserts the rendered output, and on
   * the landing page as well as `/skill`, because a reader that never reaches
   * `/skill` is exactly the reader who reached for `hermes mcp add`.
   */
  it("shows the MCP wiring where a runtime has a measured one", () => {
    const landingText = text(landing);
    const skillText = text(skillPage);

    for (const { platform, mcpSetup } of SKILL_REPOSITORIES) {
      if (mcpSetup === undefined) continue;
      for (const line of mcpSetup.commands.split("\n")) {
        expect(
          landingText,
          `${platform}: MCP setup not on the landing page`,
        ).toContain(line);
        expect(skillText, `${platform}: MCP setup not on /skill`).toContain(
          line,
        );
      }
      expect(landingText, `${platform}: the trap is unnamed`).toContain(
        mcpSetup.instead,
      );
      expect(skillText, `${platform}: the trap is unnamed`).toContain(
        mcpSetup.instead,
      );
    }
  });

  it("is a tabbed panel and not a list with the other tabs thrown away", () => {
    // Every body is in the document. A panel that rendered only the selected
    // runtime would be invisible to Ctrl-F, to a crawler, and to an agent.
    expect(landing.match(/class="panel__body[ "]/g)?.length).toBe(
      // Two panels since `#119`, as above.
      (SKILL_REPOSITORIES.length + 1) * 2,
    );
  });
});
