import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every built page renders on the same background (kolonie-website#64).
 *
 * Run **after** `astro build`, per the convention in `vitest.built.config.ts`:
 * this reads `dist/`, and a test that reads it before the build has written it
 * is a green tick for whatever the last person left behind.
 *
 * **What went wrong, and why it needed a test rather than a fix.** The landing
 * page has written `data-theme="dark"` into its markup since `#30`. The
 * Starlight pages — `/quests/`, `/skill`, `/academy/`, `/who-builds-this` —
 * used Starlight's own `ThemeProvider`, whose inline script sets the attribute
 * from `localStorage` and then from `prefers-color-scheme`. So a visitor on a
 * light system read a dark landing page and then a white document, on the click
 * that matters most.
 *
 * The fix is two overrides that render nothing, which means the guarantee is
 * carried by *absence* — of a script, and of a control. Absence is exactly the
 * kind of thing that comes back: a Starlight upgrade, a component list edited
 * in a hurry, or a page added under `docs/` would each restore it silently, and
 * the only place it would show is on somebody else's monitor. Hence a test that
 * asserts the absence rather than a comment asking for it.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));

const pagesUnder = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return pagesUnder(path);
    return entry.endsWith(".html") ? [path] : [];
  });

/** The `<html>` open tag, which is where a theme is declared if it is declared. */
const htmlTag = (html: string): string => html.match(/<html\b[^>]*>/i)?.[0] ?? "";

describe("the built site has one theme", () => {
  const pages = pagesUnder(dist);

  it("built some pages at all", () => {
    // Astro emits an empty site without complaint if the content collection is
    // misconfigured, and an assertion over nothing passes.
    expect(pages.length).toBeGreaterThan(1);
  });

  const each = it.each(pages.map((page) => page.slice(dist.length)));

  /**
   * The positive half. A page may declare `dark` or declare nothing — both
   * resolve to the dark set, since `theme.css` puts it on bare `:root` and the
   * light set behind `:root[data-theme='light']`. What it may not do is declare
   * `light`, which is the state this issue was opened about.
   */
  each("declares no theme but dark on %s", (page) => {
    const tag = htmlTag(readFileSync(join(dist, page), "utf8"));
    const declared = tag.match(/\bdata-theme\s*=\s*["']([^"']*)["']/i)?.[1];

    expect(declared ?? "dark").toBe("dark");
  });

  /**
   * **The rejection case.** Starlight's provider is recognisable by the two
   * things it does and nothing else on this site does: read the
   * `starlight-theme` key, and branch on `prefers-color-scheme`. Restoring the
   * default component brings both back and fails here.
   *
   * Matched on the built HTML because the script is inlined — it is inlined
   * precisely so it can run before first paint, which is also what makes it
   * invisible to any test that only reads source.
   */
  each("runs no script that picks a theme on %s", (page) => {
    const html = readFileSync(join(dist, page), "utf8");

    expect(html).not.toContain("starlight-theme");
    expect(html).not.toContain("prefers-color-scheme: light");
  });

  /**
   * `#64`: *"no theme control is visible that does not work."* The control is
   * asserted absent from the markup rather than merely unstyled — a hidden
   * `<select>` is still in the accessibility tree and still reachable by
   * keyboard, so a CSS answer would have left the failure in place for the
   * readers most likely to meet it.
   */
  each("renders no theme control on %s", (page) => {
    const html = readFileSync(join(dist, page), "utf8");

    expect(html).not.toContain("starlight-theme-select");
    expect(html).not.toContain('id="theme-icons"');
  });
});
