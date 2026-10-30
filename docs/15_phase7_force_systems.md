# 15 — Phase 7: force systems, as built (v0.11.0)

**Built:** 2026-09-24 · **Brief:** `docs/14_phase7_brief.md`

## What is new in a career

| Rules | What you see |
|---|---|
| **Wolfpacks [24.0-24.7]** | From October 1943, at a major base, *Form a wolfpack*: two boats of the fleet (war-construction classes, in service that month, not in overhaul) join yours. The pack sails as one [24.2]; each boat rolls its own Transit Event check at −1 [24.4]; Group or Barrier search [24.3] (+2, with 0-5 intercept rolls); on the Combat Display the boats are placed one by one, two to a column at most [24.5]; each boat reveals, places TDC, aims, fires and takes its own counterattack in turn [24.53] with its own escort level [24.54]; a Diligent Escort goes for a random boat [24.51]; Combat Events touch only the boat that turned them up [24.52]; the pack may Re-Attack once, every boat rolling its Tactical to join [24.55]; one spotted, all spotted, one removal roll [24.6]; Wolfpack Experience [24.7]. Boats that must go home leave; below three the pack disbands [24.14]; at base the others rejoin the fleet. |
| **Tenders and forward bases [21.1-21.2]** | Midway, Majuro, Mios Woendi, Saipan, Guam (and Surabaya) open on their War Events; a tender whose deployment date has come is drawn at random and placed in the War Progress Phase [21.21]; a second tender adds capacity. A forward base is a friendly base for Range; its step costs no Speed [15.1 note]. RTB there: undamaged to the tender's Broom Box, readied there (Ship Side instead of Pier Side); damaged, one roll: Superficial is fixed, anything else sends the boat on to a major base [21.23]. **Tirante now sails from Saipan, as in the book.** |
| **Quick Resolution [27.0-27.1]** | *Quick resolution* beside Search at [13.1] (a career option; not in a Special Mission Zone, not for a pack): two dice for a submarine, the table by attack value and the chart's non-white boxes, the die less ULTRA/radar, ships drawn cup by cup and sunk, then the one-die counterattack read off the chart's colours. |
| **Closing the Phase 6 gaps** | **Congregating Risk [22.0]**: your boat (a pack counts one per two [22.3]) plus a Special Mission's quota in the same OpArea: −1 on the search, +1 on Transit Events per four beyond four; SMZs exempt [20.2]. **[15.25]**: a boat left beyond Range by a fallen base now limps home at Speed −1. |
| **IJN Expansion Kit [28.0], optional** | A switch in the Career menu, **off by default**: Loners [IJN 4], Crash Dive with the class ratings [IJN 5], Targeting an Escort [IJN 6], Early War Period 4 [IJN 7]. Single patrols never use them. |

## Decisions made while building

- **Your boat's tonnage scores the career**, not the pack's. The report shows both. Calibration on 3,200 careers
  (your boat only): median 13,000 t, p75 29,000 t, p90 48,000 t. Silver 25,000 t and Gold 40,000 t still sit
  near p75 and p90.
- **Losing a pack member** counts as a US loss but does not end the career. Losing your boat does.
- **Wolfpack Experience** counts only your packs. It won't reach 9 in a career, so packs stay at three boats, one at a time [24.11].
- **In a pack Re-Attack the boats keep their columns**. The [14.4] reposition isn't offered to each boat.
- **Sub vs. Sub and Loners in a pack** involve your boat only.
- **Quick Resolution, two readings flagged:**
  - The table result is the number of draws; events, aircraft and Diligent Escorts use up a draw.
  - A result of 0 means no fight: no counterattack, and −1 on Endurance as for no contact.
- **The Hold Box and Max Repair Capacity [10.1-10.2]** can't bind: your boat is alone in port (pack members leave on
  arrival), and the fleet's occupancy of a base isn't simulated. Tender capacity is shown.
- **The IJN rules were built as an option.** They weren't ticked under "parts", but were answered "optional, off by default".

## Verified

| Check | Result |
|---|---|
| `node tools/test_sw_career.js` | 371 passed (tenders 17, Congregating Risk 5, Quick Resolution 8, IJN 14, wolfpacks 20 new) |
| all unit suites | 1,988 passed |
| `node tools/bot/career_soak.js` (+ `--ijn`) | 200/200 against re-recorded baselines (old one archived); 3,200 teacher careers with 3,160 wolfpack patrols, 2,400 random, 1,600 + 1,600 with IJN: 0 problems |
| `node tools/bot/soak.js` | 200/200 identical: single patrols are unchanged by Phase 7 |
| lessons | two new career lessons (A wolfpack fight; The forward base), 115 lesson checks; learn_verify 233 in Chromium |
| `python3 tools/career_verify.py` | Wahoo 28, Tirante (from Saipan) 28, Tang 32 and Rasher 32 (with wolfpacks on the map and the Combat Display), 0 console errors |
| live 86, ux 45, map 38, first hour 49, parity 6/6, assets 80/0 | all pass |
