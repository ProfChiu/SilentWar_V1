# Phase 1 — Asset Review: Silent War (Browser Guided Tabletop)

> ⚠️ **PARTIALLY SUPERSEDED 2026-08-22.** Kept as the dated Phase 1 record. Two findings here are now known
> to be wrong: §3.3 says per-submarine ratings are missing (they are printed on the Vassal class art, and
> boat → class → entry date for all 309 boats is in `Source/extracted/submarines.json`), and the TDC mix is no
> longer unknown. Read `ASSET_FEASIBILITY.md` and `ACTION_PLAN.md` first.


**Date:** 2026-08-11  
**Status:** Complete — awaiting sign-off before Phase 2  
**Product:** Guided digital tabletop (hard-lock illegal moves)  
**First playable target (post-shell):** Single-sub patrol  
**Art policy:** Reuse `Source/` Vassal / Compass art as primary  
**Tech:** Single `index.html` + data JS files (no framework)

---

## 1. Interview decisions (locked)

| Decision | Choice |
|---|---|
| Product | Guided tabletop: map, counters, chart popups; app is rules referee |
| First playable slice | Single-sub patrol |
| Art | Reuse Source images as primary art |
| Guidance strictness | Hard lock — only legal actions clickable |
| Delivery | Single `index.html` + data JS |
| This session | Phase 1 asset review only |

---

## 2. What Source actually is

`Source/` is **not** a blank art dump. It is primarily a **Vassal module asset pack** (v0.96, under license from Compass Games), plus:

| Path | Role |
|---|---|
| `Source/Compass Games - Silent War Rulebook 1.1.pdf` | Official rules v1.1 (28 pp) — **rules authority** |
| `Source/images/` | ~328 counters, map, combat display, UI icons (Vassal) |
| `Source/Charts/` | 9 high-res chart/player-aid page images |
| `Source/help.html` + `Source/help/` | Vassal quick help (cups setup, combat, ULTRA) |
| `Source/AdditionalReference/` | FAQ, Spanish scenario book, turn sequence, player tables PDFs |

**Implication for Phase 2:** We can build a visually authentic playboard quickly by copying and organizing these assets. We do **not** need to invent map or counter art first.

**Ownership note:** Vassal help states the player must own the physical game. Keep assets local; do not publish a commercial web module without Compass permission.

---

## 3. Asset inventory by function

### 3.1 Board / displays (playboard core)

| Asset | File | Size | Phase 2 use | Notes |
|---|---|---|---|---|
| Full game map | `images/SW_map_final-50.png` | 4342×3300, ~4.3 MB | **Main playboard background** | OpAreas + AAC color grids, bases, Search/Contact, Transit Event, Endurance, Damage, tracks all **printed on map** |
| Combat Display | `images/combat_display.png` | 1620×1218 | Combat popup / panel | Columns A–D, TDC + target slots, 2 sub slots per column |
| Combat Display (chart scan) | `Charts/page_054_…jpeg` | 2100×1622 | Alternate / print quality | Same layout as PNG; larger file |
| Sub Tender / Surabaya Display | `images/sub_tender_display.png` + `Charts/page_065_…` | ~1480×1160 | Later (campaign); optional Phase 2 popup | Not needed for single-sub patrol |
| Cover art | `cover.jpg`, `cover2.jpg` | small | Splash / title | Optional |

**Map quality:** Excellent for a browser board. Expect pan/zoom (map is large). OpArea Activity Charts are **embedded in the map image** — good for fidelity, harder for “click this AAC cell” unless we either (a) overlay hotspots or (b) re-encode AAC data in JS and draw/highlight digitally.

### 3.2 Chart popups (Phase 2 requirement)

Identified and renamed by content:

| Logical name | Source file | Needed for patrol? | Notes |
|---|---|---|---|
| **Charts & Tables** (War Period, Torpedo Improvement, Enemy Subs) | `Charts/page_050_…jpeg` | Partial | Torpedo table = campaign; enemy-sub table = rare |
| **Combat Tables** (ART, Counterattack, Transit Event, S&C, Endurance, Events list) | `Charts/page_051_…jpeg` | **Yes — primary** | Highest-value single popup for play |
| **Counter Explanation / Unit Summary** | `Charts/page_052_…jpeg` | Yes (reference) | How to read counters |
| **Sense of Scale** | `Charts/page_053_…jpeg` | Nice-to-have | Flavor / class ID |
| **Combat Display** | `Charts/page_054_…` / `combat_display.png` | **Yes** | Interactive board, not just image |
| **War Mix Table [3.1]** | `Charts/page_063_…jpeg` | Setup for any combat | Cups A–D composition by War Period |
| **ULTRA Table [7.0]** | `Charts/page_064_…jpeg` | Campaign / later | Patrol scenarios may skip |
| **Sub Tender Display** | `Charts/page_065_…jpeg` | No for patrol | |
| **Quick Resolution Table [27.0]** | `Charts/page_019_…png` | Optional | Optional rules path |

**Phase 2 popup set (recommended minimum):**

1. Combat Tables (`page_051`)
2. Charts & Tables (`page_050`)
3. War Mix (`page_063`)
4. Counter Explanation (`page_052`)
5. ULTRA (`page_064`) — can ship disabled until needed
6. Combat Display — **interactive panel**, not only a static image
7. Sense of Scale / Tender — secondary menu

Also usable as popups later: map-inset tables (Search & Contact, Transit Event, Endurance, Damage) — already on `SW_map_final-50.png`.

### 3.3 Counters — submarines

| Category | Approx count | Files | Patrol readiness |
|---|---|---|---|
| US / Allied patrol sides | ~36 class GIFs | `gato.gif`, `balao.gif`, `s1.gif`, `p1.gif`, … | **Class art present** |
| Transit sides | ~40 | `*_transit.gif` | Present |
| Named boats | **Not separate art** | Class silhouette + name is **printed on counter in physical game**; Vassal GIFs are **class-level** | Need **data layer** for each named boat (Barb, Spearfish, …) with ratings |

**Gap:** No per-boat PNG set for every named submarine. Vassal used class art + text overlays or stack attributes. For the browser app we should:

- Keep class GIFs as face art  
- Render name + ratings (Attack-Defense-Tactical / Speed-Range-Ready) as HTML/CSS overlay or canvas text from a **submarine data file**

### 3.4 Counters — Japanese ships & events

| Category | Approx | Examples | Notes |
|---|---|---|---|
| Merchants / tankers / stores | many | `m1t10.gif` … `m20t40.gif`, `ao*`, `af*` | Filename encodes type + tonnage + defense often |
| Warships | many | `bb*`, `cv*`, `ca*`, `cl*`, `dd*`, `de*` | Named: Yamato, Kaga, Shokaku, Taiho, Shinano, Izumo, Asahi |
| Aircraft | 2 | `h6mavis2.gif`, `h8emily2.gif` | ASW only |
| Diligent escort | yes | `dd2t74(diligent).gif` | Special counterattack row |
| Combat Event | 1 | `combat_event.gif` | One per cup |
| Flags | 2 | `flag_battle.gif`, `flag_merchant.gif` | Fog-of-war backs |

**Gap:** War Mix is **counts by type**, not unique IDs. Need a JS `warMix.js` that builds cups from the War Mix Table (digitize `page_063`) and maps type keys → image files. Multiples of same type share art (correct for the board game).

### 3.5 Markers & TDC

| Item | Files | Status |
|---|---|---|
| TDC −3…+3 | `tdc_-3.gif` … `tdc_+3.gif` | Complete |
| Spotted / Damaged / RTB | `spotted.gif`, `damaged.gif`, `damaged2.gif`, `rtb.gif` | Complete |
| ULTRA | `ultra.gif`, `ultra_blank.gif` | Complete |
| Super Skippers | ~24 named × sides (`morton1/2`, `*-l1/l2`) | Complete art |
| Wolfpack colors | 5 | Later |
| Track tallies | `tons_*`, `ships_*`, `subs_lost_*`, `exp_*` | Campaign UI |
| Date / war / torp | `week.gif`, `month.gif`, `year.gif`, `war_progress.gif`, `torp_status.gif`, `w00`–`w09` | Campaign UI |
| Cup icons | `cups_w1`…`w4`, `cups_32` | Cup UI |

