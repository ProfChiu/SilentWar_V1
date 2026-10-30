#!/usr/bin/env python3
"""live_verify.py — drive the real UI in a real browser with real clicks.

Run the project over HTTP first:  python3 -m http.server 8765
Then:  python3 tools/live_verify.py [outdir]
"""
import sys, os
from playwright.sync_api import sync_playwright

URL = "http://localhost:8765/apps/game/index.html?seed=1&brief=0&detail=full&coach=0"  # seeded: the patrol always reaches combat, so every check runs
OUT = sys.argv[1] if len(sys.argv) > 1 else "."
fails, checks = [], 0

def ck(cond, msg):
    global checks
    checks += 1
    if not cond:
        fails.append(msg)
        print("  FAIL:", msg)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1600, "height": 1000})
    errors = []
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL, wait_until="networkidle")
    pg.wait_for_timeout(1200)

    # instant speed so nothing is mid-animation when we assert
    pg.click("#speed .seg button:has-text('instant')")

    # --- 1. Theater: map renders, pans and zooms; areas are click targets ---
    ck(pg.locator("#theater-world > img").count() == 1, "map image present")
    ck(pg.locator(".hotspot.oparea").count() == 23, "23 OpArea click targets")
    ck(pg.locator(".hotspot.smz").count() == 16, "16 SMZ click targets")
    ck(pg.locator(".hotspot.base").count() == 6, "6 base click targets")
    before = pg.eval_on_selector("#theater-world", "n => n.style.transform")
    pg.mouse.move(700, 500); pg.mouse.down(); pg.mouse.move(560, 430); pg.mouse.up()
    after = pg.eval_on_selector("#theater-world", "n => n.style.transform")
    ck(before != after, "map pans by dragging")
    pg.click(".map-controls button:has-text('+')")
    ck(pg.eval_on_selector("#theater-world", "n => n.style.transform") != after, "map zooms")
    pg.screenshot(path=os.path.join(OUT, "v1_theater.png"))

    # --- 2. Status strip + breadcrumb persist; views switch; back works ---
    ck(pg.locator("#status-strip .stat").count() >= 7, "status strip carries every campaign marker")
    # .stat .k is uppercased in CSS, and inner_text honours text-transform
    strip_txt = pg.inner_text("#status-strip").lower()
    ck("war period" in strip_txt, "status strip shows the War Period")
    ck("mk-xiv" in strip_txt and "gen. asw" in strip_txt, "status strip shows torpedo and ASW values")
    ck("[13.0]" in pg.inner_text("#breadcrumb"), "breadcrumb lists the sequence of play")
    pg.click("#viewnav button:has-text('Combat')")
    ck(pg.locator("#view-combat.active").count() == 1, "switched to Combat view")
    ck(pg.locator("#status-strip .stat").count() >= 7, "status strip persists across views")
    ck(pg.locator("#breadcrumb .crumb").count() > 0, "breadcrumb persists across views")
    pg.click("#viewnav .back")
    ck(pg.locator("#view-theater.active").count() == 1, "back returns to the previous view")

    # --- 3. Charts open as dismissable overlays ---
    pg.click("#viewnav button:has-text('Charts')")
    ck(pg.locator("#overlay.open").count() == 1, "chart gallery opens as an overlay")
    ck(pg.locator(".chart-card").count() == 9, "all nine charts listed")
    pg.click(".chart-card:has-text('Combat Tables')")
    pg.wait_for_timeout(400)
    ck(pg.locator(".sheet .body img").count() == 1, "a chart scan renders")
    ck(pg.eval_on_selector(".sheet .body img", "n => n.naturalWidth") > 0, "the chart image actually loaded")
    pg.keyboard.press("Escape")
    ck(pg.locator("#overlay.open").count() == 0, "Escape dismisses the overlay")

    # --- 6/7. Play the tape: dice, ledger, log, auto view-switching ---
    # The manual view clicks above correctly turned auto-follow OFF (manual
    # override wins). Turn it back on to exercise the automatic switching.
    ck(pg.get_attribute("#viewnav .auto-toggle", "aria-pressed") == "false",
       "a manual view change turns auto-follow off")
    pg.click("#viewnav .auto-toggle")
    ck(pg.get_attribute("#viewnav .auto-toggle", "aria-pressed") == "true",
       "auto-follow can be turned back on")
    for _ in range(len(pg.evaluate("window.__swDebug.state().tape ? [] : []")) or 17):
        if pg.locator("#transport button.primary[disabled]").count():
            break
        pg.click("#transport button.primary")
        pg.wait_for_timeout(60)
    pg.wait_for_timeout(400)
    st = pg.evaluate("window.__swDebug.state()")
    ck(st["tape"]["done"] is True, "tape played to the end")
    ck(len(st["tape"]["log"]) == 8, f"8 resolution records logged (got {len(st['tape']['log'])})")
    ck(st["tape"]["status"]["shipsSunk"] == 1, "campaign markers advanced on the sunk maru")
    ck(st["view"] == "combat", f"auto-follow left us in the phase's view (got {st['view']})")

    # --- 4. Combat view renders counter art in the right slots ---
    pg.evaluate("window.__swDebug.seek(11)")   # after both attacks
    pg.wait_for_timeout(300)
    pg.evaluate("window.__swDebug.view('combat')")
    pg.wait_for_timeout(300)
    ck(pg.locator("#view-combat .slot.filled").count() >= 15, "counters occupy Combat Display slots")
    ck(pg.locator("#view-combat .slot img[src*='new_s2']").count() == 1, "the submarine sits in a submarine box")
    # Four markers were placed, but cargo maru #3 has been sunk and removed, and
    # its marker goes with it — a TDC cannot sit on a ship that is no longer there.
    st_live = pg.evaluate("window.__swDebug.state()")
    afloat = {u["id"] for u in st_live["tape"]["units"]}
    marked = set(st_live["tape"]["board"]["tdc"].keys())
    ck(len(marked) == 4, "four TDC markers were placed this round")
    ck(pg.locator("#view-combat .slot img[src*='tdc_']").count() == len(afloat & marked),
       "a TDC marker renders for each marked ship still afloat")
    ck(pg.locator("#view-combat .slot img[src*='dd2t71']").count() == 1, "the revealed destroyer shows its real counter")
    ck(pg.locator("#view-combat .slot img[src*='flag_']").count() >= 9, "undrawn column pieces stay face down")
    broken = pg.eval_on_selector_all("#view-combat img", "ns => ns.filter(n => !n.naturalWidth).length")
    ck(broken == 0, f"every combat counter image loaded ({broken} broken)")
    pg.screenshot(path=os.path.join(OUT, "v2_combat.png"))

    # --- fog of war holds ---
    ck(pg.evaluate("window.__swDebug.fogCheck()") == [], "no hidden value leaks into the summary")
    side = pg.inner_text("#side")
    ck("unrevealed" in side, "side panel reports unrevealed counters without valuing them")

    # --- 6. ledger renders the rulebook's own arithmetic ---
    pg.evaluate("window.__swDebug.seek(9)")    # the first attack
    pg.wait_for_timeout(300)
    led = pg.inner_text("#side .ledger")
    ck("= +3" in led and "= +2" in led, "attacker and target totals shown")
    ck("need = or < 1" in led, "ledger states the number needed")
    ck("rolled 4" in led, "ledger states the die rolled")
    ck("miss" in led.lower(), "ledger states the result")

    # --- 5. tooltips + rules deep link ---
    pg.evaluate("window.__swDebug.view('oparea')")
    pg.wait_for_timeout(200)
    pg.hover("#side .term[data-term='attack']")
    pg.wait_for_timeout(300)
    ck(pg.locator("#tooltip").is_visible(), "hovering a rating shows a tooltip")
    ck("Rule [2.3]" in pg.inner_text("#tooltip"), "tooltip cites the rule")
    pg.click("#tooltip .t-rule")
    pg.wait_for_timeout(700)
    ck(pg.locator("#overlay.open").count() == 1, "tooltip click-through opens the rules viewer")
    rules = pg.inner_text(".sheet .body")
    ck("Playing Pieces" in rules, "rules viewer opened at the cited section [2.3]")
    ck("Could not load" not in rules, "RULES.md loaded over HTTP")
    pg.screenshot(path=os.path.join(OUT, "v3_rules.png"))
    pg.keyboard.press("Escape")

    # deep link to a sub-rule falls back to its parent section
    pg.evaluate("window.__swDebug.rules('14.15')")
    pg.wait_for_timeout(600)
    ck("First Attack Round" in pg.inner_text(".sheet .body"), "sub-rule [14.15] resolves to its parent section")
    pg.keyboard.press("Escape")

    # --- Phase 3: the real Area Activity Chart renders in the OpArea view ---
    pg.evaluate("window.__swDebug.view('oparea')")
    pg.wait_for_timeout(300)
    ck(pg.locator("table.aac").count() == 1, "OpArea view renders its Area Activity Chart")
    ck(pg.locator("table.aac tr").count() == 5, "AAC has a header plus four War Period rows")
    ck(pg.locator("table.aac td.cell").count() == 40, "AAC shows 40 cells")
    ck(pg.locator("table.aac tr.now").count() == 1, "the current War Period row is highlighted")
    reds = pg.eval_on_selector_all("table.aac tr td.reds", "ns => ns.map(n => n.textContent)")
    ck(reds == ["4", "3", "1", "0"],
       f"East China Sea red-box counts are 4/3/1/0 (rulebook says 3 for W2), got {reds}")
    pg.screenshot(path=os.path.join(OUT, "v5_aac.png"))

    # --- 7. speed control ---
    pg.click("#speed .seg button:has-text('animate')")
    ck(pg.get_attribute("#speed .seg button:has-text('animate')", "aria-pressed") == "true",
       "speed control switches to animate")

    # --- every remaining view renders without error ---
    for v in ["cups", "tenders", "graveyard", "base", "log", "oparea", "theater"]:
        pg.evaluate(f"window.__swDebug.view('{v}')")
        pg.wait_for_timeout(250)
        ck(pg.locator(f"#view-{v}.active").count() == 1, f"{v} view renders")
        bad = pg.eval_on_selector_all(f"#view-{v} img", "ns => ns.filter(n => !n.naturalWidth).length")
        ck(bad == 0, f"{v} view has no broken images ({bad})")
        if v == "log":
            ck(pg.locator(".log-entry").count() > 0, "roll log lists records")
            pg.select_option(".log-filters select >> nth=0", index=2)
            pg.wait_for_timeout(200)
            ck(pg.locator(".log-entry").count() > 0, "roll log filters by phase")
            ck("showing" in pg.inner_text(".log-filters"), "roll log count reflects the active filter")
            pg.screenshot(path=os.path.join(OUT, "v4_log.png"))

    # --- Phase 4: play a patrol against the live engine, hard-locked ---
    pg.click("#nav-menu"); pg.click("#overlay.open [data-start='patrol']")
    pg.wait_for_timeout(400)
    st = pg.evaluate("window.__swDebug.patrol()")
    ck(st is not None and st["phase"] == "12.0", "patrol mode starts at Patrol Movement")
    acts = pg.evaluate("window.__swDebug.legalActions()")
    moves = sorted(a["area"] for a in acts if a["type"] == "move")
    ck(moves == ["empire_pacific", "marianas", "n_phil_sea", "scs1", "yellow_sea"],
       f"[12.0] only adjacent areas are offered, got {moves}")
    ck(all(a.get("rule") for a in acts), "every offered action cites a rule")
    rendered = pg.eval_on_selector_all("#palette .choices button.act", "ns => ns.length")
    ck(rendered > 0, "legal actions are rendered as buttons")
    ck(pg.locator("#transport .phase-chip").inner_text() == "[12.0]", "the phase chip shows the SOP step")

    # The engine refuses an action it never offered.
    illegal = pg.evaluate("""() => { try { window.__swDebug.act('move','carolines'); return 'allowed'; }
                                     catch (e) { return 'refused'; } }""")
    ck(illegal == "refused", "an illegal move is refused, not merely hidden")

    # Drive the patrol to a contact, then through combat.
    phase = pg.evaluate("window.__swDebug.act('stay')")
    ck(phase == "13.1", "staying still advances to Activity Determination")
    pg.wait_for_timeout(200)
    phase = pg.evaluate("window.__swDebug.act('search')")
    ck(phase in ("14.11", "16.0"), f"search resolves to combat or ends the turn, got {phase}")
    log = pg.evaluate("window.__swDebug.patrol().log")
    ck(any(r["table"].startswith("Area Activity") for r in log), "the AAC roll was logged by the engine")
    ck(pg.locator("#side .ledger .row").count() > 0, "the engine's record renders in the ledger")

    if phase == "14.11":
        pg.evaluate("window.__swDebug.act('place','B')")
        pg.wait_for_timeout(200)
        st = pg.evaluate("window.__swDebug.patrol()")
        ck(st["sub"]["column"] == "B", "the submarine took a column")
        pg.evaluate("window.__swDebug.view('combat')")
        pg.wait_for_timeout(300)
        ck(pg.locator("#view-combat .slot.filled").count() > 0, "engine counters render on the Combat Display")
        bad = pg.eval_on_selector_all("#view-combat img", "ns => ns.filter(n => !n.naturalWidth).length")
        ck(bad == 0, f"every engine-drawn counter image loaded ({bad} broken)")
        ck(pg.evaluate("window.__swDebug.fogCheck()") == [], "no hidden value leaks in patrol mode")
        pg.screenshot(path=os.path.join(OUT, "v6_patrol.png"))

        # Play the rest of the turn only through offered actions.
        for _ in range(140):
            st = pg.evaluate("window.__swDebug.patrol()")
            if st["done"] or st["phase"] == "16.0":
                break
            acts = pg.evaluate("window.__swDebug.legalActions()")
            if not acts:
                break
            pref = [a for a in acts if a["type"] in ("done_reveal", "done_tdc", "fire", "withdraw")]
            pick = (pref or acts)[0]
            pg.evaluate("(t) => window.__swDebug.act(t)", pick["type"])
        st = pg.evaluate("window.__swDebug.patrol()")
        ck(st["phase"] == "16.0" or st["done"], f"the patrol turn completed, phase {st['phase']}")
        ck(any(r["table"].startswith("Endurance") for r in st["log"]),
           "the endurance check ran")
        ck(len(st["log"]) >= 3, f"the patrol produced a record trail ({len(st['log'])})")

    pg.evaluate("window.__swDebug.view('log')")
    pg.wait_for_timeout(300)
    ck(pg.locator(".log-entry").count() > 0, "engine records appear in the roll log")

    ck(errors == [], f"no console errors: {errors[:4]}")
    b.close()

print(f"live_verify: {checks - len(fails)} passed, {len(fails)} failed")
sys.exit(1 if fails else 0)
