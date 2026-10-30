'use strict';
/* The operations loop: one patrol, end to end, with every action hard-locked. */
var t = require('./_harness.js');
global.SWResolution = require('../apps/game/rules/sw_resolution.js').SWResolution;
global.SWFog        = require('../apps/game/rules/sw_fog.js').SWFog;
global.SWTables     = require('../apps/game/data/sw_tables.js').SWTables;
global.SWShips      = require('../apps/game/data/sw_ships.js').SWShips;
global.SWUnits      = require('../apps/game/data/sw_units.js').SWUnits;
global.SWAac        = require('../apps/game/data/sw_aac.js').SWAac;
global.SWLayout     = require('../apps/game/data/sw_layout.js').SWLayout;
global.SWMap        = require('../apps/game/data/sw_map.js').SWMap;
global.SWMovement   = require('../apps/game/rules/sw_movement.js').SWMovement;
global.SWSearch     = require('../apps/game/rules/sw_search.js').SWSearch;
global.SWCombat     = require('../apps/game/rules/sw_combat.js').SWCombat;
global.SWCups       = require('../apps/game/rules/sw_cups.js').SWCups;
var P = require('../apps/game/rules/sw_patrol.js').SWPatrol;
var strip = require('./_strip.js');
t.suite('sw_patrol');

var src = strip(require('fs').readFileSync(__dirname + '/../apps/game/rules/sw_patrol.js', 'utf8'));
t.ok(src.indexOf('Math.random') === -1, 'sw_patrol has no Math.random');
t.ok(src.indexOf('document.') === -1, 'sw_patrol touches no document');

/* A deterministic die stream: a fixed repeating pattern, so a whole patrol
 * plays the same way every run (playbook invariant 4). */
function dice(seed) {
  var x = seed;
  return { rollDie: function () { x = (x * 1103515245 + 12345) & 0x7fffffff; return (x >>> 16) % 10; } };
}
function setup() {
  return {
    warPeriod: 'W2', torpedoValue: -1, area: 'east_china_sea',
    activeBaseAreas: ['scs1'],
    sub: { name: 'USS Spearfish', attack: 6, defense: 3, tactical: 4,
           endurance: 'B', range: 8, speed: 2,
           superSkipper: { name: 'Whitaker', value: 1 } }
  };
}

/* ---- the hard lock ---- */
var s = P.create(setup());
t.eq(s.phase, '12.0', 'the turn opens in Patrol Movement');
var acts = P.legalActions(s);
t.ok(acts.length > 1, 'movement offers choices');
t.ok(acts.every(function (a) { return a.rule; }), 'every offered action cites a rule');
var areas = acts.filter(function (a) { return a.type === 'move'; }).map(function (a) { return a.area; });
t.eq(areas.sort(), ['empire_pacific', 'marianas', 'n_phil_sea', 'scs1', 'yellow_sea'],
  '[12.0] only adjacent areas are offered');
t.ok(areas.indexOf('carolines') === -1, 'a non-adjacent area is never offered');
t.throws(function () { P.apply(s, { type: 'move', area: 'carolines' }, dice(1)); },
  'the engine refuses an illegal move outright');
t.throws(function () { P.apply(s, { type: 'fire' }, dice(1)); },
  'an action from the wrong phase is refused');

/* Range is a real leash: a short-ranged boat sees fewer options. */
var short = P.create(setup());
short.sub.range = 1;
var shortMoves = P.legalActions(short).filter(function (a) { return a.type === 'move'; });
t.ok(shortMoves.length < 5, '[2.3A] range restricts the offered areas (' + shortMoves.length + ')');

/* ---- bypassing search ---- */
var by = P.create(setup());
P.apply(by, { type: 'stay' }, dice(2));
t.eq(by.phase, '13.1', 'staying still leads to Activity Determination');
P.apply(by, { type: 'bypass' }, dice(2));
t.eq(by.phase, '16.0', '[13.1] bypassing goes straight to the endurance check');
t.ok(by.log.some(function (r) { return r.table.indexOf('Endurance') === 0; }),
  'the endurance roll was logged');
var endRec = by.log.filter(function (r) { return r.table.indexOf('Endurance') === 0; })[0];
t.ok(endRec.drms.some(function (d) { return d.value === -1; }),
  '[13.1] the bypass carries a -1 endurance drm');

