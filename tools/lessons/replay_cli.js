'use strict';
/* replay_cli.js — the headless state after (seed, decisions), for browser tests.
 *   echo '{"seed":129,"decisions":[...]}' | node tools/lessons/replay_cli.js
 * Prints { phase, turn, done, outcome, shipsSunk, tonnageSunk, rolls, hash }.
 * Forced steps (one legal action) are taken in between, as the page does. */
var soak = require('../bot/soak.js');
var Dice = require('../../apps/game/rules/sw_dice.js').SWDice;
['data/sw_campaign.js:SWCampaignData', 'rules/sw_transit.js:SWTransit', 'rules/sw_war.js:SWWar',
 'rules/sw_base.js:SWBase', 'rules/sw_career.js:SWCareer'].forEach(function (x) {
  var q = x.split(':'); global[q[1]] = require('../../apps/game/' + q[0])[q[1]];
});
var input = JSON.parse(require('fs').readFileSync(0, 'utf8'));
/* Phase 6: {"career": "wahoo"} replays a career instead of the patrol. */
var P = input.career ? global.SWCareer : global.SWPatrol;
var s = input.career ? P.create(input.career) : P.create(soak.setup()), d = Dice.seeded(input.seed);
function settle() {
  for (var g = 0; g < 50 && !s.done; g++) { var l = P.legalActions(s); if (l.length !== 1) return; P.apply(s, l[0], d); }
}
input.decisions.forEach(function (a) { settle(); if (!s.done) P.apply(s, a, d); });
settle();
process.stdout.write(JSON.stringify({ phase: s.phase, turn: s.turn, done: s.done, outcome: s.done ? s.outcome : null,
  shipsSunk: s.shipsSunk, tonnageSunk: s.tonnageSunk, rolls: s.log.length, hash: soak.fingerprint(s.log) }));
