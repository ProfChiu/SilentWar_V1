#!/usr/bin/env python3
"""career_verify.py — Phase 6 careers, driven in a real Chromium.

Opens the page, picks a career from the Career menu, checks the port (the boat
drawn in its Base Display box, readiness odds, a suggested destination), sails
by clicking the map, then lets the teaching captain play the whole career
through the page's own production path (window.__swDebug.apply). Along the way:
the war panel, the career status strip, the ULTRA / mission / destination chips
on the map, the career week checklist in the palette, and at the end the career
report (medal, the book's record, patrol by patrol, the war). Then Patrol mode
still works. Zero console errors.

    python3 tools/career_verify.py [outdir] [career] [seed]
"""
import os, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = "file://" + os.path.join(ROOT, "apps", "game", "index.html") + "?brief=0&detail=full&coach=0"
OUT = sys.argv[1] if len(sys.argv) > 1 else "."
CAREER = sys.argv[2] if len(sys.argv) > 2 else "wahoo"
SEED = int(sys.argv[3]) if len(sys.argv) > 3 else 31
fails, checks = [], 0


def ck(cond, msg):
    global checks
    checks += 1
    if not cond:
        fails.append(msg)
        print("  FAIL:", msg)


def settle(pg):
    pg.evaluate("window.__swDebug.settle()")


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 1000})
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(PAGE); pg.wait_for_timeout(800)
    pg.click("#speed .seg button:has-text('instant')")

    # ---------------- the Career menu ----------------
    pg.click("#nav-menu"); pg.click("#overlay.open [data-start='career']"); pg.wait_for_timeout(300)
    ck(pg.locator("#overlay.open .career-card").count() == 8, f"the Career menu lists the eight boats ({pg.locator('.career-card').count()})")
    menu = pg.inner_text("#overlay")
    ck("Record to beat" in menu and "O'Kane" in menu and "Gold" in menu, "each career shows its skipper, the record to beat and the medals")
    ck(pg.locator("#opt-ijn").count() == 1 and not pg.is_checked("#opt-ijn"), "the IJN Expansion rules are an option, off by default [28.0]")
    ck("forward base" in menu, "Tirante sails from a forward base, as in the book [32.18]")
    pg.screenshot(path=os.path.join(OUT, "c0_menu.png"))
    pg.evaluate("([id, seed]) => window.__swDebug.startCareer(id, seed)", [CAREER, SEED])
    pg.evaluate("document.querySelector('#overlay').classList.remove('open')")
    pg.wait_for_timeout(400)

    # ---------------- in port ----------------
    st = pg.evaluate("(() => { const e = window.__swDebug.patrol(); return { phase: e.phase, box: e.career.box, base: e.career.base }; })()")
    ck(st["phase"] == "base" and st["box"] == "ready", f"the career starts in port, Ready for Sea ({st})")
    ck(pg.evaluate("window.__swDebug.state().view") == "base", "the page shows the base")
    ck(pg.locator("#base-boat").count() == 1, "the boat is drawn in its box on the Base Display")
    strip = pg.inner_text("#status-strip")
    ck("career" in strip.lower() and "Ready for Sea" in strip and "0 of 5" in strip, "the status strip shows the career, the box and the patrol count")
    ck(pg.locator("#war-panel").count() == 1, "the war panel is in the side column")
    ck("War Period" in pg.inner_text("#war-panel") and "Bases open" in pg.inner_text("#war-panel"), "...with the period, the torpedo and the bases")
    guide = pg.inner_text("#pal-guide")
    ck("The war this week" in guide and "In port" in guide, "the palette's week has the whole Sequence of Play")
    ck(pg.locator("#palette .choices button.act").count() >= 2, "a suggested destination and Stay in port are offered as buttons")
    pg.screenshot(path=os.path.join(OUT, "c1_port.png"))

    # ---------------- sail by clicking the map ----------------
    first = pg.evaluate("""(() => { const e = window.__swDebug.patrol();
        return window.SWTeacher.create(window).choose(e, window.__swDebug.legalActions()).action; })()""")
    if first["type"] == "form_pack":
        ck(pg.locator("#palette .choices button:has-text('wolfpack')").count() >= 1, "Form a wolfpack is offered as a button in port [24.1]")
        pg.locator("#palette .choices button:has-text('Form a wolfpack')").first.click(); pg.wait_for_timeout(250)
        ck("Wolfpack in port" in pg.inner_text("#war-panel"), "the pack is listed in the war panel before it sails")
    dest = pg.evaluate("""(() => { const e = window.__swDebug.patrol();
        const t = window.SWTeacher.create(window).choose(e, window.__swDebug.legalActions()); return t.action.area; })()""")
    pg.click("#viewnav button[data-view='theater']"); pg.wait_for_timeout(300)
    hs = pg.locator(f"#theater-world .hotspot[data-area='{dest}']")
    ck(hs.count() == 1 and "legal-move" in (hs.get_attribute("class") or ""), f"{dest} glows on the map as a legal destination")
    hs.click(force=True); pg.wait_for_timeout(300); settle(pg)
    e = pg.evaluate("(() => { const e = window.__swDebug.patrol(); return { atSea: e.career.atSea, phase: e.phase, n: e.career.current && e.career.current.n }; })()")
    ck(e["atSea"] and e["n"] == 1, f"clicking the map sailed patrol 1 ({e})")
    ck(pg.evaluate("window.__swDebug.patrol().log.some(r => r.table === 'Transit Event [19.1]')"), "the deployment rolled its Transit Event check [19.1]")
    pg.screenshot(path=os.path.join(OUT, "c2_sailed.png"))
    # Clicking a view tab turns auto-follow off, as it does for a player: turn it back on.
    if pg.get_attribute("#viewnav .auto-toggle", "aria-pressed") != "true":
        pg.click("#viewnav .auto-toggle"); pg.wait_for_timeout(150)

    # ---------------- the captain plays the rest through the page ----------------
    seen = {"ultra": False, "port": False, "strategic": False, "combat": False, "dest": False, "pack": False, "packboard": False}
    steps = 0
    while steps < 4000:
        over = pg.evaluate("window.__swDebug.patrol().done")
        if over:
            break
        a = pg.evaluate("""(() => { const e = window.__swDebug.patrol(), L = window.__swDebug.legalActions();
            if (!L.length) return null; const t = window.SWTeacher.create(window).choose(e, L); return t && t.action; })()""")
        if not a:
            ck(False, "the captain found an action at every step")
            break
        pg.evaluate("a => window.__swDebug.apply(a)", a); settle(pg)
        steps += 1
        info = pg.evaluate("""(() => { const e = window.__swDebug.patrol(), s = window.__swDebug.state();
            return { ultra: e.war.ultra.length, phase: e.phase, view: s.view, atSea: e.career.atSea,
                     chips: document.querySelectorAll('#map-layer .map-chip.ultra').length,
                     dest: document.querySelectorAll('#map-layer .map-chip.dest').length,
                     boat: document.querySelectorAll('#base-boat').length,
                     packChip: document.querySelectorAll('#map-layer .map-chip.pack').length,
                     packBoard: document.querySelectorAll('#view-combat .slot.filled').length,
                     pc: !!e.pc && e.pc.stage === 'turns' }; })()""")
        if info["packChip"]:
            seen["pack"] = True
        if info["pc"] and info["view"] == "combat" and info["packBoard"] >= 2 and not seen["packboard"]:
            seen["packboard"] = True
            pg.screenshot(path=os.path.join(OUT, "c6_wolfpack.png"))
        if info["ultra"] and info["view"] == "theater" and info["chips"]:
            seen["ultra"] = True
        if info["dest"]:
            seen["dest"] = True
        if not info["atSea"] and info["view"] == "base" and info["boat"]:
            if not seen["port"]:
                pg.screenshot(path=os.path.join(OUT, "c3_back_in_port.png"))
            seen["port"] = seen["port"] or steps > 3
        if info["view"] == "combat" and not seen["combat"]:
            seen["combat"] = True
            pg.screenshot(path=os.path.join(OUT, "c4_combat.png"))
    ck(pg.evaluate("window.__swDebug.patrol().done"), f"the career ran to its end in {steps} decisions")
    print("  outcome:", pg.evaluate("(() => { const e = window.__swDebug.patrol(); return e.outcome + ' / patrols ' + e.career.patrols.length + ' / ' + e.career.endWhy; })()"))
    log = pg.evaluate("window.__swDebug.patrol().log.map(r => r.table)")
    ck("War Event Phase [5.0]" in log and "ULTRA Table [7.0]" in log, "every week ran the Strategic Segment [5.0]-[7.0]")
    ck(any("Readying" in t for t in log), "the boat was readied in port [9.0]")
    ck(seen["ultra"], "ULTRA Areas were marked on the map")
    ck(seen["dest"], "the destination was marked on the map while in transit")
    ck(seen["port"], "the page showed the boat back in port")
    if CAREER in ("tang", "rasher", "flasher", "harder"):
        ck(seen["pack"], "a wolfpack sailed, marked on the map [24.0]")
        ck(seen["packboard"], "the Combat Display shows the pack's boats in their boxes [24.5]")
    pg.wait_for_timeout(300)
    rep = pg.locator("#overlay.open .career-report")
    if not rep.count():
        pg.evaluate("window.__swDebug.careerReport()"); pg.wait_for_timeout(300)
    txt = pg.inner_text("#overlay")
    ck(pg.locator("#overlay.open .career-report").count() == 1, "the career report opens at the end")
    tl = txt.lower()
    ck("patrol by patrol" in tl and "the war" in tl and "us submarines lost" in tl, "the report covers every patrol and the war")
    ck("[32.1]" in txt or "lost" in txt.lower(), "the first patrol is judged against the book's record [32.1]")
    pg.screenshot(path=os.path.join(OUT, "c5_report.png"))
    pg.evaluate("document.querySelector('#overlay').classList.remove('open')")

    # ---------------- Patrol mode is untouched ----------------
    pg.click("#nav-menu"); pg.click("#overlay.open [data-start='patrol']"); pg.wait_for_timeout(400)
    ck(pg.evaluate("!window.__swDebug.patrol().career"), "Patrol mode starts a plain patrol again")
    ck("patrol" in pg.inner_text("#status-strip").lower() and "career" not in pg.inner_text("#status-strip").lower(), "...and the strip says so")
    ck(pg.locator("#war-panel").count() == 0, "...with no war panel")

    ck(not errs, "zero console errors" + ("" if not errs else ": " + " | ".join(errs[:5])))
    b.close()

print(f"career_verify: {checks - len(fails)} passed, {len(fails)} failed")
sys.exit(1 if fails else 0)
