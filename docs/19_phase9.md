# 19 — Phase 9, as built: a competent build for Compass Games, and the extensions (v0.15.0)

**Built:** 2026-09-25 · **Brief:** `docs/18_phase9_brief.md` · the canvas stays 1600 × 900 (a mature project, not retrofitted)

## Polish

- **Save & resume.**
  - Every game (patrol, career, Patrol Game, campaign) autosaves in the browser after each decision you take.
  - A save holds the seed, the settings and the decisions; the engine is deterministic, so resuming replays them and rebuilds the game exactly.
  - The replay goes straight to the engine and renders once.
  - The **Saves** button resumes, exports to a JSON file, imports, or deletes.
  - On launch, the newest unfinished save is offered, but not when the URL names a `?seed=`.
  - A save that no longer replays on a newer build says so and names both versions.
- **History primer** (the **History** button): six short chapters in our own words:
  - the war;
  - the torpedo scandal;
  - ULTRA;
  - why 1942 went badly;
  - ComSubPac's decisions;
  - how the game models it.

  Each chapter ties the history to the rules that carry it and names its sources (Blair, JANAC, Roscoe, Kuenne, the designer's notes). No rules text is copied.
- **History tracker.** The Fleet board and the campaign report chart your cumulative tonnage and losses against the historical curve (JANAC, from the campaign data's fleet curve), with the keep-command targets. A reading line says whether you are ahead of, close to, or behind history, and points at "Why 1942 went badly". A hypothetical war (East Wind Early) draws only your own line; MacArthur's Navy has none, because the curve is the whole Pacific.
- **Fleet board upgrades.**
  - Last week's summary: who sank what, who was lost, and the war's news.
  - Filters (Ready, On station, In transit, Wolfpacks, In port, Damaged), a home-base filter, and sorting (by place, name, tonnage, attack, busy waters).
  - Standing orders per base: each week the captain sails every boat Ready for Sea from the bases you tick. These are recorded decisions, so saves and undo keep them.
  - A clearer fight choice:
    - every boat on station shows how busy its waters are (Area Activity boxes out of ten) and whether it has ULTRA;
    - one button ticks the most promising fights;
    - "Carry out the week" says how many fights you will play.
  - Fixed on the way:
    - a destination dropdown showed blank once a boat had orders;
    - the nav overflowed at 1600 px (key hints moved into tooltips).
- **The captain.** The careful captain now does three new things:
  - places its column where the convoy's merchant flags are, because it must reveal up to its Tactical rating and every escort revealed adds ASW;
  - weighs red boxes and transit time more;
  - lies low while Spotted.

  Measured on The Rising Sun (practice setting, 40 seeds each):

  | Seeds | Before | After |
  |---|---|---|
  | 101-140 | 381k t | 416k t |
  | 201-240 | 361k t, 30 lost | 424k t, 29 lost |

  With longevity on, the February 1942 check now reaches about 80,000 t against the book's 90,000 t (was 67,000). History is 725,000 t for the year: the full rules remain harsh early, as docs/17 found.

## Optional rules [33.0]-[34.0] (Scenarios menu, each off by default)

- **[33.1] Allied submarines.** The Dutch and British boats of [33.14], tallied apart from yours.
  - Their sinkings do not move longevity, the torpedo or the War Period.
  - They count for the end of the war, and from the book's date for victory, with each campaign's [33.15] adjustment.
  - Surabaya starts active with Zuiderkruis. Its Display is a full base: repair 1-3-5, Hold 12.
  - The book's starting positions: K-XIV in the Java Sea; K-XV and K-XVI holding the Makassar Strait until spotted, damaged or sent home.
  - The arrival and withdrawal list 1942-45, with the [33.14 *] replacements.
  - O-27 has no counter in the Vassal roster, so it borrows O-21's as the book's note allows.
  - Restrictions [33.11]: Surabaya only until it falls, then only Fremantle, Subic Bay and Mios Woendi; never relegated; never in a wolfpack.
  - Technology [33.12]: Dutch attacks at −1 in 1941-42.
  - The Dutch withdrawal [33.13]: from the second week of March 1942, starting the week after Surabaya falls or at War Period 2.
  - The Setting Sun starts with its four Dutch boats. The Zeeleeuw variant is its own option.
- **[33.2] K-XIV's 2nd patrol** (van Well Groeneveld) is a tenth Patrol Game, from Surabaya.
- **[33.3] Surcouf.** Pearl Harbor May 1942 to January 1943. It may choose surface gunnery on the 10-17 line [33.31].
- **[33.4] U-2513** and **[33.5] Nautilus II.** Pearl Harbor, July 1945. Withdrawn after the first patrol on which damaged. U-2513 fires at +2 always.
- **[34.0] Staggered arrivals and withdrawals.** Each boat on the lists is rolled a week (0-2 → week 1, 3-4 → 2, 5-7 → 3, 8-9 → 4).

## East Wind Early (1932) [31.6]

- **[31.61] rule changes.**
  - Patrol only in the eleven listed areas, though transit may cross any area; every Special Mission Zone is playable.
  - Only Pearl Harbor and Manila at the start. Area Activity on the W1 line. General ASW 0.
  - The Mitsubishi B1M replaces the Betty.
  - ULTRA only when a War Event calls for it, on the line it names.
  - The torpedo starts at −1 and improves once, to 0, on the −2 to −1 column. No War Progress.
  - The War Mix's 1932 column (Y32):
    - only the 6-defence DD 2t;
    - the DD 6-3 is a Diligent Escort;
    - the CV 10t (Hosho) leaves play once sunk;
    - battleships appear only in the North Philippine Sea and South China Sea 1, and the two areas below them: one drawn elsewhere goes back and another is drawn.
- **[31.62]-[31.64] length and forces.**
  - Third week of April to December 1932, 34 turns; the first turn skips the Strategic Segment.
  - The order of battle, including S-37 at Lingayen and S-34 in neutral Tsingtao (no attacks, home first).
  - The reinforcements through September.
- **[31.65] Leviathan** ("USS Leviathon" in the roster) may choose surface gunnery on the 5-9 line.
- **The East Wind War Event table** (rulebook), with its conditionals:
  - the landings on Luzon and Guam;
  - Formosa, where the boats hold until spotted, damaged or sent home;
  - Okinawa, where the big-gun boats go first;
  - tender Holland at Wake;
  - the Army at Manila (October on: Canopus to Davao, damaged boats in port scuttled, damaged boats at sea to Pearl Harbor);
  - the Dutch Intervention (Pelikaan at Surabaya, four K-boats, the American torpedo value).
- **[31.66] victory.**
  - Tonnage by the end of December, with capital ships sunk counted twice and damaged ones once.
  - Modifiers: fewer than 6 boats lost +1; more than 15 −1; more than 20 −2; +1 for each battleship or carrier sunk.

Results, captain on the full rules, 20 seeds:

| Setting | Median tonnage | Result |
|---|---|---|
| Captain on the full rules | 170k t | Catastrophic Defeat 17, Defeat 3 |
| Quick Resolution | 879k t | Decisive Victory 20 |

This is the same pattern as the other campaigns. The old S-boats have Range 3, and many missions cannot be reached.

## Verified

| Check | Result |
|---|---|
| `node tools/test_sw_phase9.js` (new) | 53 passed |
| all unit suites | pass; fleet 143, career 381 |
| soaks: patrol 200, careers 200 (and IJN) | identical to baselines |
| Patrol Games | 225 of the old runs identical, 25 new K-XIV runs recorded |
| fleet baselines | re-recorded for the new captain (old ones in `tools/bot/baselines/archive/pre_0.15/`); with the old captain every fleet baseline was first proved identical, so the optional-rule and East Wind plumbing changes nothing when off |
| new fleet baselines | East Wind 20; all options on, 10 |
| `python3 tools/phase9_verify.py` (new, Chromium) | 26 passed, 0 console errors: nav fits, primer, Fleet board filters/sort/standing orders/summary/tracker, autosave, export, resume rebuilds exactly, optional rules, East Wind Early to its [31.66] report |
| live 86, ux 45, map 38, learn 233, first hour 49, career 28, campaign 28, parity 6/6, assets 80/0 | all pass |

## Not in this build

- [33.11] "Dutch boats may not be diverted to Surabaya's Hold Box" is not enforced; with a 12-boat Hold it rarely binds.
- [31.61 E]: a battleship redrawn under the doctrine rule takes the next counter from the same cup.

## The Welcome (added the same day, at Wan's request)

The game now introduces itself instead of relying on the pitch page. A first visit opens **Welcome** (also in the nav), with five tabs (content in `data/sw_intro.js`):

- **The war:** the background in four points, with a link into the History primer.
- **What you decide:**
  - the three levels of command (Captain, Skipper, ComSubPac): what you decide, and what the dice or the war decide, each with its rule number, which opens the rulebook;
  - why you do not control more;
  - how a good captain thinks: the six principles the coach and the built-in captain use.
- **How it teaches:** the maths panel, rule links, lessons and drills, the coach, Undo and What if?, History, Simple or Full.
- **Start here:** Resume (when a save exists), Boot camp (opens the patrol briefing), Lessons, A patrol, A career, Scenarios.
- **About:** the board game and its credits, how fidelity is checked (unit, soak and browser counts), the history sources, the rights notice.

`first_hour_verify` now walks the Welcome to Boot camp (52 checks). Every other live suite is unchanged and passes.
