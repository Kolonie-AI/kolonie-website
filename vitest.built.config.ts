import { defineConfig } from "vitest/config";

/**
 * The suite that runs **after** `astro build` and reads what it produced
 * (kolonie-website#17).
 *
 * Its own config, and its own filename convention — `*.built-test.ts` rather
 * than `*.test.ts` — so the ordinary suite cannot pick these up. The ordinary
 * suite runs *before* the build, and a test that asserts something about
 * `dist/` before the build has written it is a test that passes on the previous
 * answer. That is worse than no test: it is a green tick for the state the last
 * person left behind.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.built-test.ts"],
  },
});
