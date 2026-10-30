# 04 — UX pass: the board becomes the interface

**Built:** 2026-08-24 · **Status:** ready for playtest.

Requested ahead of more rules work: get the interaction right before building
Phase 5 modules. This pass turns Patrol mode from a list of buttons into a board
you touch.

## What changed

| Before | Now |
|---|---|
| "Reveal a counter in B" ×3 identical buttons | click the counter you want to flip |
| TDC placement from a button list | click the ship you want to mark |
| Targets chosen from a list, points split evenly | click a ship, then set its points with −/+ |
| Submarine column from four buttons | click a submarine box on the display |
| Movement from a button list | legal OpAreas pulse green on the map; click one |
| No indication of what to do next | a prompt line per phase, with counts remaining |
| Only the last die roll shown | every roll from one action, oldest first |
| Fake date, frozen at "March 1943 wk N" | real week→month→year rollover |

The action bar now carries only choices with no home on the board — Search,
Bypass, Fire, Withdraw, Re-Attack, End turn. Everything per-counter moved onto
the counters.

**The hard lock is now visual.** A counter is only clickable when the rules
permit that click, because its `onclick` comes from `Patrol.legalActions`. A
glowing border means "the rules allow this right now"; nothing else glows.

## Two real bugs this pass found

1. **TDC markers never rendered in Patrol mode.** `engineView` set every marker's
   slot to `null` while the board matched markers by slot id, so nothing drew.
   The board now derives placement from column order, which also guarantees a
   ship and its TDC marker share a row.
2. **`combat_event` was missing from the piece roster.** The War Mix puts four
   Combat Event markers in the cups [3.1] and `sw_cups` duly drew them, but
   `SWShips.pieces` had no entry, so `Ships.piece()` returned null and the whole
   view crashed the moment one was drawn. Added as a piece with no tonnage,
   defense or ASW. An unknown piece id now also renders as `UNKNOWN: <id>` on the
   counter rather than taking the app down.

## One behaviour change worth noting

A TDC marker on a sunk ship no longer renders. Previously the board drew markers
by slot regardless of whether a ship was still there, so a sunk target left a
marker floating in an empty box. Markers now belong to ships.

## Engine change

`sw_patrol` gained `points` and `untarget` actions so attack allocation is a
player decision rather than an even split. [14.14] lets the player distribute the
attack value freely across as many targets as it covers; that is the most
interesting decision in the game and it now happens a point at a time.

## Verification

| Check | Result |
|---|---|
| `python3 tools/ux_verify.py` | **27 passed** — new: drives the game by *clicking the board* |
| `python3 tools/live_verify.py` | 86 passed |
| all `node tools/test_*.js` | 1326 passed |
| `python3 tools/verify_assets.py` | 79 assets, 0 missing |

`ux_verify.py` is deliberately different from `live_verify.py`: it clicks
counters and submarine boxes rather than calling debug hooks, so it fails if the
board stops being the interface.

## Known rough edges (expected during playtest)

- Combat Events are drawn, rolled and logged, but their **effects are not applied**.
- Sub-vs-Sub [14.6] is detected and ends the phase rather than being fought.
- A sunk ship simply disappears — no beat marking the kill.
- No undo. A misclick stands.
- Base, Cups, Tenders and Graveyard are still static images (Phase 6 wires them).
- The patrol is open-ended: no scenario, victory condition or turn limit yet.
- Only the first Re-Attack is offered logic-wise; [14.41]'s Super Skipper roll for
  a second one is not implemented.
