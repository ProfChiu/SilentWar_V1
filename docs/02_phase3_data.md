# 02 — Phase 3: data digitization

**Built:** 2026-08-24 · **Status:** complete except the movement graph, which ships as a **draft**.

## What changed

Every engine table Silent War prints is now data. Five new/rewritten pure-data modules:

| Module | Holds |
|---|---|
| `data/sw_aac.js` | the 23 Area Activity Charts — **920 cells**, pixel-sampled |
| `data/sw_tables.js` | ART, Counterattack (+ Diligent Escort, Event Aircraft), Transit Event, Endurance, Contact, Engagement, Damage, War Period ASW / Modification / Transition, Torpedo Improvement, Enemy Submarines, ULTRA, Combat Events |
| `data/sw_ships.js` | 47 Japanese ship counters + 2 aircraft, and the full War Mix Table |
| `data/sw_subclasses.js` | all 40 submarine classes, both sides of the counter |
| `data/sw_map.js` | OpArea geometry upgraded from eyeballed to pixel-derived; the movement graph |

New tools: `sample_grid.py` (reads a printed colour matrix off a scan),
`sample_aac.py` (all 23 AACs), `trace_adjacency.py` (the movement graph).
The OpArea view now renders the area's real AAC with the current War Period highlighted.

## How each table was read, and how it was checked

**Nothing here was transcribed by eye and left at that.** Every table has an independent check.

- **ART, Counterattack, Transit Event** — *pixel sampled* from `Charts/page_051` by `tools/sample_grid.py`.
  The palette was calibrated against the legend swatches printed on that same sheet, so classification is
  measured rather than guessed. The Counterattack sheet also prints a "+" disc on ten cells meaning
  *roll again*; those are detected by luminance variance in the cell centre (a flat cell reads near zero,
  a cell carrying the white disc and its black stroke reads an order of magnitude higher).
- **920 AAC cells** — pixel sampled from the map. Each chart's printed title was rendered and read to
  confirm the chart-to-OpArea mapping (this caught two printed *example* charts that are not areas at all,
  and a Transfer Route chart with only three coloured cells). Eight charts were then compared cell-by-cell
  against the map art.
- **War Mix** — transcribed from `Charts/page_063`, then checked against the per-cup totals printed on the
  chart. All five columns tie out exactly, which is what makes the transcription trustworthy.
- **Japanese ships** — decoded from Vassal filenames as `<type><tonnage>t<defense><asw>[variant]`, with all
  47 counters rendered and read to confirm the pattern.
- **Submarine classes** — read from both sides of all 40 counters. Cross-check: the Range printed on the
  Patrol side equals the Range printed on the Transit side for every class.

### Cross-checks against the rulebook

These are the ones that matter, because they come from outside the data:

| Rulebook says | Data says |
|---|---|
| [14.2] East China Sea, War Period 2 has **3 red boxes** | `SWAac.redBoxes('east_china_sea','W2')` = 3 |
| [14.14] USS Spearfish is a **6-3-4** | `new_s2` class reads 6-3-4 |
| [14.14] the example fights a **7-1 destroyer**, **2-0** and **1-0** marus | all three counters exist |
| [3.12] **nine pieces** carry printed entry dates | `datedPieceCount()` = 9 |
| [6.0] 70 ships sunk needs a **9**; next attempt at **75** needs an **8** | Torpedo Improvement table agrees |
| [17.1A] "if 310, then use 300" | `warPeriodModifier('W2',310,0)` uses the 300 line |
| [2.3B] aircraft have **no defense rating** | both aircraft have `defense: null` |

**And the Phase 2 demo tape now validates against the real tables.** Every outcome hard-coded into
`sw_tape_spearfish.js` is independently reproduced: the AAC gives Moderate for W2/die 5, the Contact Table
gives C2 for W2/die 6, the Engagement Table gives A5 B4 C3 D2, the ART sinks a 3,000-ton target on a
modified 7, the Counterattack '1' line is a no-effect on a 6, and Endurance B at torpedo −1 needs a 4.
The tape was written before any of these tables existed.

