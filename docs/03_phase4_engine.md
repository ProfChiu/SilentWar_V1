# 03 — Phase 4: the single-sub patrol engine

**Built:** 2026-08-24 · **Status:** one patrol playable end to end, hard-locked.

## What changed

Five new pure rules modules, and a Patrol mode in the app that plays against them.

| Module | Covers |
|---|---|
| `rules/sw_movement.js` | [12.0] patrol movement, [15.0] transit, [2.3A] the range leash |
| `rules/sw_search.js` | [13.1] activity determination, [13.2] AAC / Contact / Engagement |
| `rules/sw_cups.js` | [3.1] building and drawing the four War Mix cups, [2.3C] the TDC pool |
| `rules/sw_combat.js` | [14.1]–[14.8] reveal, TDC, targeting, attack, ART, counterattack, endurance |
| `rules/sw_patrol.js` | the operations loop as a state machine over the Sequence of Play |

All five are DOM-free and `Math.random`-free; dice arrive through `opts.rollDie`, so the
same functions run in the browser and under `node`. `tools/test_architecture.js` enforces it.

## The hard lock

The Phase 1 decision was "only legal actions are clickable". The engine's contract with the UI is
two functions and nothing else:

```
legalActions(state)          -> every action allowed right now, each citing its rule
apply(state, action, opts)   -> the new state, or a thrown error if the action was not offered
```

The UI renders one button per returned action. There is no disabled-but-present state, because the
engine never offers an illegal action — and `apply` re-checks and throws if called with one anyway,
so a UI bug surfaces as an error rather than an illegal move. Every refusal names its rule:
*"Only the submarine's own column or an adjacent one [14.12]"*, *"Allocated 8 of 6 attack points
[14.14]"*, *"TDC markers may not be moved once placed [14.13]"*, *"Out of range 8 of a friendly
base [2.3A]"*.

Verified live: with the boat in column B, the action bar offers reveals in columns A, B and C and
none in D, and driving `move` to a non-adjacent area from the console is refused.

## The rulebook example runs through the real engine

`tools/test_sw_combat.js` rebuilds the board from the worked example in [14.14] — USS Spearfish
(6-3-4) with Whitaker, War Period 2, East China Sea, Mk-XIV at −1 — and plays it:

| Rulebook | Engine |
|---|---|
| Cargo #1: 3+1+(−1) = **+3** vs 2+1+(−2)+1 = **+2**, roll = or < **1** | same |
| Cargo #3: 3+1+(−1) = **+3** vs 1+1+1 = **+3**, roll = or < **0** | same |
| Counterattack: 1+3+1 = **+5** vs 3+1 = **+4**, the **'1' line** | same |

The 3 red boxes in that counterattack are not a constant — they come from the East China Sea AAC
pixel-sampled in Phase 3. The 3,000-ton ART row, the Endurance B / −1 target of 4, and the
Contact/Engagement results all come from the Phase 3 tables too. Nothing in the combat path is
hardcoded to make the example work.

## The movement graph — rebuilt, and why

Phase 3 shipped this as a draft and said Phase 4 must confirm it. Confirming it found a real defect.

**The map draws a pale coastal halo in the same colour as the OpArea discs and their connector
bands.** That halo is a connected network hugging every coastline, so the Phase 3 watershed leaked
between areas that merely share an island. It produced a plausible-looking 33-edge graph containing
at least two links that are not drawn on the map at all (`carolines–s_phil_sea`,
`coral_sea–bismarck_sea`), and it left three areas stranded with no edges.

`tools/trace_adjacency.py` now strips the halo with a morphological opening — the halo is ~13px
wide, the bands ~38px — before flooding. The cleaned band network was then rendered and read
region by region, which is where the current table comes from.

Result: **36 edges, symmetric, every area reachable**, `adjacencyStatus: 'read-from-map'`.
Sea of Japan connects to the Kurile Islands only, which matches how US boats actually entered it.
One pair (`scs2–s_phil_sea`) stays in `uncertain` and out of the graph.

Also worth recording: a straight centre-to-centre corridor test is **not** a valid check here.
Every disc has its Area Activity Chart printed across the middle, so such a line always crosses a
large non-pale gap and reports "no edge" even for links that are plainly drawn. That test was tried,
said no to everything including obvious edges, and was discarded.

## Design decisions

- **Cup draws use the same injected die.** `sw_cups.pickIndex` turns d10 digits into an unbiased
  index by rejection sampling, so a whole patrol — cup composition, draws, TDC selection — replays
  identically from a scripted die sequence. That is what makes `test_sw_patrol.js` deterministic.
- **Attack points are spread evenly across chosen targets.** The rulebook lets the player allocate
  freely up to the attack value; the engine offers even distribution for now and validates the
  general rule in `canAllocate`. Free allocation is a UI affordance still to come.
- **`combatView` / `moveView` adapters.** The loop keeps one flat state; the combat and movement
  modules each get the shape they expect. This kept both of them independent of the loop.

## Verification

| Check | Result |
|---|---|
| `node tools/test_sw_combat.js` | **59 passed** — the rulebook example, plus [14.16], [14.4], [14.5], [2.3B] |
| `node tools/test_sw_patrol.js` | **36 passed** — full turn, multi-turn, determinism, refusals |
| `node tools/test_architecture.js` | 125 passed — the five new modules are DOM-free and dice-free |
| `node tools/test_sw_phase3.js` | 947 passed — now including graph connectivity and degree bounds |
| others (`_data`, `_fog`, `_resolution`, `_tapeplayer`) | 78 / 21 / 29 / 29 passed |
| `python3 tools/verify_assets.py` | 78 unique assets, 0 missing |
| `python3 tools/live_verify.py` | **78 passed** — real Chromium; a patrol played through the UI |

**Not independently verified:** the `scs2–s_phil_sea` band. Combat Events [19.2] are rolled and
logged but their effects are not yet applied. Sub-vs-Sub [14.6] is detected and ends the phase
rather than being fought. [14.16A] (no counterattack when no attack was possible in the first
round) is not yet special-cased. Wolfpacks, SMZs, tenders, Quick Resolution and the campaign layer
are Phases 5–7 as planned.

## Next

Phase 5 — full combat fidelity: Combat Event effects, Re-attack polish, Diligent Escort withdrawal
rules, Sub-vs-Sub, radar unflip, and free allocation of attack points in the UI.
