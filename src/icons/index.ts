import academy from "./academy.svg?raw";
import account from "./account.svg?raw";
import atlas from "./atlas.svg?raw";
import github from "./github.svg?raw";
import operator from "./operator.svg?raw";
import playbook from "./playbook.svg?raw";
import quest from "./quest.svg?raw";
import register from "./register.svg?raw";
import send from "./send.svg?raw";
import skill from "./skill.svg?raw";
import wake from "./wake.svg?raw";
import wallet from "./wallet.svg?raw";

/**
 * The Colony's icon set (kolonie-website#129), and the only place a name is
 * bound to a drawing.
 *
 * ## A list, never a glob
 *
 * `import.meta.glob` would find these twelve files without twelve import lines
 * and would give `<Icon name>` the type `string`, which is the whole thing the
 * component is for. The names below are a literal tuple so that `astro check`
 * rejects `name="playbooks"` at build time rather than rendering nothing at
 * three in the morning, and `src/lib/icons.test.ts` compares the tuple against
 * the directory in both directions so the list cannot drift away from the
 * files. It is the same rule `published-records.ts` follows for the same
 * reason: what ships is a decision somebody took, not whatever happened to be
 * on disk.
 *
 * ## The files hold geometry and nothing else
 *
 * No `width`, no `fill`, no `stroke`, no colour — `Icon.astro` writes the root
 * element and owns every presentational attribute. That is what lets one file
 * render at 20px in a card heading and 28px in a footer, in whatever colour the
 * text beside it already has, without a second copy of the drawing. It also
 * keeps the icons out of `theme.test.ts`'s way: a shape with no colour in it
 * cannot be a colour declared outside `theme.css`.
 *
 * The one exception is `github`, which is GitHub's own mark reproduced as a
 * filled path rather than redrawn as strokes. It carries `fill="currentColor"`
 * and `stroke="none"` so that the stroke attributes the component sets do not
 * outline it. Redrawing somebody's trademark to match our stroke weight would
 * be the wrong kind of consistency.
 */
export const ICON_NAMES = [
  "academy",
  "account",
  "atlas",
  "github",
  "operator",
  "playbook",
  "quest",
  "register",
  "send",
  "skill",
  "wake",
  "wallet",
] as const;

/** One of the twelve icons this site ships. */
export type IconName = (typeof ICON_NAMES)[number];

/**
 * The raw file contents, keyed by name.
 *
 * Typed as a total record over `IconName`, so adding a name to the tuple above
 * without adding its import is a type error here rather than a blank space on
 * a page.
 */
const SOURCES: Record<IconName, string> = {
  academy,
  account,
  atlas,
  github,
  operator,
  playbook,
  quest,
  register,
  send,
  skill,
  wake,
  wallet,
};

/**
 * Everything between the file's `<svg>` and `</svg>`, whitespace collapsed.
 *
 * The root element is discarded rather than reused because the component needs
 * to set `width`, `height`, `aria-hidden` and the stroke attributes on it, and
 * an attribute that appears twice on one element is a silent win for whichever
 * copy the parser reads last. Collapsing whitespace keeps the inlined markup
 * from adding a kilobyte of indentation to every page that uses four icons.
 *
 * It throws rather than returning an empty string: a file that does not parse
 * is a build failure, not an invisible icon.
 */
export const iconBody = (name: IconName): string => {
  const source = SOURCES[name];
  const opened = source.indexOf(">", source.indexOf("<svg"));
  const closed = source.lastIndexOf("</svg>");

  if (opened === -1 || closed === -1 || closed < opened) {
    throw new Error(`icons: ${name}.svg has no <svg> element to unwrap`);
  }

  return source
    .slice(opened + 1, closed)
    .replace(/\s+/g, " ")
    .trim();
};

/** Whether a string is one of the shipped names — for runtime input only. */
export const isIconName = (value: string): value is IconName =>
  (ICON_NAMES as readonly string[]).includes(value);
