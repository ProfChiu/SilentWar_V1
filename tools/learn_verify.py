#!/usr/bin/env python3
"""learn_verify.py — the lessons and Rewind, driven with real clicks.

Written 2026-09-21 (lessons 1-5 + Undo / What if?). Opens the page from
file://, and for every engine lesson:
  - starts it from the Learn menu, plays every step with ▶ (animation on for
    the first steps), and requires the page's patrol to equal a headless
    replay of the same decisions after every step (fingerprint of every roll);
  - checks the captain's reason is shown and the next move is marked on the
    board, and that the board cannot be clicked while the lesson drives it;
  - steps back with ◀ and requires the exact earlier state;
  - takes the helm and requires the board to be the player's again.
Then Rewind in a patrol: What if? to before the aim gives the exact earlier
state and remembers the earlier result; Undo takes back one decision.
Zero console errors throughout.

    python3 tools/learn_verify.py [outdir]
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


def headless(seed, decisions, career=None):
    out = subprocess.run(["node", os.path.join(ROOT, "tools", "lessons", "replay_cli.js")],
                         input=json.dumps({"seed": seed, "decisions": decisions, "career": career}), capture_output=True, text=True)
    return json.loads(out.stdout)


PAGE_STATE = """() => {
  const s = window.__swDebug.patrol();
  let h = 0x811c9dc5;
  s.log.forEach(r => {
    const t = r.table + '|' + r.die + '|' + r.modifiedDie + '|' + JSON.stringify(r.result) + ';';
    for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  });
  return { phase: s.phase, turn: s.turn, done: s.done, outcome: s.done ? s.outcome : null, shipsSunk: s.shipsSunk,
           tonnageSunk: s.tonnageSunk, rolls: s.log.length, hash: ('00000000' + h.toString(16)).slice(-8) };
}"""


def idle(pg):
    pg.wait_for_function("""() => { const s = window.__swDebug.state();
        return !(s.lesson && s.lesson.busy) && !window.__swDebug.pending() && !s.pendingView; }""", timeout=60000)


lessons = json.loads(subprocess.run(["node", "-e",
    "process.stdout.write(JSON.stringify(require('./apps/game/data/sw_lessons.js').SWLessons))"],
    cwd=ROOT, capture_output=True, text=True).stdout)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1600, "height": 1000})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(PAGE + "?brief=0&detail=full&coach=0")
    pg.wait_for_timeout(800)

    pg.click("#nav-menu"); pg.click("#overlay.open [data-start='lessons']"); pg.wait_for_timeout(300)
    ck(pg.locator(".lc-go[data-lesson]").count() == len(lessons), f"the Learn menu lists every lesson ({pg.locator('.lc-go[data-lesson]').count()})")
    pg.screenshot(path=os.path.join(OUT, "learn0_menu.png"))
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200)

    for L in [l for l in lessons if not l.get("tape")]:
        name = L["id"]
        pg.click("#nav-menu"); pg.click("#overlay.open [data-start='lessons']"); pg.wait_for_timeout(250)
        pg.click(f".lc-go[data-lesson='{name}']"); pg.wait_for_timeout(500)
        idle(pg)
        st = pg.evaluate("window.__swDebug.state().lesson")
        ck(st is not None and st["next"] == L["start"], f"{name}: opens at its first step ({st and st['next']})")
        decided = [a for step in L["steps"][:L["start"]] for a in step["actions"]]
        ck(pg.evaluate(PAGE_STATE) == headless(L["seed"], decided, L.get("career")), f"{name}: the fast-forward lands on the exact state")
        ck(pg.locator("#view-combat .slot.actionable, .hotspot.legal-move").count() == 0,
           f"{name}: the board is locked while the lesson drives it")
        slow = name == "attack"
        pg.click("#speed .seg button:has-text('" + ("animate" if slow else "instant") + "')")
        for k in range(L["start"], len(L["steps"])):
            step = L["steps"][k]
            why = pg.inner_text("#pal-guide")
            ck(step["why"][:40] in why, f"{name} step {k}: the captain's reason is shown before the move")
            a0 = step["actions"][0]
            if a0.get("unit") or a0.get("area") or a0["type"] == "place":
                ck(pg.locator(".lesson-next").count() >= 1, f"{name} step {k}: the next move ({a0['type']}) is marked on the board")
            pg.click("#palette #transport button.primary")
            pg.wait_for_timeout(200)
            idle(pg)
            decided += step["actions"]
            same = pg.evaluate(PAGE_STATE) == headless(L["seed"], decided, L.get("career"))
            ck(same, f"{name} step {k}: the page's patrol equals the headless replay")
            if not same:
                break
        if slow:
            pg.screenshot(path=os.path.join(OUT, "learn1_attack_end.png"))
        ck("Lesson complete" in pg.inner_text("#pal-guide") or "LESSON COMPLETE" in pg.inner_text("#pal-guide"),
           f"{name}: the palette says the lesson is complete")
        # One step back gives exactly the earlier state.
        if len(L["steps"]) - L["start"] >= 2:
            pg.click("#palette #transport button[title^='Step back']"); pg.wait_for_timeout(300)
            idle(pg)
            back = [a for step in L["steps"][:len(L["steps"]) - 1] for a in step["actions"]]
            ck(pg.evaluate(PAGE_STATE) == headless(L["seed"], back, L.get("career")), f"{name}: ◀ restores the exact earlier state")
        if name == "attack":
            # Take the helm at the lesson's decision point.
            pg.evaluate(f"(() => {{}})()")
            pg.click("#palette #transport button[title^='Back to the start']"); pg.wait_for_timeout(300); idle(pg)
            while pg.evaluate("window.__swDebug.state().lesson.next") < L["tryAt"]:
                pg.click("#palette #transport button.primary"); pg.wait_for_timeout(150); idle(pg)
            ck("Your turn?" in pg.inner_text("#pal-guide") or "YOUR TURN?" in pg.inner_text("#pal-guide"),
               "attack: at its decision point the lesson offers the helm")
            pg.click("#palette button.helm"); pg.wait_for_timeout(300)
            ck(pg.evaluate("window.__swDebug.state().lesson") is None, "attack: taking the helm ends the lesson")
            ck(pg.locator("#view-combat .slot.actionable").count() > 0, "attack: ...and the board is yours to click")
            pg.screenshot(path=os.path.join(OUT, "learn2_helm.png"))

    # ---------------- Phase 5 on the board, with the mouse ----------------
    def helm_at(lesson_id, step):
        pg.goto(PAGE + "?brief=0&detail=full&coach=0"); pg.wait_for_timeout(500)
        pg.click("#speed .seg button:has-text('instant')")
        pg.evaluate(f"window.__swDebug.startLesson('{lesson_id}')"); pg.wait_for_timeout(300); idle(pg)
        while pg.evaluate("window.__swDebug.state().lesson.next") < step:
            pg.click("#palette #transport button.primary"); pg.wait_for_timeout(120); idle(pg)
        pg.click("#palette button.helm"); pg.wait_for_timeout(300)
    radar = [l for l in lessons if l["id"] == "radar"][0]
    helm_at("radar", radar["tryAt"])
    pg.evaluate("window.__swDebug.view('combat')"); pg.wait_for_timeout(200)
    ck("radar" in pg.inner_text("#palette").lower(), "radar: the palette explains the unflip")
    uf = pg.locator("#view-combat .slot.actionable[data-action='unflip']")
    ck(uf.count() == 1, "radar: the counter just revealed can be clicked to unflip it")
    if uf.count():
        before = pg.evaluate("window.__swDebug.patrol().radarUsed")
        uf.first.click(); pg.wait_for_timeout(300)
        ck(not before and pg.evaluate("window.__swDebug.patrol().radarUsed"), "radar: clicking it turns the counter back face down")
        pg.screenshot(path=os.path.join(OUT, "learn4_radar.png"))
    ra = [l for l in lessons if l["id"] == "reattack"][0]
    helm_at("reattack", ra["tryAt"])
    pg.click("#palette .choices button:has-text('Re-Attack')"); pg.wait_for_timeout(300)
    ck(pg.evaluate("window.__swDebug.patrol().phase") == "14.4", "Re-Attack: first, the choice of column")
    pg.evaluate("window.__swDebug.view('combat')"); pg.wait_for_timeout(200)
    mv = pg.locator("#view-combat .slot.actionable[data-action='reposition']")
    ck(mv.count() >= 1, "Re-Attack: adjacent columns' submarine boxes are clickable")
    if mv.count():
        col0 = pg.evaluate("window.__swDebug.patrol().sub.column")
        mv.first.click(); pg.wait_for_timeout(300)
        ck(pg.evaluate("window.__swDebug.patrol().sub.column") != col0 and pg.evaluate("window.__swDebug.patrol().round") == 2,
           "Re-Attack: clicking one moves the boat there")

    # ---------------- Rewind in a patrol ----------------
    tr = json.loads(subprocess.run(["node", os.path.join(ROOT, "tools", "bot", "soak.js"), "--trace", str(SINK_SEED)],
                                   capture_output=True, text=True).stdout)
    pg.goto(PAGE + f"?seed={SINK_SEED}&brief=0&detail=full&coach=0"); pg.wait_for_timeout(600)
    pg.click("#speed .seg button:has-text('instant')")
    pg.click("#nav-menu"); pg.click("#overlay.open [data-start='patrol']"); pg.wait_for_timeout(300)
    decisions = []
    # play the sinking seed up to the end of its first fight that sinks a ship
    for i, a in enumerate(tr["actions"]):
        if tr["forced"][i]:
            continue
        pg.evaluate("window.__swDebug.settle()")
        pg.evaluate("a => window.__swDebug.apply(a)", a)
        decisions.append(a)
        if a["type"] == "fire" and pg.evaluate("window.__swDebug.patrol().shipsSunk") >= 1:
            pg.evaluate("window.__swDebug.settle()")
            break
    ck(pg.evaluate("window.__swDebug.patrol().shipsSunk") >= 1, f"patrol {SINK_SEED} sank a ship in its fight")
    ck(pg.locator("button.whatif").count() >= 2, f"after the fight, What if? offers rewind points ({pg.locator('button.whatif').count()})")
    played = pg.evaluate("window.__swDebug.state().played")
    ck(len(played) == len(decisions), f"the page recorded every decision ({len(played)} of {len(decisions)})")
    pg.click("button.whatif:has-text('Aim differently')"); pg.wait_for_timeout(300)
    n = len(pg.evaluate("window.__swDebug.state().played"))
    ck(pg.evaluate(PAGE_STATE) == headless(SINK_SEED, decisions[:n]), "What if? rewinds to the exact state before the aim")
    guide = pg.inner_text("#pal-guide")
    ck("You chose" in guide and "sunk" in guide, "the earlier try is remembered for comparison")
    pg.screenshot(path=os.path.join(OUT, "learn3_whatif.png"))
    pg.click("#transport button.undo"); pg.wait_for_timeout(300)
    ck(pg.evaluate(PAGE_STATE) == headless(SINK_SEED, decisions[:n - 1]), "Undo takes back exactly one decision")

    ck(errs == [], f"no console errors: {errs[:3]}")
    b.close()

print(f"learn_verify: {checks - len(fails)} passed, {len(fails)} failed")
sys.exit(1 if fails else 0)
