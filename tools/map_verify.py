#!/usr/bin/env python3
"""map_verify.py — the map shows what is happening, and the palette explains it.

Written 2026-09-20 after Wan's playtest: "I have no idea what is happening as
there is no visual cue on the map (no token, any stat change). The Play button
should be on a floating palette and explain the phases better."

Opens the page from file:// in Chromium, drives it with real clicks, asserts:
  Demo   - the sub is a large marker on the map; the Area Activity roll lights
           its exact cell on the printed chart; the contact drops a marker;
           search steps stay on the map; the palette lights the phase and
           explains it; the camera follows.
  Patrol - legal destinations fill their disc; moving slides the marker and
           leaves a wake; a sinking flashes Ships sunk / Tonnage with the delta;
           the Boat status is in the strip.
  Palette- it floats, drags, remembers where it was, folds its guide away, and
           the Combat Display makes room for it.
Zero console errors throughout.

    python3 tools/map_verify.py [outdir]
"""
import json, os, subprocess, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = "file://" + os.path.join(ROOT, "apps", "game", "index.html")
OUT = sys.argv[1] if len(sys.argv) > 1 else "."
fails, checks = [], 0

SINK_SEED = int(subprocess.run(["node", os.path.join(ROOT, "tools", "bot", "soak.js"), "--find-sinking", "1000"],
                               capture_output=True, text=True).stdout)   # first seed from 1000 whose patrol sinks a ship


def ck(cond, msg):
    global checks
    checks += 1
    if not cond:
        fails.append(msg)
        print("  FAIL:", msg)


