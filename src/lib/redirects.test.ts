import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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

/** Every file under a directory, recursively. */
function* walk(directory: string): Generator<string> {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

/**
 * Every address that moved, and where it moved to.
 *
 * `/run-a-colony` is `kolonie-website#89`'s: the page was named after the
 * confusion that issue removed — *colony* is the whole and *swarm* is one
 * operator's — and it is in the footer of every page, in the sitemap, and
 * linked from `/one-swarm/`. Whatever links to it from outside is the half
 * nobody can check, which is why it redirects rather than moving quietly.
 */
const MOVED: readonly (readonly [string, string])[] = [
  ["/sponsors", "/quests/"],
  ["/sponsors/", "/quests/"],
  ["/sponsors/ideas", "/quests/ideas/"],
  ["/sponsors/ideas/", "/quests/ideas/"],
  ["/run-a-colony", "/run-a-swarm/"],
  ["/run-a-colony/", "/run-a-swarm/"],
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

describe("the addresses that moved", () => {
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
   * The redirects must not capture more than the addresses above.
   *
   * A prefix `location /sponsors` would swallow anything starting with those
   * characters, and `location /run-a-colony` the same. Nothing does today, but
   * the rule that keeps it true is the `=`, and a rule nobody asserts is a rule
   * the next edit drops.
   */
  it.each(["/sponsors", "/run-a-colony"])(
    "claims %s exactly, and nothing beyond it",
    (prefix) => {
      const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const prefixRules =
        CONFIG.match(new RegExp(`location\\s+${escaped}`, "g")) ?? [];
      expect(prefixRules).toHaveLength(0);
    },
  );

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
   *
   * **`/for-sponsors/` left the header too, in `#85`**, which replaced every
   * item with the question a reader arrives with. It is asserted the same way
   * the line above already asserts `/quests/`: reachable from the navigation or
   * from the footer, and not from one named file. Pinning it to the header was
   * what made this test fail on a change that lost nothing.
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
      join(process.cwd(), "src/content/pages/for-sponsors.mdx"),
      "utf8",
    );

    const linksTo = (source: string, href: string): boolean =>
      new RegExp(`href:\\s*['"]${href}['"]|\\]\\(${href}\\)`).test(source);

    expect(linksTo(nav, "/sponsors/")).toBe(false);
    expect(linksTo(footer, "/sponsors/")).toBe(false);
    expect(linksTo(nav, "/for-sponsors/") || linksTo(footer, "/for-sponsors/")).toBe(true);
    expect(linksTo(sponsorPage, "/quests/") || linksTo(footer, "/quests/")).toBe(true);
  });

  /**
   * The same, for `kolonie-website#89`'s rename — and this one is checked
   * across the whole of `src/`, not two named files.
   *
   * `/sponsors` moved out of one nav entry. `/run-a-colony/` was the footer's,
   * the sitemap's, and a link inside `/one-swarm/`, and the failure mode of a
   * rename is precisely the copy nobody remembered — so the check is a sweep
   * rather than a list, and it is the list that would have gone stale.
   */
  it("leaves no internal link on the old swarm address", () => {
    const offenders = [...walk(join(process.cwd(), "src"))]
      .filter((file) => /\.(astro|ts|mdx)$/.test(file))
      // The redirect itself has to name the address it retires, and so does
      // the prose explaining why. A link is what must not survive.
      .filter((file) => !file.endsWith("redirects.test.ts"))
      .filter((file) => {
        const source = readFileSync(file, "utf8");
        return /href[:=]\s*['"`]\/run-a-colony\/?['"`]|\]\(\/run-a-colony\/?\)/.test(
          source,
        );
      });

    expect(offenders, `still linking /run-a-colony/: ${offenders}`).toEqual([]);
  });

  /**
   * And the page it moved to exists. A redirect to a `404` is the same failure
   * as no redirect, one hop later.
   */
  it("points the old address at a page that is there", () => {
    expect(
      existsSync(join(process.cwd(), "src/content/pages/run-a-swarm.mdx")),
    ).toBe(true);
  });
});