## The movement graph — ships as a DRAFT

`SWMap.adjacency` now has 33 edges over all 23 OpAreas, but `adjacencyStatus` is `'draft'` and
**Phase 4 must not hard-lock movement on it yet.**

How it was traced: each OpArea is a pale disc and each legal move is a pale band joining two discs, in a
colour nothing else on the map uses. `trace_adjacency.py` floods outward from every disc centre through the
pale only, so every pale pixel is owned by the disc nearest along the corridors; two territories can then
only meet inside a band, which makes a shared border an edge. That produced 30 edges that match the drawn
bands on inspection. Three more (`java_sea–scs2`, `java_sea–banda_sea`, `coral_sea–gilberts`) were added
after a direct corridor test scored them 0.81–0.97 pale.

What is **not** settled, and is recorded in the data rather than hidden:

- `SWMap.unresolved` — **Sea of Japan, Java Sea, Banda Sea** never joined the traced network. Their
  connecting bands fall outside the colour tolerance or are interrupted by island art. Sea of Japan
  currently has no edges at all, which cannot be right.
- `SWMap.uncertain` — five pairs scored in the ambiguous 0.5–0.8 band and were left out:
  `sea_of_japan–east_china_sea`, `sea_of_japan–yellow_sea`, `banda_sea–s_phil_sea`, `scs2–s_phil_sea`,
  `gilberts–transfer_route`.

Two false edges were caught and removed along the way (`carolines–s_phil_sea`, `coral_sea–bismarck_sea`),
which is the reason for the caution: the method produces plausible-looking wrong answers when the seeding
drifts. A deliberate confirmation pass against the map is the first task of Phase 4.

## Real problems found

1. **My own monotonicity assumption was wrong.** I validated the AAC sampling by asserting that a later War
   Period is never hotter than an earlier one at the same die roll. It flagged Sea of Japan, the Carolines
   and the Gilberts — and inspecting the scans showed the *map* was right: those areas genuinely run hotter
   in W2 than W1. The check was removed and a comment left so it is not added back. The within-row check
   (activity never decreases as the die rises) does hold everywhere and is kept.
2. **Two printed charts are not OpAreas.** The map prints a Marianas AAC as a worked example inside the
   Search & Contact panel, and the Submarine Damage Table looks like a chart to a colour detector. Reading
   every chart's title is what separated them.
3. **The Torpedo Improvement table really is indexed by ships sunk, not tonnage.** 1,190 ships looks like a
   typo until [6.0]'s worked example confirms the 70/9 and 75/8 rows.

## Verification

| Check | Result |
|---|---|
| `node tools/test_sw_phase3.js` | **931 passed** — the new data, incl. all 920 AAC cells and every War Mix row |
| `node tools/test_sw_data.js` | 78 passed |
| `node tools/test_architecture.js` | 95 passed — the new modules are DOM-free and dice-free |
| `node tools/test_sw_resolution.js` / `_fog` / `_tapeplayer` | 29 / 21 / 29 passed |
| `python3 tools/verify_assets.py` | 78 unique assets, 0 missing |
| `python3 tools/live_verify.py` | **67 passed** — real Chromium, incl. the AAC rendering with the right red-box counts |

**Not independently verified:** the movement graph (above). SMZ, base and map-panel coordinates are still
eyeballed `temp` — only the 23 OpArea positions were upgraded. The 1932-campaign column of the War Mix is
transcribed but unused. Entry dates for the nine dated pieces were read off the counters, not from a table.

## Next

Phase 4 — the single-sub patrol engine. First task: confirm the movement graph against the map and clear
`unresolved`/`uncertain`, because hard-locking illegal moves is the product premise and everything else in
Phase 4 sits on top of it.
