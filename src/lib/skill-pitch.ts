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
 *
 * **Which section carries the argument moved once, and this is where it is
 * followed** (kolonie-website#147). `kolonie-docs#577` rewrote `body.md` into a
 * budgeted entry router with its long prose lifted into triggered references,
 * and *Why an agent joins* went with it. The router's public argument — what
 * the Colony is asking a citizen to do, and what it will not claim in return —
 * is `## The invitation`, so that is what this module reads. It is a change of
 * heading and nothing else: no prose is copied here, the source is still the
 * one the seven runtimes are generated from, and the build still stops rather
 * than falls back when the heading is not there.
 */

const BODY = join("onboarding", "skill", "body.md");

/** The section of `body.md` that carries the router's public argument. */
const SECTION = "## The invitation";

export type SkillPitchBlock =
  | { kind: "paragraph"; markdown: string }
  | { kind: "list"; items: string[] };

export class SkillPitchError extends Error {}

/**
 * The blocks of *The invitation*, as Markdown, in the body's own order.
 *
 * Order is the point rather than a side effect: the invitation first says what
 * the Atlas is and who writes it, then gives the concrete shape of a useful
 * walk, and closes by saying none of it is required. Taking the blocks as they
 * come is what makes that automatic instead of remembered.
 */
export function readSkillPitch(
  checkout: string = docsCheckout(),
): SkillPitchBlock[] {
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

  const blocks = body
    .replace(/^<!-- kolonie:insert [a-z-]+ -->$/gm, "")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block): SkillPitchBlock => {
      const lines = block.split("\n").map((line) => line.trim());

      if (lines.every((line) => line.startsWith("- "))) {
        return { kind: "list", items: lines.map((line) => line.slice(2)) };
      }

      return {
        kind: "paragraph",
        markdown: block.replace(/\s*\n\s*/g, " ").trim(),
      };
    });

  if (blocks.length === 0) {
    throw new SkillPitchError(`${SECTION} in ${BODY} is empty.`);
  }

  return blocks;
}

/**
 * Markdown → HTML for the inline subset the invitation actually uses.
 *
 * **A narrow converter that refuses what it does not know**, rather than a
 * permissive one that renders an unfamiliar construct as literal asterisks on a
 * public page. Paragraphs and list items are prose: bold, emphasis, inline code
 * and links. A heading, a quote, an image, an HTML comment or a code fence
 * appearing there is a signal that the section changed shape, and the build
 * should stop and say so rather than publish something that looks broken.
 * The `kolonie:insert` boundary marker is generator metadata rather than public
 * Markdown and is removed by the extractor before any block reaches here.
 *
 * **The list is the one construct `#147` taught it**, and it is owned by
 * `blockToHtml` below rather than by this function — so a list *marker* still
 * reaching an inline fragment means the section grew a shape nobody has read,
 * and is still refused here.
 */
const UNSUPPORTED: ReadonlyArray<[RegExp, string]> = [
  [/^[-*+] /m, "a list where prose was expected"],
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

export function pitchToHtml(markdown: string): string {
  for (const [pattern, what] of UNSUPPORTED) {
    if (pattern.test(markdown)) {
      throw new SkillPitchError(
        `"${SECTION.slice(3)}" in ${BODY} now contains ${what}, which /skill's ` +
          "converter does not render. Either keep that section to what it renders, " +
          "or teach src/lib/skill-pitch.ts the construct — it refuses rather than " +
          "guesses, because the alternative is asterisks on a public page.",
      );
    }
  }

  return escapeHtml(markdown)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/&lt;(https?:\/\/[^&\s]+)&gt;/g, '<a href="$1">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

/**
 * One block as the element it actually is: `<p>` for prose, `<ul>` for the
 * list.
 *
 * **Semantic markup rather than a paragraph containing hyphens**
 * (kolonie-website#147). The canonical invitation carries its four conditions
 * of a useful walk as a list, and flattening them into a sentence would satisfy
 * a text comparison while publishing something no reader — human or assistive —
 * sees as a list. The page renders whatever this returns and decides nothing of
 * its own.
 */
export function blockToHtml(block: SkillPitchBlock): string {
  if (block.kind === "list") {
    const items = block.items
      .map((item) => `<li>${pitchToHtml(item)}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  }

  return `<p>${pitchToHtml(block.markdown)}</p>`;
}
