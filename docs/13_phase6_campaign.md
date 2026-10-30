# 13 — Phase 6: the campaign layer, as built (v0.10.0)

**Built:** 2026-09-23/24 · **Brief:** `docs/11_phase6_campaign_brief.md` · **Scenario book sections:** `docs/12_scenario_book_en.md`

A **Career** is one boat over five patrols with the whole weekly Sequence of Play [4.0] around it. Pick a boat
from the Career menu (eight of the book's Patrol Games [32.1x], seven playable now), start in port Ready for
Sea at the book's date and base, and play until five patrols are home, the boat is lost, or the war ends.

## What a week is now

| Segment | Rules | Where |
|---|---|---|
| I. Strategic | War Event [5.0] with every conditional of the four tables; Torpedo Improvement [6.0]; ULTRA [7.0] with the three-area cap [7.3] | `rules/sw_war.js` |
| II. Triple-R | Withdraw for overhaul / return [8.0C-D]; Readying from Broom and Pier Side [9.0]; Repair Boxes 3→2→1 [10.0] with each base's printed numbers (Subic Bay's own) | `rules/sw_base.js`, `rules/sw_career.js` |
| III. Operations | Deployment [15.1] and transit [15.11] at Speed, Cautious Transit [15.24], Return to Base to a chosen base [15.2]; **Transit Events [19.1]** on every trip and every patrol move; Special Missions into SMZs [12.1, 20.3-20.5] with the event's contact limits; Political Pressure; the patrol engine for 12.0-14.x | `rules/sw_transit.js`, `rules/sw_career.js` |
| IV. End Turn | Spotted removal [16.2] (Super Skipper subtracts); ULTRA cleared [16.4]; the calendar [16.5]; War Progress [17.1] with the modification table and automatic advance [17.2]; period-start base changes | `rules/sw_war.js`, `rules/sw_career.js` |
| Arrival | Damage Table on arrival [18.3], two markers rolled twice and added, beyond Box 3 a constructive total loss [18.1]; Dutch Harbor wear [15.23] | `rules/sw_base.js` |

**Also new in the patrol engine:** [18.1]/[18.2] second and third Damage markers. A second marker rolls against
Defense (over is sunk), a third sinks the boat. Before, a boat could be "damaged" any number of times. This
changes single patrols too (seed 1045 of the soak now sinks), so the soak baseline was re-recorded and the old one
archived (`tools/bot/baselines/archive/soak_1000_200_pre-phase6.json`).

## The war around the boat

The rest of ComSubPac is off-screen. Each week it adds a share of the month's historical US submarine sinkings
(JANAC, smoothed within each year) times a die-driven factor 0.55-1.45, and loses a boat when a die says so.
Its totals plus yours drive the printed Torpedo Improvement and War Period tables.
Calibrated over 3,200 careers:

| | Engine (median, p10-p90) | History / the book |
|---|---|---|
| War Period 3 | May 1943 (Mar-May 1943) | the Solomons, early 1943 |
| War Period 4 | Oct 1944 (Sep 1944-Jan 1945) | Leyte Gulf, October 1944 |
| Mk-XIV 0 | May 1943 (Apr-Aug 1943) | the book's Harder patrol: 0 in Aug 1943 |
| Mk-XIV +1 | Nov 1943 (Oct 1943-Mar 1944) | Tang: +1 in May 1944 |
| Mk-XIV +2 | Dec 1944 (Nov 1944-Jan 1945) | Tirante: +2 in Mar 1945 |

The torpedo fixes run a few months ahead of the book's snapshots; the War Periods land on history.

## Data read for this phase

- **Base displays**: repair numbers (Pearl 4/6/8, Brisbane 2/4/6, Fremantle 3/5/7, Dutch Harbor 1/3/5, Manila
  1/3/5, Subic Bay 2/4/6) and capacities, read off the map. The panels' rectangles were re-measured from their
  dark outlines in the pixels (the Phase 2 values were eyeballed and a panel off).
