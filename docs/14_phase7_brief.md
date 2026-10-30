# Phase 7 — Force systems: brief (interview 2026-09-24)

## Decisions (Wan)

| Question | Decision |
|---|---|
| Scope | **Wolfpack career.** The one-career shape stays. From October 1943 [24.1] a boat Ready for Sea at a major base may sail as the lead of a three-boat pack; you command all three for that patrol. The other two come from the off-screen fleet and go back to it. No full fleet command. |
| Parts | **Tenders & forward bases** [21.1-21.2], **Quick Resolution** [27.0], **close the Phase 6 gaps** (Congregating Risk [22.0], Hold Box / capacity [10.1-10.2], Speed −1 after a base falls [15.25]). |
| IJN Expansion rules | **Optional, off by default**: a switch in the Career menu. (Not ticked under "parts" but answered as optional; built as an optional switch. Say if it should go.) |

## Sources

- Tenders: the Submarine Tender / Surabaya display (`Source/Charts/page_065`): Holland w/s (4 boats), Canopus w/s (4),
  Fulton w/s (6), Sperry 8/42 (6), Bushnell 4/43 (6), Orion 10/43 (6), Proteus 3/44 (6), Gilmore 9/44 (6). Surabaya
  is a base display of its own: repair 1/3/5, 12 subs.
- Rules: [10.1-10.2], [15.25], [20.0], [21.0-21.2], [22.0], [23.0], [24.0-24.7], [27.0-27.1], [IJN 4.0-7.0] in `RULES.md`.

## Design calls (Wan may overrule)

- **Pack members**: two boats of the fleet, drawn from those that exist at the date (entered, not withdrawn), same
  base area, war-construction classes (Gato, Balao, Tench). Named, with their own ratings; no Super Skipper.
- **Score**: the career medal counts **your boat's** tonnage, so careers stay comparable; the pack's total is
  shown beside it in the report.
- **Wolfpack Experience** [24.7] is kept for your packs only (one point a patrol at most). Without the fleet's packs
  it will not reach 9 in a career, so packs stay at three boats, one pack at a time [24.11], as early-war packs were.
- **Losing a pack member** is a US loss (counts in Subs Lost) but does not end the career; losing your boat does.
- **Tenders**: when a War Event opens a forward base, a tender whose deployment date has passed is drawn at random
  [21.21]. Your boat may RTB to it: undamaged → its Broom Box, readied there; damaged → Damage Table at once,
  only Superficial is fixed there, anything else sends it on to a major base [21.23]. Capacity is shared with the
  fleet off-screen, so it is shown but binds only on your pack.
- **Congregating Risk** with one boat or one pack: counts your pack (every two members as one [22.3]) plus boats
  on the same Special Mission (the fleet's quota in that zone is known). SMZs are exempt [20.2].
- **Quick Resolution**: offered as a choice at contact ("Quick resolution" next to the Combat Display), per contact,
  for one boat; not for a wolfpack (the book's wolfpack −1 applies only when a pack uses it; a pack fights on the board).

## Build order

| Step | Content |
|---|---|
| 7.1 | Tenders & forward bases: data, activation on War Events, RTB to a tender, readiness there, [21.23] minor repair, Tirante from Saipan |
| 7.2 | The Phase 6 gaps: Congregating Risk, Hold Box / capacity at a tender, [15.25] Speed −1 |
| 7.3 | Quick Resolution [27.0-27.1] |
| 7.4 | IJN rules as an option: Loners, Crash Dive, Targeting an Escort, Early WP4 |
| 7.5 | Wolfpacks [24.0-24.7]: formation, movement, Group/Barrier, Transit Events, combat with several boats, Re-Attack, Spotted, experience |
| 7.6 | Page, lessons, soak, live drive; v0.11.0 |