### 3.6 UI chrome (Vassal leftovers)

Zoom, undo, step-forward, icons for charts/combat/counters — usable as toolbar buttons or replace with simple HTML buttons in Phase 2.

### 3.7 Reference documents (not art, but required data sources)

| Doc | Use |
|---|---|
| Rulebook 1.1 PDF | Rules authority (already read) |
| `FAQ_22.09.2009.pdf` | Errata / clarifications (many already folded into 1.1) |
| `SilentWarTurnSeq_v2.pdf` | Excellent **guided phase checklist** source |
| `Silent_War_ESCENARIOS.pdf` | **Spanish** scenario book — patrol scenarios + reinforcement list + special rules. Need English extract or re-key from physical book if available |
| `SW_TABLAS.pdf` / `SW_Tablas_grandes.pdf` | Spanish player tables — backup if chart JPEGs insufficient |
| `silent_war_rules_summary.doc` | Quick summary |
| `help.html` | Vassal UX patterns (cups + combat window layout) — good interaction reference |

**Gap:** Scenario book in Source is Spanish. For “single-sub patrol” we need either:

- English patrol scenario text from another source, or  
- Translate/key one simple patrol from the Spanish PDF, or  
- Design a **tutorial patrol** from rulebook example values (Spearfish examples in [14.x]) with user-approved fictional setup

---

## 4. What is on the map vs what must be data

The physical map already includes many tables. For a **guided** app:

| Element | On map image? | Must also be JS data? | Why |
|---|---|---|---|
| OpArea positions / links | Visual only | **Yes** | Legal move graph, range checks |
| Area Activity Charts (color grids) | Yes | **Yes** | Search resolution + Transit Event red-box thresholds |
| Base displays (Pearl, Fremantle, …) | Yes | **Yes** | Placement of boat in Ready/Broom/Repair |
| Search & Contact / Engagement | Yes + chart card | **Yes** | Draw counts from cups |
| Transit Event table | Yes + chart | **Yes** | Event resolution |
| Endurance / Damage | Yes | **Yes** | RTB / repair |
| Combat ART / Counterattack | Chart card mainly | **Yes** | Hit / sink / damage |
| War Mix | Chart only | **Yes** | Cup construction |
| ULTRA | Chart only | Later | Area markers |
| War Events | Rules book text | Later | Not patrol-critical |
| Named sub stats | Counters | **Yes** | Every boat |

**Critical insight:** Phase 2 can **show** charts as popups without encoding them. Phase 3+ **must** digitize tables for the referee to hard-lock legal moves. Do not treat chart images as the rules engine.

---

## 5. Phase 2 readiness matrix

### Ready to use as-is (copy into app `assets/`)

- [x] Full map PNG  
- [x] Combat display PNG  
- [x] Chart JPEGs for popup gallery  
- [x] Class sub art (patrol + transit)  
- [x] Japanese ship type art  
- [x] TDC, Spotted, Damaged, RTB, Combat Event  
- [x] Super Skipper portraits (for later)  
- [x] Cover for title screen  

### Needed before Phase 2 shell looks “real”

| Need | Effort | Notes |
|---|---|---|
| Asset folder layout + manifest | Small | e.g. `game/assets/{map,charts,subs,ships,markers,ui}/` with stable names |
| Rename/alias chart files | Small | Human names: `combat_tables.jpg`, `war_mix.jpg`, … |
| Map pan/zoom shell | Medium | 4K map in browser |
| Modal/dialog component | Small | Chart popups, combat display |
| Placeholder OpArea hotspot layer | Medium | Even if non-functional, defines click targets for later |
| CSS theme | Small | Navy / Compass blue from map chrome |

### Not required for Phase 2 (defer)

- Full War Mix cup engine  
- Dice + table automation  
- All named boats database  
- Wolfpacks, tenders, war events  
- Scenario book full translation  
- English reinforcement master list digitization  

---

## 6. Single-sub patrol vertical slice — asset/data gaps