/* ---- voluntary RTB ---- */
var rtb = P.create(setup());
P.apply(rtb, { type: 'stay' }, dice(3));
P.apply(rtb, { type: 'rtb' }, dice(3));
t.eq(rtb.phase, '15.0', '[13.1] a voluntary RTB moves straight to Transit');
t.eq(rtb.sub.rtb, true, 'the boat is marked RTB');
var transits = P.legalActions(rtb).filter(function (a) { return a.type === 'transit'; });
t.ok(transits.length > 0, '[15.0] transit offers destinations');
t.ok(transits.every(function (a) { return a.steps <= rtb.sub.speed; }),
  '[15.0] nothing further than the submarine’s speed is offered');

/* ---- a full patrol turn, driven only through legalActions ---- */
function playTurn(state, opts, budget) {
  var guard = 0;
  while (!state.done && state.phase !== '16.0' && guard++ < budget) {
    var options = P.legalActions(state);
    if (!options.length) break;
    /* Prefer to get on with it: finish a step rather than loop on it. */
    var pick = options.filter(function (a) {
      return ['done_reveal', 'done_tdc', 'fire', 'withdraw'].indexOf(a.type) > -1;
    })[0] || options[0];
    P.apply(state, pick, opts);
  }
  return guard;
}

var full = P.create(setup());
P.apply(full, { type: 'stay' }, dice(7));
P.apply(full, { type: 'search' }, dice(7));
t.ok(['14.11', '16.0'].indexOf(full.phase) > -1, 'search either finds contact or ends the turn');

/* Force a contact so the combat path is exercised deterministically. */
var seeds = [7, 11, 13, 17, 19, 23, 29, 31, 37, 41];
var fought = null;
for (var i = 0; i < seeds.length && !fought; i++) {
  var c = P.create(setup());
  var d = dice(seeds[i]);
  P.apply(c, { type: 'stay' }, d);
  P.apply(c, { type: 'search' }, d);
  if (c.phase === '14.11') fought = { state: c, dice: d };
}
t.ok(fought !== null, 'at least one seed produces a contact');

var st = fought.state, dd = fought.dice;
t.ok(st.units.length > 0, 'counters were drawn onto the Combat Display');
t.ok(st.units.every(function (u) { return !u.revealed; }),
  '[13.2C] every drawn counter starts face down');
t.eq(P.legalActions(st).length, 4, '[14.11] four columns are offered for the submarine');

P.apply(st, { type: 'place', column: 'B' }, dd);
t.eq(st.phase, '14.12', 'placing the boat opens the reveal step');
var revealables = P.legalActions(st).filter(function (a) { return a.type === 'reveal'; });
t.ok(revealables.length > 0, '[14.12] there are counters to reveal');

var steps = playTurn(st, dd, 200);
t.ok(steps < 200, 'the turn completed without looping (' + steps + ' actions)');
t.eq(st.phase, '16.0', 'the turn ends at Conclude Turn');
t.ok(st.log.length > 3, 'the patrol produced a full record trail (' + st.log.length + ')');
t.ok(st.log.every(function (r) { return r.ruleRef && r.table && r.turn === 1; }),
  'every record is attributed to a rule, a table and the turn');
t.ok(st.log.some(function (r) { return r.table.indexOf('Area Activity') === 0; }),
  'the AAC roll is in the log');
t.ok(st.log.some(function (r) { return r.table.indexOf('Endurance') === 0; }),
  'the endurance check is in the log');

/* Deterministic: the same seed plays the same patrol twice. */
function playAll(seed) {
  var a = P.create(setup()), d = dice(seed);
  P.apply(a, { type: 'stay' }, d);
  P.apply(a, { type: 'search' }, d);
  playTurn(a, d, 200);
  return a;
}
t.eq(JSON.stringify(playAll(7).log.map(function (r) { return r.result; })),
     JSON.stringify(playAll(7).log.map(function (r) { return r.result; })),
     'the same seed replays the same patrol');
t.ok(JSON.stringify(playAll(7).log) !== JSON.stringify(playAll(11).log),
  'a different seed plays a different patrol');

