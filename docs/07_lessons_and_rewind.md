# 07 — Lessons and Rewind

**Built:** 2026-09-21 · **Build:** v0.7.0 · **Play:** `PLAY Silent War.command` → **Learn**

Wan, after v0.6.0: *"Seeing the play in action helped me understand the flow of combat."* Asked how to
extend that to the rest of the game; chose the recommendation: **a lesson library (1) and Rewind (3)**
for what the engine already plays. The coach (2) and printed-track markers (4) come later; Phase 5+
topics get their lesson when their rules land.

## Lessons: real patrols, a captain who explains himself

**Learn** (top bar, replaces Demo) opens a menu of six lessons:

| # | Lesson | Seed | What it shows |
|---|---|---|---|
| 0 | The rulebook example | tape | Spearfish in the East China Sea with the book's numbers (the old Demo) |
| 1 | Moving and searching | 19 | moving toward busier water, an empty search (−1 Endurance), then contact |
| 2 | Setting up an attack | 129 | column → reveal → firing solutions → aim (split 1+5) → fire → a sinking |
| 3 | The counterattack and the Re-Attack gamble | 243 | a Re-Attack weighed on its odds, the +1 counterattack, the boat damaged |
| 4 | Endurance and the trip home | 5 | a failed Endurance roll, RTB, transit to base |
| 5 | When the escorts win | 3104 | a 3% counterattack that sinks the boat |

- Lessons 1–5 are **not scripted by hand.** `tools/lessons/build_lessons.js` plays 4,000 seeded
  patrols with the **teaching captain** (`tools/bot/teacher.js`: deterministic, decides from the
  engine's own odds, returns a one-line reason), and keeps the clearest patrol for each lesson. Lessons
  that would feature a hopeless shot are rejected (that is [14.16A], not yet in the engine).
- In the page: ▶ plays the captain's next move, click by click, at the chosen speed; before each, the
  palette shows **the captain's next move and why** ("Aim. 1 on maru 2,000 t (hit 30%, sink 18%) and
  5 on maru 5,000 t (hit 60%, sink 30%)") and the board marks what he is about to touch (pink). ◀
  steps back, ⟲ restarts, ▶▶ plays to the end. The board is locked while the lesson drives it.
- **Take the helm** at any point: the patrol becomes yours from that exact moment. Each lesson that has
  a key decision stops there with "Your turn?".
- When a lesson ends, the palette recaps what it showed.

## Rewind: Undo and What if?

- **↶ Undo** in the action bar takes back your last decision.
- After a fight, **What if?** offers: *Pick another column*, *Aim differently*, *Re-Attack or not,
  again*. Rewinding remembers what your earlier choice led to, shown when you are back at that
  decision: *Last time: You chose "6 on M 5,000 t": 1 sunk (5,000 t).*
- Both are replays: same seed, same decisions up to that point, so the state is exact. The dice come in
  the same order; a different choice changes what they land on.

## Verification (2026-09-21)

| Check | Result |
|---|---|
| `node tools/test_sw_lessons.js` (new) | 39 passed: every lesson replays legally, shows what its title claims, and equals what the builder makes today |
| `python3 tools/learn_verify.py` (new, real mouse) | 91 passed: every step of every lesson equals a headless replay; ◀, the helm, What if?, Undo all exact; 0 console errors |
| unit suites total | 1409 passed |
| soak 200/200 identical · 20,000 patrols | 0 problems |
| live 86 · ux 45 · map 38 · parity 6/6 (1.00 presses per decision) · assets 79/0 | all green |

## Rebuilding the lessons

After any engine or teacher change: `node tools/lessons/build_lessons.js`, then `test_sw_lessons.js`
(it fails if the shipped file is stale) and `learn_verify.py`.
