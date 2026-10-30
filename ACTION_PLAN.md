# Silent War — Action Plan

**Approved:** 2026-08-22
**Product:** Guided digital solitaire tabletop. The app is the rules referee; the player is ComSubPac.
**Rules authority:** `RULES.md` · **Asset verdict:** `ASSET_FEASIBILITY.md` · **Data source:** `Source/Silent_War.vmod` (`buildFile`)

---

## Locked decisions (Phase 1, 2026-08-11)

| Decision | Choice |
|---|---|
| Product | Guided tabletop: map, counters, chart popups; app enforces rules |
| First playable slice | Single-sub patrol |
| Art | Reuse `Source/` Vassal + Compass art as primary |
| Guidance strictness | Hard lock — only legal actions are clickable |
| Delivery | ~~Single `game/index.html`~~ → **multi-file `apps/game/`** (overridden 2026-08-23, see Resolved) |
| Licensing | Personal use; assets stay local |

---

## Phases

| # | Phase | Status | Gate |
|---|---|---|---|
| 1 | Asset review | ✅ Complete | `PHASE1_ASSET_REVIEW.md` + `ASSET_FEASIBILITY.md` |
| 2 | Playboard, views, chart popups, explainability | ✅ Complete 2026-08-23 | `apps/game/` + `docs/01_phase2_playboard.md`; all 8 criteria met, verified live |
| 3 | Data digitization (the JSON layer) | ✅ Complete 2026-08-24 | `docs/02_phase3_data.md`; every engine table in data, cross-checked against the rulebook |
| 4 | Single-sub patrol engine | ✅ Complete 2026-08-24 | `docs/03_phase4_engine.md`; one patrol playable end to end, hard-locked |
| 5 | Full combat fidelity | ✅ Complete 2026-09-21 | `docs/10_phase5_combat.md`: [14.16A/B], [14.4] Re-Attack markers + reposition, [14.41] second Re-Attack, radar, Diligent Escort, all ten Combat Events, Super Skipper +2, Sub vs. Sub |
| 6 | Campaign layer | ✅ Complete 2026-09-24 | `docs/13_phase6_campaign.md`: one boat's career over the full weekly SOP: War Events, Torpedo Improvement, ULTRA, War Progress, bases, readiness, repair, overhaul, Transit Events, Special Missions |
| 7 | Force systems | ✅ Complete 2026-09-24 | `docs/15_phase7_force_systems.md`: wolfpack careers, tenders/forward bases, Quick Resolution, Congregating Risk, [15.25], IJN rules (optional) |
| 8 | Scenarios | ✅ Built 2026-09-25 (calibration open) | `docs/17_phase8_scenarios.md`: the 9 Patrol Games [32.x] and all five campaigns [31.1]-[31.5] with fleet command. Fleet wolfpacks in v0.14.0. |
| 9 | Competent build + extensions | ✅ Complete 2026-09-25 (v0.15.0) | `docs/19_phase9.md`: save & resume, History primer, history tracker, stronger captain, Fleet board upgrades, optional rules [33.0]-[34.0], East Wind Early [31.6], pitch page for Compass Games |

**Phase 3 detail.** Pixel-sample the 920 AAC cells out of `SW_map_final-50.png`; filename-parse the 47 Japanese
ship types; trace the ~45-node OpArea/SMZ/base adjacency graph; transcribe ART, Counterattack, Endurance,
Transit Event, Contact, Engagement, War Mix, ULTRA, War Period, Torpedo Improvement, Enemy Submarines; read
the ~38 submarine class counters; map ~200 boat names to classes.

---

## Phase 2 — expanded scope

Original criteria (map pan/zoom, chart modals, Combat Display panel, sandbox counters, **no rules engine**)
plus four additions approved 2026-08-22.

### A. Expose rules and interaction

The player must be able to *see* the board state, not just its consequences.

- Boards render as real surfaces with real counter art in real slots: Combat Display columns A–D with two
  submarine boxes per column; OpArea Operating/Done sections; Base Display Broom / Pier Side / Ready for Sea /
  Repair 3-2-1-Hold boxes.
- State changes are shown as **token placement**, not as a result line. Drawing four counters from Cup A places
  four face-down counters in column A on screen.
- Every view carries a **numerical summary panel** alongside the visual board.
- Persistent status strip across all views: week / month / year, War Period, general ASW value, current torpedo
  value, tonnage sunk, ships sunk, subs lost.

> **Fog-of-war constraint (binding).** Summaries may aggregate **revealed information only**. Face-down counters
> are counted but never valued. Display "revealed escort ASW: 3 (+2 unrevealed)", never the true total.
> Unrevealed units carry defense 1 per [14.16]. A summary that leaks hidden values breaks the game.

