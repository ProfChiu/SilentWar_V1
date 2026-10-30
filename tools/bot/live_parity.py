#!/usr/bin/env python3
"""live_parity.py — the page plays the same patrol as the headless engine.

For each seed, soak.js plays a patrol headless and emits its choices. This
script replays those choices in the real page (file://, Chromium) with the die
animation RUNNING between actions, then compares the page's patrol with the
headless one: outcome, turns, ships and tonnage sunk, rolls, dice drawn, and
the hash of every roll, and that every press was a decision (forced steps
are skipped here and must happen by themselves). Any draw the presentation takes from the game dice
(Ambush v2's task-1 bug) shows up as a mismatch.

    python3 tools/bot/live_parity.py                 # seeds 1000-1005
    python3 tools/bot/live_parity.py 1003 1076 1880  # specific seeds
"""
import json, os, subprocess, sys
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
PAGE = "file://" + os.path.join(ROOT, "apps", "game", "index.html")
seeds = [int(a) for a in sys.argv[1:]] or list(range(1000, 1006))

FINGERPRINT = """() => {
  const s = window.__swDebug.patrol();
  let h = 0x811c9dc5;
  s.log.forEach(r => {
    const t = r.table + '|' + r.die + '|' + r.modifiedDie + '|' + JSON.stringify(r.result) + ';';
    for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  });
  return { outcome: s.done ? s.outcome : 'unfinished', turns: s.turn, shipsSunk: s.shipsSunk,
           tonnageSunk: s.tonnageSunk, rolls: s.log.length, draws: window.__swDebug.draws(),
           hash: ('00000000' + h.toString(16)).slice(-8) };
}"""

fails = 0
total_presses = total_decisions = total_auto = 0
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1600, "height": 900})
    errors = []
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(PAGE + "?brief=0&detail=full&coach=0")
    pg.wait_for_timeout(800)
    speed = pg.evaluate("window.__swDebug.state().speed")
    for seed in seeds:
        out = subprocess.run(["node", os.path.join(HERE, "soak.js"), "--trace", str(seed)],
                             capture_output=True, text=True)
        trace = json.loads(out.stdout)
        want = {k: v for k, v in trace["summary"].items() if k != "seed"}
        pg.evaluate(f"window.__swDebug.startPatrol({seed})")
        diverged = None
        for i, a in enumerate(trace["actions"]):
            if trace["forced"][i]:
                # Not a decision: the page takes it by itself after a beat.
                # Early on, wait the real beat (animation and auto-advance both
                # running); later, take it at once to keep the run short.
                if i < 25:
                    pg.wait_for_function("() => !window.__swDebug.pending()", timeout=15000)
                else:
                    pg.evaluate("window.__swDebug.settle()")
                continue
            try:
                pg.wait_for_function("() => !window.__swDebug.pending()", timeout=15000)
                pg.evaluate("a => window.__swDebug.apply(a)", a)
            except Exception:
                # The page's patrol has drifted so far that the headless
                # choice is no longer legal there.
                diverged = i
                break
            # Let the die tumble between the first actions: this is where a
            # presentation that borrowed game dice would diverge.
            if i < 25:
                pg.wait_for_timeout(140)
        pg.evaluate("window.__swDebug.settle()")
        got = pg.evaluate(FINGERPRINT)
        if diverged is not None:
            got["diverged_at_action"] = diverged
        pace = pg.evaluate("window.__swDebug.pacing()")
        n_forced = sum(1 for f in trace["forced"] if f)
        if pace["presses"] != pace["decisions"] or pace["auto"] != n_forced:
            print(f"    pacing off: {pace}, expected {n_forced} forced steps taken automatically")
            fails += 1
        total_presses += pace["presses"]; total_decisions += pace["decisions"]; total_auto += pace["auto"]
        same = got == want
        fails += 0 if same else 1
        print(f"  seed {seed}: {'identical' if same else 'DIFFERS'}  "
              f"{want['outcome']}, {want['turns']} turns, {want['rolls']} rolls, {want['draws']} draws, "
              f"{len(trace['actions'])} actions")
        if not same:
            print("    headless:", want, "\n    page:    ", got)
    b.close()

print(f"pacing in the page: {total_presses} presses for {total_decisions} decisions "
      f"({total_presses / max(1, total_decisions):.2f} per decision), {total_auto} forced steps taken automatically")
print(f"live parity: {len(seeds) - fails}/{len(seeds)} identical (speed '{speed}', animation running), "
      f"{len(errors)} console errors")
for e in errors[:5]:
    print("  console:", e)
sys.exit(1 if fails or errors else 0)