- **Base links** (the band from each anchor) and **SMZ links** (each bubble's arrowhead), read off the rendered map
  one by one. Least certain: Manila to the North Philippine Sea; the Palau, Mios Woendi and Lingayen arrowheads.
  They are listed as `uncertain` in `data/sw_campaign.js`.
- **War Event Tables**: rulebook pp. 22-26, all four periods, as data with their conditionals.
- **Careers**: the Patrol Games' stat blocks; **Withdraw/Return**: the Master Reinforcement list.

## The page

- **Career** in the mode switch: a menu of the boats with skipper, date, base, class ratings, the story and the
  record to beat; the medal ladder.
- **In port**, the Base view shows the real Base Display with the boat in its box and the week's odds (readiness,
  repair number). Ready for Sea: every OpArea within Range glows on the map; the captain's suggested destination is
  also a button.
- **The war panel** (side column): War Period, Mk-XIV, this week's ULTRA Areas, War Event, orders, open bases,
  forward bases (Phase 7), all boats' sinkings and your share, US subs lost, your patrols.
- **On the map**: ULTRA, MISSION and DESTINATION/HOME chips.
- **The palette's week** has the whole Sequence of Play: The war this week, In port, Move, Search, Combat, Transit,
  End of the week. The guide explains each, and there are nine new one-time "New:" notes (port, War Event, ULTRA,
  Transit Event, mission, torpedo, War Period, overhaul).
- **Career report** at the end: medal, why it ended, your first patrol against the book's record [32.1], patrol by
  patrol, and the war with your share of it.
- **Four generated career lessons**: Home, repair and ready; Out and home: Transit Events; Special Mission orders;
  The war moves on (overhaul). Each is found in real seeded careers by the builder, like every other lesson.

## Decisions made while building

- **Overhaul does not end a career.** The brief said the career ends at withdrawal. In the soak that cut most
  careers to one to three patrols (Rasher sails in July 1944 and is withdrawn in September). The book brings
  overhauled boats back [8.0D], so a withdrawal now fast-forwards the war to the Return month and the boat
  resumes at Pearl Harbor. A boat with no listed return still ends the career.
- **Routes are chosen by the engine.** A transit leg takes the route that gets closest to the goal, then the
  safest one (the highest governing Transit Event number). That is always the player's best route, so asking
  would be a click without a decision. The record prints the route taken.
- **Medals** (calibrated on 800, confirmed on 3,200 teacher careers: tonnage p25 3,000 t, median 12,000 t,
  p75 27,000 t, p90 43,000 t; 41% lose the boat): Bronze = any ship and the boat survives; Silver = 25,000 t;
  Gold = 40,000 t.
- **The Brief's four calls stand:** relegation only takes the boats a table names first, or S-boats when they are
  retired; the Aleutians designation never forces your boat; forward bases and tenders are Phase 7 (logged, not
  sailed to; Tirante sails from Pearl Harbor); the First Wolfpack waits for wolfpacks.

## Not in this build (said on screen where it matters)

- Forward bases and tenders [21.1-21.2]: activations are logged; boats return to the five major bases.
- Congregating Risk [22.0], the Hold Box and Max Repair Capacity [10.1-10.2]: they bind only with a fleet on the map.
- [15.25] "RTB at Speed −1" after a base falls: the boat is damaged and made RTB, but moves at full Speed.
- Arrivals from the reinforcement list: not needed for one boat (the fleet is a tally).

## Verified

| Check | Result |
|---|---|
| `node tools/test_sw_career.js` (new) | 299 passed: data, Transit Events, bases, [18.1], every War Event conditional, the rulebook's [6.0] and [7.3] worked examples, the career engine, hard lock, medals |
| all unit suites | 1,902 passed, 0 failed (lessons 101, architecture 191) |
| `node tools/bot/career_soak.js` (new) | 200/200 identical to baseline; 3,200 teacher careers and 2,000 random-player careers, 0 crashes / stalls / dead ends / unruled records |
| `node tools/bot/soak.js` | 200/200 against the re-recorded baseline; 20,000 patrols clean |
| `python3 tools/career_verify.py` (new, real Chromium) | 26/26 on Wahoo, S-38 and Tang, 0 console errors |
| live 86, ux 45, map 38, learn 186 (was 146: the career lessons play in the page on the exact headless state), first hour 49, parity 6/6, assets 80/0 | all pass |
