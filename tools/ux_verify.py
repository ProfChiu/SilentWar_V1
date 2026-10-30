#!/usr/bin/env python3
"""ux_verify.py — drive the Patrol UX by clicking the board, the way a player does.

live_verify.py proves the engine is reachable; this proves the BOARD is the
interface: counters are clicked, not chosen from a list.
Run the project over HTTP first, then: python3 tools/ux_verify.py [outdir]
"""
import os, sys
from playwright.sync_api import sync_playwright

OUT = sys.argv[1] if len(sys.argv) > 1 else "."
fails, checks = [], 0
def ck(c, m):
    global checks; checks += 1
    if not c:
        fails.append(m); print("  FAIL:", m)

with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={"width": 1600, "height": 1000})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto("http://localhost:8765/apps/game/index.html?seed=1&brief=0&detail=full&coach=0", wait_until="networkidle")  # seeded: same patrol every run
    pg.wait_for_timeout(1000)
    pg.click("#speed .seg button:has-text('instant')")
    pg.click("#nav-menu"); pg.click("#overlay.open [data-start='patrol']"); pg.wait_for_timeout(400)

    # ---- movement happens on the map ----
    side = pg.inner_text("#palette").lower()   # the phase prompt lives in the floating palette
    ck("12.0" in side and "▶" in side and "move" in side, "the palette lights the current phase (Move [12.0])")
    ck("click an adjacent oparea" in side, "the prompt says how to act")
    lm = pg.locator(".hotspot.legal-move").count()
    ck(lm == 5, f"five legal destinations glow on the map, got {lm}")
    # ---- version line, and the odds on the map before you move ----
    ck("v" in pg.inner_text("#status-strip .brand .build"), "the build version is named under the title")
    pg.locator(".hotspot.legal-move").first.hover(); pg.wait_for_timeout(150)
    card = pg.inner_text("#hovercard") if pg.is_visible("#hovercard") else ""
    ck("Contact if you search" in card and "%" in card, "hovering a destination shows its contact odds")
    ck("Red boxes" in card and "From base" in card, "...its counterattack red boxes and range")
    ck("Click to move" in card, "...and that the click is legal")
    pg.screenshot(path=os.path.join(OUT, "ux1_move.png"))
    pg.mouse.move(5, 5)
    pg.evaluate("window.__swDebug.act('stay')"); pg.wait_for_timeout(250)
    ck(pg.locator(".hotspot.legal-move").count() == 0, "highlights clear once movement is over")

    # ---- find a contact ----
    got = False
    for _ in range(10):
        st = pg.evaluate("window.__swDebug.patrol()")
        if st["phase"] == "13.1":
            pg.evaluate("window.__swDebug.act('search')"); pg.wait_for_timeout(250)
        st = pg.evaluate("window.__swDebug.patrol()")
        if st["phase"] == "14.11":
            got = True; break
        if st["phase"] == "16.0":
            pg.evaluate("window.__swDebug.act('end_turn')"); pg.wait_for_timeout(200)
            pg.evaluate("window.__swDebug.act('stay')"); pg.wait_for_timeout(200)
    ck(got, "reached a contact")

    if got:
        pg.evaluate("window.__swDebug.view('combat')"); pg.wait_for_timeout(350)
        ck(pg.locator("#view-combat .slot.actionable").count() == 8,
           "all eight submarine boxes are offered for placement")
        pg.locator("#view-combat .slot.actionable").nth(2).click(); pg.wait_for_timeout(300)
        st = pg.evaluate("window.__swDebug.patrol()")
        ck(st["sub"]["column"] is not None, "clicking a submarine box took a column")
        ck(st["phase"] == "14.12", "advanced to the reveal step")
        ck("reveal" in pg.inner_text("#palette").lower(), "the prompt explains the reveal budget")
        n = pg.locator("#view-combat .slot.actionable").count()
        ck(n > 0, f"face-down counters are clickable ({n})")
        pg.screenshot(path=os.path.join(OUT, "ux2_reveal.png"))

        for _ in range(8):
            loc = pg.locator("#view-combat .slot.actionable")
            if not loc.count(): break
            loc.first.click(); pg.wait_for_timeout(160)
            if pg.evaluate("window.__swDebug.patrol()")["phase"] != "14.12": break
        st = pg.evaluate("window.__swDebug.patrol()")
        ck(st["revealedThisRound"] == st["sub"]["tactical"], "reveals stop at the Tactical rating")
        ck(any(u["revealed"] for u in st["units"]), "counters actually flipped")

        # No acknowledgement press: with the reveal budget spent, the game moves
        # on to TDC placement by itself (only one legal action was left).
        st = pg.evaluate("window.__swDebug.patrol()")
        ck(st["phase"] == "14.13", f"the game proceeds to TDC placement by itself, phase {st['phase']}")
        ck(pg.evaluate("window.__swDebug.pacing()")["presses"] == pg.evaluate("window.__swDebug.pacing()")["decisions"],
           "every press so far was a decision")
        for _ in range(8):
            if pg.evaluate("window.__swDebug.patrol()")["phase"] != "14.13": break
            loc = pg.locator("#view-combat .slot.actionable")
            if not loc.count(): break
            loc.first.click(); pg.wait_for_timeout(160)
        st = pg.evaluate("window.__swDebug.patrol()")
        ck(st["tdcPlaced"] > 0, f"TDC markers placed by clicking ({st['tdcPlaced']})")
        pg.wait_for_timeout(350)
        ck(pg.evaluate("window.__swDebug.patrol()")["phase"] in ("14.14",),
           "the TDC markers turn over by themselves once they are all placed")
        tdcimgs = pg.locator("#view-combat .slot img[src*='tdc_']").count()
        ck(tdcimgs == st["tdcPlaced"],
           f"every placed TDC marker renders on the board ({tdcimgs} of {st['tdcPlaced']})")
        pg.screenshot(path=os.path.join(OUT, "ux3_tdc.png"))

        st = pg.evaluate("window.__swDebug.patrol()")
        if st["phase"] == "14.14":
            loc = pg.locator("#view-combat .slot.actionable")
            if loc.count():
                loc.first.click(); pg.wait_for_timeout(300)
                ck(pg.locator(".alloc-row").count() == 1, "an allocation row appears for the target")
                ck(pg.locator("#view-combat .slot.targeted").count() == 1, "the target is marked on the board")
                ck(pg.locator("#view-combat .slot .pts").count() == 1, "its point count shows on the counter")
                before = pg.evaluate("window.__swDebug.patrol().allocations[0].points")
                pg.locator(".alloc-row .step").nth(1).click(); pg.wait_for_timeout(220)
                after = pg.evaluate("window.__swDebug.patrol().allocations[0].points")
                ck(after == before + 1, f"the + control adds a point ({before} -> {after})")
                ck("unassigned" in pg.inner_text("#palette").lower(), "the prompt tracks unassigned points")
                bar = pg.inner_text("#palette .choices")
                ck("Fire" in bar, "Fire is offered under Your move")
                ck("Reveal a counter" not in bar, "the choices never list per-counter actions")
                pg.locator("#view-combat .slot.targeted").first.hover(); pg.wait_for_timeout(150)
                card = pg.inner_text("#hovercard") if pg.is_visible("#hovercard") else ""
                ck("To hit" in card and ("%" in card or "impossible" in card), f"hovering a target shows the roll needed and the odds (or why it cannot hit)")
                ck("with 2 points" in card, "...for the points actually allocated")
                pg.screenshot(path=os.path.join(OUT, "ux4_target.png"))
                sub = pg.locator("#view-combat button.slot.filled[title], #view-combat button.slot.filled").filter(
                    has=pg.locator("img.counter-drop")).first
                sub.hover(); pg.wait_for_timeout(150)
                card = pg.inner_text("#hovercard") if pg.is_visible("#hovercard") else ""
                ck("counterattack" in card.lower() and "Sunk" in card, "hovering the submarine shows the counterattack odds")
                pg.mouse.move(5, 5)
                pg.click("#palette .choices button:has-text('Fire')"); pg.wait_for_timeout(400)
                st = pg.evaluate("window.__swDebug.patrol()")
                ck(st["phase"] in ("14.3", "16.0"), f"firing resolves the round, phase {st['phase']}")
                ck(any(r["table"].startswith("To-hit") for r in st["log"]), "the attack was logged")
                res = pg.inner_text("#side")
                ck("To-hit" in res or "need" in res.lower(),
                   "the attack ledger is still on screen after firing")
                ck("Counterattack" in res, "the counterattack ledger is shown too")
                ck(pg.locator("#side .dicebox").count() >= 2,
                   "every roll from the fire step is shown, not just the last")
                attacks = sum(1 for r in pg.evaluate("window.__swDebug.patrol()")["log"]
                              if r["table"].startswith("To-hit"))
                badges = pg.locator("#view-combat .slot .result").count()
                ck(badges >= attacks, f"every attack lands as a badge on the board ({badges} for {attacks})")
                sunk = [u for u in pg.evaluate("window.__swDebug.patrol()")["units"] if u["sunk"]]
                ck(pg.locator("#view-combat .slot.wreck").count() == len(sunk),
                   f"sunk ships stay on the board as wrecks ({len(sunk)})")
                ck(pg.locator(".radio-line").count() >= 3, "the radio log carries the patrol's reports")
                pg.locator(".radio-line").first.click(); pg.wait_for_timeout(150)
                ck(pg.locator(".radio-why .ledger").count() == 1, "clicking a radio line opens its full ledger")
                pg.screenshot(path=os.path.join(OUT, "ux5_result.png"))
                if pg.locator("#palette .choices button:has-text('Re-Attack')").count():
                    pg.locator("#palette .choices button:has-text('Re-Attack')").hover(); pg.wait_for_timeout(150)
                    card = pg.inner_text("#hovercard") if pg.is_visible("#hovercard") else ""
                    ck("If you Re-Attack" in card, "hovering Re-Attack shows what the next counterattack risks")
                    pg.mouse.move(5, 5)
                if pg.locator("#palette .choices button:has-text('Withdraw')").count():
                    pg.click("#palette .choices button:has-text('Withdraw')"); pg.wait_for_timeout(400)
                    pg.evaluate("window.__swDebug.settle()")
                pace = pg.evaluate("window.__swDebug.pacing()")
                ck(pace["presses"] == pace["decisions"] and pace["auto"] > 0,
                   f"one press per decision, forced steps automatic ({pace})")

    # ---- the calendar advances ----
    st = pg.evaluate("window.__swDebug.patrol()")
    st = pg.evaluate("window.__swDebug.patrol()")
    ck(st["turn"] >= 2 or st["done"], f"the week concluded by itself (turn {st['turn']})")
    ck("wk 1" not in pg.inner_text("#status-strip") or st["done"], "the date advances when the turn ends")

    ck(errs == [], f"no console errors: {errs[:3]}")
    b.close()

print(f"ux_verify: {checks - len(fails)} passed, {len(fails)} failed")
sys.exit(1 if fails else 0)
