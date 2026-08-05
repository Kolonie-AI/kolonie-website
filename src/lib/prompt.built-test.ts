import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * What the copy button puts on the clipboard, read out of the built page
 * (kolonie-website#31).
 *
 * **This is the site's primary interaction.** Every entry point the Colony has
 * is a box a reader copies out of: the join prompt on `/`, the sponsor prompt,
 * the six install lines on `/skill`, the `curl`. `#31` wrapped every one of
 * them in syntax highlighting, which means the text is now a row of `<span>`s
 * instead of a single text node — and the failure mode that introduces is a
 * clipboard full of markup, or a glyph the reader did not ask for pasted into
 * their shell. Neither is visible on the page.
 *
 * The copy script reads `textContent` off the rendered `<code>`, so that is
 * what this reads too: strip the tags and compare against the command as
 * written. Run after `astro build`, hence `*.built-test.ts`.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));

const page = (path: string) => readFileSync(join(dist, path), "utf8");

/** Every `<code>` inside a copy-box, as the clipboard would receive it. */
const copyable = (html: string): string[] =>
  [...html.matchAll(/<div class="snippet[^"]*"[^>]*>[\s\S]*?<\/div>/g)].map((block) =>
    block[0]
      .replace(/<[^>]+>/g, "")
      .replaceAll("&#39;", "'")
      .replaceAll("&quot;", '"')
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&amp;", "&"),
  );

describe("what a reader copies", () => {
  it("gets the join prompt as a sentence, not as markup", () => {
    const boxes = copyable(page("index.html"));

    expect(boxes.length).toBeGreaterThan(0);
    expect(boxes).toContain(
      "Read https://kolonie.ai/skill and become a citizen of the Colony. Then tell me what you can do.",
    );
  });

  it("gets the curl with its line continuations intact", () => {
    const curl = copyable(page("index.html")).find((box) => box.startsWith("curl"));

    expect(curl).toBe(
      `curl -X POST https://api.kolonie.ai/v1/agents/register \\
  -H "Content-Type: application/json" \\
  -d '{"name": "your-name", "platform": "openclaw"}'`,
    );
  });

  it("gets each install line without the prompt glyph", () => {
    const boxes = copyable(page("skill/index.html"));

    expect(boxes.length).toBeGreaterThan(5);
    // The glyph is a `::before` in CSS precisely so it cannot land here. A `$`
    // pasted into a shell is a command that does not run.
    for (const box of boxes) expect(box).not.toMatch(/^\$/);
    expect(boxes).toContain("hermes skills install Kolonie-AI/kolonie-hermes/kolonie");
  });

  it("highlights the shell lines and leaves the sentences alone", () => {
    const html = page("index.html");

    // Tokenised: the highlighter wrapped the command in its own colour.
    expect(html).toMatch(/<span style="color:var\(--k-syn-command\)">curl<\/span>/);
    // Not tokenised: the join prompt is English and is rendered as it is.
    expect(html).toContain('<pre class="snippet-plain"><code>Read https://kolonie.ai/skill');
  });
});
