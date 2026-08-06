import type { APIRoute } from "astro";
import { robotsTxt } from "../lib/robots.ts";

/**
 * `/robots.txt`, served from this repository (kolonie-website#56).
 *
 * A route rather than a file in `public/`, for the same reason `/llms.txt` is
 * one: the paths it names are derived from `ENTRY_POINTS` instead of typed, so
 * a moved host is one edit and never a file that quietly points at nothing.
 *
 * The decision, the measurements and why `ai-train=yes` gives up a right are all
 * in `src/lib/robots.ts`. This file exists to answer the request.
 */
export const GET: APIRoute = () =>
  new Response(robotsTxt(), {
    headers: {
      // Plain text, and explicitly UTF-8 — the same rule `/llms.txt` follows: a
      // consumer guessing latin-1 renders typographic punctuation as noise.
      "content-type": "text/plain; charset=utf-8",
    },
  });