### B. Die roll animation and shown calculation

- Animated d10 roll, then a breakdown of how the number was used.
- **Every table lookup in the engine emits a structured resolution record.** The UI renders records; it never
  recomputes. Shape:

  ```
  { context, table, inputs:[{label,value,rule}], drms:[{label,value,rule}],
    target, die, modifiedDie, result, ruleRef }
  ```

- Breakdown renders as a stacked ledger mirroring the rulebook's own worked examples:
  `Attack 3 + Skipper +1 + Torpedo −1 = 3` vs `Defense 2 + Escort ASW 1 + TDC −2 + Adjacent +1 = 2`
  → `need ≤ 1, rolled 4 → miss`.
- **Roll log**: every record appended to a scrollable history, filterable by phase and by submarine.
- **Speed control is required, not optional.** A campaign is ~178 turns. Settings: animate / fast / instant,
  plus auto-advance for uncontested rolls.
- The worked examples in `RULES.md` ([14.14], [14.15], [14.2], [6.0], [7.3], [25.3], [IJN 7.0]) become the
  test fixtures for this contract.

### C. Tooltips for abstract stats

- Hover any rating → one-line plain-language definition. Source text already exists in `RULES.md` [2.3];
  extract to `glossary.json`.
- Covers: Attack, Defense, Tactical, Endurance, Range, Speed, Readiness, Tonnage, Defense Rating, ASW Rating,
  TDC, Super Skipper bonus, Activity Level colours, C1/C2/TF, cup letters, War Period, Crash Dive.
- Click-through → rules viewer opens at the cited rule number. `RULES.md` is already sectioned by rule number,
  so deep links are close to free.
- Tooltips obey the same fog-of-war constraint as summaries.

### D. View switching, not one crowded screen

Views, each owning the full viewport:

**Derived from the Vassal module's own window layout** (`Source/extracted/vassal_layout.json`) — approved
2026-08-22 as the first-pass UI. Silent War should play like the Vassal module, with guidance and automation added.

| View | Vassal origin | Contains |
|---|---|---|
| Theater | Pacific (main map) | Full map, pan/zoom, OpAreas, SMZs, base Zones, ULTRA markers, tracks |
| Combat | Combat Display (F4) | 8 sub slots, 22 target slots, 22 TDC slots — pixel geometry already extracted |
| Cups | W1–W4 + 1932 Cups (F5–F9) | War Mix cups A–D, TDC pool, Super Skipper pool; automated but visible per addition A |
| Tenders | Sub Tenders (F3) | Tender/Surabaya display, forward-base boxes |
| Base | Zones on main map | One Base Display enlarged: Broom / Pier Side / Ready for Sea / Repair track |
| Graveyard | Submarine Graveyard | Losses |
| OpArea | *(new — not in Vassal)* | One area enlarged: Operating/Done, its AAC, congregating count |
| Charts | *(new)* | Reference gallery — overlay, dismissable, never a destination |
| Log | Vassal Chatter | Roll history and turn journal |

Vassal summons windows on F-keys over a persistent map. That is already addition D, so we inherit it rather
than invent it. What Vassal does **not** do is explain itself: it rolls a 1D10 and leaves the arithmetic to the
player. Additions B and C are precisely the delta between the Vassal module and this project.

- **The active view follows the sequence of play.** The app switches automatically at phase boundaries; manual
  override always available.
- Charts and rules are *overlays* (you glance and dismiss). Combat and Base are *destinations* (you work there).
- Persistent status strip + a sequence-of-play breadcrumb showing the current phase, so the player always knows
  where they are in [4.0].
- Back/history: peek at a chart, return to exactly where you were.

### Phase 2 acceptance criteria (revised)

1. Theater view: map pans and zooms; areas and bases are identifiable click targets.
2. Views switch cleanly; status strip and SOP breadcrumb persist; back/history works.
3. Every core chart opens as a dismissable overlay.
4. Combat view renders counter art in the correct Combat Display slots.
5. Counters and ratings show tooltips; click-through opens the rules viewer at the right section.
6. A die roll animates and produces a rendered calculation ledger, appended to the roll log.
7. Speed control works, including instant mode.
8. **Still no rules engine** — legality and table logic arrive in Phase 4.

---

## Phase 2 as built (2026-08-23)

`apps/game/` — nine views, no rules engine. Serve over HTTP (`python3 -m http.server 8765`, then
`http://localhost:8765/apps/game/`): the rules viewer fetches `RULES.md` and `file://` blocks it.

