import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ENTRY_POINTS } from "./skills.ts";

/**
 * What the build says about citizen pages, and what it must never say
 * (kolonie-website#109).
 *
 * ## Why this is scoped to the machine-readable files
 *
 * Not a blanket scan of `dist/`. The homepage renders one real citizen through
 * `<CitizenStanding />` — the maintainer's own test account, decided on
 * `kolonie-website#26` and labelled as such on the page's face — so a scan of
 * every built file would fail on a decision that was argued separately and is
 * still the right one.
 *
 * What `#109` touched is the machine-readable surface, and there the rule is
 * absolute: these files are read by something that cannot see a disclaimer.
 * Every one of them may state the *form* `/@{handle}`; none of them may name a
 * citizen, and none may publish a number of them.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));

/** Every file this issue touched, plus the descriptors it deliberately did not. */
const MACHINE_READABLE = [
  "robots.txt",
  "sitemap.xml",
  "sitemap-pages.xml",
  "llms.txt",
  "llms-full.txt",
  ".well-known/agent.json",
  ".well-known/ai-plugin.json",
  ".well-known/mcp.json",
];

describe("the machine-readable surface names no citizen", () => {
  for (const file of MACHINE_READABLE) {
    describe(`/${file}`, () => {
      const body = readFileSync(join(dist, file), "utf8");

      /**
       * The placeholder is the only thing allowed after `/@`. A handle here is
       * a citizen this repository published, which `a-citizen-has-a-page.md`
       * refuses: no directory, no listing, no count.
       */
      it("writes the URL form and never a handle", () => {
        for (const match of body.match(/\/@[^\s"'<),]*/g) ?? []) {
          expect(match).toBe("/@{handle}");
        }
      });

      /**
       * *How many citizens are there* is the question the record refuses in
       * every form, and a total in a file a machine parses is the form that
       * gets quoted back.
       */
      it("publishes no population number", () => {
        expect(body).not.toMatch(/\b\d[\d,.]*\s+(citizens|agents registered)\b/i);
        expect(body.toLowerCase()).not.toMatch(
          /(population|total|number) of (citizens|agents)/,
        );
      });
    });
  }
});

/**
 * The other half of the acceptance criteria, asserted against what ships rather
 * than what compiles: both plain-text files carry the surface, in the same
 * words, because both read one constant.
 */
describe("the built plain-text files describe the surface", () => {
  for (const file of ["llms.txt", "llms-full.txt"]) {
    it(`${file} says where a citizen's page is and what it costs to read`, () => {
      const body = readFileSync(join(dist, file), "utf8");

      expect(body).toContain(`${ENTRY_POINTS.site}/@{handle}`);
      expect(body).toMatch(/no account and no key/i);
      expect(body).toMatch(/whether or not that citizen has turned indexing on/i);
      expect(body).toMatch(/no route that\s+lists citizens/i);
    });
  }
});

/**
 * The one page a reader is actually on when the question occurs to them. It
 * points at the form as code rather than as a link, because `{handle}` resolves
 * to nothing and this repository requires every link it emits to resolve.
 */
describe("the built homepage points a reader at the form", () => {
  const html = readFileSync(join(dist, "index.html"), "utf8");

  it("shows the URL form", () => {
    expect(html).toContain(`${ENTRY_POINTS.site}/@{handle}`);
  });

  it("does not link it", () => {
    expect(html).not.toMatch(/href="[^"]*\/@\{handle\}/);
  });
});
