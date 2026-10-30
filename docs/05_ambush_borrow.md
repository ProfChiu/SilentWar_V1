# 05 — What Silent War borrowed from Ambush v2

**Built:** 2026-09-20 · **Build:** v0.5.0 (`apps/game/version.js`) · **Play:** double-click `PLAY Silent War.command`

Wan asked to look at `../AMBUSH_V2/` and borrow what fits before continuing. Five items were agreed;
all five are built. The engine's rules are unchanged except for the two bugs the new bot found.

| # | Item | What it means in play |
|---|---|---|
| 1 | Seeded dice + bot | Every patrol has a seed (status strip, **Seed**); `?seed=N` or `SW_SEED=N` replays it. `tools/bot/` plays thousands of patrols headless and proves the page plays the same game. |
| 2 | No acknowledgement presses | When the rules leave one legal action it is not a decision: the game takes it after a beat ("Proceeding: …" in the action bar). Presses per real decision: 1.28 → **1.00**. |
| 3 | Results on the board | Each attack lands as a badge on its target (MISS / HIT · DUD / DAMAGED / SUNK with the roll); sunk ships founder into wrecks with a SUNK stamp until clean-up; the counterattack lands on the sub's box. A **Radio** panel lists every report; click a line for its ledger (for a counterattack, the escorts' reasoning). |
| 4 | Hover odds | Hover a target in [14.14]: roll needed, hit %, ART odds, chance to sink, or how many more points a hopeless shot needs. Hover the sub or Re-Attack: the counterattack odds. Hover an OpArea: contact odds by density, red boxes, distance from base, and whether the click is legal. |
| 5 | Launcher + version | `PLAY Silent War.command` opens this folder's page and prints the build; the version sits under the title. No build chooser (Wan: not until there is a second build to compare). |

## Where the numbers come from

The hover odds are engine functions, not UI arithmetic: `SWCombat.attackPreview`,
`SWCombat.counterattackPreview`, `SWSearch.preview`. `attack()` and `counterattack()` were split so the
preview and the roll share one term builder, and `tools/test_sw_preview.js` checks over 200 patrols that
every previewed need and row is the one then rolled, plus the [14.15] worked example (+3 vs +2, 20%).
All are fog-safe: face-down ships are defense 1 with no ART odds, TDC values count only once turned over,
counterattacks see only revealed ASW.

## Bugs the bot found (fixed)

1. **[14.14] dead end** — boat in column D, convoy in A–B: nothing could be targeted and no action was
   offered (28 of 200 patrols froze). New `no_attack` action per [14.16A/B].
2. **[14.8] clean-up** — TDC markers and Japanese units were never returned, so the 24-marker pool ran
   dry and the next placement crashed (13 of 2000). The soak now checks conservation every week.

## Verification (2026-09-20)

| Check | Result |
|---|---|
| `node tools/test_*.js` | 1358 passed |
| `node tools/bot/soak.js` | 200/200 identical to baseline; 20,000 patrols 0 problems |
| `python3 tools/bot/live_parity.py` | 6/6 identical with animation and auto-advance running; 263 presses for 263 decisions; 0 console errors |
| `python3 tools/live_verify.py` · `ux_verify.py` | 86 · 45 passed (both pinned to `?seed=1`) |
| `python3 tools/verify_assets.py` | 79 assets, 0 missing |

## Left alone

- Re-Attack keeps round-1 TDC markers and subtracts 1; [14.4] says return them and draw fresh. Phase 5.
- Hold-to-skip and a click-anywhere skip were not borrowed; the speed control covers pacing.
