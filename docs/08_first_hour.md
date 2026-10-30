# 08 — The first hour: from newcomer to first patrol

**Built:** 2026-09-21 · **Build:** v0.8.0 · **Play:** `PLAY Silent War.command` (a first visit opens the briefing)

Wan asked for an evaluation of the app as a guide for players new to the genre. The verdict: it
explained *what happened* well but not *what the game is for*, *what you are trying to do*, or the
genre's vocabulary (counters, roll-under, modifiers, charts, face-down units). Wan approved every
proposed action; all are built except the human playtest, whose protocol is `09_newcomer_playtest.md`.

## What a newcomer now meets

1. **Briefing, on first visit.** Role (Spearfish, March 1943), the patrol **goal ladder**, the scale
   ("a good captain sinks something in about half of patrols"), and **six things to know**: you and
   your goal, your boat's numbers, the week, the dice, the fight, the risks. Buttons: *Start boot camp*,
   *Read your boat*, *Lessons*, *Straight to a patrol*. Reopen any time with **Briefing** in the top bar.
2. **Read your boat.** Both counter sides enlarged, every printed number marked and explained
   (Attack 6, Defense 3, Tactical 4, Range 6, Endurance B, class; Speed 2, Range, Readiness 4).
   Positions read off 4x scans of `new_s2.gif` / `new_s2_transit.gif`.
3. **Boot camp (9 steps, about 10 minutes), watch then do:** briefing → boat → lesson: moving and
   searching → lesson: setting up an attack → **drill: pick your column** → **drill: aim the torpedoes**
   → lesson: the Re-Attack gamble → **drill: go again or break off** → first patrol with the coach.
   Progress is remembered; the Learn menu shows it as a checklist with Continue / Start over.
4. **Drills** are real situations found by the lesson builder where the right call is clear (a convoy
   where one column reaches a third of it; a fight with a target that cannot be hit; a Re-Attack with
   13% risk of losing the boat). You decide; the result compares your call with the captain's, with
   *Try again* (a replay) and *Keep playing this patrol*.
5. **The coach** (on by default, always on in drills, toggle in the top bar). It is the teaching
   captain's judgement applied to your decision *before* it is committed. A clear mistake is held:
   *"6 on maru 10,000 t cannot hit: the roll needed is below 0. The captain would put 6 on maru
   3,000 t."* → **Let me change it** / **Do it anyway**. Lesser points are a note afterwards.
   It flags: a column reaching half or less of the convoy, a volley that cannot hit or is under 60% as
   good as the captain's aim, a Re-Attack with over 5% risk of loss or on a damaged boat, bypassing or
   going home with a healthy boat.
6. **Simple view** (default; **Simple | Full** in the top bar): plain labels in the status strip (Enemy
   ASW, Torpedoes), the tabs not used yet hidden, no rule numbers in the palette, hover cards or badges,
   the dice maths folded to one line per roll with *Show the maths*.
7. **"New:" explanations**, once each: your first die roll, the Area Activity Chart, face-down counters,
   reading a Japanese counter, firing solutions, the counterattack, a sinking, the Endurance roll, RTB.
8. **The goal** at the top of the palette all patrol (*"Bronze so far · next: Silver at 5,000 t · bring
   the boat home"*), and the **patrol report** at the end: medal, weeks / ships / tons / the boat, the
   ladder, *the moments that decided it* (each with *Replay from here*), and one tip.
9. **Combat Events** now say *(effect not in this build yet)* in the radio and the log, instead of
   silently doing nothing.

## The goal, calibrated

A presentation-layer objective (`apps/game/rules/sw_goal.js`), not a rule: the rulebook's victory
conditions belong to the scenarios (Phase 8). Measured 2026-09-21 on 3,000 seeded patrols:

| | Teaching captain | Random bot |
|---|---|---|
| Sinks nothing | 52% | 85% |
| 5,000 t or more (p75) | 25% | under 10% |
| 10,000 t or more (p90) | 10% | — |
| Boat lost | 7% | — |
| Patrol length | median 3 weeks, p90 5, max 13 | |

**Bronze** any ship and home · **Silver** 5,000 t · **Gold** 10,000 t · **Failed** boat lost. No week
limit: Endurance ends patrols long before one would matter, and adding one would have been an engine change.

## A correction to earlier text

The v0.6/v0.7 guide said bypassing a search "costs endurance". It is the opposite: [14.7] gives −1 to
the Endurance roll after a week with no contact or a bypass, and the boat stays out on a roll equal or
under its target, so −1 **helps**. Fixed in the phase guide, the bypass hover card, the coach, lesson 1's
text and its test.

## Structure

| File | Role |
|---|---|
| `apps/game/rules/sw_teacher.js` | the teaching captain + `verdict()` (the coach). Pure. Moved from `tools/bot/teacher.js`, which now re-exports it |
| `apps/game/rules/sw_goal.js` | goal ladder and rating. Pure |
| `apps/game/data/sw_guide.js` | essentials, boat diagram, "New:" texts, boot camp order, plain labels |
| `apps/game/data/sw_lessons.js` | lessons + `SWDrills`, both generated by `tools/lessons/build_lessons.js` |
| URL overrides | `?brief=0` (no first-run briefing) `&detail=full|beginner` `&coach=0|1`; the older suites open with `brief=0&detail=full&coach=0` |

## Verification (2026-09-21)

| Check | Result |
|---|---|
| `node tools/test_sw_coach.js` (new) | 20 passed. Over 500 patrols the coach judged 4,612 of the captain's own decisions and flagged 125, every one a volley where nothing could hit: the engine still forces a shot there because [14.16A] ("no successful attack possible: no counterattack, withdraw or re-attack") is not implemented. That is 2.7% of decisions, a concrete argument for doing [14.16A] early in Phase 5; it catches bypass, unforced RTB, a half-reach column, a volley that cannot hit; goal ladder |
| `node tools/test_sw_lessons.js` | 53 passed (drills replay legally to their decision; lessons and drills up to date with the builder) |
| `python3 tools/first_hour_verify.py` (new, fresh browser, real mouse) | 45 passed: the whole boot camp with deliberate mistakes, progress across a reload, Simple/Full, "New:" once, Combat Event label, patrol report and Replay from here |
| unit total · soak 200/200 · 20,000 patrols | 1455 · identical · 0 problems |
| live 86 · ux 45 · map 38 · learn 91 · parity 6/6 (1.00 presses per decision) · assets 80/0 | all green |