- Pure layer: `data/` (map geometry, Combat Display slots, Contact + Engagement tables, 309 boats,
  TDC pool, sequence of play, glossary, charts) and `rules/` (resolution records, fog-of-war,
  tape player) — all DOM-free, `Math.random`-free, dice injected.
- `swui.js` is the only file touching the DOM or rolling real dice. Enforced by `tools/test_architecture.js`.
- Demo tape: the rulebook's **Spearfish** example ([14.14], [14.15], [14.2]) rather than the Spanish
  book's Seawolf — same content, already the designated fixture, and in English.
- Two rulebook/module defects found and documented, not papered over: the [14.14]/[14.15] TDC
  contradiction, and the Cachalot art-filename mismatch in the Vassal module.
- Regression: 232 unit assertions + 32 assets + 62 live-browser checks, all green.

Full write-up: `docs/01_phase2_playboard.md`.

## Resolved

- ~~Scripted demo tape~~ — **RESOLVED 2026-08-22: YES.** Phase 2 ships a hard-coded JSON "tape" of one patrol
  turn (contact roll → C2 → engagement draw → counters placed → TDC → attack → counterattack → endurance),
  played back by the UI. Content source: the Spanish scenario book's Comprehensive Example of Play (*Seawolf*).
  No rules logic in Phase 2; the tape exercises every UI contract and later becomes the tutorial.
- ~~Course layer~~ — **RESOLVED 2026-08-22: NO.** Plan stays at 8 phases. Teaching is carried in-place by
  hard-locked illegal moves + tooltips sourced from RULES.md [2.3] + a rules viewer with deep links.
  No separate learning-units app.
- ~~Architecture~~ — **RESOLVED 2026-08-22: MULTI-FILE**, overriding the Phase 1 single-file decision.
  Adopt `game-course-playbook` invariant 9: `apps/game/`, one DOM-free rules module per subsystem, zero
  `Math.random`, dice injected via an `opts.rollDie()` callback, exactly one UI file allowed to touch the DOM.
  Rationale: makes the rulebook's worked examples ([14.15], [14.2]) directly executable as tests.

- ~~TDC pool multiplicity~~ — **RESOLVED 2026-08-22** from the Vassal `buildFile`: 24 markers,
  `−3×2, −2×4, −1×4, 0×4, +1×4, +2×4, +3×2`, identical in every War Period. `Source/extracted/tdc_pool.json`.
- ~~Boat → class mapping~~ — **RESOLVED 2026-08-22**: 309 boats with class + entry date.
  `Source/extracted/submarines.json`.
- ~~UI first pass~~ — **RESOLVED 2026-08-22**: adopt the Vassal window layout.
  `Source/extracted/vassal_layout.json`.

## Phase 3 as built (2026-08-24)

920 AAC cells pixel-sampled; ART / Counterattack / Transit Event pixel-sampled from `page_051`; War Mix
transcribed and checked against its own printed totals; 47 Japanese ships + 2 aircraft decoded; 40 submarine
classes read from both counter sides; OpArea geometry upgraded from eyeballed to pixel-derived.

Seven independent rulebook facts now cross-check the data (East China Sea W2 = 3 red boxes, Spearfish = 6-3-4,
nine dated pieces, the 70/9 torpedo row, "if 310 use 300", aircraft have no defense, the 7-1 destroyer), and
**every hard-coded outcome in the Phase 2 demo tape is now reproduced by the real tables** — the tape was
written before they existed. Full write-up: `docs/02_phase3_data.md`.

## Phase 4 as built (2026-08-24)

Five pure rules modules (`sw_movement`, `sw_search`, `sw_cups`, `sw_combat`, `sw_patrol`) plus a Patrol mode
in the app. The hard lock is real: `legalActions` returns only what the rules permit and `apply` throws on
anything else, with every refusal citing its rule. The rulebook's Spearfish example runs through the actual
engine and reproduces both attacks and the counterattack — with the red-box term coming from the sampled AAC,
not a constant. Full write-up: `docs/03_phase4_engine.md`.

## Still genuinely open (work, not decisions)

- ~~**OpArea adjacency graph**~~ — **RESOLVED 2026-08-24.** Confirming the Phase 3 draft found the cause of
  its errors: the map draws a pale COASTAL HALO in the same colour as the discs and bands, which made the
  watershed leak along coastlines and invent edges. The trace now strips the halo with a morphological
  opening; the graph was re-read from the cleaned band network. 36 edges, symmetric, fully connected,
  `adjacencyStatus: 'read-from-map'`. One pair (`scs2–s_phil_sea`) remains in `SWMap.uncertain`.
- **Scenario victory conditions / special rules** — Spanish only; setups themselves are in the `.vsav` files.
