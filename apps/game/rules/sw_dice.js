/* sw_dice.js — the game's one source of dice. PURE MODULE. ZERO DOM, ZERO Math.random.
 *
 * Every patrol is seeded. The same seed and the same choices replay the same
 * patrol, in the browser or headless, which is what lets the bot prove that a
 * presentation change did not change a single outcome (borrowed from Ambush v2,
 * task 1: there, the die animation drew from the game stream, so changing the
 * animation changed every game).
 *
 * The generator is mulberry32: small, fast, 32-bit state, good enough for d10s.
 * `draws` counts every die taken, so a test can assert that something (an
 * animation, a hover) took none.
 */
(function (root) {
  'use strict';

  function seeded(seed) {
    var a = (seed >>> 0) || 1;
    var d = {
      seed: seed >>> 0,
      draws: 0,
      rollDie: function (sides) {
        a = (a + 0x6D2B79F5) >>> 0;
        var t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        var u = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        d.draws += 1;
        return Math.floor(u * (sides || 10));
      }
    };
    return d;
  }

  root.SWDice = { seeded: seeded };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
