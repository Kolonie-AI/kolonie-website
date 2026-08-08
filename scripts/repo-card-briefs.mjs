/**
 * What each repository card's drawing shows (kolonie-website#90).
 *
 * **One card per repository, and almost no words on it.** A reader who sees a
 * Kolonie link anywhere recognises the Colony, and can tell `kolonie-platform`
 * from `kolonie-hermes` without reading a sentence. The cards outlive every
 * change to how the Colony describes itself, because they make no claim about
 * it — which is `#90`'s reason for building them rather than reusing `og.png`:
 * that image carries a headline, a pitch and a list of domains, and a repository
 * card is uploaded by hand into a settings page and will sit there for a year.
 *
 * ## The briefs are `#90`'s table, verbatim in intent
 *
 * Each `shows` is the drawing that issue asked for. They are here rather than in
 * the generator because they are *decisions* — what a repository looks like —
 * and the generator is a mechanism.
 *
 * ## The six runtime cards share one drawing
 *
 * `#90`: *"seen side by side they read as one family with six members, which is
 * what `kolonie-platform#511` and `kolonie-docs#216` claim the Colony is."* They
 * name `runtime` here and the generator draws it once.
 */

/** The brief every prompt is built from. Style, and then the one thing that varies. */
export const STYLE = [
  "A minimal technical line drawing, flat vector style,",
  "on a very dark near-black background.",
  "Thin amber line strokes only, uniform stroke weight,",
  "no fills, no gradients, no shading, no texture, no perspective.",
  "Generous empty space around the drawing. Centred composition.",
  "Absolutely no text, no letters, no numbers, no labels, no watermark,",
  "no signature, no logo of any kind.",
].join(" ");

/**
 * The drawings, by the name the generator writes them under.
 *
 * `website` is deliberately **not** asked to draw the crest. `brand/README.md`
 * §4 forbids redrawing the mark, and a model asked for one produces a fourth
 * weight of a shape that has exactly two. So the model draws the empty frame and
 * the compositor puts the real `mark.svg` inside it.
 */
export const DRAWINGS = {
  docs: "two paths leaving one point, one of the two struck through with a short diagonal slash",
  platform:
    "three objects in a row: a sheet of paper being handed over, a wax seal, and a coin",
  infra: "an open crate holding three stacked rectangular containers",
  website: "an empty browser window frame, with a title bar and three small dots, and nothing inside it",
  skill:
    "one central rounded shape with seven straight lines running outward from it, each ending in a small empty square",
  email: "an envelope, with a single upright rectangular cursor bar inside it",
  dns: "one point on the left branching into three branches, each of which branches again into two",
  runtime:
    "one large empty square field on the right, with a single straight line running to it from off the left edge of the frame",
};

/**
 * Which drawing each repository's card carries, and what else the card needs.
 *
 * **`.github` is the neutral card**: mark and name, centred, no illustration and
 * no repository name. `#90` makes it the fallback for any repository whose card
 * is not ready, which is why it is the one card that makes no claim at all.
 */
export const CARDS = {
  ".github": { drawing: null, neutral: true },
  "kolonie-docs": { drawing: "docs" },
  "kolonie-platform": { drawing: "platform" },
  "kolonie-infra": { drawing: "infra" },
  "kolonie-website": { drawing: "website", crest: true },
  "kolonie-skill": { drawing: "skill" },
  "kolonie-email": { drawing: "email" },
  "kolonie-dns": { drawing: "dns" },
  "kolonie-openclaw": { drawing: "runtime", runtime: "OpenClaw" },
  "kolonie-hermes": { drawing: "runtime", runtime: "Hermes" },
  "kolonie-claude": { drawing: "runtime", runtime: "Claude Code" },
  "kolonie-codex": { drawing: "runtime", runtime: "OpenAI Codex" },
  "kolonie-antigravity": { drawing: "runtime", runtime: "Google Antigravity" },
  "kolonie-kilo": { drawing: "runtime", runtime: "Kilo" },
};

/**
 * **Every runtime card fell back, and this is the record `#90` asks for.**
 *
 * `#90` wanted each runtime's own mark *"taken from that project's own brand or
 * press page, unmodified, in the monochrome variant where one is offered"*, and
 * provided for the case where a project publishes none: *"that card falls back
 * to the shared drawing with the runtime's name set in the template's monospace
 * instead. Record which ones fell back and why — a later reader will otherwise
 * assume it was an oversight."*
 *
 * All six fell back. Measured 2026-08-08, by asking for each brand page:
 *
 * | Runtime | Brand page | What it answered |
 * |---|---|---|
 * | Claude Code | `anthropic.com/legal/trademark-policy`, `anthropic.com/brand` | **404**, both |
 * | OpenAI Codex | `openai.com/brand/` | **403** |
 * | Google Antigravity | `about.google/brand-resource-center/` | redirect; Google requires written permission for logo use |
 * | OpenClaw | `openclaw.ai/brand` | **404** |
 * | Kilo | `kilocode.ai/brand` | redirect; the repository carries a `logo.png` at its root |
 * | Hermes | none published | the repository carries `assets/banner.png` |
 *
 * **A logo file in a repository is not a brand page, and MIT is not a licence to
 * use it.** OpenClaw, Kilo and Hermes are all MIT, and the MIT text grants
 * rights to the *software* — it says nothing about trademarks, which is the
 * ordinary position and not an oversight on their part.
 *
 * **What was refused, and this is the part worth keeping.** Every one of these
 * marks is available in seconds from a logo-aggregator site. Taking one would
 * satisfy the acceptance criterion's letter — a mark would be on the card — and
 * break the thing the criterion is for: *"Each borrowed mark is the vendor's own
 * file, and where it came from is recorded next to it."* A file from an
 * aggregator has no provenance to record and no permission behind it, on a
 * surface that sits in a settings page for a year. The fallback `#90` wrote is
 * the better outcome and it is the one it was written for.
 */
export const FELL_BACK = {
  "kolonie-claude": "anthropic.com/brand and the trademark policy both answer 404",
  "kolonie-codex": "openai.com/brand answers 403; permission is by request to partnercomms",
  "kolonie-antigravity": "Google requires written permission for logo use",
  "kolonie-openclaw": "openclaw.ai/brand answers 404; MIT covers the code, not the mark",
  "kolonie-kilo": "no brand page; a repository logo.png is not one, and MIT covers the code",
  "kolonie-hermes": "no brand page and no mark published; the repository carries a banner",
};
