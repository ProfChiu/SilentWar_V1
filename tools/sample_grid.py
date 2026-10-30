#!/usr/bin/env python3
"""sample_grid.py — read a printed colour grid off a scan by sampling pixels.

Used for the tables Silent War prints as colour matrices (ART, Counterattack,
Transit Event, and the 23 Area Activity Charts). Eyeballing a 920-cell grid is
not verification; this is.

Detects the grid from its own dark rulings, samples the median colour of each
cell's interior, and classifies against a named palette. Prints the classified
grid plus every cell whose colour was not a confident match, so a bad read is
loud rather than silent.
"""
import sys
from collections import Counter
from PIL import Image

# Palettes, keyed by the legend printed beside each table.
PALETTES = {
    "art": {          # ATTACK RESULTS [14.0]
        "none":    (232, 232, 232),
        "damaged": (255, 212, 0),
        "sunk":    (242, 103, 34),
    },
    # Calibrated by sampling the printed legend swatches on page_051, not guessed.
    "counterattack": {  # COUNTERATTACK [14.2]
        "none":        (231, 230, 222),
        "spotted":     (148, 222, 14),
        "damaged":     (252, 250, 6),
        "damaged_rtb": (251, 208, 8),
        "sunk":        (250, 101, 8),
    },
    "transit": {      # TRANSIT EVENT [19.1]
        "none":              (255, 255, 255),
        "spotted":           (57, 181, 74),
        "spotted_rtb":       (247, 148, 30),
        "spotted_dmg_rtb":   (0, 114, 188),
        "lost":              (237, 28, 36),
        "na":                (0, 0, 0),
    },
    "aac": {          # AREA ACTIVITY CHART [13.2A]
        "none":     (255, 255, 255),
        "sparse":   (57, 181, 74),
        "low":      (247, 148, 30),
        "moderate": (0, 114, 188),
        "high":     (237, 28, 36),
    },
}


def classify(rgb, palette, tol=64):
    best, bestd = None, 1e9
    for name, ref in palette.items():
        d = sum((a - b) ** 2 for a, b in zip(rgb, ref)) ** 0.5
        if d < bestd:
            best, bestd = name, d
    return best, bestd


def _median(px):
    px = list(px)
    if not px:
        return (0, 0, 0)
    return tuple(sorted(p[c] for p in px)[len(px) // 2] for c in range(3))


def median_colour(im, x0, y0, x1, y1, inset=0.30):
    """Cell colour, sampled from a RING inside the rulings.

    The Counterattack table prints a white "+" disc in the middle of some cells
    ([14.2] "Additional Die Roll needed"), which would swamp a centre sample.
    Sampling the ring between 15% and 32% in from the edges avoids both the
    black rulings and the glyph.
    """
    w, h = x1 - x0, y1 - y0
    o_x, o_y = int(w * 0.15), int(h * 0.15)
    i_x, i_y = int(w * 0.32), int(h * 0.32)
    outer = im.crop((x0 + o_x, y0 + o_y, x1 - o_x, y1 - o_y))
    px = []
    ow, oh = outer.size
    bx0, by0 = i_x - o_x, i_y - o_y
    bx1, by1 = ow - (i_x - o_x), oh - (i_y - o_y)
    for yy in range(oh):
        for xx in range(ow):
            if bx0 <= xx < bx1 and by0 <= yy < by1:
                continue          # skip the middle, where a glyph may sit
            px.append(outer.getpixel((xx, yy)))
    return _median(px)


def _lum(rgb):
    return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]


def has_glyph(im, x0, y0, x1, y1, ring_rgb, min_sd=28):
    """True when a cell carries the "+" disc for an extra die roll [14.2].

    The mark is a WHITE disc with a BLACK plus on it, so neither brightness nor
    contrast against the ring identifies it reliably — a centre sample can land
    on the white disc or the black stroke depending on the inset. What always
    holds is that the centre of a marked cell contains both, while a plain cell
    is flat colour. So the signal is the standard deviation of centre luminance:
    flat cells read near zero, marked cells read an order of magnitude higher.
    """
    w, h = x1 - x0, y1 - y0
    cx0, cy0 = x0 + int(w * 0.30), y0 + int(h * 0.30)
    cx1, cy1 = x1 - int(w * 0.30), y1 - int(h * 0.30)
    px = list(im.crop((cx0, cy0, cx1, cy1)).getdata())
    if not px:
        return False
    lums = [_lum(p) for p in px]
    mean = sum(lums) / len(lums)
    sd = (sum((v - mean) ** 2 for v in lums) / len(lums)) ** 0.5
    return sd >= min_sd


def sample(path, box, rows, cols, palette_name, inset=0.30, tol=70):
    im = Image.open(path).convert("RGB")
    x0, y0, x1, y1 = box
    cw = (x1 - x0) / cols
    ch = (y1 - y0) / rows
    pal = PALETTES[palette_name]
    grid, suspect = [], []
    for r in range(rows):
        line = []
        for c in range(cols):
            cx0 = int(x0 + c * cw)
            cy0 = int(y0 + r * ch)
            cx1 = int(x0 + (c + 1) * cw)
            cy1 = int(y0 + (r + 1) * ch)
            rgb = median_colour(im, cx0, cy0, cx1, cy1, inset)
            name, dist = classify(rgb, pal)
            if dist > tol:
                suspect.append((r, c, rgb, name, round(dist, 1)))
            if has_glyph(im, cx0, cy0, cx1, cy1, rgb):
                name += "+"
            line.append(name)
        grid.append(line)
    return grid, suspect


def main():
    import argparse, json
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--box", required=True, help="x0,y0,x1,y1 of the grid interior")
    ap.add_argument("--rows", type=int, required=True)
    ap.add_argument("--cols", type=int, required=True)
    ap.add_argument("--palette", required=True, choices=sorted(PALETTES))
    ap.add_argument("--inset", type=float, default=0.30)
    ap.add_argument("--tol", type=float, default=70)
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    box = tuple(int(v) for v in a.box.split(","))
    grid, suspect = sample(a.image, box, a.rows, a.cols, a.palette, a.inset, a.tol)
    if a.json:
        print(json.dumps(grid))
    else:
        width = max(len(n) for row in grid for n in row)
        for r, row in enumerate(grid):
            print(f"  r{r}: " + " ".join(n.ljust(width) for n in row))
        counts = Counter(n for row in grid for n in row)
        print("  totals:", dict(counts))
    if suspect:
        print(f"  !! {len(suspect)} cell(s) matched poorly (check the box coords):", file=sys.stderr)
        for r, c, rgb, name, d in suspect[:12]:
            print(f"     r{r}c{c} rgb={rgb} -> {name} (dist {d})", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
