/* sw_goal.js — the patrol's goal and its rating. PURE MODULE. ZERO DOM.
 *
 * The rulebook's own victory conditions belong to the scenarios (Phase 8,
 * gated on the Spanish scenario book). Until then a single patrol needs a goal
 * a new player can aim at, so this is a presentation-layer objective, not a
 * rule: sink tonnage and bring the boat home.
 *
 * Calibrated 2026-09-21 on 3,000 seeded patrols (tools/lessons calibration in
 * docs/08_first_hour.md): the teaching captain sinks nothing in 52% of patrols,
 * reaches 5,000 t in 25% and 10,000 t in 10%; the random bot sinks nothing in
 * 85%. Patrols last a median 3 weeks (Endurance ends them), so no week limit.
 *   Bronze - sink any ship and bring the boat home
 *   Silver - 5,000 tons and home
 *   Gold   - 10,000 tons and home
 *   Failed - the boat is lost
 * Tonnage is in thousands, as the engine keeps it.
 */
(function (root) {
  'use strict';

  var LEVELS = [
    { id: 'gold',   label: 'Gold',   tons: 10, text: '10,000 tons sunk, boat home' },
    { id: 'silver', label: 'Silver', tons: 5,  text: '5,000 tons sunk, boat home' },
    { id: 'bronze', label: 'Bronze', tons: 1,  text: 'any ship sunk, boat home' }
  ];

  /* Rating so far (provisional while at sea), and the next level to reach. */
  function rate(state) {
    var tons = state.tonnageSunk || 0, lost = !!(state.sub && state.sub.sunk);
    var reached = null;
    for (var i = 0; i < LEVELS.length; i++) if (tons >= LEVELS[i].tons) { reached = LEVELS[i]; break; }
    var next = null;
    for (var j = LEVELS.length - 1; j >= 0; j--) if (tons < LEVELS[j].tons) { next = LEVELS[j]; break; }
    var over = !!state.done;
    return {
      tons: tons, lost: lost, over: over,
      level: lost ? null : reached,
      next: lost ? null : next,
      final: over ? (lost ? 'failed' : reached ? reached.id : 'none') : null,
      /* One line for the palette / debrief. */
      line: lost ? 'Failed: the boat was lost.'
        : over ? (reached ? reached.label + ': ' + (tons * 1000).toLocaleString('en-US') + ' tons sunk and the boat is home.'
                          : 'No rating: the boat is home but sank nothing.')
        : (reached ? reached.label + ' so far (' + (tons * 1000).toLocaleString('en-US') + ' t)' : 'Nothing sunk yet') +
          (next ? ' · next: ' + next.label + ' at ' + (next.tons * 1000).toLocaleString('en-US') + ' t' : '') +
          ' · bring the boat home'
    };
  }

  /* Phase 6: a career's medal. Calibrated 2026-09-24 on 800 seeded careers
   * with the teaching captain at the helm (tools/bot/career_soak.js): tonnage
   * p25 3,000 t, median 12,000 t, p75 27,000 t, p90 43,000 t; 19% sink
   * nothing and 40% lose the boat, so bringing the crew through is itself the
   * first step. A constructive total loss, an overhaul or the war's end all
   * count as surviving; only a sunk boat fails.
   *   Bronze - any ship sunk and the boat survives
   *   Silver - 25,000 tons and the boat survives
   *   Gold   - 40,000 tons and the boat survives */
  var CAREER_LEVELS = [
    { id: 'gold',   label: 'Gold',   tons: 40, text: '40,000 tons sunk, boat survives' },
    { id: 'silver', label: 'Silver', tons: 25, text: '25,000 tons sunk, boat survives' },
    { id: 'bronze', label: 'Bronze', tons: 1,  text: 'any ship sunk, boat survives' }
  ];
  function rateCareer(state) {
    /* Phase 7: your own boat's tonnage, so a wolfpack's other boats do not
     * inflate the medal (they are shown beside it in the report). */
    var own = state.career && state.career.own;
    var tonsOwn = own ? (own.tonsSunk || 0) : (state.tonnageSunk || 0), shipsOwn = own ? (own.shipsSunk || 0) : state.shipsSunk;
    var tons = tonsOwn, lost = state.outcome === 'lost' || !!(own ? own.sunk : state.sub && state.sub.sunk);
    if (tons > 0 && tons < 1 && shipsOwn > 0) tons = 1;   // any ship counts for Bronze
    var reached = null, next = null, i;
    for (i = 0; i < CAREER_LEVELS.length; i++) if (tons >= CAREER_LEVELS[i].tons) { reached = CAREER_LEVELS[i]; break; }
    for (i = CAREER_LEVELS.length - 1; i >= 0; i--) if (tons < CAREER_LEVELS[i].tons) { next = CAREER_LEVELS[i]; break; }
    var t = Math.round(tonsOwn * 1000).toLocaleString('en-US');
    var over = !!state.done;
    return {
      tons: tonsOwn, lost: lost, over: over, level: lost ? null : reached, next: lost ? null : next,
      final: over ? (lost ? 'failed' : reached ? reached.id : 'none') : null,
      line: lost ? 'Failed: the boat was lost.'
        : over ? (reached ? reached.label + ': ' + t + ' tons over the career, and the boat came through.'
                          : 'No medal: the boat came through but sank nothing.')
        : (reached ? reached.label + ' so far (' + t + ' t)' : 'Nothing sunk yet') +
          (next ? ' · next: ' + next.label + ' at ' + (next.tons * 1000).toLocaleString('en-US') + ' t' : '') + ' · keep the boat alive'
    };
  }

  root.SWGoal = { levels: LEVELS, rate: rate, careerLevels: CAREER_LEVELS, rateCareer: rateCareer };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
