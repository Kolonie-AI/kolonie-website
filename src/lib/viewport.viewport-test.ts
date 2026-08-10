import { createServer, type Server } from "node:http";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, extname } from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NOT_PAGES } from "./built-pages.ts";

/**
 * **The site on a phone, measured rather than reasoned about**
 * (kolonie-website#98).
 *
 * Every defect `#98` found was invisible in the source and obvious in a 390px
 * viewport: a header that wanted 439px of a 390px screen, a code line 690px
 * wide, and 252 elements on `/` computing under 14px. None of them is a
 * property of a stylesheet — each is what happened when the stylesheet met a
 * width. So this suite loads the built pages in Chromium and reads the numbers
 * off them, which is what `#98` asked for and the only thing that answers it.
 *
 * **It walks `dist/` rather than a list.** A page added next month is covered
 * on the day it is added rather than on the day somebody remembers to extend an
 * array — the same rule `site-header.built-test.ts` and `site-footer.built-test.ts`
 * already follow.
 *
 * 390 × 844 is an iPhone 14/15 in portrait, which is what `#98` measured at.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));

/** The width `#98` measured at, and the width this suite is about. */
const PHONE = { width: 390, height: 844 } as const;
const HEADER_WIDTHS = [320, 390, 430] as const;

/**
 * The floors, both from `#98`'s goal: *"Nothing a reader is meant to press is
 * smaller than 44px. Nothing that must be read is under 14px."* 44 is what both
 * platform vendors ask of a touch target; 14 is where text stops being readable
 * on a phone held at arm's length.
 */
const TAP_TARGET_PX = 44;
const READABLE_PX = 14;

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

/**
 * Every built page, as the path a reader would type.
 *
 * `dist/academy/index.html` is `/academy/`; `dist/404.html` is `/404.html`,
 * which is the path `nginx.conf`'s `error_page` serves it from.
 */
const routes = readdirSync(dist, { recursive: true, encoding: "utf8" })
  .filter((file) => file.endsWith(".html"))
  /**
   * `/site-chrome/` is built HTML and is not a page — it is the header and the
   * footer with nothing between them, for the Atlas to include (`#99`). It has
   * no content to overflow, no text to be too small and no controls to press.
   */
  .filter((file) => !NOT_PAGES.some((route) => file.startsWith(route)))
  .map((file) => "/" + file.replace(/index\.html$/, ""))
  .sort();

/**
 * `dist/` over HTTP.
 *
 * A `file://` URL would load the pages and not the stylesheets the way a
 * browser loads them from a server, and the whole subject here is layout.
 * Serving it is also what makes the paths under test the real ones.
 */
const serve = (): Promise<{ server: Server; origin: string }> =>
  new Promise((resolve) => {
    const server = createServer((request, response) => {
      const path = decodeURIComponent((request.url ?? "/").split("?")[0]);
      let file = join(dist, path);
      if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
      if (!existsSync(file) && existsSync(`${file}.html`)) file += ".html";
      if (!existsSync(file) || statSync(file).isDirectory()) {
        response.writeHead(404);
        response.end("not found");
        return;
      }
      response.writeHead(200, {
        "content-type": CONTENT_TYPES[extname(file)] ?? "application/octet-stream",
      });
      response.end(readFileSync(file));
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address !== null ? address.port : 0;
      resolve({ server, origin: `http://127.0.0.1:${port}` });
    });
  });

interface Measurement {
  readonly overflow: number;
  readonly widest: readonly { readonly what: string; readonly right: number }[];
  readonly small: readonly { readonly what: string; readonly px: number }[];
  readonly cramped: readonly { readonly what: string; readonly w: number; readonly h: number }[];
}

let browser: Browser;
let page: Page;
let server: Server;
let origin: string;

beforeAll(async () => {
  ({ server, origin } = await serve());
  try {
    browser = await chromium.launch();
  } catch (cause) {
    // Loud rather than skipped. A phone layout that is unverified and a phone
    // layout that is correct must not look the same on the way past.
    throw new Error(
      "could not launch Chromium — run `npx playwright install chromium`. " +
        "This suite is kolonie-website#98's acceptance criterion and does not skip.",
      { cause },
    );
  }
  const context = await browser.newContext({
    viewport: { ...PHONE },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });
  page = await context.newPage();
});

afterAll(async () => {
  await browser?.close();
  server?.close();
});

const measure = async (route: string): Promise<Measurement> => {
  await page.setViewportSize(PHONE);
  const response = await page.goto(origin + route, { waitUntil: "load" });
  expect(response?.status(), `${route} did not serve`).toBeLessThan(400);

  return page.evaluate(
    ({ readable, tap }) => {
      const name = (el: Element): string => {
        const cls =
          typeof el.className === "string" && el.className.trim() !== ""
            ? "." + el.className.trim().split(/\s+/)[0]
            : "";
        return el.tagName.toLowerCase() + cls;
      };

      const client = document.documentElement.clientWidth;

      const widest = [...document.querySelectorAll("body *")]
        .map((el) => ({ what: name(el), right: Math.round(el.getBoundingClientRect().right) }))
        .filter((entry) => entry.right > client + 1)
        .sort((a, b) => b.right - a.right)
        .slice(0, 5);

      /**
       * Text a reader is meant to read: an element with a text node of its own.
       * A wrapper inherits its children's size and counting it would report the
       * same string four times.
       */
      const small = [...document.querySelectorAll("body *")]
        .filter((el) =>
          [...el.childNodes].some((node) => node.nodeType === 3 && node.textContent?.trim()),
        )
        .map((el) => ({ what: name(el), px: parseFloat(getComputedStyle(el).fontSize) }))
        .filter((entry) => entry.px < readable);

      /**
       * **What a reader is meant to press**, and the selector is the whole of
       * the judgement here. `#98` is explicit that a raw measurement of every
       * clickable box *"is noisy and should not be treated as a defect list"* —
       * an inline link inside a paragraph is legitimately the height of a line,
       * and a `<label>` above a text field is a caption rather than a control.
       * What is listed is what the site draws as something to press.
       */
      const cramped = [
        ...document.querySelectorAll(
          ".btn, button, summary, .audience__pick, .panel__tab, .site-header__mark, .site-header__icon",
        ),
      ]
        .map((el) => {
          const box = el.getBoundingClientRect();
          return { what: name(el), w: Math.round(box.width), h: Math.round(box.height) };
        })
        .filter((entry) => entry.w > 0 && entry.h > 0)
        .filter((entry) => Math.min(entry.w, entry.h) < tap);

      return {
        overflow: document.documentElement.scrollWidth - client,
        widest,
        small,
        cramped,
      };
    },
    { readable: READABLE_PX, tap: TAP_TARGET_PX },
  );
};

