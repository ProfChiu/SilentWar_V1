#!/usr/bin/env python3
"""trace_adjacency.py — recover the OpArea movement graph from the map.

Vassal never modelled adjacency and the rulebook does not list it: it is drawn.
Each OpArea is a pale disc and each legal move is a pale band joining two discs,
in a colour nothing else on the map uses (the ocean is a different blue).

Method: geodesic watershed. Flood outwards from every disc centre at equal speed,
but only through pale pixels. Every pale pixel ends up owned by the disc it is
closest to *along the pale*. Because pale exists only as discs and the bands
between them, two territories can only ever meet inside a band -- so a shared
border IS an edge. The width of that border is reported, and a band is ~40px
wide, so a mere corner touch is easy to reject.
"""
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAP = os.path.join(ROOT, "Source", "images", "SW_map_final-50.png")
PALE, TOL = (90, 186, 234), 26
MIN_BORDER = 18          # px of shared border needed to count as a real band
OPEN_R = 7               # morphological opening radius, see below


def main():
    im = np.array(Image.open(MAP).convert("RGB")).astype(int)
    H, W = im.shape[:2]
    raw = np.linalg.norm(im - np.array(PALE), axis=2) < TOL

    # The map draws a pale COASTAL HALO in the same colour around every
    # landmass. That halo is a connected network hugging every coastline, so a
    # watershed run on the raw mask leaks between areas that are merely near the
    # same island and invents edges. The halo is ~13px wide and the real
    # connector bands are ~38px, so a morphological opening deletes the halo and
    # keeps the bands. This is the single most important step here: without it
    # the traced graph looks plausible and is wrong.
    y, x = np.ogrid[-OPEN_R:OPEN_R + 1, -OPEN_R:OPEN_R + 1]
    pale = ndimage.binary_opening(raw, structure=(x * x + y * y <= OPEN_R * OPEN_R))
    print(f"pale mask: {raw.sum()} px raw -> {pale.sum()} px after removing the "
          f"coastal halo (opening r={OPEN_R})")

    centres = json.load(open(os.path.join(ROOT, "tools", "disc_centres.json")))
    ids = sorted(centres)

    owner = np.zeros((H, W), dtype=np.int16)      # 0 = unowned
    q = deque()
    for i, k in enumerate(ids, start=1):
        cx, cy = int(centres[k][0] * W), int(centres[k][1] * H)
        # A disc centre usually lands on the AAC panel printed inside the disc,
        # so the seed has to be moved onto pale. Snapping to the NEAREST pale
        # pixel is wrong: map art is anti-aliased, and a stray single pixel of
        # disc-blue sits closer than the disc itself, which strands the seed on
        # a one-pixel island. Take the largest pale component in the window.
        y0, y1 = max(0, cy - 260), min(H, cy + 261)
        x0, x1 = max(0, cx - 260), min(W, cx + 261)
        sub = pale[y0:y1, x0:x1]
        sl, sn = ndimage.label(sub)
        if sn == 0:
            print(f"  !! {k}: no pale near its disc centre", file=sys.stderr)
            continue
        counts = ndimage.sum(sub, sl, range(1, sn + 1))
        big = int(np.argmax(counts)) + 1
        ys, xs = np.nonzero(sl == big)
        # Seed at the component pixel closest to the disc centre.
        j = int(np.argmin((ys + y0 - cy) ** 2 + (xs + x0 - cx) ** 2))
        cy, cx = int(ys[j] + y0), int(xs[j] + x0)
        owner[cy, cx] = i
        q.append((cy, cx))

    # Multi-source BFS: equal-speed flood, so ties are broken by path length.
    while q:
        y, x = q.popleft()
        o = owner[y, x]
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and pale[ny, nx] and owner[ny, nx] == 0:
                owner[ny, nx] = o
                q.append((ny, nx))

    claimed = int((owner > 0).sum())
    print(f"watershed claimed {claimed} of {int(pale.sum())} pale px "
          f"({claimed / pale.sum():.1%})")

    # Shared borders between territories.
    border = {}
    a = owner[:, :-1]
    b = owner[:, 1:]
    m = (a > 0) & (b > 0) & (a != b)
    for u, v in zip(a[m], b[m]):
        border[tuple(sorted((int(u), int(v))))] = border.get(tuple(sorted((int(u), int(v)))), 0) + 1
    a = owner[:-1, :]
    b = owner[1:, :]
    m = (a > 0) & (b > 0) & (a != b)
    for u, v in zip(a[m], b[m]):
        border[tuple(sorted((int(u), int(v))))] = border.get(tuple(sorted((int(u), int(v)))), 0) + 1

    edges, weak = [], []
    for (u, v), n in sorted(border.items(), key=lambda kv: -kv[1]):
        pair = (ids[u - 1], ids[v - 1])
        (edges if n >= MIN_BORDER else weak).append((pair[0], pair[1], n))

    adj = {k: [] for k in ids}
    for x, y, _n in edges:
        adj[x].append(y)
        adj[y].append(x)
    for k in adj:
        adj[k].sort()

    print(f"\n{len(edges)} edges (border >= {MIN_BORDER}px), {len(weak)} rejected as touches\n")
    for k in sorted(adj):
        print(f"  {k:16s} ({len(adj[k])}) -> {', '.join(adj[k])}")
    if weak:
        print("\nrejected weak contacts:", file=sys.stderr)
        for x, y, n in weak:
            print(f"   {x} - {y}  border={n}px", file=sys.stderr)

    out = {"adjacency": adj,
           "edges": [[x, y, n] for x, y, n in edges],
           "rejected": [[x, y, n] for x, y, n in weak]}
    dest = os.path.join(ROOT, "tools", "adjacency_traced.json")
    json.dump(out, open(dest, "w"), indent=1)
    print(f"\nwrote {os.path.relpath(dest, ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
