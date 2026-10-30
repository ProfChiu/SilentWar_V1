# 10 — Phase 5: full combat fidelity

**Built:** 2026-09-21 · **Build:** v0.9.0 · Wan: "go ahead and build the next phase" (newcomer playtest assumed passed).

Every combat rule of the single-submarine patrol now plays as the book says. Each is hard-locked
(offered only when legal, citing its rule), explained in the palette, and covered by a scripted-dice test.

| Rule | What happens now | Before |
|---|---|---|
| [14.16A/B] impossible attacks | If no target in reach can be hit even with every point (face-down = defense 1), the only action is *No attack can succeed*: in round 1 no counterattack, then withdraw or Re-Attack; in a Re-Attack the escorts still counterattack | the engine forced a volley that could not hit (125 of 4,612 teaching-captain decisions) |
| [14.4] Re-Attack | first a choice: move to an adjacent column or stay; the round's TDC markers go back into the pool; new markers count one better except a −3; revealed ships stay revealed | old markers kept and reduced; no reposition |
| [14.41]/[14.42] second Re-Attack | only with a Super Skipper and a roll = or < his rating; after it, combat ends | always allowed |
| [14.12] radar (1943–45) | the counter just revealed may be turned back face down, once a round (not an Event, Diligent Escort or aircraft; not a round-1 unit in a Re-Attack); another must be revealed in its place. A face-down escort's ASW counts for nothing | not implemented |
| [14.12] Diligent Escort | its Counterattack row is applied the moment it is revealed; if that damages the boat during the reveal step it may withdraw at once (not at targeting) | rolled, never applied |
| [14.14] targets turned up at Fire | face-down targets are revealed before the volley; an aircraft frees its points (TDC to the pool) and a Combat Event takes over the round: you aim again | resolved face down at defense 1 |
| [14.13] | no TDC marker on a revealed aircraft | allowed |
| [19.2] Combat Events, all ten | 0 a red-ball ship lumbers into the torpedoes (you pick it; ART with Mk-XIV) · 1 surface gunnery on the 26-35 line, boat Spotted, then counterattack (ignored if a revealed warship is present) · 2 circular runner against your own boat · 3 Betty bomber on the Event Aircraft row, straight to Endurance · 4 mechanical: odd damaged + RTB, even fixed, no Endurance roll · 5 perfect setup: all TDC negative · 6 largest merchant sunk counts double · 7 escorts strike first, then you, no second counterattack · 8 held down: counterattack only · 9 no counterattack. One per round; a second marker goes back to the cup | drawn and rolled, no effect ("not in this build yet") |
| [14.5] Super Skipper | 3+ ships and 16,000+ t in the Combat Phase: +1, or +1 → +2 | only a first +1 |
| [14.6] Sub vs. Sub | two zeros on the chart: detection (−1 spotted/damaged, +1 radar), enemy drawn from the Enemy Submarine Table by date and area (German/Italian only in Java Sea / SCS 2), one attack with its TDC marker, 1-4 line of the ART; no counterattack or Re-Attack | ended the phase |

The engine date (March 1943 + 4 weeks a month) now lives in the engine (`SWPatrol.dateOf`) because
Sub vs. Sub needs it; the patrol setup carries `start: { y: 1943, m: 2 }`, which also fits the radar.

## Lessons, guide, board

- Three new lessons found by the builder: **Radar: hiding an escort** (seed 3212), **Combat Events**
  (surface gunnery, seed 1905), **Enemy submarine!** (seed 7). The Re-Attack lesson now includes the
  column choice and real volleys in both rounds. 8 engine lessons + the rulebook tape.
- The teaching captain unflips revealed escorts, withdraws after a damaging Diligent Escort, shifts
  column for a Re-Attack when another reaches more ships, picks the lumbering / shelled ship.
- Palette prompts for radar, the Re-Attack column, each event state, [14.16] and the second Re-Attack;
  guide entry [14.4]; "New:" notes for Combat Events, radar, Diligent Escorts, enemy submarines.
- On the board: click the just-revealed counter to unflip it; click an adjacent submarine box to move
  for the Re-Attack; click the lumbering / shelled ship. Badges for those results and for the boat hit by
  a Diligent Escort, Betty bomber or circular runner; map chips for the round's Event and an enemy sub.
- The "(effect not in this build yet)" label is gone.

## Bugs found on the way

- The captain placed a TDC marker on a Combat Event marker that had already left the display: the
  page, correctly, had nothing to highlight, and `learn_verify` failed. `canPlaceTdc` / `canTarget` now
  refuse returned units.
- The soak's patrol setup had no date, so radar never switched on (0 unflips in 20,000 patrols) until
  the coverage count showed it.

## Verification (2026-09-21)

| Check | Result |
|---|---|
| `node tools/test_sw_phase5.js` (new, scripted dice) | 70 passed, one or more checks per rule above |
| coverage over 20,000 patrols | all ten Events (~450–500 each), 327 Sub vs. Sub, 1,567 Diligent rolls, 3,544 second-Re-Attack rolls, radar unflips, lumber, gunnery, held-down; 0 problems |
| coach consistency (500 patrols) | 4,467 captain decisions judged, **0** flagged (was 125 forced hopeless volleys) |
| unit total · soak baseline | 1543 · re-recorded (rules changed; old baseline archived in `tools/bot/baselines/archive/`) |
| live 86 · ux 45 · map 38 · learn 146 (incl. mouse: radar unflip, Re-Attack column) · first hour 49 · parity 6/6 (1.00 presses per decision) · assets 80/0 | all green |

## Still not in (by design, later phases)

Wolfpacks [24], forward bases and tenders [21], transit events [19.1] on the move, the campaign's
bases, repair and readiness (Phase 6), and scenarios with the book's victory conditions (Phase 8).
