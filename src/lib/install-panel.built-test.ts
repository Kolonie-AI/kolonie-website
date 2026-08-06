import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SKILL_REPOSITORIES } from "./skills.ts";

/**
 * The hero's install panel, read out of the built pages (kolonie-website#36).
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
      expect(landing, `${platform} is missing a tab`).toContain(`>${platform}<`);
    }

    expect(landing).toContain(">other<");
    // The word boundary matters: `panel__tabs` is the fieldset around them.
    expect(landing.match(/class="panel__tab[ "]/g)?.length).toBe(
      // Two panels — the hero's and the closing one — of seven tabs each.
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
        expect(landingText, `${platform}: not on the landing page`).toContain(line);
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
    expect(
      landing.match(/name="[a-z]+-runtime"[^>]*\schecked/g),
    ).toHaveLength(2);
  });

  it("carries the two panels in separate radio groups", () => {
    // Sharing a `name` would make them one group, and a click on a tab at the
    // foot of the page would silently change the tab in the hero.
    expect(landing).toContain('name="join-runtime"');
    expect(landing).toContain('name="closing-runtime"');
  });

  it("is a tabbed panel and not a list with the other tabs thrown away", () => {
    // Every body is in the document. A panel that rendered only the selected
    // runtime would be invisible to Ctrl-F, to a crawler, and to an agent.
    expect(landing.match(/class="panel__body[ "]/g)?.length).toBe(
      (SKILL_REPOSITORIES.length + 1) * 2,
    );
  });
});
