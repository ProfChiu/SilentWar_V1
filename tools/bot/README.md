# tools/bot — seeded patrols, headless and in the page

Borrowed from Ambush v2 (`../AMBUSH_V2/tools/bot/`), 2026-09-20. Silent War's engine is pure, so
the soak runs in Node in well under a second; only the parity check needs a browser.

```bash
node tools/bot/soak.js                        # 200 patrols (seeds 1000-1199) vs the recorded baseline
node tools/bot/soak.js --seeds 20000 --seed-base 1   # a wide sweep (no baseline; finds dead ends)
node tools/bot/soak.js --record               # re-record after an intended RULES change
node tools/bot/soak.js --trace 1003           # one patrol's actions + summary, as JSON
python3 tools/bot/live_parity.py              # the page replays seeds 1000-1005 identically
```

| File | What it owns |
|---|---|
| `policy.js` | Chooses among `SWPatrol.legalActions` only; its own seeded stream, never the game dice. Aims at coverage (every verb, incl. bypass, RTB, untarget) and heads home when RTB. |
| `soak.js` | Plays patrols. Fails on a crash, a stall (no legal action), the turn cap, an action or record without a rule, a die outside 0-9, or a [14.8] clean-up that loses a TDC marker or a Japanese unit. Fingerprints each patrol (outcome, turns, sinkings, rolls, draws, hash of every roll). |
| `live_parity.py` | Replays the soak's choices through `window.__swDebug.apply` with the die animation running. Forced steps (one legal action) are skipped and must happen by themselves. Requires the same fingerprint, one press per decision (`__swDebug.pacing()`), and zero console errors. |
| `baselines/` | `soak_<base>_<n>.json`. A presentation change must leave it 200/200 identical. |

## The seam

Dice: `apps/game/rules/sw_dice.js` (mulberry32, counts `draws`). A patrol in the page is always
seeded: `?seed=N` picks one, otherwise a fresh seed is drawn and shown as **Seed** in the status
strip, so any patrol a tester reports can be replayed. The die animation's tumbling faces come
from `crypto`, never the game stream (the Ambush v2 task-1 trap; `live_parity.py` fails if it
comes back: proven by reintroducing it, 0/2 identical).

Page hooks used: `__swDebug.startPatrol(seed)`, `apply(action)`, `patrol()`, `draws()`, `seed()`,
`pacing()` (presses / decisions / auto), `pending()` (a forced step is waiting its beat), `settle()` (take it now).

The soak also prints **presses per decision**: 1.28 if every step were clicked (the pre-2026-09-20 page),
1.00 with auto-advance. Measured in the page by `live_parity.py`, not assumed.

## What the first soak found (2026-09-20)

1. **Dead end at [14.14]** (28/200 patrols): boat in column D, convoy in A-B, nothing can carry a
   TDC marker, and the phase offered no action. Fixed with `no_attack` per [14.16A/B].
2. **Crash after a few fights** (13/2000): TDC markers and Japanese units were never returned at
   [14.8] Clean-Up, so the 24-marker pool ran dry. Fixed; the soak now checks conservation.
