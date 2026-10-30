# 01 — Phase 2: playboard, views, chart overlays, explainability

**Built:** 2026-08-23 · **Status:** acceptance criteria 1–8 met, verified live in Chromium.

## What changed

`apps/game/` now exists: a nine-view playboard derived from the Vassal module's own
window layout, with no rules engine. A scripted tape plays one patrol turn through it.

```
apps/game/
  index.html              shell; <script> tags in dependency order
  css/app.css             all theming through CSS variables
  swui.js                 the ONLY file touching the DOM / rolling real dice
  data/    sw_map.js sw_layout.js sw_tables.js sw_units.js
           sw_sop.js sw_glossary.js sw_charts.js        (pure data)
  rules/   sw_resolution.js sw_fog.js sw_tapeplayer.js  (pure, DOM-free, dice injected)
  tape/    sw_tape_spearfish.js                         (pure data)
tools/     test_*.js  verify_assets.py  live_verify.py
```

**Run it.** The rules viewer fetches `RULES.md`, which `file://` blocks, so serve the project:

```
python3 -m http.server 8765          # from the project root
open http://localhost:8765/apps/game/
```

## The three decisions this phase was blocked on

All three were answered 2026-08-23 and are recorded in `ACTION_PLAN.md`.

- **Demo tape: yes.** `tape/sw_tape_spearfish.js`, 17 steps.
- **Course layer: no.** Eight phases; teaching is carried by tooltips, the rules viewer and (from Phase 4) hard-locks.
- **Architecture: multi-file**, overriding Phase 1. Playbook invariant 9, enforced by `tools/test_architecture.js`.

## Decisions made while building

**The tape uses the Spearfish example, not Seawolf.** `ACTION_PLAN.md` named the Spanish
scenario book's *Seawolf* Comprehensive Example of Play. The rulebook's own Spearfish example
([14.14], [14.15], [14.2], p.9–10) is the same kind of content, is already the designated test
fixture for the resolution-record contract, and is in English. Substituted deliberately. Steps 1–6
and 12–17 are not in the printed example; they are constructed to be consistent with its stated
situation, fixed-dice, and flagged `constructed: true` — the UI shows a badge for them.

**Counter art matches the example exactly.** Vassal filenames decode as
`<type><tonnage>t<defense><asw>[variant]`. `new_s2.gif` is printed 6-3-4 (Spearfish's class),
`m5t20.gif` is a 5,000-ton 2-0 maru, `m3t10.gif` a 3,000-ton 1-0 maru, `dd2t71.gif` a 7-1
destroyer. The example does not state the marus' tonnage; 5t and 3t are the smallest printed
counters carrying the stated ratings.

**Map geometry is `status: "temp"`.** The 23 OpAreas, 16 SMZs, 6 bases and 9 printed panels are
normalised click targets read by eye off a 1500px render — not traced. `SWMap.adjacency` is
explicitly `null`. The Theater view says so on screen. Phase 3 replaces both.

**Two tables were transcribed early.** The tape needs real lookups, so the Contact Table [13.2B]
and Engagement Table [13.2C] were read off the map at full resolution into `sw_tables.js`, flagged
`status: 'partial'`. Phase 3 re-verifies them against the `page_051` scan and adds the rest.

## Real defects found

1. **The rulebook contradicts itself in the Spearfish example.** [14.14] says the 1-0 cargo ship
   "has a TDC value of 0"; the worked calculation in [14.15] uses TDC **+1** to reach 1+1+1 = +3
   and "roll = or < 0". Confirmed against the source PDF — not an OCR artifact in `RULES.md`. The
   tape follows [14.15] so the printed arithmetic chain is reproducible, and carries the
   discrepancy in an `errata` field that the UI renders in the step panel.
2. **The Vassal module is internally inconsistent for one submarine class.** The Cachalot boats
   carry art key `cachelot`, but ship as `cachalot.gif` (patrol) and `cachelot_transit.gif`
   (transit). Handled by `SWUnits.artFixups` rather than editing the extracted JSON, so
   re-extraction stays lossless. Found by the art sweep over all 309 boats — 618 files, all resolve.

## The two contracts this phase exists to establish

**Resolution records.** Every table lookup emits
`{ context, table, inputs, drms, sides, target, die, modifiedDie, result, ruleRef }`.
The UI renders records; it never recomputes. `sw_resolution.js` owns the shape, the arithmetic
around it, and the ledger renderer. Its tests are the rulebook's own worked examples: the two
Spearfish attacks and the counterattack reproduce +3/+2 → need ≤1 → rolled 4 → miss, +3/+3 →
need ≤0 → rolled 0 → hit, and 5−4 = the '1' line.

**Fog of war.** Every summary goes through `sw_fog.js`, which never reads a value off an
unrevealed unit. There is no `trueAsw` field and never will be. `assertNoLeak()` re-checks on the
way out and is exposed live as `window.__swDebug.fogCheck()`. The UI renders exactly the mandated
phrasing: `Escort ASW 1 (+10 unrevealed)`.

## Verification

| Check | Result |
|---|---|
| `node tools/test_architecture.js` | 77 passed — pure modules DOM-free and dice-free; swui.js is the only exception |
| `node tools/test_sw_data.js` | 76 passed — geometry, tables, 309 boats, 618 art files, glossary coverage |
| `node tools/test_sw_resolution.js` | 29 passed — includes the three rulebook fixtures |
| `node tools/test_sw_fog.js` | 21 passed |
| `node tools/test_sw_tapeplayer.js` | 29 passed — full tape, 8 records, deterministic replay |
| `python3 tools/verify_assets.py` | 32 unique assets, 0 missing |
| `python3 tools/live_verify.py` | 62 passed — real Chromium, real clicks, 0 console errors |

Live verification drives real UI clicks (drag to pan, wheel to zoom, nav buttons, transport,
tooltip hover, tooltip click-through, chart cards, log filters) and asserts against
`window.__swDebug`, which only ever calls production functions.

**Not independently verified:** the map hotspot positions are eyeballed, so "identifiable click
target" was asserted by count and by hit-testing, not by checking that each circle sits on the
right printed area. The Contact and Engagement tables were read once off the map and cross-checked
only against the tape's expected values, not against the `page_051` scan. Both are Phase 3 work.

## Next

Phase 3 — data digitization. On the critical path: the OpArea adjacency graph (hand-traced; Vassal
does not model it, and hard-locking illegal moves is the product premise), the 920 AAC cells
pixel-sampled out of the map, and the remaining engine tables.
