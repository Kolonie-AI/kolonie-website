# Illustrations

Flat, palette-locked artwork for the persuasion pages. Generated with an image
model, then snapped to the Colony's tokens and checked before it is committed.

This file is the how-to. The *why* — what an illustration is for as against an
icon — is `brand/README.md` in `kolonie-docs`, and the token values live in
`src/styles/theme.css` and nowhere else. **Nothing here restates a hex value**,
deliberately: a second copy of the palette is a second thing to get wrong.

## The checklist

1. **Write the prompt against the six tokens by name.** Not by hex, not by
   "amber" — name them, then let `snap-illustration-palette.mjs` do the
   arithmetic. The palette an illustration may use is exactly:

   | Token | Used for |
   |---|---|
   | `--k-bg` | the field everything sits on |
   | `--k-surface` | the near-black one step up from it |
   | `--k-surface-raised` | the lightest neutral, for structure that must separate |
   | `--k-accent` | the subject — the one thing the reader should look at |
   | `--k-accent-strong` | highlights and thin leading edges |
   | `--k-accent-dim` | accent that must recede: fills, shadows, inactive nodes |

   Six, and no seventh. `scripts/lib/palette.mjs` is the machine-readable copy.

2. **Generate at 1536px wide or larger, into `/tmp`.** Never into the repo — a
   candidate that turns out wrong should not need a `git rm`. The gateway
   answers a `size` request approximately, so read the real dimensions with
   `file` rather than trusting what you asked for.

3. **Snap and downscale in one step:**

   ```bash
   node scripts/snap-illustration-palette.mjs /tmp/candidate.png \
     public/illustrations/<name>.png --width 1200
   ```

   1200px is the width every existing illustration uses and the width the
   `width`/`height` attributes assume. Snapping is not optional cleanup: the
   models' favourite amber sits 12–15 dE from `--k-accent` however the prompt
   is worded, and re-rolling does not converge.

4. **Check it:**

   ```bash
   npm run check:illustrations
   ```

   It prints an off-palette share per file and `PASS` or `FAIL`. Read the
   verdict out of the output — the tolerance is 12 dE76 with a 0.05 % budget for
   anti-aliasing, and a file over that budget is not a rounding error, it is a
   colour the palette does not contain.

5. **Write the `alt` as a sentence, not a label.** More than 40 characters and
   more than 8 words, because `src/lib/illustrations.built-test.ts` enforces
   both — but the reason is that the picture carries an argument and a reader
   without it should still get the argument. Describe what the drawing *claims*,
   not that it is a drawing.

6. **Reserve the box.** `width`, `height`, `loading="lazy"`,
   `decoding="async"`, `class="illustration"`. A picture that shoves the
   paragraph under it down on arrival has been removed from the homepage once
   already (`#34`).

7. **Watch the page weight.** The landing page's unique image bytes are capped
   at 320 KB by the built test, and the three illustrations already there spend
   most of it. A new landing-page illustration means removing one; a new
   illustration on a subpage does not. **Prefer an icon** — inline SVG costs no
   image bytes at all, and for anything smaller than a whole idea it reads
   better anyway.

8. **Add the path to `ILLUSTRATIONS` in
   `src/lib/illustrations.built-test.ts`.** An illustration nothing asserts on
   is an illustration that will silently stop being checked.

## What is forbidden

- **Text in the bitmap.** No labels, no captions, no wordmark, no numbers, no
  UI chrome with words in it. It cannot be translated, it cannot be selected, it
  is illegible at the width the picture is actually served at, and the models
  spell badly. Anything that needs a word is markup next to the image.
- **Logos**, ours or anyone else's.
- **More than six colours**, including a gradient that interpolates outside
  them. The checker will say so.
- **Gloss**: bevels, drop shadows, specular highlights, glass, 3D extrusion.
  The site is flat and hairlined; a glossy sticker in the middle of it reads as
  something pasted on from a different product.
- **Photographic or painterly rendering.** These are diagrams that happen to be
  drawn, not scenes.

## Good and bad, on the same subject

The subject: *an agent holding the accounts it needs to act.*

> **Good.** Flat two-dimensional diagram on `--k-bg`. A single small square node
> in `--k-accent`, slightly left of centre. Five thin `--k-surface-raised` lines
> leave it and end in five outlined shapes of different geometry — a rectangle,
> a rounded tag, a circle, a hexagon, a narrow slot — each drawn in
> `--k-accent-dim` with a 2px `--k-accent-strong` leading edge. Even negative
> space. No text. Uniform 2px strokes. Nothing behind the diagram.

Why it passes: one subject, one accent, geometry doing the work of the label,
and the reader can tell what it claims — *one actor, several distinct holdings*
— at thumbnail size.

> **Bad.** A friendly robot with glowing blue eyes stands at a futuristic
> holographic dashboard, holding a golden key. Neon circuit traces, lens flare,
> depth of field, floating padlock icons, a small screen reading "AGENT
> SECURE". Photorealistic, dramatic lighting, trending on ArtStation.

Why it is rejected, in the order the problems matter: it says nothing the
sentence next to it does not already say better; the robot is a claim about what
an agent *looks like*, which is exactly the thing this site refuses to assert;
the text in the image is unreadable and misspelled at the served width; blue,
gold and neon are not in the palette and the checker will fail it; and the
lighting cannot survive a 16-colour palettised PNG. Rejecting art like this is
not a taste judgement — every one of those is a measurable failure.

## The files

| File | What it argues |
|---|---|
| `a-swarm.png` | One operator, twelve agents, four runtimes among them |
| `what-an-agent-holds.png` | The accounts an agent needs, and whose they are today |
| `the-path.png` | The Academy as a route rather than a ladder |
