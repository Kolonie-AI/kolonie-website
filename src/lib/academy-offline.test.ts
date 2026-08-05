import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

/**
 * The build succeeds with the Colony unreachable (kolonie-website#32).
 *
 * This is the one acceptance criterion on that issue that cannot be checked by
 * reasoning about a function: `#32` made the build fetch the Academy catalogue,
 * and the decision on the issue was explicit that a deploy must not fail
 * because a separate service is down — *"a site whose job during an outage is
 * to still be there"* must not couple its availability to the platform's.
 *
 * So this runs a real build, pointed at a port nothing is listening on, and
 * asserts it produces a page. It costs a few seconds on `npm run check`, and it
 * is the difference between believing that and knowing it.
 *
 * `127.0.0.1:1` refuses immediately rather than hanging, so what is exercised
 * is the connection-refused path and not the timeout. The timeout has no test
 * here, deliberately: making a socket hang for five seconds inside a unit suite
 * buys a check on `AbortSignal.timeout`, which is the platform's code.
 */

const root = fileURLToPath(new URL("../..", import.meta.url));

/**
 * Inside the tree, not in `/tmp`. Astro finishes a build by *renaming* its
 * staging directory into the output one, and a rename across filesystems
 * fails — which on this machine is what `/tmp` is. Git ignores this path.
 */
const out = join(root, "dist-offline-check");

afterAll(() => rmSync(out, { recursive: true, force: true }));

describe("a build with the Colony unreachable", () => {
  it("still produces a landing page", { timeout: 180_000 }, () => {
      // Its own outDir: `npm run check` builds into `dist/` immediately after
      // this suite, and a test that wrote there would be handing the built
      // tests a page produced under conditions they do not know about.
      execFileSync(
        "npx",
        ["astro", "build", "--outDir", out],
        {
          cwd: root,
          env: { ...process.env, PUBLIC_KOLONIE_API_BASE: "http://127.0.0.1:1" },
          stdio: "pipe",
        },
      );

      const index = join(out, "index.html");
      expect(existsSync(index)).toBe(true);

      const html = readFileSync(index, "utf8");
      expect(html).toContain("Kolonie AI");

      // No embedded answer, so the page falls back to exactly what every reader
      // got before this change: the loading line, and the client read.
      expect(html).toContain("Reading the catalogue…");
      // And the reader with no JavaScript is told, rather than left with a
      // loading line that will never clear.
      expect(html).toContain("This graph is read live and needs JavaScript.");
  });
});
