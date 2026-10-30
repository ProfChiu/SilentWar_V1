#!/usr/bin/env python3
"""campaign_verify.py — Phase 8 scenarios in a real Chromium.

A Patrol Game from the Scenarios menu, played to the book's verdict [32.1];
then The Rising Sun [31.2]: the Fleet board, orders given with its own
controls (a destination chosen, a fight marked), a marked fight played on the
Combat Display, weeks carried out until the campaign ends, and the campaign
report. Zero console errors.

    python3 tools/campaign_verify.py [outdir] [seed]
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

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1600, "height": 1000})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(PAGE); pg.wait_for_timeout(800)
    pg.click("#speed .seg button:has-text('instant')")

    # ---------------- the Scenarios menu ----------------
    pg.click("#nav-menu"); pg.click("#overlay.open [data-start='scenarios']"); pg.wait_for_timeout(300)
    ck(pg.locator("#overlay.open [data-patrolgame]").count() == 10, "the Scenarios menu lists the nine Patrol Games [32.1x] and K-XIV's [33.2]")
    ck(pg.locator("#overlay.open [data-campaign='rising_sun']").count() == 1, "...and The Rising Sun [31.2]")
    pg.screenshot(path=os.path.join(OUT, "s0_scenarios.png"))

    # ---------------- a Patrol Game ----------------
    pg.click("#overlay.open [data-patrolgame='wahoo']"); pg.wait_for_timeout(400)
    ck(pg.evaluate("window.__swDebug.patrol().patrolGame === true"), "Wahoo's 4th patrol starts as a Patrol Game")
    ck("Beat Dudley" in pg.inner_text("#pal-guide"), "the goal is Morton's record [32.1]")
    n = 0
    while not pg.evaluate("window.__swDebug.patrol().done") and n < 600:
        pg.evaluate("a => window.__swDebug.apply(a)", pg.evaluate(CAPTAIN)); pg.evaluate("window.__swDebug.settle()"); n += 1
    ck(pg.evaluate("window.__swDebug.patrol().done"), f"the patrol ends ({n} decisions)")
    ck(not pg.evaluate("window.__swDebug.patrol().log.some(r => r.table === 'War Event Phase [5.0]')"), "no War Events in a Patrol Game [32.0]")
    pg.wait_for_timeout(300)
    if not pg.locator("#overlay.open").count():
        pg.evaluate("window.__swDebug.debrief()"); pg.wait_for_timeout(300)
    txt = pg.inner_text("#overlay")
    ck("Patrol Game report" in txt and "[32.1]" in txt, "the report judges the patrol by the book's standard [32.1]")
    pg.screenshot(path=os.path.join(OUT, "s1_patrolgame_report.png"))
    pg.evaluate("document.querySelector('#overlay').classList.remove('open')")

    # ---------------- The Rising Sun ----------------
    pg.evaluate("s => window.__swDebug.startCampaign('rising_sun', s, { auto: 'captain' })", SEED); pg.wait_for_timeout(500)
    ck(pg.evaluate("window.__swDebug.state().view") == "fleet", "a campaign opens on the Fleet board")
    ck(pg.locator("#view-fleet tr[data-boat]").count() == 42, f"all 42 boats are listed ({pg.locator('#view-fleet tr[data-boat]').count()})")
    strip = pg.inner_text("#status-strip")
    ck("keep command" in strip.lower() and "90,000" in strip, "the strip shows the next career-longevity target [31.12]")
    ck(pg.locator("#viewnav button[data-view='fleet']").count() == 1, "the Fleet tab appears in a campaign")
    pg.screenshot(path=os.path.join(OUT, "s2_fleet_board.png"))
    # a destination chosen with the board's own select
    sel = pg.locator("#view-fleet select[data-sail]").first
    boat = sel.get_attribute("data-sail")
    opts = sel.locator("option").all()
    dest = opts[1].get_attribute("value")
    sel.select_option(dest); pg.wait_for_timeout(200)
    ck(pg.evaluate("n => window.__swDebug.fleet().sail[n]", boat) == dest, f"{boat} is ordered to {dest} from the Fleet board")
    # a fight marked
    boxes = pg.locator("#view-fleet input[data-fight]")
    marked = None
    if boxes.count():
        marked = boxes.first.get_attribute("data-fight")
        boxes.first.check(); pg.wait_for_timeout(200)
        ck(pg.evaluate("n => !!window.__swDebug.fleet().fight[n]", marked), f"{marked} is marked to fight on the board")
    pg.click("#sail-suggested"); pg.wait_for_timeout(400)
    ck(pg.evaluate("Object.keys(window.__swDebug.fleet().sail).length") >= 20, "one button gives every boat Ready for Sea the captain's destination")
    pg.click("#run-week"); pg.wait_for_timeout(300)
    ck(pg.evaluate("n => window.__swDebug.fleet().boats.find(b => b.career.boat === n).career.atSea", boat), f"the week carried out: {boat} sailed")

    # ---------------- the rest of the campaign ----------------
    fought = False; weeks = 0; guard = 0
    while not pg.evaluate("window.__swDebug.fleet().done") and guard < 20000:
        guard += 1
        phase = pg.evaluate("window.__swDebug.fleet().phase")
        if phase == "fight":
            if not fought:
                fought = True
                ck(pg.evaluate("window.__swDebug.state().view") in ("combat", "theater"), "a marked fight takes the page to the fight")
                pg.screenshot(path=os.path.join(OUT, "s3_fleet_fight.png"))
            pg.evaluate("a => window.__swDebug.apply(a)", pg.evaluate(CAPTAIN)); pg.evaluate("window.__swDebug.settle()")
            continue
        # orders: every ready boat where the captain would send it; mark one fight a week
        acts = pg.evaluate("window.__swDebug.legalActions()")
        sails = [a for a in acts if a["type"] == "sail"]
        if sails:
            b0 = sails[0]["boat"]
            pick = pg.evaluate("""n => { const f = window.__swDebug.fleet(), b = f.boats.find(x => x.career.boat === n);
                const L = window.SWCareer.legalActions(b).filter(a => a.type === 'sail');
                const t = window.SWTeacher.create(window).choose(b, L); return t && t.action ? t.action.area : L[0].area; }""", b0)
            a = [x for x in sails if x["boat"] == b0 and x["area"] == pick] or [x for x in sails if x["boat"] == b0]
            pg.evaluate("a => window.__swDebug.apply(a)", a[0]); continue
        fights = [a for a in acts if a["type"] == "fight"]
        if fights and weeks % 4 == 0 and not pg.evaluate("window.__swDebug.fleet()['m' + window.__swDebug.fleet().turn]"):
            pg.evaluate("window.__swDebug.fleet()['m' + window.__swDebug.fleet().turn] = true")
            pg.evaluate("a => window.__swDebug.apply(a)", fights[0]); continue
        pg.evaluate("window.__swDebug.apply({ type: 'run_week' })"); weeks += 1
    f = pg.evaluate("(() => { const f = window.__swDebug.fleet(); return { done: f.done, outcome: f.outcome, level: f.verdict && f.verdict.level, weeks: f.turn }; })()")
    ck(f["done"], f"the campaign ends: {f}")
    ck(fought, "at least one marked fight was played on the Combat Display")
    pg.wait_for_timeout(300)
    if not pg.locator("#overlay.open .campaign-report").count():
        pg.evaluate("window.__swDebug.debrief()"); pg.wait_for_timeout(300)
    rep = pg.inner_text("#overlay")
    ck(pg.locator("#overlay.open .campaign-report").count() == 1, "the campaign report opens")
    ck("tons sunk" in rep.lower() and "boats lost" in rep.lower(), "it gives the tonnage, capital ships and losses [31.24]")
    pg.screenshot(path=os.path.join(OUT, "s4_campaign_report.png"))
    pg.evaluate("document.querySelector('#overlay').classList.remove('open')")

    # ---------------- the other campaigns, from the menu ----------------
    pg.click("#nav-menu"); pg.click("#overlay.open [data-start='scenarios']"); pg.wait_for_timeout(300)
    ck(pg.locator("#overlay.open [data-campaign]").count() == 6, "the menu lists six campaigns (East Wind Early [31.6] included)")
    ck(pg.locator("#campaign-practice").count() == 1, "with a practice option to ignore Career Longevity")
    pg.click("#overlay.open [data-campaign='setting']"); pg.wait_for_timeout(600)
    rows = pg.locator("#view-fleet tr[data-boat]").count()
    ck(pg.evaluate("window.__swDebug.fleet().boats.length") == 137 and rows >= 136,
       f"The Setting Sun: 137 boats; {rows} on the board (Steelhead's overhaul has no return in the list [31.01])")
    ck("Forward bases" in pg.inner_text("#side") or pg.evaluate("Object.keys(window.__swDebug.fleet().war.tenderAt).length") == 5, "five tenders at their forward bases")
    ck(pg.locator("#view-fleet h3:has-text('In a wolfpack')").count() == 1 and "leads a wolfpack" in pg.inner_text("#view-fleet"),
       "the Fleet board shows the wolfpacks at sea [31.42]")
    for wk in range(3):
        if pg.locator("#sail-suggested").count():
            pg.click("#sail-suggested"); pg.wait_for_timeout(200)
        g2 = 0
        while pg.evaluate("window.__swDebug.fleet().phase") == "fight" and g2 < 400:
            pg.evaluate("a => window.__swDebug.apply(a)", pg.evaluate(CAPTAIN)); g2 += 1
        if pg.evaluate("window.__swDebug.fleet().done"):
            break
        pg.click("#run-week"); pg.wait_for_timeout(300)
    ck(pg.evaluate("window.__swDebug.fleet().turn") >= 3, "three weeks of The Setting Sun carried out from the Fleet board")
    pg.screenshot(path=os.path.join(OUT, "s5_setting_sun.png"))
    pg.evaluate("window.__swDebug.startCampaign('macarthur', 3, { auto: 'captain', noLongevity: true })"); pg.wait_for_timeout(500)
    opts = pg.evaluate("[...document.querySelectorAll('#view-fleet select[data-sail] option')].map(o => o.value).filter(Boolean)")
    sw = ['scs1', 'scs2', 'java_sea', 'n_phil_sea', 's_phil_sea', 'banda_sea', 'bismarck_sea', 'solomons', 'coral_sea']
    ck(len(opts) > 0 and all(o in sw for o in opts), "MacArthur's Navy: the Fleet board offers only Southwest Pacific areas [31.5 A]")
    ck(not errs, "zero console errors" + ("" if not errs else ": " + " | ".join(errs[:5])))
    b.close()

print(f"campaign_verify: {checks - len(fails)} passed, {len(fails)} failed")
sys.exit(1 if fails else 0)
