'use strict';
var t = require('./_harness.js');
var strip = require('./_strip.js');
var Res = require('../apps/game/rules/sw_resolution.js');
global.SWResolution = Res.SWResolution;
var P = require('../apps/game/rules/sw_tapeplayer.js').SWTapePlayer;
var F = require('../apps/game/rules/sw_fog.js').SWFog;
var tape = require('../apps/game/tape/sw_tape_spearfish.js').SWTapeSpearfish;
t.suite('sw_tapeplayer');

var src = strip(require('fs').readFileSync(__dirname + '/../apps/game/rules/sw_tapeplayer.js', 'utf8'));
t.ok(src.indexOf('Math.random') === -1, 'sw_tapeplayer contains no Math.random');
t.ok(src.indexOf('document.') === -1, 'sw_tapeplayer touches no document');

/* A tape with fixed dice must never need the injected roller — but if it asks
 * for one it must get one, so pass a roller that fails loudly if used. */
var opts = { rollDie: function () { throw new Error('tape step had no fixed die'); } };

var st = P.create(tape);
t.eq(st.index, -1, 'starts before the first step');
t.eq(st.units.length, 4, 'four Japanese units on the tape');
t.eq(P.revealedUnits(st).length, 0, 'nothing revealed at the start');

var steps = [];
while (!st.done) { var r = P.next(st, tape, opts); if (r) steps.push(r); }
t.eq(steps.length, tape.steps.length, 'played every step');

/* Token placement, not a result line. */
t.eq(st.board.subSlot, 'Sub_B1', 'submarine ended in its Combat Display box');
t.eq(st.board.activity, 'moderate', 'AAC result recorded as board state');
t.eq(st.board.contact, 'C2', 'contact result recorded as board state');
t.eq(st.board.cupDraw, { A: 5, B: 4, C: 3, D: 2 }, 'engagement draw recorded per cup');
t.ok(st.board.cleanedUp, 'clean-up ran');
t.ok(st.board.withdrawn, 'the submarine withdrew');

/* The sunk maru left the board and moved the campaign markers. */
t.eq(st.board.sunk, ['j_b2'], 'cargo maru #3 was sunk');
t.eq(st.units.length, 3, 'sunk unit removed from the board');
t.eq(st.status.shipsSunk, 1, 'ships sunk advanced by one');
t.eq(st.status.tonnageSunk, 3, 'tonnage sunk advanced by the target size');

/* Roll log: every table lookup emitted a record. */
t.eq(st.log.length, 8, 'eight resolution records logged: AAC, contact, engagement, 2 attacks, ART, counterattack, endurance');
t.ok(st.log.every(function (r) { return r.ruleRef && r.table && r.context; }),
  'every record carries context, table and a rule reference');
t.ok(st.log.every(function (r) { return r.stepId && r.sop && r.submarine; }),
  'every record is filterable by step, phase and submarine');

/* The two rulebook attack fixtures came through the record contract intact. */
var attacks = st.log.filter(function (r) { return r.table.indexOf('To-hit') === 0; });
t.eq(attacks.length, 2, 'two attacks resolved [14.15]');
t.eq(attacks[0].target, 1, 'attack 1 needs = or < 1 (rulebook)');
t.eq(attacks[0].result, 'miss', 'attack 1 missed on a 4 (rulebook: 20% chance)');
t.eq(attacks[1].target, 0, 'attack 2 needs = or < 0 (rulebook)');
t.eq(attacks[1].result, 'HIT', 'attack 2 hit on a 0 (rulebook: 10% chance)');

var ca = st.log.filter(function (r) { return r.table.indexOf('Counterattack') === 0; })[0];
t.eq(ca.target, 1, "counterattack consults the '1' line (rulebook)");

/* Fog holds all the way through: at the reveal step, 4 of 14 are face up. */
var mid = P.create(tape);
for (var i = 0; i <= 6; i++) P.next(mid, tape, opts);   // through step s7, the reveal
var sum = F.summarize(mid.units);
t.eq(sum.revealedCount, 4, 'four units revealed by Tactical 4');
t.eq(F.assertNoLeak(sum, mid.units), [], 'no hidden value leaked mid-tape');

/* seek() replays deterministically — same tape, same state. */
var a = P.create(tape); P.seek(a, tape, 10, opts);
var b = P.create(tape); P.seek(b, tape, 10, opts);
t.eq(JSON.stringify(a), JSON.stringify(b), 'deterministic: seek to 10 twice is identical');
t.ok(a.status.shipsSunk === 0, 'at step 10 nothing is sunk yet');

t.done();
