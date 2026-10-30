# 17 — Phase 8: scenarios, as built (v0.12.0)

**Built:** 2026-09-25 · **Brief:** `docs/16_phase8_brief.md`

## What is new

**Scenarios** in the mode switch opens the scenario book:

- **The nine Patrol Games [32.11-32.19].** One boat, one patrol from departure to return, as the book frames them.
  - There are no War Events, no War Period or Mk-XIV change, and no ULTRA. The Strategic and Triple-R segments are skipped [4.0].
  - There are no Super Skippers.
  - The report judges you by [32.1]: good, great or legendary against the named skipper; losing the boat takes a level off.
  - The First Wolfpack [32.19] sails as Cero with Shad and Grayback. Its record is the pack's.
- **The Rising Sun [31.2]: fleet command.**
  - **Start:** the whole December 1941 order of battle [31.13], 42 boats, with the book's special orders:
    - S-36 in the Lingayen Gulf zone, TF contacts only, home in the first turn;
    - the five Hawaiian Islands boats: no Patrol Movement, TF contacts only, RTB in the first Transit Phase;
    - Argonaut and Trout at Midway, Tambor and Triton at Wake, for two turns.
  - **The first turn** skips the Strategic Segment.
  - **Every week:**
    - the War Event, torpedo and ULTRA once for the war;
    - mission quotas filled with the nearest boats that can reach [5.2];
    - relegation of the named, then the weakest, boats;
    - the Fall of Luzon sends Manila's boats Base-to-Base to Fremantle, and scuttles Repair Boxes 2-3;
    - the Aleutians group of eight based at Dutch Harbor, with a lost member replaced;
    - arrivals from the whole Master Reinforcement list (now fully transcribed, 1942-45);
    - readiness and repair, with Max Repair Capacity and the Hold Box binding for real [10.1-10.21];
    - Congregating Risk counting the real boats in each area [22.0];
    - the War Mix made up again when the War Period changes.
  - **Career longevity [31.12]:** 90,000 / 220,000 / 360,000 / 620,000 t by the end of February, May, August and November 1942, or you are relieved.
  - **Victory [31.24]** on tonnage at the end of 1942, adjusted for capital ships (CA, BB, CV) sunk and for 12+ boats lost.
- **The Fleet board** is a new tab in a campaign:
  - every boat with its ratings, place, status and sinkings;
  - a destination dropdown for each boat Ready for Sea, and a button that sends them all where the captain would;
  - a "fight on the board" checkbox for each boat on station;
  - Carry out the week;
  - the war's news.
- **A marked fight** stops the week at its contact and hands you the Combat Display, exactly as in a patrol. When it is over the week carries on for the rest of the fleet.
- **The map** shows how many boats are in each area and base.
- **Campaign report:** the result, the book's ladder, the modifiers, and history for comparison.

## The machinery

`rules/sw_fleet.js` runs many career boats (`sw_career.createBoat`) that share one war, calendar, War Mix and TDC pool.
The career engine was split into war-level and boat-level steps (`boatWeek`, `boatWeekEnd`, `applyEffects(…, 'war' | 'boat')`),
proven by the career baselines staying byte-identical through the refactor. Clean-Up [14.8] now also runs as each
boat's fight ends (`SWPatrol.cleanUp`), because several boats fight from one set of cups and markers in the same week.
A shared TDC pool ran dry without it: the first fleet soak crashed on that.

## The decision this phase needs from you: how the campaign plays out

The fights you don't play yourself are resolved by one of two settings in the Scenarios menu. Measured over whole
Rising Sun campaigns (`node tools/bot/fleet_soak.js`, the captain giving the orders):

| Setting | Tons sunk in 1942 | Ships | US boats lost | Result |
|---|---|---|---|---|
| History | about 725,000 | about 180 | 7 | the book's Historical level |
| Captain on the full rules (default) | median 202,000 (with the longevity rule off) | 46 | 34 | **relieved of command in February 1942, 20 of 20** |
| Quick Resolution [27.0] | median 2,680,000 | 457 | 47 | Decisive Victory, 10 of 10 |

- **The full rules** are faithful, but in 1942 they are brutal. With the Mk-XIV at −2 the Endurance target is 2-4, so most boats
  go home after a week on station (61 of 89 Endurance rolls in one sample). Hits are rare and often duds. First-round
  counterattacks cause most losses; only 11 of 318 losses followed a Re-Attack.
- **Quick Resolution** is as printed but, used for every boat every week, it sinks about five times what the same boat does on
  the full rules and loses boats to its counterattack. The book says it is "not recommended for extensive campaign use".
- So with either setting the campaign doesn't track history yet. Options for the next session:
  - (a) teach the captain better early-war play and measure again;
  - (b) calibrate Quick Resolution for campaign use (for example, only on a week the search finds contact);
  - (c) keep the rules as printed and treat the longevity rule as the book's challenge;
  - (d) mix: board fights for the boats you choose, the captain for the rest, and relax longevity until the captain is better.

## Other decisions made while building

- **Mission quotas** fill with the nearest boats that can reach, as many as possible [5.2]. The board and the war log list them.
- **Relegation** removes the named boats first, then the weakest eligible (in port first).
- **Arrivals:** the Vassal roster spells Entemedor as "Etemedor"; an alias maps them.

## Verified

