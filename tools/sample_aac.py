#!/usr/bin/env python3
"""sample_aac.py — read all 23 Area Activity Charts off the map by pixel.

Each OpArea prints an AAC: 4 rows (War Periods 1-4) x 10 columns (die roll 0-9),
each cell coloured for the Activity Level [13.2A]. 920 cells is far too many to
eyeball, so this reads them.

Method. The four SATURATED cell colours are unique on the map at tight
tolerance, so every non-white cell is found as a connected component. Those are
clustered into charts, a lattice is fitted to each cluster (cell pitch is
constant because every panel is the same size), and the grid is then extended
LEFT through the white "no contact" cells until the row is 10 wide. A chart that
does not resolve to exactly 4x10 is reported as a failure rather than guessed at.

The red-box count per row is produced too: [14.2A2] adds it to the Japanese
counterattack total.
"""
import json
import os
import sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAP = os.path.join(ROOT, "Source", "images", "SW_map_final-50.png")

# Sampled off a verified chart (East China Sea), not guessed.
PALETTE = {
    "none":     (255, 255, 255),
    "sparse":   (61, 184, 121),
    "low":      (249, 151, 52),
    "moderate": (0, 118, 188),
    "high":     (238, 52, 57),
}
COLOURED = ["sparse", "low", "moderate", "high"]
CELL_W, CELL_H = 22.0, 23.75      # constant: every AAC panel is 288x165


def classify(rgb):
    best, bestd = None, 1e9
    for name, ref in PALETTE.items():
        d = float(np.linalg.norm(np.array(rgb) - np.array(ref)))
        if d < bestd:
            best, bestd = name, d
    return best, bestd


def find_cells(im):
    from scipy import ndimage
    cells = []
    for name in COLOURED:
        ref = np.array(PALETTE[name])
        d = np.linalg.norm(im - ref, axis=2)
        lab, n = ndimage.label(d < 30)
        for i, sl in enumerate(ndimage.find_objects(lab), start=1):
            ys, xs = sl
            w, h = xs.stop - xs.start, ys.stop - ys.start
            if not (15 <= w <= 30 and 15 <= h <= 32):
                continue
            if (lab[sl] == i).sum() < 200:
                continue
            cells.append(((xs.start + xs.stop) / 2, (ys.start + ys.stop) / 2, name))
    return cells


def cluster(cells, max_dx=300, max_dy=110):
    """Group cells belonging to the same chart panel."""
    groups = []
    for cx, cy, name in cells:
        for g in groups:
            if abs(cx - g["cx"]) < max_dx and abs(cy - g["cy"]) < max_dy:
                g["cells"].append((cx, cy, name))
                g["cx"] = sum(c[0] for c in g["cells"]) / len(g["cells"])
                g["cy"] = sum(c[1] for c in g["cells"]) / len(g["cells"])
                break
        else:
            groups.append({"cx": cx, "cy": cy, "cells": [(cx, cy, name)]})
    return [g for g in groups if len(g["cells"]) >= 3]


def fit_axis(vals, pitch, count, tol=6.0):
    """Best lattice origin for `count` equally spaced positions.

    Anchoring on the extreme cell is fragile: a chart's coloured TITLE BAR can
    shed cell-sized blobs that sit outside the grid. Instead every detected
    coordinate is tried as each of the lattice positions and the origin scoring
    the most inliers wins, so strays are simply outvoted.
    """
    best, bestkey = None, None
    for v in vals:
        for k in range(count):
            origin = v - k * pitch
            positions = [origin + i * pitch for i in range(count)]
            devs = [min(abs(u - p) for p in positions) for u in vals]
            score = sum(1 for d in devs if d <= tol)
            # Ties are common, so break them on total misfit: an origin shifted
            # by a whole pitch scores the same inlier count but fits worse.
            key = (score, -sum(min(d, tol) for d in devs))
            if bestkey is None or key > bestkey:
                bestkey, best = key, positions
    return best, bestkey[0]


