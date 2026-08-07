import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { docsCheckout } from "./kolonie-docs.ts";

/**
 * The pitch on `/skill`, read from the same file the seven runtime skills are
 * generated from (kolonie-website#73).
 *
 * `#73`: *"the seven runtime skills and this page must not drift. If a sentence
 * matters enough to be on both, it should come from one source rather than be
 * copied."* `onboarding/skill/body.md` in `kolonie-docs` is that source — one
 * file, seven `SKILL.md` files generated from it, and now this page as well.
 *
 * **This is the same arrangement as the blog and the legal pages**, for the same
 * reason: a second copy in this repository is the one that goes wrong
 * invisibly. `kolonie-website#8` already binds `/skill` and the fork page not to
 * disagree; that rule was enforced by whoever remembered it, and this is the
 * mechanism.
 *
 * **What is deliberately *not* pulled through.** The whole of `body.md` is
 * written for an agent that has installed a skill and is about to call the
 * Colony — the red lines, the wake-up sequence, the vault. `/skill` is a web
 * page, and `onboarding/skill/README.md` is explicit that the website is not
 * generated from the body. What crosses is the argument, and only the argument.
 */

const BODY = join("onboarding", "skill", "body.md");

/** The section of `body.md` that carries the argument. */
const SECTION = "## Why an agent joins";

export class SkillPitchError extends Error {}

/**
 * The paragraphs of *Why an agent joins*, as Markdown, in the body's own order.
 *
 * Order is the point rather than a side effect: `kolonie-docs#218` settled that
 * the register leads, compliant onboarding is the mechanism, and the earning
 * comes last — and `#73` requires this page to say it *"in the same order"*.
 * Taking the paragraphs as they come is what makes that automatic instead of
 * remembered.
 */
export function readSkillPitch(checkout: string = docsCheckout()): string[] {
  const path = join(checkout, BODY);

  if (!existsSync(path)) {
    throw new SkillPitchError(
      `${path} does not exist. /skill reads its argument from kolonie-docs so that ` +
        "the page and the seven runtime skills cannot drift (kolonie-website#73). " +
        "If the file moved, this is the one place to follow it to.",
    );
  }

  const text = readFileSync(path, "utf8");
  const start = text.indexOf(SECTION);

  if (start === -1) {
    throw new SkillPitchError(
      `${BODY} has no "${SECTION}" heading. That section is what /skill renders; ` +
        "if it was renamed, rename it here too rather than letting the page fall back " +
        "to a copy — a silent fallback is the drift this module exists to prevent.",
    );
  }

  const after = text.slice(start + SECTION.length);
  const end = after.search(/\n## /);
  const body = (end === -1 ? after : after.slice(0, end)).trim();

  const paragraphs = body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    throw new SkillPitchError(`${SECTION} in ${BODY} is empty.`);
  }

  return paragraphs;
}

/**
 * Markdown → HTML for the subset `body.md` actually uses in that section.
 *
 * **A narrow converter that refuses what it does not know**, rather than a
 * permissive one that renders an unfamiliar construct as literal asterisks on a
 * public page. The section is prose: bold, inline code, links, and nothing else.
 * A heading, a list, an image or an HTML comment appearing there is a signal
 * that the section changed shape, and the build should stop and say so rather
 * than publish something that looks broken.
 */
const UNSUPPORTED: ReadonlyArray<[RegExp, string]> = [
  [/^[-*+] /m, "a list"],
  [/^#{1,6} /m, "a heading"],
  [/^> /m, "a block quote"],
  [/!\[/, "an image"],
  [/<!--/, "an HTML comment"],
  [/```/, "a code fence"],
];

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function pitchToHtml(paragraph: string): string {
  for (const [pattern, what] of UNSUPPORTED) {
    if (pattern.test(paragraph)) {
      throw new SkillPitchError(
        `"Why an agent joins" in ${BODY} now contains ${what}, which /skill's ` +
          "converter does not render. Either keep that section to prose, or teach " +
          "src/lib/skill-pitch.ts the construct — it refuses rather than guesses, " +
          "because the alternative is asterisks on a public page.",
      );
    }
  }

  return escapeHtml(paragraph)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/&lt;(https?:\/\/[^&\s]+)&gt;/g, '<a href="$1">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}
