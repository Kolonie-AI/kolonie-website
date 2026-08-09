import { defineConfig } from "vitest/config";

/**
 * The suite that loads the built site in a real browser (kolonie-website#98).
 *
 * Its own config and its own filename convention — `*.viewport-test.ts` — for
 * the same reason `vitest.built.config.ts` has them, and one more of its own.
 *
 * **It needs `astro build` to have run**, like the built suite: it serves
 * `dist/` and navigates to every page in it.
 *
 * **And it needs a browser**, which nothing else here does. That is the cost
 * `#98` accepted and asked for in as many words: *"A test that fails on
 * horizontal overflow is what stops this returning. One page load per route,
 * `scrollWidth <= clientWidth`, at 390px."* No amount of reading the stylesheet
 * answers whether a page scrolls sideways — every defect `#98` measured was
 * invisible in the source and obvious in a viewport.
 *
 * The browser is Chromium, installed by `npm run test:viewport`'s own first
 * step, and the suite **fails rather than skips** when it cannot be launched.
 * A phone layout that is unverified and a phone layout that is correct must not
 * look the same on the way past.
 *
 * One worker, because the tests share one browser and one static server:
 * starting a Chromium per worker to load twenty-six pages costs more than it
 * saves, and the suite is a couple of seconds as it is.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.viewport-test.ts"],
    pool: "forks",
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