/* ---- several turns in a row ---- */
var camp = P.create(setup());
var turns = 0;
var cd = dice(99);
while (!camp.done && turns < 12) {
  if (camp.phase === '16.0') { P.apply(camp, { type: 'end_turn' }, cd); turns += 1; continue; }
  var o = P.legalActions(camp);
  if (!o.length) break;
  var chosen = o.filter(function (a) {
    return ['done_reveal', 'done_tdc', 'fire', 'withdraw', 'search', 'stay'].indexOf(a.type) > -1;
  })[0] || o[0];
  P.apply(camp, chosen, cd);
}
t.ok(turns >= 3, 'the loop survives several consecutive turns (' + turns + ')');
t.ok(camp.log.length > 8, 'a multi-turn patrol accumulates records');
t.ok(camp.log.every(function (r) { return r.turn >= 1 && r.turn <= turns + 1; }),
  'records are attributed to the right turn');

/* ---- [14.16] no attack possible: found by the soak (tools/bot/soak.js) ---- */
/* Boat in column D, convoy in A-B: nothing can carry a TDC marker, so nothing
 * can be targeted. The phase used to offer no action at all. */
function outOfReach(round) {
  var z = P.create(setup());
  z.phase = '14.14'; z.round = round; z.sub.column = 'D';
  z.units = [{ uid: 'm6minus#1', row: 'm6minus', cup: 'A', piece: 'm3t10', column: 'A',
               revealed: false, damaged: false, sunk: false, tdc: null }];
  return z;
}
var r1 = outOfReach(1);
var na = P.legalActions(r1);
t.eq(na.map(function (a) { return a.type; }), ['no_attack'], '[14.16] out of reach: the one way on is no_attack');
t.eq(na[0].rule, '14.16', 'no_attack cites [14.16]');
P.apply(r1, na[0], dice(3));
t.eq(r1.phase, '14.3', '[14.16A] first round: no counterattack, straight to Withdrawal');
t.ok(!r1.log.some(function (r) { return /^Counterattack/.test(r.table); }), '[14.16A] no counterattack roll was made');
var r2 = outOfReach(2);
P.apply(r2, P.legalActions(r2)[0], dice(3));
t.ok(r2.log.some(function (r) { return /14\.2/.test(r.ruleRef); }), '[14.16B] Re-Attack round: the escorts still counterattack');

/* ---- [14.8] clean-up returns units and TDC markers: found by the soak ---- */
var cu = P.create(setup());
var cud = dice(5);
P.apply(cu, { type: 'stay' }, cud);
var guard = 0;
while (!cu.cups && guard++ < 50) {           // search until contact
  if (cu.phase === '13.1') P.apply(cu, { type: 'search' }, cud);
  else if (cu.phase === '16.0') P.apply(cu, { type: 'end_turn' }, cud);
  else if (cu.phase === '12.0') P.apply(cu, { type: 'stay' }, cud);
  else if (cu.phase === '15.0') P.apply(cu, { type: 'hold' }, cud);
}
t.ok(!!cu.cups, 'a contact was found to test clean-up on');
var cupsBefore = ['A', 'B', 'C', 'D'].reduce(function (n, c) { return n + cu.cups[c].length; }, 0) + cu.units.length;
while (cu.phase !== '16.0' && !cu.done) {
  var la = P.legalActions(cu), pickA = null;
  ['place', 'tdc', 'done_tdc', 'target', 'fire', 'no_attack', 'withdraw', 'done_reveal'].some(function (k) {
    pickA = la.filter(function (a) { return a.type === k; })[0]; return !!pickA;
  });
  P.apply(cu, pickA || la[0], cud);
}
if (!cu.done) {
  t.ok(cu.tdcPool.length < 24 || cu.units.every(function (u) { return u.tdc === null; }), 'TDC markers left the pool during the fight');
  var sunkGone = cu.units.filter(function (u) { return u.sunk && ['shokaku','taiho','shinano','yamato','kaga','asahi','izumo','bv36t'].indexOf(u.row) > -1; }).length;
  P.apply(cu, { type: 'end_turn' }, cud);
  t.eq(cu.tdcPool.length, 24, '[14.8] every TDC marker is back in the pool');
  t.eq(['A', 'B', 'C', 'D'].reduce(function (n, c) { return n + cu.cups[c].length; }, 0), cupsBefore - sunkGone,
    '[14.8] every Japanese unit is back in its cup');
}

t.done();
