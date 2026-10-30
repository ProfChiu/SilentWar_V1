#!/usr/bin/env python3
"""phase9_verify.py — Phase 9 in a real Chromium: save & resume (autosave,
the Saves sheet, resume rebuilds the game exactly, export), the History
primer, the Fleet board's filters, sorting, standing orders, weekly summary
and history tracker, the optional rules [33.0] in the Scenarios menu, and East
Wind Early [31.6] to its verdict. Zero console errors.

    python3 tools/phase9_verify.py [outdir] [seed]
"""
import os, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = "file://" + os.path.join(ROOT, "apps", "game", "index.html") + "?brief=0&detail=full&coach=0"
OUT = sys.argv[1] if len(sys.argv) > 1 else "."
SEED = int(sys.argv[2]) if len(sys.argv) > 2 else 7
fails, checks = [], 0


def ck(cond, msg):
    global checks
    checks += 1
    if not cond:
        fails.append(msg)
        print("  FAIL:", msg)


CAPTAIN = """(() => { const e = window.__swDebug.patrol(), L = window.__swDebug.legalActions();
    const t = window.SWTeacher.create(window).choose(e, L); return (t && t.action) || L[0]; })()"""


def fights(pg):
    g = 0
    while pg.evaluate("window.__swDebug.fleet() && window.__swDebug.fleet().phase") == "fight" and g < 2000:
        pg.evaluate("a => window.__swDebug.apply(a)", pg.evaluate(CAPTAIN)); g += 1


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1600, "height": 1000})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(PAGE); pg.wait_for_timeout(700)
    pg.click("#speed .seg button:has-text('instant')")

    # ---- the nav fits: every mode button on screen at 1600 wide
    r = pg.evaluate("(() => { const e = document.querySelector('#nav-menu').getBoundingClientRect(); return e.left; })()")
    ck(r <= 1, f"the Menu button is the first thing in the bar ({r:.0f}px)")
    ck(pg.evaluate("[...document.querySelectorAll('#viewnav > *')].every(e => e.getBoundingClientRect().right <= window.innerWidth + 1)"), "nothing in the bar is cut off")
    pg.set_viewport_size({"width": 975, "height": 700}); pg.wait_for_timeout(300)
    ck(pg.evaluate("[...document.querySelectorAll('#viewnav > *')].every(e => e.getBoundingClientRect().right <= window.innerWidth + 1)") and
       pg.evaluate("document.querySelector('#viewnav').getBoundingClientRect().bottom <= document.querySelector('#main').getBoundingClientRect().top + 1"),
       "at 975 px the bar wraps instead of cutting buttons off")
    pg.evaluate("window.__swDebug.view('combat')"); pg.wait_for_timeout(300)
    bw = pg.evaluate("(() => { const b = document.querySelector('#view-combat .board'); return b ? b.getBoundingClientRect().width : 0; })()")
    ck(bw >= 480, f"at 975 px the Combat Display keeps a usable width ({bw:.0f}px)")
    side_x = pg.evaluate("document.querySelector('#side').getBoundingClientRect().left")
    ck(side_x >= 975 - 1, "at 975 px the side panel waits in a drawer")
    pg.click("#nav-details"); pg.wait_for_timeout(350)
    ck(pg.evaluate("document.querySelector('#side').getBoundingClientRect().right") <= 976 and
       pg.evaluate("document.body.classList.contains('side-open')"), "the Rolls button opens the drawer")
    pg.click("#nav-details"); pg.wait_for_timeout(250)
    pg.evaluate("window.__swDebug.view('theater')")
    pg.set_viewport_size({"width": 1600, "height": 1000}); pg.wait_for_timeout(300)
    pg.click("#nav-menu"); pg.wait_for_timeout(200)
    ck(pg.locator("#overlay.open [data-start]").count() >= 7, "the main menu offers every way to play, plus saves and history")
    pg.evaluate("document.querySelector('#overlay').classList.remove('open')")

    # ---- the primer
    pg.click("#nav-menu"); pg.click("#overlay.open [data-start='history']"); pg.wait_for_timeout(300)
    ck(pg.locator("#overlay.open .primer [data-chapter]").count() == 6, "the primer lists six chapters")
    pg.click("#overlay.open [data-chapter='torpedo']"); pg.wait_for_timeout(200)
    txt = pg.inner_text("#overlay")
    ck("Mark XIV" in txt and "Sources:" in txt and "In the game." in txt, "the torpedo chapter: the history, the game, the sources")
    pg.screenshot(path=os.path.join(OUT, "p9_primer.png"))
    pg.evaluate("document.querySelector('#overlay').classList.remove('open')")

    # ---- a campaign, the Fleet board
    pg.evaluate("s => window.__swDebug.startCampaign('rising_sun', s, { auto: 'captain' })", SEED); pg.wait_for_timeout(400)
    ck(pg.locator("#view-fleet .week-summary").count() == 1, "the Fleet board has the weekly summary")
    ck(pg.locator("#view-fleet .history-chart").count() == 1, "and the history tracker")
    pg.check("#view-fleet input[data-standing='manila']"); pg.wait_for_timeout(300)
    ordered = pg.evaluate("Object.keys(window.__swDebug.fleet().sail).length")
    ck(ordered >= 20, f"a standing order sails Manila's boats at once ({ordered})")
    ck(pg.evaluate("window.__swDebug.state().campaignSettings.standing.manila") is True, "the standing order is kept with the campaign's settings")
    for wk in range(5):
        pg.click("#run-week"); pg.wait_for_timeout(250); fights(pg)
        if pg.evaluate("window.__swDebug.state().view") != "fleet":
            pg.evaluate("window.__swDebug.view('fleet')"); pg.wait_for_timeout(150)
    ck(pg.evaluate("window.__swDebug.fleet().weeks.length") >= 5, "five weeks summed up")
    ws = pg.inner_text("#week-summary")
    ck("Last week" in ws, "the summary names last week")
    pg.click("#view-fleet [data-filter='station']"); pg.wait_for_timeout(200)
    groups = pg.evaluate("[...document.querySelectorAll('#view-fleet h3')].map(h => h.textContent)")
    ck(not any(g.startswith("Ready for Sea") or g.startswith("In port") for g in groups), f"the On-station filter hides the other groups ({groups})")
    pg.click("#view-fleet [data-filter='all']"); pg.wait_for_timeout(150)
    pg.select_option("#fleet-sort", "sunk"); pg.wait_for_timeout(200)
    ck(pg.evaluate("window.__swDebug.state().fleetUi.sort") == "sunk", "sorting by tonnage")
    if pg.locator("#mark-best").count():
        pg.click("#mark-best"); pg.wait_for_timeout(200)
        ck(pg.evaluate("Object.keys(window.__swDebug.fleet().fight).length") >= 1, "one button ticks the most promising fights")
    pg.screenshot(path=os.path.join(OUT, "p9_fleet_board.png"))

    # ---- save & resume
    rec = pg.evaluate("window.__swDebug.saveRecord()")
    stored = pg.evaluate("JSON.parse(localStorage.getItem('sw.save.campaign'))")
    ck(stored and stored["kind"] == "campaign" and len(stored["played"]) == len(rec["played"]), f"the campaign autosaved ({len(rec['played'])} decisions)")
    before = pg.evaluate("(() => { const f = window.__swDebug.fleet(); return [f.turn, f.war.mine.tons, f.lost, f.log.length, Object.keys(f.fight).length]; })()")
    pg.evaluate("window.__swDebug.startPatrol(5)"); pg.wait_for_timeout(200)
    pg.click("#nav-menu"); pg.click("#overlay.open [data-start='saves']"); pg.wait_for_timeout(300)
    ck(pg.locator("#overlay.open [data-resume='campaign']").count() == 1, "the Saves sheet offers the campaign")
    pg.screenshot(path=os.path.join(OUT, "p9_saves.png"))
    with pg.expect_download() as dl:
        pg.click("#overlay.open [data-export='campaign']")
    ck(dl.value.suggested_filename.startswith("silent-war-campaign"), "a save exports to a file")
    pg.click("#overlay.open [data-resume='campaign']"); pg.wait_for_timeout(600)
    after = pg.evaluate("(() => { const f = window.__swDebug.fleet(); return [f.turn, f.war.mine.tons, f.lost, f.log.length, Object.keys(f.fight).length]; })()")
    ck(after == before, f"resume rebuilds the campaign exactly ({before} -> {after})")
    ck(pg.evaluate("window.__swDebug.state().campaignSettings.standing.manila") is True, "and keeps its standing orders")

    # ---- the optional rules in the menu, and a campaign with them
    pg.click("#nav-menu"); pg.click("#overlay.open [data-start='scenarios']"); pg.wait_for_timeout(300)
    ck(pg.locator("#overlay.open [data-optional]").count() == 7, "six optional rules [33.0]-[34.0] and the Historical pace house rule in the Scenarios menu")
    pg.evaluate("document.querySelector('details.optional-rules').open = true")
    pg.check("#overlay.open [data-optional='allied']"); pg.check("#overlay.open [data-optional='surcouf']")
    pg.click("#overlay.open [data-campaign='rising_sun']"); pg.wait_for_timeout(500)
    ck(pg.evaluate("window.__swDebug.fleet().opt.allied") is True and pg.evaluate("window.__swDebug.fleet().boats.length") == 47,
       "Allied submarines: the Dutch boats join the order of battle [33.14]")
    ck("Allied boats" in pg.inner_text("#view-fleet"), "the Fleet board shows the Allied tally")
    pg.evaluate("localStorage.setItem('sw.optional', '{}')")

    # ---- East Wind Early, to its verdict
    pg.evaluate("s => window.__swDebug.startCampaign('east_wind', s, { auto: 'captain' })", SEED); pg.wait_for_timeout(400)
    ck(pg.evaluate("window.__swDebug.fleet().boats.length") == 23, "East Wind Early: 23 S-boats [31.63]")
    ck(pg.locator("#view-fleet .hc-hist").count() == 0 and pg.locator("#view-fleet .hc-mine").count() == 1, "a hypothetical war: your line, no history line")
    g = 0
    while not pg.evaluate("window.__swDebug.fleet().done") and g < 60:
        g += 1
        if pg.locator("#sail-suggested").count():
            pg.click("#sail-suggested"); pg.wait_for_timeout(100)
        fights(pg)
        if pg.evaluate("window.__swDebug.fleet().done"):
            break
        pg.evaluate("window.__swDebug.apply({ type: 'run_week' })"); fights(pg)
    ck(pg.evaluate("window.__swDebug.fleet().done"), f"East Wind Early ends ({g} weeks)")
    pg.wait_for_timeout(300)
    if not pg.locator("#overlay.open .campaign-report").count():
        pg.evaluate("window.__swDebug.debrief()"); pg.wait_for_timeout(300)
    rep = pg.inner_text("#overlay")
    ck("[31.66]" in rep and "never happened" in rep, "the report judges it by [31.66], with no history to compare")
    pg.screenshot(path=os.path.join(OUT, "p9_east_wind_report.png"))
    ck(not errs, "zero console errors" + ("" if not errs else ": " + " | ".join(errs[:5])))
    b.close()

print(f"phase9_verify: {checks - len(fails)} passed, {len(fails)} failed")
sys.exit(1 if fails else 0)
