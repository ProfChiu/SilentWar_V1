#!/usr/bin/env python3
"""first_hour_verify.py — a newcomer's first hour, with real clicks.

Written 2026-09-21 (briefing, beginner view, boot camp, coach, debrief).
A FRESH browser (no stored preferences) opens the page exactly as a new player
would, and the suite walks the whole boot camp:
  briefing appears by itself -> Read your boat -> lesson 1 -> lesson 2 ->
  drill: column (the coach stops the worst column) -> drill: aim (the coach
  stops a hopeless aim; "Do it anyway" goes through and the result says so) ->
  lesson 3 -> drill: Re-Attack (the coach stops a risky Re-Attack) -> first
  patrol with the coach on.
Also: the beginner view (plain labels, hidden tabs, no rule numbers, the dice
maths folded), one-time "New:" explanations that stay dismissed, boot-camp
progress that survives a reload, Simple/Full switch, the Combat Event label,
and the debrief (rating, moments, tip, Replay from here). Zero console errors.

    python3 tools/first_hour_verify.py [outdir]
"""
import json, os, re, subprocess, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = "file://" + os.path.join(ROOT, "apps", "game", "index.html")
OUT = sys.argv[1] if len(sys.argv) > 1 else "."
fails, checks = [], 0


def ck(cond, msg):
    global checks
    checks += 1
    if not cond:
        fails.append(msg)
        print("  FAIL:", msg)


def guide(pg):
    return pg.inner_text("#pal-guide")


def idle(pg):
    pg.wait_for_function("""() => { const s = window.__swDebug.state();
        return !(s.lesson && s.lesson.busy) && !window.__swDebug.pending() && !s.pendingView; }""", timeout=60000)


def play_lesson_to_end(pg):
    for _ in range(40):
        if pg.locator("#bootcamp-continue").count():
            return True
        pg.click("#palette #transport button.primary"); pg.wait_for_timeout(120); idle(pg)
    return False