When we leave the “shell” and build guided play, minimum data/assets:

### Must have

1. **One OpArea** fully data-modeled (AAC rows W1–W4 as color arrays or red-start thresholds)  
2. **One named sub** (class art + full ratings: Atk/Def/Tac/End/Range/Speed/Ready)  
3. **War Mix for one War Period** (cup contents as multiset of ship type keys)  
4. **Ship type catalog** (type, tons, defense, ASW, image, special flags)  
5. **TDC pool** (values −3…+3 with correct multiplicity if known; else uniform)  
6. Digitized: **Contact table, Engagement table, ART, Counterattack, Endurance, Transit Event**  
7. Combat Display interactive slots  
8. Turn sequence for **patrol game only** (per turn seq card: skip Strategic + most Triple-R; start at Prep / Patrol / S&C / Combat / Transit)

### Nice for first patrol

- Spotted / Damaged / RTB markers on sub  
- Super Skipper optional off  
- Map still shows full Pacific but only one area is “live”

### Explicitly out of first patrol

- Multi-sub, wolfpacks, bases turnover, ULTRA, war events, war progress, torpedo improvement campaign track

---

## 7. Proposed app asset layout (for Phase 2)

```text
game/
  index.html              # shell + UI
  css/app.css             # theme
  js/
    data/                 # empty or stubs in Phase 2
    app.js                # board + dialogs only in Phase 2
  assets/
    map/SW_map.png
    displays/combat_display.png
    displays/sub_tender_display.png
    charts/
      combat_tables.jpg
      charts_and_tables.jpg
      war_mix.jpg
      ultra.jpg
      counter_explanation.jpg
      sense_of_scale.jpg
      quick_resolution.png
    subs/…                # class gifs
    ships/…               # IJN / merchant gifs
    markers/…
    skippers/…
    ui/…
  Source/                 # untouched originals (archive)
```

Copy, do not move, originals under `Source/`.

---

## 8. Risks & open questions (not blocking Phase 1)

1. **Map interactivity:** Printed AACs on a bitmap are hard to “press.” Prefer hotspot polygons per OpArea + digital AAC readout in a side panel / popup.  
2. **Spanish scenario book:** English patrol setup still unresolved.  
3. **TDC multiplicity:** Physical mix of −3…+3 markers not fully specified in rules text we have — may need scenario book / living rules / count from Vassal.  
4. **Named boat list:** Master reinforcement list is in scenario book (Spanish PDF) — digitization is a later phase.  
5. **File size:** Map 4.3 MB + chart JPEGs ~15 MB total — fine locally; consider WebP later if needed.  
6. **Licensing:** Personal-use browser play of owned game is the assumed scope.

---

## 9. Phase 1 gate checklist

- [x] Rulebook 1.1 read and summarized  
- [x] Interview complete; product decisions locked  
- [x] Source tree inventoried  
- [x] Chart images identified by content  
- [x] Board/display assets sized and assessed  
- [x] Counter categories counted  
- [x] Phase 2 popup list recommended  
- [x] Data-vs-image split documented  
- [x] Single-sub patrol gaps listed  
- [x] This document written  

**Gate met when you approve this review.** Then Phase 2 can start: HTML playboard + chart popup dialogs (no full rules engine yet).

---

## 10. Suggested Phase 2 acceptance criteria (preview)

Phase 2 is done when you can open `game/index.html` in a browser and:

1. See the Silent War map (pan/zoom)  
2. Open each core chart in a modal dialog from a toolbar  
3. Open the Combat Display as a panel/dialog  
4. See sample counters (one sub class, a few ships, TDC, markers) placed in a non-rules “sandbox tray”  
5. No illegal-move engine yet — that is Phase 3+  

---

## 11. Handoff to Phase 3 (when you ask)

Phase 3 will use subagents to:

- Diff rulebook systems vs what the shell can show  
- Produce a **build backlog** of additional phases (data digitization, patrol engine, combat referee, campaign systems, etc.)  
- Order them for hard-lock guided play starting with single-sub patrol  

Do **not** start Phase 2 or 3 until you sign off on this document (or request changes).
