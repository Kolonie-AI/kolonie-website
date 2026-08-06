import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The site is phone-first, and there are two widths (kolonie-website#33).
 *
 * Before `#33` there was **one** media query in the repository. Everything else
 * — the type scale, the spacing steps, every copy-box — rendered at one size
 * for a 390px phone and a 2560px display, and most links to this page are
 * opened on a phone, because it is shared in chat.
 *
 * **What this file can check and what it cannot.** *Does the page look right at
 * 390px* is a rendered measurement and needs a browser; that judgement stays
 * where `#22` put it, with a pair of cold eyes. What is checkable without one
 * is the discipline underneath it, and that is what is here: two breakpoints
 * and no third, every width traceable to a token in `theme.css`, `min-width`
 * only, and no copy-box that scrolls sideways on a phone.
 */

const src = fileURLToPath(new URL("..", import.meta.url));

/**
 * A file with its comments removed.
 *
 * Not fussiness: `theme.css` explains at length that
 * `@media (min-width: var(--k-bp-sm))` is not valid CSS, and a scanner that
 * cannot tell an example of the wrong thing from the wrong thing would fail on
 * the paragraph warning against it.
 */
const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8")
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .replaceAll(/^\s*\/\/.*$/gm, "");

const themeCss = read("./theme.css");

/** The declared breakpoints, read out of the file that declares them. */
const breakpoints = Object.fromEntries(
  [...themeCss.matchAll(/(--k-bp-[a-z]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
);

const sources = readdirSync(src, { recursive: true, encoding: "utf8" }).filter((file) =>
  /\.(astro|css)$/.test(file),
);

/** Every `@media` in the repository, with the file it is in. */
const queries = sources.flatMap((file) =>
  [...read(`../${file}`).matchAll(/@media\s*\(([^)]*)\)/g)].map(
    (m) => [file, m[1].trim()] as const,
  ),
);

describe("the breakpoints", () => {
  it("are two, declared in theme.css", () => {
    expect(Object.keys(breakpoints).sort()).toEqual(["--k-bp-md", "--k-bp-sm"]);
  });

  it("are the only widths any media query uses", () => {
    // CSS cannot read a custom property inside a media query — it is evaluated
    // before there is an element to resolve one against — so every `@media`
    // writes its width out. This is what keeps them one source anyway.
    const widths = queries
      .filter(([, condition]) => condition.includes("width"))
      .map(([file, condition]) => [file, condition] as const);

    const declared = new Set(Object.values(breakpoints));
    const offending = widths.filter(([, condition]) => {
      const value = condition.split(":")[1]?.trim();
      return value === undefined || !declared.has(value);
    });

    expect(
      offending.map(([file, condition]) => `${file}: @media (${condition})`),
      `every width must be one of ${[...declared].join(", ")}`,
    ).toEqual([]);
  });

  it("are used phone-first, so `max-width` never appears", () => {
    // One exception, and it is not a breakpoint: the Academy's node card asks
    // its own container how wide it is. A container query is a component
    // measuring itself, not the page choosing a layout.
    const backwards = queries.filter(
      ([, condition]) => condition.startsWith("max-width"),
    );

    expect(backwards.map(([file, condition]) => `${file}: (${condition})`)).toEqual([]);
  });

  it("are three or fewer states, counting the one that is not a width", () => {
    const kinds = new Set(queries.map(([, condition]) => condition.split(":")[0].trim()));

    expect([...kinds].sort()).toEqual(["min-width", "prefers-reduced-motion"]);
  });
});

describe("a copy-box on a phone", () => {
  const snippet = read("../components/Snippet.astro");

  /**
   * The failure this guards is the one the issue names: `white-space: pre` with
   * `overflow-x: auto` at every width turns the join prompt and the six install
   * lines into horizontal scrollers on a 390px screen. The copy button still
   * works, so the box looks fine — and the reader cannot see what they are
   * about to paste, which is the single thing this site asks them to do.
   */
  it("wraps rather than scrolling sideways", () => {
    const phoneFirst = snippet.slice(0, snippet.indexOf("@media"));

    expect(phoneFirst).toMatch(/white-space:\s*pre-wrap/);
    expect(phoneFirst).toMatch(/overflow-wrap:\s*anywhere/);
    expect(phoneFirst).not.toMatch(/white-space:\s*pre;/);
  });

  /**
   * **This test asserted the opposite until `#52`, and inverting it is the
   * point.**
   *
   * `#33` wrapped the snippets on a phone and let them go back to
   * `white-space: pre` above `--k-bp-sm`, on the reasoning that a desktop has
   * room for the line as it was written. `#52` measured that a desktop does
   * not: in the hero the panel is about two fifths of a 60rem column, and the
   * OpenClaw line — 73 bytes — rendered as `$ openclaw skills install
   * git:Koloni` and stopped at 1440px.
   *
   * So there is no width at which a snippet stops wrapping, and the media query
   * that remains carries the padding and the type size only. What was a
   * reasonable inference in `#33` was contradicted by a measurement, and the
   * assertion follows the measurement rather than being deleted.
   */
  it("does not stop wrapping at any width", () => {
    const wide = snippet.slice(snippet.indexOf("@media"));

    expect(wide).not.toMatch(/white-space:\s*pre;/);
    expect(wide).not.toMatch(/overflow-wrap:\s*normal/);
  });

  it("keeps a sentence wrapping at every width", () => {
    // `lang={null}` is prose, and prose set to scroll sideways is not a
    // decision anybody would take deliberately. It needed its own rule while
    // the base went back to `pre` above `--k-bp-sm`; the base wraps everywhere
    // now, so the rule is gone and this asserts the property rather than the
    // selector that used to carry it.
    expect(snippet).not.toMatch(/\.snippet-plain\s*\{[^}]*white-space:\s*pre;/);
    expect(snippet.slice(0, snippet.indexOf("@media"))).toMatch(
      /white-space:\s*pre-wrap/,
    );
  });
});

describe("nothing is wider than a phone by construction", () => {
  it("declares no fixed width a 390px screen could not hold", () => {
    // 24rem is 384px. A `width` or `min-width` above it, without a media query
    // around it, is a horizontal scrollbar on the page itself.
    const offending: string[] = [];

    for (const file of sources) {
      // Media conditions are removed first — a `@media (min-width: 60rem)` is
      // the opposite of the failure this looks for, and `max-width` is a cap
      // rather than a floor.
      const body = read(`../${file}`).replaceAll(/@media[^{]*/g, "");

      for (const [, property, value] of body.matchAll(
        /(?<![-\w])(min-width|width):\s*(\d+(?:\.\d+)?)rem/g,
      )) {
        if (Number(value) > 24) offending.push(`${file}: ${property}: ${value}rem`);
      }
    }

    expect(offending).toEqual([]);
  });
});