it("found the built routes at all", () => {
  // Without this, every case below would vacuously pass on an empty list.
  expect(routes.length).toBeGreaterThan(10);
});

describe.each(routes)("%s at 390px", (route) => {
  let measured: Measurement;

  beforeAll(async () => {
    measured = await measure(route);
  });

  /**
   * **The whole class of defect, in one assertion.**
   *
   * `#98`: *"A visitor on a phone can swipe the page off-centre, and the right
   * edge of every section moves."* It was 37px on `/` and `/privacy/` on
   * 2026-08-08, and 33px on all nineteen pages once `#94` made the footer
   * full-bleed everywhere.
   *
   * The cause turned out not to be the one the issue named — see its closing
   * comment. Which is the argument for asserting the symptom rather than the
   * suspect: this fails whatever the next cause is.
   */
  it("does not scroll sideways", () => {
    expect(
      measured.overflow,
      `${route} overflows by ${measured.overflow}px. Widest: ${measured.widest
        .map((entry) => `${entry.what}@${entry.right}`)
        .join(", ")}`,
    ).toBeLessThanOrEqual(0);
  });

  it("sets no text a reader must read below 14px", () => {
    expect(
      measured.small,
      `${route} has text under ${READABLE_PX}px: ${measured.small
        .map((entry) => `${entry.what}@${entry.px}px`)
        .join(", ")}`,
    ).toEqual([]);
  });

  it("draws nothing pressable smaller than 44px", () => {
    expect(
      measured.cramped,
      `${route} has controls under ${TAP_TARGET_PX}px: ${measured.cramped
        .map((entry) => `${entry.what} ${entry.w}×${entry.h}`)
        .join(", ")}`,
    ).toEqual([]);
  });
});

describe.each([320, 430] as const)("every route at %ipx", (width) => {
  it.each(routes)("%s does not scroll sideways", async (route) => {
    await page.setViewportSize({ width, height: PHONE.height });
    const response = await page.goto(origin + route, { waitUntil: "load" });
    expect(response?.status(), `${route} did not serve`).toBeLessThan(400);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(0);
  });
});

describe.each(HEADER_WIDTHS)("the mobile header at %ipx", (width) => {
  it.each(["/", "/academy/"])("composes deliberately on %s", async (route) => {
    await page.setViewportSize({ width, height: PHONE.height });
    await page.goto(origin + route, { waitUntil: "load" });

    const header = page.locator(".site-header");
    const mark = header.locator(".site-header__mark");
    const toggle = header.locator("summary");
    const signIn = header.getByRole("link", { name: "Sign in", exact: true });
    const send = header.getByRole("link", { name: "Send your agent", exact: true });

    expect(await mark.isVisible()).toBe(true);
    expect(await toggle.isVisible()).toBe(true);
    expect(await signIn.isVisible()).toBe(false);
    expect(await send.isVisible()).toBe(false);

    const markBox = await mark.boundingBox();
    const toggleBox = await toggle.boundingBox();
    expect(markBox).not.toBeNull();
    expect(toggleBox).not.toBeNull();
    expect(markBox!.x).toBeLessThanOrEqual(17);
    expect(toggleBox!.x + toggleBox!.width).toBeGreaterThanOrEqual(width - 17);

    await toggle.click();
    expect(await signIn.isVisible()).toBe(true);
    expect(await send.isVisible()).toBe(true);
    expect(await header.getByRole("link", { name: "GitHub", exact: true }).isVisible()).toBe(true);
    expect(await header.getByRole("link", { name: "Docs", exact: true }).isVisible()).toBe(true);
    expect(await header.locator(".audience").isVisible()).toBe(true);

    expect(await signIn.count()).toBe(1);
    expect(await send.count()).toBe(1);
    for (const control of await header.locator("a, summary").all()) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(Math.min(box!.width, box!.height)).toBeGreaterThanOrEqual(TAP_TARGET_PX);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(0);
  });
});

it("opens the mobile menu without JavaScript", async () => {
  const context = await browser.newContext({
    viewport: { ...PHONE },
    javaScriptEnabled: false,
  });
  const noScriptPage = await context.newPage();
  await noScriptPage.goto(origin + "/", { waitUntil: "load" });
  await noScriptPage.locator(".site-header summary").click();
  expect(
    await noScriptPage
      .locator(".site-header")
      .getByRole("link", { name: "Sign in", exact: true })
      .isVisible(),
  ).toBe(true);
  await context.close();
});
