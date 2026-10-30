# Phase 6 — Campaign layer: brief (interview 2026-09-23)

Phase 6 turns one patrol into a **career**: one boat, several patrols, the war moving around it.
The book has no such mode. Its Patrol Games [32.0] are one patrol with War Events, war progress and
torpedo improvement switched off, and its campaigns [31.x] are fleet command. So this brief records
design decisions, not only rules.

## Decisions (Wan, 2026-09-23)

| Question | Decision |
|---|---|
| First slice | **One boat's career.** Fleet command (many boats) is not in Phase 6. |
| War clock | **Simulated fleet + your kills.** An off-screen "rest of ComSubPac" adds a seeded, historically calibrated weekly tally; your sinkings add on top; [6.0] Torpedo Improvement and [17.0] War Progress then run exactly as printed on the combined totals. |
| Special Missions | **Orders may task your boat.** If your boat can reach the SMZ it is ordered there under the event's limits (TF only, no attacks, ...); the rest of the quota is filled off-screen. Base, ULTRA and relegation events apply to you directly. |
| Start | **Pick a historical boat + date:** the book's Patrol Games [32.1x] as career starting points, with that patrol's record to beat. |
| End and score | **Set length, medal ladder:** N patrols (default 5) or earlier on loss, relegation, overhaul withdrawal or war's end; Bronze/Silver/Gold scaled to a career, plus the historical record. |
| Spanish book | **Translate what Phase 6 needs** into English in `docs/`, uncertain passages flagged for Wan. |
| Teaching | **Same pattern as before:** a generated lesson per new rule, captain/coach support, one-time "New:" explanations. Boot camp stays patrol-only. |

## Sources (all on disk)

- War Event Tables, all four periods: rulebook pp. 22–26, already in `RULES.md` §[5.0] WAR EVENT TABLES (line ~1311).
- ULTRA, Torpedo Improvement, War Period Modification/Transition, Damage: already data in `apps/game/data/sw_tables.js`.
- Patrol Games (start boats, base, date, destination, torpedo value, record): Spanish book [32.0]–[32.19].
- Withdraw/Return dates for the career boats: Spanish book reinforcement lists [31.54]/[31.64] (pp. 12–15).
- Rules text: [3.0], [4.0] SOP, [5.0]–[11.0], [15.0], [16.0], [17.0], [18.0], [21.0].

## What a career plays

Every week runs the full Sequence of Play [4.0] for your boat:

1. **Strategic:** War Event [5.0], Torpedo Improvement [6.0], ULTRA [7.0].
2. **Triple-R, at base:** Readiness roll from the Broom Box [9.0], Pier Side → Ready for Sea, Repair Boxes 3→2→1→Broom [10.0], damage level fixed on arrival [18.3], Dutch Harbor wear [15.23].
3. **Operations:** the patrol engine you already have (deploy, patrol move, search, combat, endurance, transit, RTB).
4. **End turn:** Spotted removal [16.2], date advance, War Progress [17.0] with automatic advance [17.2].

Weeks spent in port run fast-forward, with a log of what happened elsewhere in the war.

## Design calls made while writing this (Wan may overrule)

- **The fleet tally** uses JANAC-style monthly US submarine sinkings divided into weeks with seeded noise.
  It is calibrated so that, on average, war periods and torpedo steps land near their historical dates.
  Subs Lost is simulated the same way, because Relegation thresholds read it.
- **Relegation to Training Duty** takes your boat only if it is one the event names first (Cachalot,
  Cuttlefish, Argonaut, Narwhal, Nautilus) or an S-boat when S-boats are retired. Otherwise the fleet
  absorbs it, since three boats out of ~100 is the realistic odds.
- **Aleutians designation** ("eight subs must base at Dutch Harbor") does not force your boat.
- **Forward bases and tenders** (Midway, Majuro, ...) belong to Phase 7. Their activation is logged and
  labelled "not in this build"; in Phase 6 your boat returns to a major base.
- **Career boats:** S-38, Sculpin, Wahoo, Harder, Tang, Rasher, Flasher, Tirante. The First Wolfpack
  (Momsen) waits for wolfpacks in Phase 7; Surcouf and U-2513 are optional-rule boats.

## Build order

| Step | Content | Proof |
|---|---|---|
| 6.1 | Data: War Events as data (every one-time flag, fallback, date condition), the 8 career starts, withdraw/return dates; English translation of those book sections | data tests; each row cites its page |
| 6.2 | Engine: the weekly SOP around the patrol engine, base boxes, readiness, repair, damage on arrival | unit tests, rulebook worked cases |
| 6.3 | Fleet simulation + calibration | report: period/torpedo dates vs history over 3,000 careers |
| 6.4 | War Events incl. Special Missions tasking your boat | unit tests per event |
| 6.5 | Page: career start (boat picker), base display, war strip (period, torpedo, ULTRA, fleet tally, your share), career report | live drive, 0 console errors |
| 6.6 | Teaching: generated lessons (base turnaround, repair, ULTRA, a Special Mission, war progress), coach and "New:" | lessons build, learn_verify |
| 6.7 | Verify three ways; soak 200+ careers clean; v0.10.0 | all suites green |

## Changes during the build (2026-09-24)

- **Overhaul no longer ends a career** (it did in the table above). Ending there cut most careers to one to three
  patrols; the book returns overhauled boats [8.0D], so the war now fast-forwards to the Return month and the
  boat resumes at Pearl Harbor. Details and the rest of the as-built record: `docs/13_phase6_campaign.md`.
- Transit Events [19.1] and the [18.1] second Damage marker were missing from the patrol engine; both are in now.
