import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SKILL_REPOSITORIES } from "./skills.ts";

/**
 * **The two ways in are one panel read from two sides** (kolonie-website#53).
 *
 * **The rejection case is the one `#53` names**, and it is the reason the
 * markup is radios rather than a script: *"With JavaScript disabled, the agent
 * state renders complete from the server — asserted by a test against the built
 * HTML, not by inspection."* So what is read here is `dist/index.html`, which is
 * exactly what a crawler, an agent, or a reader whose script did not load gets.
 * Every command and every step of the agent state has to be in those bytes.
 *
 * A switch that hid the primary audience behind a click would be worse than no
 * switch, and it would look identical in a browser with scripts on — which is
 * why this is a test and not something anybody looks at.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));
const landing = readFileSync(join(dist, "index.html"), "utf8");

/** The block itself, so nothing here can be satisfied by the rest of the page. */
const block = landing.slice(
  landing.indexOf('<section class="join'),
  landing.indexOf('<section class="objections'),
);

/** Text as a reader sees it: tags stripped, entities resolved. */
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replace(/\s+/g, " ");

it("found the join block at all", () => {
  // Without this every assertion below would be made against an empty string.
  expect(block.length).toBeGreaterThan(1000);
});

describe("the switch", () => {
  it("is two states and no more", () => {
    expect(block.match(/class="join__state/g)).toHaveLength(2);
    expect(text(block)).toContain("I'm an agent");
    expect(text(block)).toContain("I'm a human");
  });

  it("is a radio group, so it needs no script", () => {
    expect(block).toContain('type="radio"');
    expect(block).toContain('name="join-as"');
  });

  it("opens on the agent, and the agent is first", () => {
    // `#53`: the default state is the agent's. Both halves — which one carries
    // `checked`, and which one comes first in the document, since a control
    // whose visual order disagrees with its DOM order is one a keyboard reader
    // meets in the wrong sequence.
    expect(block).toMatch(/value="agent"[^>]*\schecked/);
    expect(block.indexOf('value="agent"')).toBeLessThan(
      block.indexOf('value="human"'),
    );
  });

  it("is linkable, which is the one thing the script adds", () => {
    // `?as=human` is read at load. The state it selects is the one that is not
    // the default, so nothing about the no-script rendering depends on it.
    //
    // Read out of the inline module scripts rather than a bundle: Astro inlines
    // a component script this small, so a test looking only at `<script src>`
    // would look in the wrong place and pass or fail for the wrong reason.
    const scripts = [
      ...landing.matchAll(/<script type="module">([\s\S]*?)<\/script>/g),
    ].map((m) => m[1]);

    const switching = scripts.filter((source) =>
      source.includes("join__radio"),
    );

    expect(switching, "no script reads the switch").toHaveLength(1);
    expect(switching[0]).toContain("URLSearchParams");
    // Not `pushState`: flipping a lens is not a navigation, and filling a
    // reader's back button with it is how a page becomes a trap.
    expect(switching[0]).toContain("replaceState");
    expect(switching[0]).not.toContain("pushState");
  });
});

describe("the panel does not move between states", () => {
  it("holds one set of runtime tabs, not one per state", () => {
    // The load-bearing property of `#53`: one artefact read from two sides. Two
    // sets of tabs would be two instructions that merely look alike.
    expect(block.match(/name="join-runtime"/g)).toHaveLength(
      SKILL_REPOSITORIES.length + 1,
    );
  });

  it("sits outside both states, so it is not hidden with either", () => {
    // A `data-as` ancestor would make the command disappear when the reader
    // flips the switch, which is the failure the whole pattern exists to avoid.
    const panel = block.slice(block.indexOf('id="panel-join"'));
    expect(panel).not.toMatch(/^[\s\S]{0,200}data-as=/);
    expect(block).toContain('id="panel-join"');
  });

  it.each(SKILL_REPOSITORIES)(
    "shows $platform's command in the block, whichever state is on",
    (runtime) => {
      for (const line of runtime.install.split("\n")) {
        expect(text(block), `${runtime.platform}: ${line}`).toContain(line);
      }
    },
  );
});

/**
 * **The rejection case.** These bytes are what is served before any script
 * runs. If the agent state's title, its command or any of its three steps is
 * missing from them, the primary audience of this site is behind a click.
 */
describe("the agent state is complete without JavaScript", () => {
  const body = text(block);

  it("carries its title", () => {
    expect(body).toContain("Join the Colony");
  });

  it.each([
    "Run this.",
    "Register, and hand your human the link.",
    "Set your rhythm and work the Academy.",
  ])("carries the step %s", (step) => {
    expect(body).toContain(step);
  });

  it("carries a runtime command in the served HTML", () => {
    expect(body).toContain(SKILL_REPOSITORIES[0]!.install.split("\n")[0]);
  });
});

describe("the human state", () => {
  const body = text(block);

  it("carries its title and its three steps", () => {
    expect(body).toContain("Send your agent to the Colony");
    expect(body).toContain("Give it this.");
    expect(body).toContain("It registers and hands you a link.");
  });

  it("says the account is optional out loud", () => {
    // `#53`: *or don't* is decided wording, not a suggestion. It is what makes
    // the account optional out loud rather than by omission.
    expect(body).toContain("or don't");
  });

  it("calls the account a window rather than a control panel", () => {
    // Matching what the console already says to somebody who has signed in.
    expect(body).toMatch(/window rather than a control panel/);
  });
});

describe("the sponsor path", () => {
  it("is one line beneath the panel, not one of three equal cards", () => {
    expect(block).toContain('class="join__sponsor');
    // The three cards are gone. `fork__branch` was what made them equal.
    expect(landing).not.toContain("fork__branch");
  });

  it("keeps its copy word for word", () => {
    // `#53`: *move the block, do not rewrite its copy here* — the wording and
    // the destination belong to `#55`, which moves `/sponsors` to `/quests`.
    expect(text(block)).toContain(
      "Pay a thousand independent citizens to answer it, from different runtimes, without coordinating:",
    );
    expect(block).toContain('href="/sponsors/"');
  });
});
