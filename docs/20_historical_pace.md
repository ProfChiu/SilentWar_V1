# 20 — Historical pace: a house rule (v0.15.0)

**Decided 2026-09-28 (Wan):** keep "as printed" as the default, and add an opt-in house rule tuned so a campaign follows the real war's sinkings. It must be labelled clearly as not in the book.

## Why

Played by the built-in captain exactly as printed, the campaigns run harder than history early in the war. A tally of 143 losses in ten Rising Sun games with an early version of the rule found what sinks the boats:

| Cause | Losses |
|---|---|
| Transit Event "Lost at sea, cause unknown" [19.1] | 83 |
| Circular runs and other Combat Events [19.2] | 18 |
| Diligent Escort [14.12] | 17 |
| Counterattack [14.2] | 17 |
| Other | 8 |

Tonnage falls short because most Endurance rolls at Mk-XIV −2 send the boat home after one week on station [14.7].

## The rule

One modifier by War Period on three rolls. Negative is better for the submarine.

| War Period | Endurance [14.7] | Counterattack [14.2] | Transit Event check [19.1] |
|---|---|---|---|
| W1 | −1 | −2 | −4 |
| W2 | −1 | −1 | −3 |
| W3 | −1 | −1 | −2 |
| W4 | +1 | 0 | −1 |

- It is data (`SWCampaignData.pace`), carried by the war (`war.pace`), and read by the boat (`state.pace`).
- Every roll it changes shows "Historical pace (house rule)" with its value and the citation [HP].
- Clicking [HP] opens a sheet that explains the rule and shows the table; it never opens the rulebook.
- The counterattack preview includes it, so the coach and the captain weigh it too.
- It is off by default. It is chosen in the Scenarios menu, listed with the optional rules as a house rule.

## Measured (the captain on every fight; `node tools/bot/fleet_soak.js --pace --curve`)

| Campaign | As printed | Historical pace | History |
|---|---|---|---|
| The Rising Sun, 1942 (practice setting, 20 seeds) | 448k t, 33 lost | 776k t, 13 lost | 755k t, 8 lost |
| The Rising Sun, with its keep-command targets | relieved of command, 20 of 20 | relieved in 11 of 20; the rest from Failure to Substantial Victory | |
| The full war (8 seeds) | Failure 7, Draw 1 | Historical Victory 6, Decisive 1, Improved 1 | Historical Victory |
| The Turning Tide (6 seeds) | Dramatic Failure 6 | Marginal Failure 3, Dramatic Failure 2, Historical (Draw) 1 | Historical (Draw) |
| The Setting Sun | Total Victory | Total Victory | |
| MacArthur's Navy (6 seeds) | relieved of command, 6 of 6 | Total Victory 3, Decisive 2, relieved 1 | |
| East Wind Early (20 seeds) | Catastrophic Defeat 17, Defeat 3 | Catastrophic Defeat to Victory | (hypothetical) |

Full war, the start of each year:

| Start of | Historical pace | History |
|---|---|---|
| 1943 | 759k t | 755k t |
| 1944 | 1,751k t | 2,205k t |
| 1945 | 4,623k t | 4,941k t |

## Limits, stated plainly

- **Losses stay about twice history.** Most of the rest are combat losses (circular runs, Diligent Escorts, the counterattack), which the rule deliberately leaves as the book has them.
- **The Setting Sun is a Total Victory either way.** The captain sinks the 1,000,000 t it needs in four months.
- **MacArthur's Navy becomes generous.** The rule is tuned to the whole-Pacific curve, and that campaign covers only the Southwest Pacific.
- **These are the built-in captain's results.** A human choosing fights will differ.

## Verified

- `node tools/test_sw_phase9.js`: 59 pass. With the rule off, no roll carries it. With it on, the Endurance, Transit and counterattack rolls carry the table's values.
- Every existing baseline is identical, so the printed game is unchanged.
- New baselines: `fleet_1_20_pace`, `fleet_full_1_2_pace`.
