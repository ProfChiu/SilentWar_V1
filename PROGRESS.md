# Silent War — Progress

## 2026-10-29 (cont.) — git; v1 frozen; Ambush V3 studied for v2

- Accomplished: git repo created (AMBUSH_V3's .gitignore); all 529 files committed as 06d1d54, tagged v1.0 (build 0.15.0).
  Compared Silent War's screens with AMBUSH_V3's (title, play, Director lesson) to set v2's direction.
- Decisions (Wan): this build is version 1; v2 starts next because v1 shows too much information at once.
- Lessons from V3: three-button title; map fills the window, HUD floats; verbs in a ring on the unit, greyed with reasons;
  one guide voice, one paragraph, "Why?" on demand; a press is a decision; one mission polished before breadth.
- Next: v2 Gate 0 interview (new folder SIlentWar_V2, engine copied byte-identical, presentation replaced, scope cut).

## 2026-10-29 — readiness review (v0.15.0, no code changes)

- Accomplished: re-ran everything. Unit suites 2,218 passed / 0 failed (15 files); node --check clean; live
  phase9_verify 31 and first_hour_verify 52 pass, 0 console errors. live_verify needs a local server on :8765 (not run).
- Verdict: playable end to end (lessons, patrol, career, 5 campaigns + East Wind Early, saves). Not yet human-playtested
  since the 975 px fixes; campaign balance as printed is still harsh (see docs/20).
- Next: Wan plays a patrol + a Rising Sun campaign at their usual window size; decide the calibration default and MacArthur's
  pace; run live_verify with a server; decide whether to share the Compass pitch page.

## 2026-09-28 — Historical pace house rule; 975 px playtest fixes (v0.15.0)

- Accomplished:
  - Historical pace, an opt-in house rule labelled NOT in the book (Wan's choice): one modifier by War Period on the
    Endurance [14.7], counterattack [14.2] and Transit Event [19.1] rolls. It is shown on every roll it changes, and [HP]
    opens its own explanation sheet. Tuned by soak: Rising Sun 1942 448k -> 776k t (history 755k); the full war ends in a
    Historical Victory in 6 of 8 games.
  - A 975 px playtest found the Combat Display squeezed to about 190 px wide. In narrow windows the side panel is now a
    drawer behind a "Rolls" button (a dot marks new rolls). The Fleet board's chart and headers fit; the chrome is compact.
  - The pitch page was refreshed: new menu and Fleet screenshots, the house rule, current counts.
- Decisions: "as printed" stays the default. Losses stay about 2x history with the rule on (combat, left as printed).
  Setting Sun is Total Victory either way; MacArthur becomes generous. All recorded in docs/20.
- Verified: unit suites pass (phase9 59); every printed baseline identical; new pace baselines;
  browser 541 incl. new 975 px checks; 0 console errors.
- Next: Wan plays at his window size; decide whether MacArthur's Navy needs its own pace; show Compass the page.

## 2026-09-27 — session wrap-up (v0.15.0)

- State: v0.15.0, all unit suites, soaks and browser suites green. The game opens on the main menu; ☰ Menu (top left)
  always returns to it. Phase 9 is documented in docs/18 (brief) and docs/19 (as built, plus the Welcome).
- Pitch page for Compass Games: https://claude.ai/artifact/MPnewDfhhgTcVv2fr7qpHy (private, Wan decides whether to share).
- Next:
  1. Wan plays from the main menu at his usual window size (~975 px) and reports what reads badly.
  2. Campaign calibration (still harsh early and mid-war, generous late war; docs/17, docs/19): decide with Compass or by playtest.
  3. Fix the status strip, which is still cramped at narrow widths (it wraps, but the date takes two lines).
  4. Refresh the pitch page's screenshots to show the new Menu once Wan is happy with it.

## 2026-09-25 (cont.) — v0.15.0: a Menu button; the bar never hides buttons

- Problem (Wan's screenshot): at a ~975 px window the top bar ran off the right edge, taking Learn/Patrol/Scenarios/Career,
  Saves and Welcome with it: no way back to the menu once a lesson had started.
- Accomplished: a Menu button (top left, always visible) opens the main menu; its Play tab offers Resume, Boot camp,
  Lessons, A patrol, A career, Scenarios, Saved games, History. The mode label sits beside it. The mode buttons, Saves,
  History and Welcome left the bar. The bar and status strip wrap to a second row instead of clipping.
- Verified: every browser suite (tests now go Menu -> card), phase9_verify 28 incl. a 975 px check; 0 console errors.

## 2026-09-25 (cont.) — v0.15.0: the Welcome, inside the game

- Accomplished: the game now introduces itself (Wan: "the game should be self contained"). A first visit and the nav's Welcome
  button open five tabs: the war; what you decide (Captain / Skipper / ComSubPac: your decisions vs the dice's and the
  war's, each with its rule, why you do not control more, how a good captain thinks); how it teaches; start here (Resume,
  Boot camp, Lessons, Patrol, Career, Scenarios); about (credits, fidelity evidence, sources, rights).
- Decisions: the Welcome replaces the first-visit briefing; the patrol briefing is one click on, via Boot camp.
  After Wan launched with the .command and saw nothing (his browser remembered earlier visits), the Welcome became the
  title screen on every launch: The war on a first visit, Start here (Resume first) afterwards; a ?seed= link skips it.
- Verified: first_hour 52 (walks the Welcome), every other browser suite and unit suite passes, 0 console errors.
- Next: Wan plays through the Welcome; the pitch page stays private until he shares it.

## 2026-09-25 (cont.) — v0.15.0: Phase 9, a competent build for Compass Games + the extensions

- Accomplished:
  - Save & resume: autosave, the Saves sheet, export and import; resume rebuilds the game exactly.
  - History primer (6 chapters) and a tracker charting tonnage and losses against JANAC.
  - Fleet board: filters, sorting, standing orders per base, a weekly summary, clearer fight choice.
  - A stronger careful captain.
  - Optional rules [33.0]-[34.0]: Allied subs with the [33.15] adjustments, K-XIV Patrol Game, Surcouf, U-2513, Nautilus II, staggered arrivals and withdrawals.
  - East Wind Early (1932) [31.6], complete. See docs/19.
- Decisions: kept 1600x900 (not retrofitted); the captain's gain (+9-17% on Rising Sun) is kept but calibration stays open;
  the optional rules are off by default; the pitch page is private and says it is not from Compass.
- Pitch page for Compass Games: https://claude.ai/artifact/MPnewDfhhgTcVv2fr7qpHy (private; Wan shares it if he wants).
- Verified: unit 2,212 (phase9 53 new); soaks identical; fleet baselines re-recorded for the new captain (old ones archived);
  every browser suite passes (phase9_verify 26 new), 0 console errors.
- Next: Wan reviews the pitch page and decides whether to send it; campaign calibration with Compass's developer.

## 2026-09-25 (cont.) — v0.14.0: fleet wolfpacks

- Accomplished: wolfpacks in every campaign from Oct 1943: a boat with orders at a major base leads the next Ready
  boats; size/number by shared Wolfpack Experience [24.11]-[24.13]; pack combat/transit from Phase 7; members break
  away [24.14] or dock together; Congregating Risk counts packs [22.3]; The Setting Sun starts with its three packs.
  Fleet board: form/undo packs, pack rows; the captain's button forms packs.
- Verified: unit 2,142 (fleet 143), all soak baselines identical after re-recording the fleets (captain now forms packs),
  board-fought pack combat soaked, all live suites incl. campaign_verify 28.
- Next: calibration remains the open design question (docs/17: early/mid-war losses high, late war generous);
  optional rules [33.0] and East Wind Early when Wan wants them.

## 2026-09-25 (cont.) — v0.13.0: all five campaigns, careful captains

- Accomplished: Campaigns 1 (full war), 3 (Turning Tide), 4 (Setting Sun), 5 (MacArthur's Navy) playable with fleet
  command: orders of battle as printed (324 boats), starting counters/tenders/skippers, dated War Mix [3.12], Campaign 5's
  own lists, calendar schedule, area limits and event filter, three victory types; Scenarios menu for all five with a
  practice option (ignore longevity, off by default). English summary of [31.1]-[31.5] in docs/12.
- Decisions: took calibration option (a): the fleet's captains are "careful" (merchant-first reveals, red boxes weighed,
  bypass when damaged): Rising Sun 1942 202k -> 340k t, losses 34 -> 27 (history 725k / 7). Rules unchanged.
- Verified: unit 2,129 (fleet 130), all soak baselines identical (5 campaigns recorded), campaign_verify 27, all live.
- Next (open): fleet wolfpacks; calibration still short early/mid war and generous late war (docs/17); optional rules,
  East Wind Early when Wan wants them.

## 2026-09-25 — v0.12.0: Phase 8, scenarios (Patrol Games + The Rising Sun)

- Accomplished: interview (Wan: Patrol Games + one campaign; you pick fights, the rest automatic; standing orders +
  exceptions; no optional rules / East Wind yet). Built: Scenarios menu; the 9 Patrol Games [32.x] with the [32.1]
  verdict (First Wolfpack as a pack); fleet command (sw_fleet.js) on The Rising Sun [31.2] with the book's OOB and
  first-turn orders, quotas, relegation, Fall of Luzon evacuation, Aleutians group, full arrivals list, repair
  capacity / Hold Box, real Congregating Risk, longevity [31.12], victory [31.24]; Fleet board; marked fights on the
  Combat Display; campaign report. Career engine split into war/boat steps (careers byte-identical).
- Decisions: Quick Resolution vastly over-performs as the automatic resolver, so the default is the captain on the
  full rules and QR is a menu option. Quotas nearest-first; relegation named-then-weakest.
- OPEN, needs Wan: the full rules + our captain reach ~202k t in 1942 (history ~725k) and are relieved in Feb 1942;
  QR gives ~2.7M t. Options (a)-(d) in docs/17. Verified: unit 2,103, all soaks/baselines, campaign_verify 21/21 ×2, all live.
- Next: decide the campaign calibration (docs/17), then the other five campaigns on the same machinery.

## 2026-09-24 (cont.) — v0.11.0: Phase 7, force systems

- Accomplished: interview (Wan: wolfpack career, tenders, Quick Resolution, close the Phase 6 gaps, IJN rules
  optional/off). Built: wolfpacks from Oct 1943 (you command three boats; full [24.0-24.7] incl. per-boat turns,
  escort level, Re-Attack rolls, disbanding), tenders/forward bases with the drawn tenders (Tirante sails from
  Saipan), Quick Resolution, Congregating Risk, [15.25] Speed −1, IJN Loners / Crash Dive / Targeting an Escort /
  early W4 behind a Career-menu switch. Page: pack on the Combat Display and map, tender port, IJN switch; 2 lessons.
- Decisions: the medal counts your boat's tonnage (pack shown beside); pack members lost don't end the career;
  Hold Box/capacity documented as unable to bind with one boat; QR readings flagged in docs/15.
- Verified: unit 1,988, soaks 200/200 (career baselines re-recorded, old archived; patrols unchanged), 3,200 +
  2,400 + 3,200 (IJN) careers clean, learn 233, career_verify Wahoo/Tirante/Tang/Rasher, all live suites green.
- Next: Phase 8 scenarios (translate the Spanish campaigns first; interview). Wan to check: docs/14 design calls.

## 2026-09-24 — v0.10.0: Phase 6, the campaign layer (one boat's career)

- Accomplished: Careers. Pick one of seven book boats [32.1x] and play five patrols through the full weekly SOP:
  War Events (all four tables, every conditional), Torpedo Improvement, ULTRA, War Progress, bases, readiness,
  repair, overhaul, Transit Events [19.1], Special Missions into SMZs, plus [18.1] second/third Damage markers.
  Page: Career menu, the real Base Display with the boat in its box, war panel, map chips, career week in the
  palette, career report; 4 generated career lessons; English translation of the book sections used (docs/12).
- Decisions: overhaul fast-forwards to the book's Return month instead of ending the career (ending there cut
  most careers to 1-3 patrols); transit routes auto-pick the safest; medals Bronze any / Silver 25k / Gold 40k t.
- Verified: unit 1,902 (career 299 new), soak 200/200 re-recorded ([18.1] changes patrols; old archived),
  career soak 200/200 + 3,200 teacher + 2,000 random careers clean, live 86, ux 45, map 38, learn 186, first hour 49,
  parity 6/6, career_verify 26/26 (Wahoo, S-38, Tang, Rasher), assets 80/0. Details: docs/13_phase6_campaign.md.
- Run also: `node tools/bot/career_soak.js` · `python3 tools/career_verify.py [out] [career] [seed]`.
- Next: Phase 7 force systems (wolfpacks, tenders/forward bases, SMZs for a fleet, Quick Resolution, IJN):
  interview first. Wan to check: the base/SMZ links marked uncertain (docs/13), and a career playtest.

## 2026-09-23 (cont.) — Phase 6 started: interview done, brief written

- Accomplished: Phase 6 interview and brief, `docs/11_phase6_campaign_brief.md`. Sources located: the War
  Event Tables are in the rulebook (pp. 22–26, already in RULES.md); the career starts and withdraw/return
  dates are in the Spanish book ([32.1x], [31.54]/[31.64]).
- Decisions (Wan): one boat's career first; simulated fleet + your kills drive Torpedo Improvement and War
  Progress; Special Missions may task your boat; start from a book Patrol Game boat/date; N patrols (default 5)
  with a medal ladder; translate only the Spanish sections needed; same teaching pattern.
- Design calls pending Wan's OK: relegation only takes named/S-boat careers; forward bases/tenders stay
  Phase 7; the First Wolfpack career waits for wolfpacks.
- Next: step 6.1, the data (War Events as data, 8 career starts, English translation), then 6.2, the weekly SOP engine.

## 2026-09-23 — session wrap-up / hand-off (model switch)

- State: v0.9.0, everything green. Nothing half-built, nothing uncommitted in progress.
- Where to start next session: this file, then `docs/10_phase5_combat.md` (newest build),
  `docs/08_first_hour.md` (the newcomer path) and `ACTION_PLAN.md` (Phase 6 is next).
- Run everything: `for f in tools/test_*.js; do node "$f"; done` (1543) · `node tools/bot/soak.js`
  (200/200 vs baseline) · `node tools/lessons/build_lessons.js --check` · then with
  `python3 -m http.server 8765` running: live_verify 86, ux_verify 45, map_verify 38,
  learn_verify 146, first_hour_verify 49, `tools/bot/live_parity.py` 6/6, verify_assets 80/0.
- Traps for a new session: lessons and drills are GENERATED — after any engine or teacher change run
  `node tools/lessons/build_lessons.js` or test_sw_lessons fails; the soak baseline is only re-recorded
  for a deliberate rules change (archive the old one); the browser suites open with
  `?brief=0&detail=full&coach=0` and find their own sinking seed via `soak.js --find-sinking`.
- Next: Phase 6 campaign layer — interview first (it turns one patrol into a war: bases, repair,
  readiness, reinforcements, War Progress, Torpedo Improvement, ULTRA, War Events). Optional smaller
  items: the newcomer playtest (docs/09), and folding Phase 5's rules into the boot camp.

## 2026-09-21 (cont.) — v0.9.0: Phase 5, full combat fidelity

- Wan: build the next phase (newcomer playtest assumed passed). Every combat rule of a single-sub patrol
  now plays as the book says: [14.16A/B], [14.4] Re-Attack (markers back to the pool, new ones −1 except
  −3, adjacent-column choice), [14.41] second Re-Attack needs a Super Skipper roll, radar unflip, Diligent
  Escort applied (+ withdraw when damaged), face-down targets turned up at Fire, all ten Combat Events,
  Super Skipper +1 → +2, Sub vs. Sub. Details: docs/10_phase5_combat.md.
- Three new lessons (radar, Combat Events, enemy submarine) found by the builder; captain, guide, board
  clicks, badges and map chips for the new rules; the "not in this build" label removed.
- Found: TDC on an already-departed event marker (fixed); radar never on in the soak (setup had no date).
- Verified: phase5 70 (new), unit 1543, 20,000 patrols clean with every rule exercised, coach flags 0 of
  4,467 captain decisions (was 125), live 86, ux 45, map 38, learn 146, first hour 49, parity 6/6.
  Soak baseline re-recorded (rules changed), old one archived.
- Next: Phase 6, the campaign layer (bases, repair, readiness, War Periods, torpedo improvement, ULTRA):
  interview first, it changes scope from one patrol to a war.

## 2026-09-21 (cont.) — v0.8.1: "not sure what to do" at Search or stay hidden

- Wan's playtest: stuck after "Your move: Search for contacts, bypass to stay hidden, or head home."
  Cause: the choice buttons sat at the top of the palette, the instruction at the bottom, three equal-
  looking buttons and no hint which is normal. Also the engine's Bypass label still said "−1 endurance"
  like a cost (the same error corrected in v0.8.0's guide text; missed because it is an engine label).
- Fixed: every patrol choice now sits under "Your move", the usual choice (the teaching captain's)
  is tagged while the coach is on, the 13.1 text says "most weeks the answer is Search", Bypass reads
  "Bypass: stay hidden this week", the palette is opaque. Lessons rebuilt for the label.
- Verified: first_hour 49 (4 new checks for this report), live 86, ux 45, map 38, learn 91, unit 1455,
  soak 200/200, parity 6/6.
- Next: unchanged: newcomer playtest (docs/09), then Phase 5 starting with [14.16A].

## 2026-09-21 (cont.) — v0.8.0: the first hour for players new to the genre

- Evaluated the app as a guide for genre newcomers (explains what happened, not what the game is for,
  the goal, or wargame vocabulary). Wan approved every proposed action; all built. Details:
  docs/08_first_hour.md; the human test is a protocol, docs/09_newcomer_playtest.md.
- Built: first-run briefing with a calibrated goal (Bronze any ship / Silver 5,000 t / Gold 10,000 t,
  boat home; failed if lost; from 3,000 patrols), Read your boat, 9-step boot camp (watch, then 3 drills
  found by the builder), the coach (captain's judgement checks a decision before commit), Simple view by
  default, one-time "New:" explanations, goal line, patrol report with deciding moments + Replay, Combat
  Events labelled "effect not in this build yet". Teacher moved into apps/game/rules/sw_teacher.js.
- Correction: the guide said bypassing "costs endurance"; the −1 [14.7] actually helps. Fixed everywhere.
- Found: 125 of 4,612 captain decisions are forced hopeless volleys ([14.16A] missing): do it early in Phase 5.
- Verified: unit 1455 (coach 20, lessons 53 new/extended), first_hour 45 (new), live 86, ux 45, map 38,
  learn 91, parity 6/6, soak 200/200 + 20,000, assets 80/0.
- Next: run the newcomer playtest (docs/09) and process the recording; then Phase 5, starting with [14.16A].

## 2026-09-21 — v0.7.0: lesson library + Rewind

- Wan liked v0.6.0 ("seeing the play in action helped me understand combat"); discussed extending it
  to the rest of the game and chose: lesson library + Rewind for what the engine already plays.
- Built: Learn menu with 6 lessons (rulebook tape + 5 real seeded patrols found by a new deterministic
  "teaching captain" that explains every move from the engine's odds); ▶/◀/⟲/▶▶, next move marked on the
  board, board locked, Take the helm, end-of-lesson recap. Patrol gains Undo and What if? (rewind the
  column / aim / Re-Attack decision, earlier result remembered). All replays of seed + decisions.
- Decisions: lessons generated, never hand-scripted (cannot teach a rule the engine does not play);
  lessons with a hopeless shot rejected ([14.16A] still missing in the engine).
- Verified: lessons 39 (new), learn_verify 91 (new), unit 1409, soak 200/200 + 20,000, live 86, ux 45,
  map 38, parity 6/6. Details: docs/07_lessons_and_rewind.md.
- Next: Wan tries the lessons. Then either the coach (guided play) or Phase 5 (interview first); each
  new rules phase should ship with its lesson.

## 2026-09-20 (cont.) — v0.6.0: the map shows what happens, a floating palette explains it

- Wan played v0.5.0: info clear, but "no idea what is happening", no cue on the map, wants the Play
  button on a floating palette that explains the phases. Interview: all four map cues, controls +
  phase guide, both Demo and Patrol.
- Built: large labelled sub marker with a following camera and move wake; the search die lit on the
  area's printed chart (exact cell); contact / combat / endurance markers by the boat; search stays on
  the map; stat changes flash with deltas + Boat status; MOVE HERE discs; draggable floating palette with
  the week checklist, just-now, plain-language guide (data/sw_guide.js), your move, next. Details:
  docs/06_map_and_palette.md.
- Found and fixed: clicking a legal destination also opened the OpArea view and killed auto-follow
  (double click handler since 2026-08-24).
- Verified: map_verify 38 (new), live 86, ux 45, unit 1364, soak 200/200 + 20,000 clean, parity 6/6.
- Next: Wan plays v0.6.0. Then Phase 5, interview first (Re-Attack TDC question).

## 2026-09-20 (cont.) — Ambush v2 borrow complete: items 2-5 built (v0.5.0)

- Wan said "build all tasks": items 2-5 built in one go. Summary and evidence in `docs/05_ambush_borrow.md`.
- Item 2: a step with one legal action is taken automatically after a beat; presses per decision 1.28 -> 1.00,
  measured in the page (263 presses, 263 decisions, 70 forced steps taken by the game).
- Item 3: result badges on targets and the sub's box, sunk ships become wrecks with a SUNK stamp, a Radio log
  whose lines open their ledger (the escorts' reasoning for a counterattack), area ids shown as names.
- Item 4: hover odds from new pure engine previews (attack, counterattack, search) that share their terms
  with the real rolls; `test_sw_preview.js` holds them to the dice over 200 patrols and the [14.15] example.
- Item 5: `PLAY Silent War.command` (SW_SEED=N replays), `apps/game/version.js` = 0.5.0 under the title.
- Verified: 1358 unit, soak 200/200 + 20,000 clean, parity 6/6, live 86, ux 45 (real mouse, new checks for
  badges, wrecks, radio, hover cards, pacing), assets 79/0.
- Next: Wan plays v0.5.0 via the launcher. Then Phase 5 (combat fidelity), starting with the Re-Attack
  TDC question; interview first.

## 2026-09-20 — borrowing from Ambush v2; item 1 of 5: seeded dice + bot

- Reviewed AMBUSH_V2. Punch list agreed (one item at a time, go-ahead between): 1 seeded dice + bot,
  2 no acknowledgement presses, 3 results shown on the board, 4 hover info layer, 5 launcher + version line.
- Item 1 built: `rules/sw_dice.js` (seeded, counts draws); every page patrol is seeded (`?seed=N`, else
  a fresh seed shown in the status strip); die-animation faces moved off the game dice (the Ambush
  task-1 trap was live here: `animateDie` drew from DICE). `tools/bot/`: policy, soak with baseline,
  live parity. `live_verify`/`ux_verify` pinned to `?seed=1` (their 79-vs-86 count was dice luck).
- The soak found two real engine bugs, both fixed and under test: [14.14] dead end when nothing is in
  reach (28/200 patrols froze; new `no_attack` per [14.16A/B]); [14.8] clean-up never returned TDC
  markers or Japanese units, so the TDC pool ran dry and crashed (13/2000).
- Verified: 20,000 patrols 0 problems; baseline 200/200; live parity 6/6 with animation running (and
  0/2 with the old bug reintroduced); suites 1341, live 86, ux 27, assets 79 missing 0.
- Noticed, not changed: Re-Attack keeps round-1 TDC markers and subtracts 1; [14.4] says return them to
  the pool and draw fresh (−1 applies to the new ones). Phase 5 rules question.
- Next: Wan's go-ahead, then item 2 (no acknowledgement presses + a presses-per-decision measure).

## 2026-08-24 (session cont.) — UX pass: the board becomes the interface

- Accomplished: Patrol mode is now direct manipulation. Click a counter to reveal it, click a ship to place a
  TDC, click to target and set attack points with -/+, click a submarine box to take a column, click a glowing
  OpArea on the map to move. Added a per-phase prompt line ("Tactical 4 - 2 reveals left"), a real calendar,
  and a Resolution panel that shows every roll from one action instead of only the last.
- Decisions: the action bar now carries only choices with no home on the board (Search, Fire, Withdraw,
  End turn). The hard lock became visual - a counter glows only when the rules permit that click, because its
  handler comes straight from legalActions.
- Found two real bugs: TDC markers never rendered in Patrol mode (view set slot to null while the board matched
  by slot id), and `combat_event` was missing from the piece roster, so drawing one from the cups crashed the
  view. Both fixed; unknown piece ids now degrade to a visible label instead of taking the app down.
- Engine: added `points` / `untarget` actions so [14.14] allocation is a player decision, not an even split.
- Verified: 1326 unit assertions + 86 live checks + a new 27-check ux_verify that drives the game by clicking
  the board rather than calling debug hooks. All green.
- Next: playtest feedback. Known gaps left deliberately: Combat Event effects, Sub-vs-Sub, no undo, no scenario
  or victory condition.

## 2026-08-24 (session cont.) — Phase 4: the patrol engine, hard-locked

- Accomplished: five pure rules modules — movement (incl. the range leash), search and contact, War Mix cups,
  the full Combat Phase [14.1]-[14.8], and the operations loop as a state machine. Added a Patrol mode to the
  app that plays against them. One patrol runs end to end in the browser.
- The hard lock is real: `legalActions` returns only permitted actions (each citing its rule) and `apply`
  throws if handed anything else. With the boat in column B the UI offers reveals in A/B/C and none in D.
- Verified: the rulebook's Spearfish example runs through the ACTUAL engine and reproduces both attacks
  (+3 vs +2 need 1; +3 vs +3 need 0) and the counterattack (5-4, the '1' line) — with the 3 red boxes coming
  from the Phase 3 sampled AAC rather than a constant.
- Found and fixed a real defect: the Phase 3 movement graph was contaminated because the map draws a pale
  COASTAL HALO in the same colour as the connector bands, so the watershed leaked along coastlines and
  invented two edges that are not drawn. Trace now strips the halo by morphological opening; graph re-read
  from the clean network — 36 edges, symmetric, fully connected.
- Verified: 1354 unit assertions + 78 assets + 78 live-Chromium checks, all green.
- Next: Phase 5 full combat fidelity — Combat Event effects, Diligent Escort withdrawal, Sub-vs-Sub, radar
  unflip, and free allocation of attack points.

## 2026-08-24 — Phase 3: every engine table digitized

- Accomplished: 920 Area Activity Chart cells pixel-sampled off the map; ART, Counterattack (incl. the ten
  extra-roll discs), Transit Event pixel-sampled from the chart scans; Endurance, Contact, Engagement, War
  Period ASW/Modification/Transition, Torpedo Improvement, Enemy Submarines, ULTRA, Damage and Combat Events
  transcribed; War Mix checked against its own printed totals; 47 Japanese ships + 2 aircraft decoded; all 40
  submarine classes read from both counter sides. OpArea map geometry upgraded to pixel-derived, and the
  OpArea view now shows each area's real AAC.
- Decisions: nothing eyeballed was left unchecked — colour matrices are sampled by tool with the palette
  calibrated off the printed legends, and every chart's title was read to confirm its OpArea. The movement
  graph ships as `adjacencyStatus: 'draft'`, NOT trusted for hard-locking.
- Found: my own validation rule was wrong — later War Periods are *not* always calmer, Sea of Japan/Carolines/
  Gilberts genuinely run hotter in W2. Two printed "charts" turned out to be worked examples, not areas.
- Verified: 1083 unit assertions + 78 assets + 67 live-Chromium checks, all green. Seven independent rulebook
  facts cross-check the data, and every outcome hard-coded in the Phase 2 tape is now reproduced by the real
  tables — the tape predates them.
- Next: Phase 4 single-sub patrol engine. FIRST task is confirming the movement graph (3 areas unresolved,
  5 pairs uncertain) — everything else in Phase 4 sits on it.

## 2026-08-23 — Phase 2 built: playboard, nine views, explainability

- Accomplished: `apps/game/` shipped — Theater (map pan/zoom, 45 area/base click targets), Combat
  (pixel-exact Vassal slot geometry, real counter art), OpArea, Base, Cups, Tenders, Graveyard, Log,
  plus Charts and Rules as dismissable overlays. Persistent status strip + SOP breadcrumb, tooltips
  deep-linked into `RULES.md`, animated d10 with a rendered calculation ledger, filterable roll log,
  speed control. 17-step Spearfish demo tape drives it all. No rules engine, as specified.
- Decisions: the three blockers were answered — demo tape yes, no course layer (8 phases), multi-file
  architecture (overrides Phase 1). Tape uses the rulebook's Spearfish example instead of the Spanish
  book's Seawolf: same content, already the test fixture, English. Map hotspots ship `status:"temp"`.
- Found: the rulebook contradicts itself in the Spearfish example (TDC 0 in [14.14] vs +1 in the
  [14.15] arithmetic — confirmed in the PDF, not an OCR slip); the Vassal module misnames the
  Cachalot patrol/transit art. Both documented and handled, not silently fixed.
- Verified: 232 unit assertions, 32 assets, 62 live-Chromium checks with real clicks — all green.
  Run it with `python3 -m http.server 8765` then `http://localhost:8765/apps/game/`.
- Next: Phase 3 data digitization — OpArea adjacency graph (critical path), 920 AAC cells sampled
  from the map, remaining engine tables, 47 Japanese ship types from filenames.

## 2026-08-22 (session cont.) — Vassal module mined; UI first pass locked

- Accomplished: found `Silent_War.vmod` in ~/Downloads, copied to `Source/`, and mined its `buildFile`.
  Resolved the TDC pool (24 markers: −3×2, −2×4, −1×4, 0×4, +1×4, +2×4, +3×2, identical in every War Period)
  and the boat→class→entry-date mapping (309 boats). Extracted the 9-window Vassal UI layout including
  pixel-exact Combat Display geometry (8 sub / 22 target / 22 TDC slots). Wrote `ACTION_PLAN.md`.
- Decisions: 8 phases approved. Phase 2 gains four additions — (A) visible token placement + fog-of-war-safe
  numeric summaries, (B) die animation + a structured resolution-record contract + roll log + speed control,
  (C) tooltips from RULES.md [2.3] with rules deep-links, (D) view switching. UI first pass = the Vassal
  window layout; the game should play like Vassal, with guidance and automation added.
- Corrected: the 82 Vassal Regions are track boxes + combat slots only — they are NOT the OpArea graph, so
  adjacency is still hand-tracing. Phase 1's claim that sub ratings were missing was also wrong.
- Open (blocking Phase 2): scripted demo tape? course layer or not? single-file or multi-file architecture?
  All three are written up in `ACTION_PLAN.md` under "Open decisions".
- Next: answer those three, then start Phase 2 (Theater view + chart overlays + Combat Display geometry).

## 2026-08-22 — Rulebook to Markdown + feasibility verdict

- Accomplished: converted Rulebook 1.1 PDF to `RULES.md` (87 KB vs 1.2 MB; column-aware extraction, all War
  Event tables and the Quick Resolution table included). Verified Source assets against what a rules engine
  actually needs and wrote `ASSET_FEASIBILITY.md`.
- Decisions: verdict is **go** — every engine table (AACs, Contact/Engagement, ART, Counterattack, Transit
  Event, Endurance, Damage, War Mix, ULTRA, War Period, Torpedo Improvement, Enemy Subs) is present and
  legible. Corrected Phase 1: submarine ratings ARE on the Vassal class art (Atk•Def•Tac, Range, Endurance
  letter, Speed, Readiness); Japanese ship stats are encoded in the counter filenames.
- Open gaps: TDC pool multiplicity (only true unknown — ship behind a tunable constant); boat→class mapping
  for ~200 boats; OpArea adjacency graph must be traced from the map; scenarios are Spanish-only.
- Next: Phase 2 — HTML playboard (map pan/zoom) + chart popup dialogs. AAC colour grids should be
  pixel-sampled out of the map PNG rather than hand-typed.

## 2026-08-11 — Phase 1 asset review

- Read rulebook 1.1; interviewed for product direction.
- Locked: guided tabletop, single-sub patrol first, reuse Source art, hard-lock illegal moves, `index.html` + data JS.
- Inventoried Vassal/Source assets (map, combat display, 9 charts, ~328 images).
- Wrote `PHASE1_ASSET_REVIEW.md` with popup list, data gaps, Phase 2 gate preview.
- **Next:** User sign-off on Phase 1 → Phase 2 HTML playboard + chart popups.