def build_grid(im_pil, im, g):
    """Fit the 4x10 lattice to one cluster and read every cell."""
    xs = [c[0] for c in g["cells"]]
    ys = [c[1] for c in g["cells"]]

    # Rows first: the fit tolerates stray blobs shed by a coloured title bar,
    # which always sit ABOVE the grid.
    rows, rscore = fit_axis(ys, CELL_H, 4)

    # Then keep only cells that actually sit on a fitted row, and anchor the
    # columns on the rightmost of those. Die 9 carries colour on every printed
    # chart, so the right edge is a real grid cell — whereas a left anchor would
    # have to guess past the white "no contact" cells.
    inliers = [c for c in g["cells"] if min(abs(c[1] - r) for r in rows) <= 6]
    if not inliers:
        inliers = g["cells"]
    right = max(c[0] for c in inliers)
    cols = [right - (9 - c) * CELL_W for c in range(10)]
    inlier = len(inliers) / float(len(g["cells"]))

    grid, worst = [], 0.0
    for r in range(4):
        row = []
        for c in range(10):
            x, y = cols[c], rows[r]
            box = (int(x - CELL_W * 0.22), int(y - CELL_H * 0.22),
                   int(x + CELL_W * 0.22), int(y + CELL_H * 0.22))
            patch = np.array(im_pil.crop(box)).reshape(-1, 3)
            rgb = tuple(int(v) for v in np.median(patch, axis=0))
            lvl, dist = classify(rgb)
            worst = max(worst, dist)
            row.append(lvl)
        grid.append(row)
    return grid, worst, inlier, cols, rows


def monotone_ok(grid):
    """Sanity: within a row, activity never decreases as the die roll rises.

    That is how every AAC is drawn, so a violation means a misfitted lattice.

    NOTE: a tempting second check — that a later War Period is never hotter than
    an earlier one at the same die roll — is FALSE on the printed map. The Sea of
    Japan, the Carolines and the Gilberts all run hotter in W2 than in W1. It was
    tried, it flagged those three, and inspecting the scans showed the map was
    right and the assumption wrong. Do not add it back.
    """
    order = {"none": 0, "sparse": 1, "low": 2, "moderate": 3, "high": 4}
    for row in grid:
        vals = [order[v] for v in row]
        if any(b < a for a, b in zip(vals, vals[1:])):
            return False
    return True


def main():
    seeds = json.load(open(os.path.join(ROOT, "tools", "aac_seeds.json")))
    im_pil = Image.open(MAP).convert("RGB")
    im = np.array(im_pil).astype(int)

    cells = find_cells(im)
    groups = cluster(cells)
    print(f"detected {len(cells)} coloured cells in {len(groups)} clusters")

    out, problems = {}, []
    used = set()
    for s in seeds:
        sx, sy = s["x"] * im_pil.width, s["y"] * im_pil.height
        best, bestd = None, 1e9
        for i, g in enumerate(groups):
            if i in used:
                continue
            d = ((g["cx"] - sx) ** 2 + (g["cy"] - sy) ** 2) ** 0.5
            if d < bestd:
                best, bestd = i, d
        if best is None or bestd > 260:
            problems.append(f"{s['id']}: no chart cluster within 260px (nearest {bestd:.0f})")
            continue
        used.add(best)
        grid, worst, inlier, cols_used, rows_used = build_grid(im_pil, im, groups[best])
        reds = [sum(1 for v in row if v == "high") for row in grid]
        ok = monotone_ok(grid)
        gx = (cols_used[0] + cols_used[9]) / 2.0
        gy = (rows_used[0] + rows_used[3]) / 2.0
        out[s["id"]] = {"grid": grid, "redBoxes": reds,
                        "centre": [round(gx / im_pil.width, 5),
                                   round(gy / im_pil.height, 5)]}
        flag = "" if ok else "   !! NOT MONOTONE"
        if worst > 40:
            flag += f"   !! worst colour distance {worst:.0f}"
        if inlier < 0.85:
            flag += f"   !! lattice inliers {inlier:.0%}"
        if not ok or worst > 40 or inlier < 0.85:
            problems.append(f"{s['id']}:{flag.strip()}")
        print(f"{s['id']:16s} seed-dist {bestd:5.0f}  reds W1-W4 = {reds}{flag}")

    dest = os.path.join(ROOT, "tools", "aac_sampled.json")
    json.dump(out, open(dest, "w"), indent=1)
    print(f"\nwrote {len(out)}/23 charts to {os.path.relpath(dest, ROOT)}")
    for p in problems:
        print("  PROBLEM:", p, file=sys.stderr)
    return 1 if problems or len(out) != 23 else 0


if __name__ == "__main__":
    sys.exit(main())
