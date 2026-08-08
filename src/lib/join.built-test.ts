import { readFileSync, readdirSync } from "node:fs";
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

/** Which reading is shown is a CSS question since `#84`, so the built CSS is read. */
const styles = readdirSync(join(dist, "_astro"))
  .filter((file) => file.endsWith(".css"))
  .map((file) => readFileSync(join(dist, "_astro", file), "utf8"))
  .join("\n");

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

/**
 * **This block has no switch of its own** (kolonie-website#84).
 *
 * It had one, and these assertions used to describe it: a radio pair labelled
 * `I'm an agent` / `I'm a human`, with a script that read `?as=human`. `#84`
 * removed it as the third asking of one question inside one screen, and the
 * header switch keeps the control.
 *
 * **What is asserted here is the removal, not the absence of a feature.** The
 * lens `#53` built is untouched and is checked below exactly as before — one
 * artefact, two readings, the command not moving. All that changed is which
 * control turns it, so the failure worth guarding against is a second control
 * quietly coming back beside the first.
 */
describe("the switch, which is the header's now", () => {
  it("draws no control of its own", () => {
    expect(block).not.toContain("join__state");
    expect(block).not.toContain('name="join-as"');
    expect(text(block)).not.toContain("I'm an agent");
    expect(text(block)).not.toContain("I'm a human");
  });

  it("carries no radios but the install panel's own", () => {
    // The runtime tabs are radios too and they stay. Counting them is what
    // makes this assertion say *the audience radios are gone* rather than
    // *there are no radios*, which was never true and would fail on `#36`.
    expect(block.match(/type="radio"/g)).toHaveLength(
      block.match(/name="join-runtime"/g)?.length ?? 0,
    );
  });

  it("needs no script at all", () => {
    // `?as=human` was the one thing the script bought — a link that opens the
    // other reading — and the fragment does it without a script, which is why
    // the script went rather than being rewritten.
    const scripts = [
      ...landing.matchAll(/<script type="module">([\s\S]*?)<\/script>/g),
    ].map((m) => m[1] ?? "");

    for (const source of scripts) {
      expect(source, "a script still drives the join block").not.toMatch(
        /join__radio|join-as|\bas=human\b/,
      );
    }
  });

  it("answers to the page's one audience control", () => {
    // The lens is turned by `#human`, the same anchor the header links to, so
    // this block cannot disagree with the header about who is reading — which
    // it could when both existed, and did the moment anybody used one only.
    expect(styles).toMatch(/#human:target~\*[^{]*\[data-as=.?agent.?\]/);
    expect(landing).toContain('href="#human"');
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
    // `#53`: *move the block, do not rewrite its copy here*. `#55` landed on
    // 2026-08-06 and owned the destination and the link text; the sentence
    // itself is still `#53`'s and is asserted here word for word.
    expect(text(block)).toContain(
      "Pay a thousand independent citizens to answer it, from different runtimes, without coordinating:",
    );
    expect(block).toContain('href="/quests/"');
    expect(block).not.toContain('href="/sponsors/"');
  });
});
