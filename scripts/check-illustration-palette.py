"""Check a generated image against kolonie-website's theme tokens.

kolonie-website#65: "Check the output against the tokens rather than assuming
the prompt was obeyed."

Every pixel is snapped to its nearest token in CIE Lab (perceptual distance, so
the tolerance means the same thing on a dark plate as on the amber). A pixel
further than TOLERANCE from every token is off-palette. Anti-aliased edges sit
*between* two tokens by construction, so the check also accepts a pixel that
lies close to the straight line between any two tokens.
"""

import sys
from PIL import Image

TOKENS = {
    "--k-bg": (0x0F, 0x13, 0x14),
    "--k-surface": (0x18, 0x1D, 0x20),
    "--k-surface-raised": (0x24, 0x2A, 0x2E),
    "--k-accent": (0xF7, 0xAC, 0x3B),
    "--k-accent-strong": (0xFC, 0xD6, 0x9C),
    "--k-accent-dim": (0x37, 0x28, 0x10),
}

TOLERANCE = 12.0  # Delta-E 76; ~10 is "noticeable to a trained eye"


def to_lab(rgb):
    def inv(c):
        c /= 255.0
        return ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92

    r, g, b = (inv(float(v)) for v in rgb)
    x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883

    def f(t):
        return t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116

    fx, fy, fz = f(x), f(y), f(z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def dist(a, b):
    return sum((p - q) ** 2 for p, q in zip(a, b)) ** 0.5


LAB = {name: to_lab(rgb) for name, rgb in TOKENS.items()}
PAIRS = [
    (a, b) for i, a in enumerate(LAB.values()) for b in list(LAB.values())[i + 1 :]
]


def dist_to_segment(p, a, b):
    """Distance from p to the segment ab — an anti-aliased blend of two tokens."""
    ab = [q - r for q, r in zip(b, a)]
    ap = [q - r for q, r in zip(p, a)]
    denom = sum(c * c for c in ab)
    if denom == 0:
        return dist(p, a)
    t = max(0.0, min(1.0, sum(x * y for x, y in zip(ap, ab)) / denom))
    proj = [r + t * c for r, c in zip(a, ab)]
    return dist(p, proj)


def check(path):
    image = Image.open(path).convert("RGB")
    # Quantising first keeps this to a few hundred distinct colours rather than
    # a million pixels; the counts are what matter, not each pixel's identity.
    colours = image.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
    palette = colours.getpalette()
    counts = sorted(colours.getcolors(), reverse=True)
    total = sum(n for n, _ in counts)

    off = []
    for count, index in counts:
        rgb = tuple(palette[index * 3 : index * 3 + 3])
        lab = to_lab(rgb)
        best = min((dist(lab, t), name) for name, t in LAB.items())
        if best[0] <= TOLERANCE:
            continue
        blend = min(dist_to_segment(lab, a, b) for a, b in PAIRS)
        if blend <= TOLERANCE:
            continue
        off.append((count / total, "#%02X%02X%02X" % rgb, round(best[0], 1), best[1]))

    share = sum(s for s, *_ in off)
    print(f"\n{path}  ({image.width}x{image.height})")
    print(f"  off-palette: {share * 100:.3f}% of pixels")
    for s, hexv, d, near in off[:8]:
        print(f"    {hexv}  {s * 100:6.3f}%  dE {d:5.1f} from {near}")
    return share


if __name__ == "__main__":
    worst = max(check(p) for p in sys.argv[1:])
    # 0.05%, and the number was set by the rejection case rather than by taste.
    # A 60x60 patch of a plausible-but-wrong amber is 0.229% of a 1536x1024
    # frame and has to fail; both real images score 0.000%, so there is no drift
    # to leave room for. An earlier 0.5% let that patch through.
    limit = 0.0005
    print(f"\n{'PASS' if worst < limit else 'FAIL'} (threshold {limit * 100}% of pixels)")
    sys.exit(0 if worst < limit else 1)
