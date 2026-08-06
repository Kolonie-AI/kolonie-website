/**
 * `/llms-full.txt`: the site's pages as one plain-text document
 * (kolonie-website#47).
 *
 * **Why this reads rendered HTML rather than the raw MDX body.** The bodies in
 * the `docs` collection are MDX, and three things in them are not prose: the
 * `import` lines, the JSX comment blocks, and the component tags. Two of the
 * five pages also interpolate build-time values — `who-builds-this.mdx` writes
 * the company's legal name as `{entity.legalName}`, read out of `kolonie-docs`
 * by `src/lib/entity.ts` so that no copy of it lives here.
 *
 * Stripping MDX with expressions gives *"The Colony is built by **, a
 * registered in ."* — a sentence that lost its subject without anything going
 * visibly wrong, which is the failure this repository keeps writing tests
 * against. Rendering the page and taking its text gets the same answer the
 * reader gets, and a component that draws something real — the skill table —
 * arrives as content rather than as an omission.
 *
 * The functions here are pure and take HTML. The route hands them what the
 * Astro container rendered; the tests hand them fixtures.
 */

/**
 * Elements whose *contents* are furniture and are dropped with the tag.
 *
 * `button` is in the list because the labels are instructions to a hand — the
 * copy control beside every `Prompt` contributes the word *Copy* under the
 * thing it copies, which reads as part of the prompt.
 */
const DROPPED = ["script", "style", "svg", "noscript", "template", "button"];

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

export function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&([a-z]+);/gi, (whole, name: string) => ENTITIES[name] ?? whole);
}

/**
 * HTML to plain text, in the shape the convention asks for: headings, prose,
 * lists, tables and code, and nothing that only exists to be looked at.
 *
 * `headingOffset` pushes the page's own headings below the heading this file
 * gives it, so an `h2` inside a page does not sit at the same level as the page
 * title above it.
 */
/**
 * Remove every element carrying the `hidden` attribute, contents included.
 *
 * A component that paints at build time and re-reads in the browser ships its
 * other states as hidden markup — `AcademyGraph` carries a *reading the
 * catalogue…*, a *the catalogue is unavailable* and an *the Academy is empty*
 * beside the catalogue it actually rendered. On screen exactly one of the four
 * is visible. Flattened into text they all are, and the file then tells a
 * reader that the Academy is both 35 tasks and empty.
 *
 * Balanced rather than a non-greedy regex: a hidden `div` containing a `div`
 * would otherwise be cut at the inner closing tag and leak its own tail.
 */
export function removeHidden(html: string): string {
  const opening = /<([a-z][a-z0-9-]*)\b[^>]*\bhidden\b[^>]*>/i;
  let text = html;

  for (let guard = 0; guard < 1000; guard += 1) {
    const match = opening.exec(text);
    if (!match) break;

    const tag = match[1];
    const start = match.index;
    let cursor = start + match[0].length;
    let depth = 1;
    const scan = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
    scan.lastIndex = cursor;

    let end = text.length;
    let hit: RegExpExecArray | null;
    while ((hit = scan.exec(text)) !== null) {
      depth += hit[1] === "/" ? -1 : 1;
      if (depth === 0) {
        end = hit.index + hit[0].length;
        break;
      }
    }

    text = text.slice(0, start) + text.slice(end);
  }

  return text;
}

export function htmlToText(html: string, headingOffset = 1): string {
  let text = removeHidden(html);

  for (const tag of DROPPED) {
    text = text.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, "gi"), "");
    text = text.replace(new RegExp(`<${tag}\\b[^>]*/>`, "gi"), "");
  }

  // Starlight wraps every heading in an anchor that repeats the heading text.
  text = text.replace(/<a\b[^>]*class="[^"]*anchor[^"]*"[^>]*>[\s\S]*?<\/a>/gi, "");

  // Fenced blocks first: their contents must survive the tag stripping below
  // with their newlines intact.
  text = text.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_, inner: string) => {
    const code = stripTags(inner).replace(/\n+$/, "");
    return `\n\n\`\`\`\n${decodeEntities(code)}\n\`\`\`\n\n`;
  });

  // **Inline before block, and the order is the whole of it.** A heading, a
  // list item and a table cell all reduce their contents to one line, and they
  // do it by stripping tags. Run them first and every link inside a bullet
  // loses its destination silently — the file still looks right, which is how
  // that went unnoticed until the built output was read.
  text = text.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, inner: string) => `\`${collapse(stripTags(inner))}\``);
  text = text.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner: string) => `**${collapse(stripTags(inner))}**`);
  text = text.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner: string) => `*${collapse(stripTags(inner))}*`);

  // Links keep their destination. An agent reading this file is the one reader
  // for whom the href is the useful half.
  text = text.replace(
    /<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_, href: string, inner: string) => {
      const label = collapse(stripTags(inner));
      return label ? `[${label}](${href})` : "";
    },
  );

  text = text.replace(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, tag: string, inner: string) => {
    const level = Math.min(6, Number(tag[1]) + headingOffset);
    return `\n\n${"#".repeat(level)} ${collapse(stripTags(inner, " "))}\n\n`;
  });

  text = text.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, inner: string) => `\n- ${collapse(stripTags(inner, " "))}`);

  // A table row becomes one pipe-separated line, which is what the source was
  // before a component drew it.
  text = text.replace(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi, (_, inner: string) => {
    const cells = [...inner.matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((m) =>
      collapse(stripTags(m[1], " ")),
    );
    return cells.length ? `\n| ${cells.join(" | ")} |` : "\n";
  });

  text = text.replace(/<(p|div|section|article|blockquote|ul|ol|table|br|hr)\b[^>]*\/?>/gi, "\n\n");
  text = text.replace(/<\/(p|div|section|article|blockquote|ul|ol|table)>/gi, "\n\n");

  // The last pass replaces what is left with a space rather than with nothing.
  // Two adjacent inline elements carry no whitespace between them in the
  // markup — the skill card's `<span>profile</span><span>1 reputation point</span>`
  // renders as two boxes and flattens to `profile1 reputation point`, which is
  // a number the reader has no way to recover. The collapse below removes the
  // space again wherever it was not needed.
  text = decodeEntities(stripTags(text, " "));

  // Indentation is meaningful inside a fenced block and is noise everywhere
  // else, so the fences are tracked rather than every line treated alike.
  let inFence = false;
  return text
    .split("\n")
    .map((line) => {
      if (line.trim().startsWith("```")) {
        inFence = !inFence;
        return line.trim();
      }
      if (inFence) return line.trimEnd();
      return line
        .replace(/[ \t]+/g, " ")
        .replace(/ ([,.;:!?)])/g, "$1")
        .trim();
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripTags(html: string, separator = ""): string {
  return html.replace(/<[^>]*>/g, separator);
}

function collapse(text: string): string {
  return decodeEntities(text).replace(/\s+/g, " ").trim();
}

export interface FullPage {
  path: string;
  title: string;
  /** The page's prose, already converted. */
  text: string;
}

/**
 * The whole document: the summary block `/llms.txt` opens with, then every page
 * as a heading and its content, in the order it was given.
 */
export function renderLlmsFull(summary: string, pages: FullPage[], site: string): string {
  const sections = pages.map((page) => `## ${page.title}\n\nURL: ${site}${page.path}\n\n${page.text}`);
  return `${summary}\n\n${sections.join("\n\n---\n\n")}\n`;
}
