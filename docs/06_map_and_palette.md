# 06 — The map shows what happens; the palette explains it

**Built:** 2026-09-20 · **Build:** v0.6.0 · **Play:** `PLAY Silent War.command`

Wan's playtest of v0.5.0: *"The information is clearly displayed. However I have no idea what is
happening as there is no visual cue being displayed on the map (no token, any stat change). Also the
Play button (triangle) should be on a floating palette and explain the phases better."*

Interview answers: all four map cues; palette = controls + phase guide; both Demo and Patrol.

## What changed

| Before (v0.5.0) | Now (v0.6.0) |
|---|---|
| The sub was a ~12 px icon on a map zoomed out to the whole Pacific | A large labelled counter (**SPEARFISH**) with a sonar pulse, condition chips (DAMAGED / SPOTTED / RTB), on the side of its disc away from the printed chart |
| The camera never moved | It glides to the boat when a week starts or the boat moves, and to the chart when the search die is rolled, leaving room for the palette. Off with auto-follow, never while you drag |
| A move just happened | The marker slides to the new area and leaves a dashed wake |
| Search rolls jumped to the OpArea view | Resolved on the map: the War Period row and the exact cell the die landed on light up on the area's printed chart (geometry from the Phase 3 sampler, verified on 4 charts), labelled "Rolled 5 → Moderate Density" |
| Contact was a line in a panel | A convoy marker (C1 / C2 / TF) drops beside the boat; in Patrol the Combat Display opens after a beat, with "Contact! Opening the Combat Display…" |
| The fight's outcome stayed on the Combat Display | Back on the map: "2 sunk · 3 attacks" / "No sinkings", and "Endurance held" / "Endurance failed: RTB" |
| Status strip values changed silently | A changed value flashes and shows its delta (+1, +5,000); a new **Boat** stat shows On patrol / Damaged / Spotted / RTB / Sunk |
| Legal moves were small green rings | The whole disc glows, labelled MOVE HERE |
| Play controls docked at the bottom, one-line title | A floating palette: drag it by its header (position remembered), fold the guide away. Controls on top; the week as a checklist (✓ done, ▶ now with the sub-step, – skipped); **Just now** (your action + the rolls it produced), what this step is and why it matters, **Your move**, **Next** |
| | The Combat Display and other boards make room for the palette instead of hiding column A |

The phase guide text is data (`apps/game/data/sw_guide.js`), each entry citing its rule.

## Bug found

Clicking a MOVE HERE area moved the boat **and** opened that area's OpArea view, switching
auto-follow off. The map hotspots got their first click handler as a listener and every redraw added
the phase's handler as a property, so both fired. Present since the 2026-08-24 UX pass; the old
suites moved the boat through the debug hook, never by clicking the map. `map_verify.py` clicks it.

## Verification (2026-09-20)

| Check | Result |
|---|---|
| `python3 tools/map_verify.py` (new, real mouse, file://) | 38 passed |
| `live_verify.py` · `ux_verify.py` | 86 · 45 passed |
| `node tools/test_*.js` | 1364 passed |
| soak 200/200 identical; 20,000 patrols | 0 problems |
| `live_parity.py` | 6/6 identical, 1.00 presses per decision, 0 console errors |
| `verify_assets.py` | 79 assets, 0 missing |
