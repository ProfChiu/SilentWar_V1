'use strict';
/* policy.js — how the bot chooses among the engine's legal actions.
 *
 * It only ever picks from Patrol.legalActions, so it cannot do anything a
 * player could not. Its own randomness comes from a SEPARATE seeded stream
 * (never the game dice), so changing the policy never shifts a die, and the
 * same (seed, policy) pair replays exactly.
 *
 * The aim is coverage, not skill: it tries every verb, including the rare
 * ones (bypass, voluntary RTB, dropping a target, taking a point back), and
 * heads home when RTB so a patrol always finishes.
 */
var Dice = require('../../apps/game/rules/sw_dice.js').SWDice;

function create(seed, Move) {
  var rng = Dice.seeded((seed ^ 0x5bd1e995) >>> 0);
  function chance(p) { return rng.rollDie(1000) < p * 1000; }
  function pick(list) { return list[rng.rollDie(list.length)]; }
  var wantTargets = null;

  function choose(state, legal) {
    function of(type) { return legal.filter(function (a) { return a.type === type; }); }
    var first = function (type) { return of(type)[0]; };

    switch (state.phase) {
      case '12.0':
        return chance(0.2) || !of('move').length ? first('stay') : pick(of('move'));
      case '13.1':
        if (chance(0.05)) return first('rtb');
        if (chance(0.08)) return first('bypass');
        return first('search');
      case '14.11':
        wantTargets = null;
        return pick(of('place'));
      case '14.12':
        if (of('unflip').length && chance(0.5)) return first('unflip');
        if (of('withdraw').length && chance(0.5)) return first('withdraw');
        if (of('done_reveal').length && (!of('reveal').length || chance(0.25))) return first('done_reveal');
        return pick(of('reveal'));
      case '14.13':
        if (of('done_tdc').length && (!of('tdc').length || chance(0.25))) return first('done_tdc');
        return pick(of('tdc'));
      case '14.14': {
        var special = of('lumber').concat(of('gunnery'), of('endure'), of('no_attack'));
        if (special.length && !of('target').length && !state.allocations.length) { wantTargets = null; return pick(special); }
        if (wantTargets === null) wantTargets = 1 + rng.rollDie(3);
        var add = of('points').filter(function (a) { return a.delta > 0; });
        var sub = of('points').filter(function (a) { return a.delta < 0; });
        if (of('untarget').length > 1 && chance(0.03)) return pick(of('untarget'));
        if (sub.length && chance(0.03)) return pick(sub);
        if (state.allocations.length < wantTargets && of('target').length) return pick(of('target'));
        if (add.length) return pick(add);
        if (of('fire').length) { wantTargets = null; return first('fire'); }
        if (of('no_attack').length) { wantTargets = null; return first('no_attack'); }
        return pick(of('target'));
      }
      case '14.3':
        wantTargets = null;
        return of('reattack').length && chance(0.4) ? first('reattack') : first('withdraw');
      case '15.0': {
        var moves = of('transit');
        if (!moves.length) return first('hold');
        if (!state.sub.rtb) return chance(0.5) ? first('hold') : pick(moves);
        /* Heading home: the move that lands nearest a friendly base. */
        var best = null, bestD = Infinity;
        moves.forEach(function (m) {
          var d = Move.distanceToNearestBase(m.area, state.activeBaseAreas);
          if (d < bestD) { bestD = d; best = m; }
        });
        return best;
      }
      case '14.4':
        return pick(legal);
      case '16.0':
        return first('end_turn');
      default:
        return legal[0];
    }
  }

  /* Anything the phase logic above did not cover: a random legal action. */
  function safeChoose(state, legal) {
    var a = choose(state, legal);
    return a || pick(legal);
  }
  return { choose: safeChoose };
}

module.exports = { create: create };