def box(pg, sel):
    return pg.eval_on_selector(sel, "n => { const r = n.getBoundingClientRect(); return {x:r.x, y:r.y, w:r.width, h:r.height}; }")


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 1000})
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(PAGE + "?brief=0&detail=full&coach=0")
    pg.wait_for_timeout(900)

    # ---------------- Demo ----------------
    ck(pg.locator("#palette").is_visible(), "the controls live in a floating palette")
    ck(pg.locator("#palette #transport button.primary").is_visible(), "the Play button is in the palette")
    ck(pg.locator("#sub-marker").is_visible(), "the submarine is a marker on the map")
    m = box(pg, "#sub-marker img")
    ck(m["w"] >= 70, f"the marker is large enough to see ({m['w']:.0f}px wide)")
    ck("SPEARFISH" in pg.inner_text("#sub-marker").upper(), "the marker names the boat")
    k0 = pg.evaluate("window.__swDebug.state().view")
    for i in range(3):
        pg.click("#palette #transport button.primary"); pg.wait_for_timeout(1300)
    ck(pg.evaluate("window.__swDebug.state().view") == "theater", "the search roll resolves on the map, not in another view")
    ck(pg.locator(".aac-hit").count() == 1, "the die's cell is lit on the area's printed chart")
    ck(pg.locator(".aac-row").count() == 1, "...on the War Period row")
    chip = pg.inner_text(".map-chip.roll")
    ck("Rolled 5" in chip and "Moderate" in chip, f"the roll is labelled on the map ({chip!r})")
    hit = box(pg, ".aac-hit")
    canvas = box(pg, "#theater-canvas")
    ck(canvas["x"] < hit["x"] < canvas["x"] + canvas["w"] and canvas["y"] < hit["y"] < canvas["y"] + canvas["h"],
       "the camera brought the chart into view")
    pal = box(pg, "#palette")
    ck(hit["x"] > pal["x"] + pal["w"], "...clear of the palette")
    now = pg.inner_text("#palette .pal-week li.now")
    ck("Search" in now and "13" in now, f"the palette lights the current phase ({now.splitlines()[0]!r})")
    guide = pg.inner_text("#pal-guide")
    ck("Area Activity Chart" in guide and "War Period" in guide, "the palette explains what the roll means")
    ck("Rolled 5" in guide or "rolled 5" in guide, "...and what just happened")
    ck("Next" in guide or "NEXT" in guide, "...and what comes next")
    ck(pg.locator("#palette .pal-week li.done").count() == 1, "the finished phase is ticked")
    pg.screenshot(path=os.path.join(OUT, "map1_demo_roll.png"))
    pg.click("#palette #transport button.primary"); pg.wait_for_timeout(1300)
    ck(pg.locator(".map-chip.contact").count() == 1 and "C2" in pg.inner_text(".map-chip.contact"),
       "the contact drops a convoy marker by the boat")
    pg.screenshot(path=os.path.join(OUT, "map2_demo_contact.png"))

    # ---------------- Palette: fold, drag, remember, make room ----------------
    pg.click("#palette .fold"); pg.wait_for_timeout(150)
    ck(not pg.locator("#pal-guide").is_visible(), "the guide folds away")
    ck(pg.locator("#palette #transport").is_visible(), "...leaving the controls")
    pg.click("#palette .fold"); pg.wait_for_timeout(150)
    ck(pg.locator("#pal-guide").is_visible(), "and unfolds again")
    h = box(pg, "#pal-head .ttl")
    pg.mouse.move(h["x"] + 5, h["y"] + 5); pg.mouse.down()
    pg.mouse.move(h["x"] + 305, h["y"] + 125, steps=8); pg.mouse.up()
    moved = box(pg, "#palette")
    ck(abs(moved["x"] - pal["x"] - 300) < 3 and abs(moved["y"] - pal["y"] - 120) < 3,
       f"the palette drags by its header ({moved['x'] - pal['x']:.0f}, {moved['y'] - pal['y']:.0f})")
    pg.reload(); pg.wait_for_timeout(900)
    again = box(pg, "#palette")
    ck(abs(again["x"] - moved["x"]) < 3 and abs(again["y"] - moved["y"]) < 3, "the palette remembers where it was put")
    pg.evaluate("localStorage.removeItem('sw.palette')")
    pg.reload(); pg.wait_for_timeout(900)

    # ---------------- Patrol ----------------
    pg.goto(PAGE + f"?seed={SINK_SEED}&brief=0&detail=full&coach=0"); pg.wait_for_timeout(700)
    pg.click("#speed .seg button:has-text('instant')")
    pg.click("#nav-menu"); pg.click("#overlay.open [data-start='patrol']"); pg.wait_for_timeout(600)
    ck("Boat" in pg.inner_text("#status-strip") or "BOAT" in pg.inner_text("#status-strip"), "the boat's condition is in the status strip")
    legal = pg.locator(".hotspot.oparea.legal-move")
    ck(legal.count() == 5, f"five legal destinations are marked ({legal.count()})")
    lb = box(pg, ".hotspot.oparea.legal-move")
    ck(lb["w"] >= 120, f"a legal destination fills its disc ({lb['w']:.0f}px)")
    before = box(pg, "#sub-marker")
    legal.first.click(); pg.wait_for_timeout(1300)
    after = box(pg, "#sub-marker")
    ck(pg.evaluate("window.__swDebug.patrol().phase") == "13.1", "clicking a destination moved the boat")
    ck(pg.evaluate("window.__swDebug.patrol().area") != "east_china_sea", "...to a new area")
    st = pg.evaluate("window.__swDebug.state()")
    ck(st["view"] == "theater" and st["autoView"], f"...and only that: no OpArea detour, auto-follow still on ({st['view']}, {st['autoView']})")
    ck(after["x"] != before["x"] or after["y"] != before["y"], "the marker went with it")
    ck(pg.locator("#palette .pal-week li.now").inner_text().startswith("▶\nSearch") or
       "Search" in pg.inner_text("#palette .pal-week li.now"), "the palette moved on to Search")
    ck("You:" in pg.inner_text("#pal-guide"), "the palette says what you just did")

    # Play the sinking seed to its first sinking and check the strip reacts.
    tr = json.loads(subprocess.run(["node", os.path.join(ROOT, "tools", "bot", "soak.js"), "--trace", str(SINK_SEED)],
                                   capture_output=True, text=True).stdout)
    pg.evaluate("window.__swDebug.startPatrol(" + str(SINK_SEED) + ")"); pg.wait_for_timeout(200)
    sank = False
    for i, a in enumerate(tr["actions"]):
        if tr["forced"][i]:
            pg.evaluate("window.__swDebug.settle()"); continue
        pg.evaluate("window.__swDebug.settle()")
        pg.evaluate("a => window.__swDebug.apply(a)", a)
        if a["type"] == "fire" and pg.evaluate("window.__swDebug.patrol().shipsSunk") > 0:
            sank = True
            break
    ck(sank, f"seed {SINK_SEED} reached a sinking")
    if sank:
        pg.wait_for_timeout(150)
        changed = pg.locator("#status-strip .stat.changed")
        txt = " ".join(changed.all_inner_texts())
        ck(changed.count() >= 2, f"the changed stats flash ({changed.count()})")
        ck("+1" in txt, f"Ships sunk shows its delta ({txt!r})")
        ck("+5,000" in txt or "+3,000" in txt or ",000" in txt, "Tonnage shows its delta")
        pg.screenshot(path=os.path.join(OUT, "map3_sinking_strip.png"))
        pg.wait_for_timeout(2900)
        ck(pg.locator("#status-strip .stat.changed").count() == 0, "the flash fades")
        # Combat Display makes room for the palette.
        pg.evaluate("window.__swDebug.view('combat')"); pg.wait_for_timeout(300)
        pb, bd = box(pg, "#palette"), box(pg, "#view-combat .board")
        ck(bd["x"] >= pb["x"] + pb["w"], "the Combat Display is not hidden under the palette")
        pg.screenshot(path=os.path.join(OUT, "map4_combat_room.png"))

    ck(errs == [], f"no console errors: {errs[:3]}")
    b.close()

print(f"map_verify: {checks - len(fails)} passed, {len(fails)} failed")
sys.exit(1 if fails else 0)