| Check | Result |
|---|---|
| `node tools/test_sw_fleet.js` (new) | 104 passed: data, the order of battle, the first turn, hard lock, orders, a week, reinforcements, a marked fight, quotas, capacity, the Fall of Luzon, longevity, the victory table with modifiers, the Patrol Games |
| all unit suites | 2,103 passed |
| soaks | patrols 200/200, careers 200/200 (+ IJN), Patrol Games 225 recorded, fleets: 20 (captain), 10 (Quick Resolution), 10 (25% board fights) against recorded baselines, 0 problems |
| `python3 tools/campaign_verify.py` (new, Chromium) | 21/21 on two seeds: the Scenarios menu, a Patrol Game to its [32.1] verdict, the Fleet board's own controls, a marked fight, the whole campaign, the report, 0 console errors |
| live 86, ux 45, map 38, learn 233, first hour 49, parity 6/6, career_verify ×3, assets 80/0 | all pass |

## Continued 2026-09-25: all five campaigns, and the captain (v0.13.0)

**Campaigns now playable:**

| Campaign | Start | Ends | Notes |
|---|---|---|---|
| **1** The Submarine Campaign [31.1] | December 1941 | at 5,500,000 t, judged by date | about 178 weeks; 4.5 s headless |
| **2** The Rising Sun [31.2] | December 1941 | December 1942 | |
| **3** The Turning Tide [31.3] | April 1943 | at War Period 4 | |
| **4** The Setting Sun [31.4] | September 1944 | at 5,000,000 t | |
| **5** MacArthur's Navy [31.5] | December 1941 | at 2,000,000 t (1,900,000 t in 1945) | Southwest Pacific only; its own lists; torpedo and War Periods by the calendar |

The English summary is in `docs/12_scenario_book_en.md`. New machinery:
- starting counters, tenders and Super Skippers;
- boats that start at sea, on RTB, in a mission zone or in overhaul;
- the War Mix now holds dated ships back until their month [3.12] and keeps sunk unique ships out;
- per-campaign lists, schedules, area limits and event filtering;
- three victory types.

The menu adds a **practice option** to ignore career longevity. It is off by default: the book's rule.

**Calibration, option (a) taken:** the fleet's captains are now *careful*. They reveal merchant-flagged counters first and
leave warships face down, weigh red boxes when choosing an area, and stay hidden when damaged. The Rising Sun without
longevity, 20 seeds:

| Captain | Tons sunk in 1942 | Boats lost |
|---|---|---|
| Plain | 202,000 | 34 |
| Careful | 340,000 | 27 |
| History | 725,000 | 7 |

Where the boat-weeks go (5 campaigns): 50% in port (readying, repair, overhaul), 25% in transit, 25% on station, where
64% of Endurance rolls at Mk-XIV −2 send the boat home. With longevity on, the fleet is still relieved at the February
1942 check (67,000 t against 90,000 t).

Results across the campaigns, captain only:

| Campaign | Result | Boats lost | History |
|---|---|---|---|
| The Turning Tide | Dramatic Failure | 87 by War Period 4 | 33 |
| The Setting Sun | Total Victory | 6 | |
| MacArthur's Navy | Relieved of command | | |

Early and mid-war, the full rules are harder on boats than history was; late-war they are generous.
**For Wan:** the rules are as printed. A human choosing fights, and more captain work, are the levers.
The next candidates:
- a captain that bypasses weeks when a counterattack would likely sink the boat;
- fleet wolfpacks.

**Not in this build:** [31.5 A]'s next-month-withdrawal exception. A boat withdrawn while inside a wolfpack stays with the
pack until it comes home.

## Fleet wolfpacks (v0.14.0)

In every campaign from October 1943, on the Fleet board, a boat with orders at a major base may **lead a wolfpack**
[24.1]. The next boats Ready for Sea at that base join it; you can undo it before the week runs.
- **Size and number** follow Wolfpack Experience [24.11]-[24.13]: one pack of three below 9, three of four from 9, five of six from 15.
  Experience is shared across the whole fleet.
- **At sea** the pack is the Phase 7 pack: its boats ride with the leader, fight on the Combat Display one by one
  (or with the captain), and roll their own Transit Events at −1.
- **Breaking up:** a boat that must go home leaves; below three the pack disbands and the rest carry on alone [24.14].
- **Home:** at base every boat of the pack docks and rolls its own damage.
- **Congregating Risk** counts every two boats of a pack as one [22.3].
- **The Setting Sun** starts with its three packs at sea already formed and experience 10. Its pack at Saipan starts in port
  as three separate boats.
- **Captain and captain's button:** the captain forms a pack whenever one is allowed, and "Send the boats Ready for Sea where the
  captain would" does the same.

Results with the captain and packs (5 seeds each):

| Campaign | Result | Notes |
|---|---|---|
| The Turning Tide | Dramatic Failure | 94 boats lost |
| The Setting Sun | Total Victory | |
| MacArthur's Navy (practice, no longevity) | Historical or Dramatic Victory | about 1.9 million t |
| The Submarine Campaign (practice) | Failure | 5.6 million t reached late in 1945, 152 boats lost |

Verified: fleet 143 unit checks (13 new for packs), every fleet baseline re-recorded (the captain now forms packs), board-fought
pack combat soaked, campaign_verify 28 in Chromium.