def drill_state(pg):
    return pg.evaluate("(() => { const d = window.__swDebug.state().drill; return d ? {id: d.def.id, done: d.done} : null; })()")


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 1000})
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(PAGE); pg.wait_for_timeout(900)

    # ---------------- first visit: the briefing ----------------
    ck(pg.locator("#overlay.open .welcome").count() == 1, "a first visit opens the Welcome by itself")
    ck(pg.locator("#overlay.open [data-welcome]").count() == 5, "...with its five tabs: the war, what you decide, how it teaches, start, about")
    pg.click("#overlay.open [data-welcome='agency']"); pg.wait_for_timeout(200)
    ck(pg.locator("#overlay.open [data-command]").count() == 3 and "You decide" in pg.inner_text("#overlay") or "YOU DECIDE" in pg.inner_text("#overlay"),
       "What you decide: three levels of command, your decisions and the dice's")
    pg.screenshot(path=os.path.join(OUT, "fh0_welcome_agency.png"))
    pg.click("#overlay.open [data-welcome='start']"); pg.wait_for_timeout(200)
    pg.screenshot(path=os.path.join(OUT, "fh0_welcome_start.png"))
    pg.click("#overlay.open [data-start='bootcamp']"); pg.wait_for_timeout(300)
    ck(pg.locator("#overlay.open .brief").count() == 1, "Boot camp opens the patrol briefing")
    brief = pg.inner_text(".brief")
    ck("Bronze" in brief and "Silver" in brief and "Gold" in brief and "Failed" in brief, "the briefing states the goal ladder")
    ck(brief.count("\n") > 5 and "Six things to know" in brief or "SIX THINGS TO KNOW" in brief, "...and the six things to know")
    ck(pg.evaluate("document.body.classList.contains('beginner')"), "a newcomer gets the Simple view")
    ck(not pg.locator("#viewnav button[data-view='cups']").is_visible(), "Simple view hides the tabs not used yet")
    ck("ENEMY ASW" in pg.inner_text("#status-strip").upper() and "GEN. ASW" not in pg.inner_text("#status-strip").upper(),
       "Simple view uses plain labels in the status strip")
    ck(pg.get_attribute("#coach-toggle", "aria-pressed") == "true", "the coach is on for a newcomer")
    pg.screenshot(path=os.path.join(OUT, "fh0_briefing.png"))
    pg.click("#brief-bootcamp"); pg.wait_for_timeout(400)

    # ---------------- read your boat ----------------
    ck(pg.locator(".boat .boat-mark").count() == 9, f"Read your boat marks every printed number ({pg.locator('.boat .boat-mark').count()})")
    ck("Attack 6" in pg.inner_text(".boat") and "Endurance B" in pg.inner_text(".boat") and "Speed 2" in pg.inner_text(".boat"),
       "...and names them")
    pg.click("#boat-done"); pg.wait_for_timeout(700); idle(pg)

    # ---------------- lesson 1, lesson 2 ----------------
    pg.click("#speed .seg button:has-text('instant')")
    ck(pg.evaluate("window.__swDebug.state().bcItem") == "lesson:search", "boot camp goes on to lesson 1")
    ck("Boot camp 3 of 9" in guide(pg) or "BOOT CAMP 3 OF 9" in guide(pg), "the palette shows boot-camp progress")
    ck(play_lesson_to_end(pg), "lesson 1 plays to the end and offers the next step")
    ck(not re.search(r"\[\d+\.\d", guide(pg)), "Simple view: no rule numbers in the palette")
    pg.click("#bootcamp-continue"); pg.wait_for_timeout(500); idle(pg)
    ck(play_lesson_to_end(pg), "lesson 2 plays to the end")
    # a "New:" explanation has appeared by now; dismiss it and check it stays gone
    first = pg.locator(".pal-sec.first")
    ck(first.count() == 1, "a one-time 'New:' explanation appeared during the lessons")
    if first.count():
        title = pg.inner_text(".pal-sec.first .pal-k")
        pg.click(".pal-sec.first .got-it"); pg.wait_for_timeout(150)
        ck(title not in guide(pg), "Got it dismisses it")
    pg.click("#bootcamp-continue"); pg.wait_for_timeout(700); idle(pg)

    # ---------------- drill: column ----------------
    ck(drill_state(pg) == {"id": "column", "done": False}, f"drill 1 is the column ({drill_state(pg)})")
    ck("Drill: pick your column" in guide(pg) or "DRILL: PICK YOUR COLUMN" in guide(pg), "the drill's task is shown")
    worst = pg.evaluate("""() => { const e = window.__swDebug.patrol(), cols = ['A','B','C','D'];
      const near = c => { const i = cols.indexOf(c); return cols.filter((x,j) => Math.abs(j-i) <= 1); };
      let w = null, wn = 99; cols.forEach(c => { const n = e.units.filter(u => near(c).includes(u.column)).length; if (n < wn) { wn = n; w = c; } });
      return w; }""")
    pg.locator(f"#view-combat .slot.actionable[title*='column {worst}']").first.click(); pg.wait_for_timeout(250)
    ck(pg.locator(".pal-sec.coach").count() == 1, "the coach stops the worst column before it is committed")
    ck(pg.evaluate("window.__swDebug.patrol().phase") == "14.11", "...and nothing was committed")
    pg.screenshot(path=os.path.join(OUT, "fh1_coach_column.png"))
    pg.click("button.coach-change"); pg.wait_for_timeout(150)
    best = pg.evaluate("window.__swDebug.state().drill.def.captain.action.column")
    pg.locator(f"#view-combat .slot.actionable[title*='column {best}']").first.click(); pg.wait_for_timeout(300)
    ck(drill_state(pg)["done"], "choosing the best column completes the drill")
    ck("Drill result" in guide(pg) or "DRILL RESULT" in guide(pg), "the drill result compares you with the captain")
    pg.click("#bootcamp-continue"); pg.wait_for_timeout(700); idle(pg)

    # ---------------- drill: aim (a hopeless aim, done anyway) ----------------
    ck(drill_state(pg) == {"id": "aim", "done": False}, f"drill 2 is the aim ({drill_state(pg)})")
    dead = pg.evaluate("""() => { const e = window.__swDebug.patrol();
      const t = window.__swDebug.legalActions().filter(a => a.type === 'target').map(a => a.unit);
      return t.find(u => window.SWCombat.attackPreview(e, {unit: u, points: e.sub.attack}).hit === 0) || null; }""")
    ck(dead is not None, "the aim drill offers a ship that cannot be hit")
    if dead:
        pg.evaluate("u => window.__swDebug.apply({type: 'target', unit: u})", dead)
        for _ in range(8):
            if not pg.evaluate("u => window.__swDebug.legalActions().some(a => a.type === 'points' && a.unit === u && a.delta > 0)", dead):
                break
            pg.evaluate("u => window.__swDebug.apply({type: 'points', unit: u, delta: 1})", dead)
        pg.click("#palette .choices button:has-text('Fire')"); pg.wait_for_timeout(250)
        ck(pg.locator(".pal-sec.coach").count() == 1 and "cannot" in guide(pg), "the coach stops a volley that cannot hit")
        pg.click("button.coach-anyway"); pg.wait_for_timeout(400); idle(pg)
        ck(drill_state(pg)["done"], "'Do it anyway' commits it and ends the drill")
        ck("coach warned" in guide(pg), "the result records that the coach warned against it")
        pg.screenshot(path=os.path.join(OUT, "fh2_drill_aim.png"))
    pg.click("#bootcamp-continue"); pg.wait_for_timeout(500); idle(pg)

    # ---------------- lesson 3, drill: Re-Attack ----------------
    ck(play_lesson_to_end(pg), "lesson 3 plays to the end")
    pg.click("#bootcamp-continue"); pg.wait_for_timeout(700); idle(pg)
    ck(drill_state(pg) == {"id": "reattack", "done": False}, f"drill 3 is the Re-Attack ({drill_state(pg)})")
    pg.click("#palette .choices button:has-text('Re-Attack')"); pg.wait_for_timeout(250)
    ck(pg.locator(".pal-sec.coach").count() == 1 and "risks the boat" in guide(pg), "the coach stops a risky Re-Attack")
    pg.click("button.coach-change"); pg.wait_for_timeout(150)
    pg.click("#palette .choices button:has-text('Withdraw')"); pg.wait_for_timeout(400); idle(pg)
    ck(drill_state(pg)["done"], "withdrawing completes the drill")

    # ---------------- progress survives a reload ----------------
    done_before = pg.evaluate("JSON.parse(localStorage.getItem('sw.bootcamp'))")
    pg.reload(); pg.wait_for_timeout(800)
    ck(pg.locator("#overlay.open .brief").count() == 0 and pg.locator("#overlay.open [data-welcome='start'][aria-pressed='true']").count() == 1,
       "the next visit opens the Welcome at Start here, not the briefing")
    pg.evaluate("document.querySelector('#overlay').classList.remove('open')")
    pg.click("#nav-menu"); pg.click("#overlay.open [data-start='lessons']"); pg.wait_for_timeout(300)
    ticks = pg.locator(".bc-list li.done").count()
    ck(ticks == len(done_before) == 8, f"boot-camp progress survives a reload ({ticks} of 9 ticked)")
    pg.click("#bootcamp-go"); pg.wait_for_timeout(600)
    ck(pg.evaluate("window.__swDebug.state().bcItem") == "patrol" and pg.evaluate("window.__swDebug.state().mode") == "patrol",
       "Continue starts the first patrol")
    ck("Goal" in guide(pg) or "GOAL" in guide(pg), "the patrol shows its goal")
    # 2026-09-21 playtest: "not sure what to do" at Search or stay hidden. The
    # choices must sit under "Your move", with the usual one marked.
    pg.click("#palette .choices button:has-text('Remain on station')"); pg.wait_for_timeout(400); idle(pg)
    you = pg.locator(".pal-sec.you")
    ck(you.locator("button:has-text('Search for contacts')").count() == 1, "at Search or stay hidden, the choices sit under Your move")
    ck(you.locator("button.usual:has-text('Search for contacts')").count() == 1, "...with Search marked as the usual choice")
    ck("Most weeks the answer is Search" in pg.inner_text(".pal-sec.you"), "...and the words say so")
    ck("−1 endurance" not in pg.inner_text("#palette"), "the Bypass button no longer reads like a cost")

    # ---------------- Simple / Full ----------------
    pg.click("#view-full"); pg.wait_for_timeout(200)
    ck(pg.locator("#viewnav button[data-view='cups']").is_visible(), "Full view shows every tab")
    ck(re.search(r"\[\d+\.\d", pg.inner_text("#palette")) is not None, "Full view shows rule numbers")
    pg.click("#view-simple"); pg.wait_for_timeout(200)

    # ---------------- Combat Event label and the debrief ----------------
    tr = json.loads(subprocess.run(["node", os.path.join(ROOT, "tools", "bot", "soak.js"), "--trace", "1001"],
                                   capture_output=True, text=True).stdout)
    pg.goto(PAGE + "?seed=1001&coach=0"); pg.wait_for_timeout(600)
    pg.click("#speed .seg button:has-text('instant')")
    pg.click("#nav-menu"); pg.click("#overlay.open [data-start='patrol']"); pg.wait_for_timeout(300)
    for i, a in enumerate(tr["actions"]):
        if tr["forced"][i]:
            continue
        pg.evaluate("window.__swDebug.settle()")
        if pg.evaluate("window.__swDebug.patrol().done"):
            break
        pg.evaluate("a => window.__swDebug.apply(a)", a)
    pg.evaluate("window.__swDebug.settle()")
    pg.evaluate("window.__swDebug.view('log')"); pg.wait_for_timeout(300)
    ck("effect not in this build yet" not in pg.inner_text("#view-log"), "Combat Events carry no 'not in this build' label now they have effects (Phase 5)")
    pg.evaluate("window.__swDebug.view('theater')"); pg.wait_for_timeout(200)
    ck(pg.evaluate("window.__swDebug.patrol().done"), "patrol 1001 ran to its end")
    pg.wait_for_timeout(300)
    ck(pg.locator("#overlay.open .debrief").count() == 1, "the patrol report opens at the end")
    rep = pg.inner_text(".debrief") if pg.locator(".debrief").count() else ""
    ck(re.search(r"BRONZE|SILVER|GOLD|FAILED|NO RATING", rep) is not None, "the report gives a rating")
    ck("moments that decided it" in rep.lower(), "...the moments that decided it")
    ck("Tip:" in rep, "...and a tip")
    pg.screenshot(path=os.path.join(OUT, "fh3_debrief.png"))
    if pg.locator(".db-moment button").count():
        pg.locator(".db-moment button").first.click(); pg.wait_for_timeout(400)
        ck(not pg.evaluate("window.__swDebug.patrol().done"), "Replay from here rewinds into the patrol")

    ck(errs == [], f"no console errors: {errs[:3]}")
    b.close()

print(f"first_hour_verify: {checks - len(fails)} passed, {len(fails)} failed")
sys.exit(1 if fails else 0)
