# 18 — Phase 9 brief: a competent game for Compass Games, and the extensions

**Agreed:** 2026-09-25 (interview with Wan). **Goal:** a build Compass Games will take seriously on first look,
plus the book's two extensions.

## Decisions

| Question | Answer |
|---|---|
| Canvas | Keep 1600 × 900. Silent War is a mature project and is not retrofitted to 1920 × 1080. |
| Polish (all four) | Save & resume; a historical primer; a stronger captain and a history tracker; Fleet board upgrades |
| Extensions (both) | Optional rules [33.0]; East Wind Early (1932) [31.6] |
| Pitch | A private presentation page (an Artifact) for Compass Games. Wan decides whether to share it. |

## Build order

1. **Save & resume.**
   - Every game autosaves to the browser as its seed, settings and decisions; the engine is deterministic, so replay rebuilds it exactly.
   - A Resume offer on launch.
   - Export and import a save file (JSON).
2. **Historical primer.** An in-app "The Silent War" reader. Six short chapters, in our own words, citing the book's commentary and the standard histories (Blair, *Silent Victory*; JANAC 1947):
   - the war;
   - the torpedo scandal;
   - ULTRA;
   - why 1942 went badly;
   - ComSubPac's choices;
   - how the game models it.
3. **The captain and the history tracker.**
   - A campaign chart plots your cumulative tonnage and losses against the historical curve, so a harsh result reads as history.
   - A better captain, measured on the soak and recorded in docs/19.
4. **Fleet board upgrades.**
   - Sorting and filters.
   - Standing orders per base (sail Ready for Sea boats automatically).
   - A weekly summary of what happened.
   - A clearer flow for choosing fights.
5. **Optional rules [33.0].** Campaign-setup options, each off by default:
   - [33.1] Allied (Dutch and British) submarines:
     - restrictions [33.11];
     - technology [33.12];
     - Dutch withdrawal [33.13];
     - the units list [33.14];
     - campaign adjustments [33.15], tallied separately from your own sinkings.
   - [33.2] K-XIV's 2nd patrol (Van Well Groeneveld) as a tenth Patrol Game.
   - [33.3] Surcouf.
   - [33.4] U-2513.
   - [33.5] Nautilus II.
   - [34.0] Staggered arrivals and withdrawals.
6. **East Wind Early [31.6].**
   - April to December 1932, 34 turns.
   - The rule changes [31.61].
   - The order of battle [31.63] and reinforcements [31.64].
   - Leviathan's gunnery [31.65].
   - Victory [31.66].
   - Its own War Event table (rulebook).
7. **The presentation page** for Compass Games.
8. **Verify.**
   - Run the three-way checks.
   - Re-record baselines only where a change is deliberate.
   - Bump the version.
   - Update ACTION_PLAN and PROGRESS.

## Sources for 5 and 6

Spanish scenario book pp. 14-24: [31.6], [33.x], [34.0]. RULES.md §[5.0], "War Events for East Wind Early Campaign".
The 1932 War Mix column (Y32) is already in `sw_ships.js`. Every counter needed is in the Vassal roster:
- K-VIII to K-XVIII, O-16 to O-24, Zwaardvisch, Zeeleeuw;
- 21 British S and T boats;
- Surcouf, U-2513;
- the S-boats, B-class boats and Leviathan ("USS Leviathon" in the roster).

## Rights

The rules text, the art and the Spanish translation belong to Compass Games and Felipe Santamaría. The primer is written
in our own words and cites the books; nothing ships publicly without Compass's licence. The pitch page is private.
