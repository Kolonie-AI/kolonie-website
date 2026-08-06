import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The name check, as it is actually served (kolonie-website#35).
 *
 * `name-check.test.ts` covers every decision the module takes. **What it cannot
 * cover is the join between the markup and the listener**, and that join is
 * where this component fails silently: the script finds its elements by
 * selector, and a class renamed in the template leaves a field that is visible,
 * looks fine and does nothing. Nothing throws, nothing is logged, and the only
 * symptom is a reader pressing a button twice and leaving.
 *
 * So these are contract assertions against `dist/`, and each one names the
 * selector the script depends on.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));
const index = readFileSync(join(dist, "index.html"), "utf8");

describe("the name check is on the landing page", () => {
  /**
   * **The no-JavaScript degradation, and it is one attribute.** `#35`: *no
   * JavaScript degrades to the page as it is today*. The field is `hidden` in
   * the served markup and only the script reveals it, so a reader without
   * scripts is never shown a control that cannot work.
   */
  it("ships hidden, so a reader without scripts sees the page as it was", () => {
    expect(index).toMatch(/<div class="name-check[^"]*"[^>]*\sdata-name-check\s+hidden>/);
  });

  it.each([
    ["the root the script reveals", "data-name-check"],
    ["the form it listens to", "data-name-check-form"],
    ["the line it writes the answer into", "data-name-check-answer"],
  ])("carries %s", (_what, attribute) => {
    expect(index).toContain(attribute);
  });

  it("labels the input, and the input is the one the script looks up by id", () => {
    expect(index).toContain('id="name-check-input"');
    expect(index).toContain('for="name-check-input"');
  });

  /**
   * The answer is announced as well as shown. A live read whose only feedback is
   * a line appearing has told a reader using a screen reader nothing, which is
   * the failure this repository tests against everywhere else.
   */
  it("announces the answer", () => {
    expect(index).toMatch(/data-name-check-answer/);
    expect(index).toMatch(/aria-live="polite"/);
  });

  /**
   * **The promise the component must not make.** `#35`: it reserves nothing, a
   * free name can be taken a minute later, and *the component must say that
   * rather than imply a hold*. This is the static half of it — the answer itself
   * says so too, and `name-check.test.ts` asserts that.
   */
  it("says on the page that nothing is reserved", () => {
    expect(index).toMatch(/nothing is held/i);
    expect(index).toMatch(/free until somebody registers it/i);
  });
});

describe("the prompt it rewrites", () => {
  /**
   * The selector the script writes through, asserted from the other end.
   *
   * `[data-prompt-kind="join"] .prompt-code code` is how the listener finds the
   * text to replace. If `Prompt.astro` stops emitting either half, the check
   * still answers and the copied prompt silently stays generic — a reader
   * chooses a name and copies an instruction that does not mention it.
   */
  it("marks the join prompts, and only those", () => {
    const marked = index.match(/data-prompt-kind="join"/g) ?? [];

    // The fork's, and the closing block's — one string, two callers since #24.
    expect(marked).toHaveLength(2);
  });

  it("renders a code element inside each marked prompt", () => {
    const blocks = index.match(
      /<figure class="prompt[^"]*"[^>]*data-prompt-kind="join"[\s\S]*?<\/figure>/g,
    );

    expect(blocks).toHaveLength(2);
    for (const block of blocks ?? []) {
      expect(block).toMatch(/class="[^"]*prompt-code[^"]*"[\s\S]*?<code/);
    }
  });
});

describe("where it deliberately is not", () => {
  /**
   * Decided in `#35` and worth a test rather than a comment: `/skill` is read by
   * an agent, an agent calls `kolonie.name.check` itself, and a form there is a
   * human control on a machine's page.
   */
  it.each([["/skill/", "skill"], ["/quests/", "quests"]])(
    "%s has no name field",
    (_path, directory) => {
      const html = readFileSync(join(dist, directory, "index.html"), "utf8");

      expect(html).not.toContain("data-name-check");
    },
  );
});
