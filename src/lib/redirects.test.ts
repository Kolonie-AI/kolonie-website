import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The permanent redirects `/sponsors` → `/quests` (kolonie-website#55).
 *
 * **Why this reads `nginx.conf` rather than `dist/`.** The redirect is not
 * something the build produces. Astro's own `redirects` option would emit an
 * HTML page carrying a meta refresh, served `200` — which tells a browser the
 * page moved and tells a crawler the old URL is still a page. `301` is the
 * answer the protocol has, and in this repository nginx is what can give it. So
 * the assertion has to be about the served configuration, and this is an
 * ordinary test rather than a `*.built-test.ts` for the same reason: there is
 * nothing in `dist/` to wait for.
 *
 * **What this cannot catch, stated so nobody reads it as more than it is.** It
 * proves the rules are written, not that nginx applies them. That was checked
 * against the built image on 2026-08-06 — `docker run` on this Dockerfile,
 * `curl -sI http://…/sponsors/` answering `301` with `location: /quests/` — and
 * a config-shaped test is what survives in CI without a container.
 */
const CONFIG = readFileSync(join(process.cwd(), "nginx.conf"), "utf8");

/** Every address that moved, and where it moved to. */
const MOVED: readonly (readonly [string, string])[] = [
  ["/sponsors", "/quests/"],
  ["/sponsors/", "/quests/"],
  ["/sponsors/ideas", "/quests/ideas/"],
  ["/sponsors/ideas/", "/quests/ideas/"],
];

/**
 * An exact-match block for `path`, or `undefined`.
 *
 * `location =` and not a prefix match: a prefix `location /sponsors` would also
 * capture `/sponsors-anything`, and an exact match is what keeps the redirect to
 * the four addresses that actually moved.
 */
function exactLocation(path: string): string | undefined {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = CONFIG.match(
    new RegExp(`location\\s*=\\s*${escaped}\\s*\\{([^}]*)\\}`),
  );
  return match?.[1];
}

describe("the addresses that moved to /quests", () => {
  it.each(MOVED)("%s redirects permanently to %s", (from, to) => {
    const block = exactLocation(from);
    expect(block, `no exact-match location for ${from}`).toBeDefined();
    expect(block).toMatch(new RegExp(`return\\s+301\\s+${to}\\s*;`));
  });

  /**
   * The rejection case the issue asks for, stated the way it will actually
   * fail: an old address that stops redirecting.
   *
   * `/sponsors/` reaching `try_files` instead of a `return 301` is a `404`, and
   * a `404` there breaks `governance/terms.md`'s cross-reference to where the
   * price is named. This asserts the rule is not merely present but is a
   * redirect — a block that answered `200`, or served a file, or redirected
   * with `302`, fails here.
   */
  it("does not answer an old address with anything but a 301", () => {
    for (const [from] of MOVED) {
      const block = exactLocation(from);
      expect(block, `${from} no longer has a rule of its own`).toBeDefined();
      expect(block).toContain("return 301");
      expect(block).not.toMatch(/return\s+30[27]/);
      expect(block).not.toMatch(/try_files/);
    }
  });

  /**
   * The redirect must not capture more than the four addresses above.
   *
   * A prefix `location /sponsors` would swallow anything starting with those
   * characters. Nothing does today, but the rule that keeps it true is the `=`,
   * and a rule nobody asserts is a rule the next edit drops.
   */
  it("claims the four moved addresses and nothing beyond them", () => {
    const prefixRules = CONFIG.match(/location\s+\/sponsors/g) ?? [];
    expect(prefixRules).toHaveLength(0);
  });

  /**
   * Nothing still points at the old address from inside the site.
   *
   * **Asserted against the `href` and not against the file's text**
   * (kolonie-website#70). It was a substring check until the header gained
   * `/for-sponsors/` — the page `#70` wrote — whose own comment has to name the
   * retired address in order to explain why it was not taken back. A check that
   * cannot tell a link from a sentence about a link fails on the one edit that
   * documents itself properly.
   *
   * `/quests/` moved out of the header in the same change and is reached from
   * the sponsor page instead, which is the crossing between layers in the
   * direction a reader travels (`#66`). So what is asserted is that it is still
   * linked *somewhere* a reader can get to, rather than from one named file.
   */
  it("leaves no internal link on the old address", () => {
    const nav = readFileSync(
      join(process.cwd(), "src/lib/site-nav.ts"),
      "utf8",
    );
    const footer = readFileSync(
      join(process.cwd(), "src/lib/site-footer.ts"),
      "utf8",
    );
    const sponsorPage = readFileSync(
      join(process.cwd(), "src/content/docs/for-sponsors.mdx"),
      "utf8",
    );

    const linksTo = (source: string, href: string): boolean =>
      new RegExp(`href:\\s*['"]${href}['"]|\\]\\(${href}\\)`).test(source);

    expect(linksTo(nav, "/sponsors/")).toBe(false);
    expect(linksTo(footer, "/sponsors/")).toBe(false);
    expect(linksTo(nav, "/for-sponsors/")).toBe(true);
    expect(linksTo(sponsorPage, "/quests/") || linksTo(footer, "/quests/")).toBe(true);
  });
});
