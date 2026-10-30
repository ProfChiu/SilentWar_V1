'use strict';
/* Phase 5: full combat fidelity, rule by rule, with scripted dice.
 * [14.16A/B] impossible attacks · [14.4] Re-Attack TDC markers and repositioning ·
 * [14.41] the second Re-Attack · [14.12] radar unflip · [14.12] Diligent Escort ·
 * [14.14] face-down targets turned up at Fire · [19.2] all ten Combat Events ·
 * [14.5] Super Skipper +1 -> +2 · [14.6] Sub vs. Sub. */
var t = require('./_harness.js');
var soak = require('./bot/soak.js');                  // loads every module as a global
var P = global.SWPatrol, C = global.SWCombat;
t.suite('sw_phase5');

/* Dice from a script; past its end, a fixed fallback. */
function seq(arr, fallback) {
  var i = 0;
  return { rollDie: function () { return i < arr.length ? arr[i++] : (fallback === undefined ? 5 : fallback); },
           used: function () { return i; } };
}
function U(uid, piece, column, extra) {
  var u = { uid: uid, row: 'm6minus', cup: column, piece: piece, column: column,
            revealed: false, damaged: false, sunk: false, tdc: null };
  Object.keys(extra || {}).forEach(function (k) { u[k] = extra[k]; });
  return u;
}
/* A patrol state in combat: boat in column B, a pool, cups to return to. */
function fight(units, phase, extra) {
  var s = P.create(soak.setup());
  s.phase = phase || '14.12';
  s.sub.column = 'B';
  s.units = units;
  s.tdcPool = global.SWCups.tdcPool();
  s.cups = { A: [], B: [], C: [], D: [] };
  Object.keys(extra || {}).forEach(function (k) { s[k] = extra[k]; });
  return s;
}
function types(s) { return P.legalActions(s).map(function (a) { return a.type; }); }
function has(s, table) { return s.log.some(function (r) { return String(r.table).indexOf(table) === 0; }); }
function idx(s, table) { for (var i = 0; i < s.log.length; i++) if (String(s.log[i].table).indexOf(table) === 0) return i; return -1; }

/* ---------- [14.16A/B] ---------- */
var imp = fight([U('d1', 'dd2t71', 'B', { revealed: true, tdc: 3, tdcRevealed: true })], '14.14');
t.eq(types(imp), ['no_attack'], '[14.16A] every target beyond hitting: the only action is no_attack');
P.apply(imp, P.legalActions(imp)[0], seq([]));
t.eq(imp.phase, '14.3', '[14.16A] first round: straight to Withdrawal');
t.ok(!has(imp, 'Counterattack'), '[14.16A] ...with no counterattack');
var imp2 = fight([U('d1', 'dd2t71', 'B', { revealed: true, tdc: 3, tdcRevealed: true })], '14.14', { round: 2 });
P.apply(imp2, P.legalActions(imp2)[0], seq([0, 0]));
t.ok(has(imp2, 'Counterattack'), '[14.16B] in a Re-Attack the escorts counterattack anyway');
var ok1 = fight([U('m1', 'm5t20', 'B', { revealed: true, tdc: -3, tdcRevealed: true })], '14.14');
t.ok(types(ok1).indexOf('target') > -1 && types(ok1).indexOf('no_attack') < 0, 'a target that can be hit is offered normally');

/* ---------- [14.4] Re-Attack: markers back to the pool, reposition, -1 except -3 ---------- */
var re = fight([U('m1', 'm5t20', 'B', { revealed: true, tdc: -3, tdcDrawn: -3, tdcRevealed: true }),
                U('m2', 'm5t20', 'A', { revealed: true, tdc: 2, tdcDrawn: 2, tdcRevealed: true })], '14.3');
re.tdcPool = re.tdcPool.slice(2);          // the two markers are out on the display
P.apply(re, { type: 'reattack' }, seq([]));
t.eq(re.tdcPool.length, 24, '[14.4] the first round\'s TDC markers go back into the pool');
t.ok(re.units.every(function (u) { return u.tdc === null; }), '[14.4] ...and leave the display');
t.eq(re.phase, '14.4', '[14.4] a Re-Attack begins with the choice to reposition');
t.eq(types(re).sort(), ['reposition', 'reposition', 'stay_column'], '[14.4] to an adjacent column, or stay');
P.apply(re, { type: 'reposition', column: 'C' }, seq([]));
t.eq([re.sub.column, re.phase], ['C', '14.12'], 'repositioned to C, then the reveal step');
re.phase = '14.13'; re.sub.column = 'B';
re.tdcPool = [2]; P.apply(re, { type: 'tdc', unit: 'm1' }, seq([]));
re.tdcPool = [-3]; re.tdcPlaced = 0; P.apply(re, { type: 'tdc', unit: 'm2' }, seq([]));
t.eq([C.unit(re, 'm1').tdc, C.unit(re, 'm1').tdcDrawn], [1, 2], '[14.4] a Re-Attack marker counts one better (+2 -> +1)');
t.eq(C.unit(re, 'm2').tdc, -3, '[14.4] ...except a -3');

/* ---------- [14.41] the second Re-Attack ---------- */
var r2 = fight([U('m1', 'm5t20', 'B', { revealed: true })], '14.3', { round: 2 });
r2.sub.superSkipper = null;
t.eq(types(r2), ['withdraw'], '[14.41] no Super Skipper: no second Re-Attack');
r2.sub.superSkipper = { name: 'X', value: 1 };
t.ok(types(r2).indexOf('reattack') > -1, '[14.41] with a Super Skipper it may be tried');
var r2a = JSON.parse(JSON.stringify(r2));
P.apply(r2a, { type: 'reattack' }, seq([1]));
t.eq([r2a.round, r2a.phase], [3, '14.4'], '[14.41] a roll = or < the rating: the third round');
var r2b = JSON.parse(JSON.stringify(r2));
P.apply(r2b, { type: 'reattack' }, seq([2, 0]));
t.ok(r2b.phase === '16.0' && has(r2b, 'Endurance'), '[14.41] a failed roll ends the combat');
var r3 = fight([U('m1', 'm5t20', 'B', { revealed: true })], '14.3', { round: 3 });
r3.sub.superSkipper = { name: 'X', value: 2 };
t.eq(types(r3), ['withdraw'], '[14.42] after a second Re-Attack, combat ends');

/* ---------- [14.12] radar ---------- */
var rd = fight([U('d1', 'dd2t71', 'B'), U('m1', 'm5t20', 'B'), U('m2', 'm5t20', 'A')]);
t.ok(rd.radar, 'March 1943: the boat has radar');
P.apply(rd, { type: 'reveal', unit: 'd1' }, seq([]));
t.ok(types(rd).indexOf('unflip') > -1, '[14.12] the unit just revealed may be unflipped');
P.apply(rd, { type: 'unflip', unit: 'd1' }, seq([]));
t.eq([C.unit(rd, 'd1').revealed, rd.revealedThisRound, rd.radarUsed], [false, 0, true],
  '[14.12] unflipped: face down, the reveal budget restored');
t.ok(!C.canReveal(rd, 'd1').ok, '[14.12] another unit must be revealed in its place');
P.apply(rd, { type: 'reveal', unit: 'm1' }, seq([]));
t.ok(types(rd).indexOf('unflip') < 0, '[14.12] radar unflips one unit per round');
var rdOld = fight([U('d1', 'dd2t71', 'B', { revealed: true, revealedRound: 1 })], '14.12', { round: 2, lastReveal: 'd1' });
t.ok(!C.canUnflip(rdOld, 'd1').ok, '[14.4B] not a unit revealed in the first round');
var noRadar = fight([U('d1', 'dd2t71', 'B')]);
noRadar.radar = false;
P.apply(noRadar, { type: 'reveal', unit: 'd1' }, seq([]));
t.ok(types(noRadar).indexOf('unflip') < 0, 'before 1943, no radar');
var evU = fight([U('e1', 'combat_event', 'B'), U('m1', 'm5t20', 'B')]);
P.apply(evU, { type: 'reveal', unit: 'e1' }, seq([5]));
t.ok(types(evU).indexOf('unflip') < 0, '[14.12] a Combat Event cannot be unflipped');

/* ---------- [14.12] Diligent Escort ---------- */
var dl = fight([U('g1', 'dd2t74(diligent)', 'B'), U('m1', 'm5t20', 'B')]);
P.apply(dl, { type: 'reveal', unit: 'g1' }, seq([7]));             // row: damaged
t.ok(dl.sub.damaged, '[14.12] the Diligent Escort row is applied at once (damaged)');
t.ok(types(dl).indexOf('withdraw') > -1, '[14.12] a damaged boat may withdraw at this point');
P.apply(dl, { type: 'withdraw' }, seq([0]));
t.ok(has(dl, 'Endurance') && dl.phase === '16.0', '...and goes to the Endurance check');
var dls = fight([U('g1', 'dd2t74(diligent)', 'B')]);
P.apply(dls, { type: 'reveal', unit: 'g1' }, seq([9]));            // row: sunk
t.ok(dls.done && dls.outcome === 'lost', '[14.12] a Diligent Escort can sink the boat');
/* at targeting: turned up at Fire, rolled, but no withdrawal offered */
var dlt = fight([U('g1', 'dd2t74(diligent)', 'B', { tdc: -3, tdcDrawn: -3, tdcRevealed: true }),
                 U('m1', 'm5t20', 'B', { revealed: true, tdc: -3, tdcDrawn: -3, tdcRevealed: true })], '14.14');
dlt.allocations = [{ unit: 'g1', points: 1 }, { unit: 'm1', points: 5 }];
P.apply(dlt, { type: 'fire' }, seq([6, 9, 9, 9, 9]));            // Diligent row 6: spotted
t.ok(dlt.sub.spotted && has(dlt, 'Counterattack Table, Diligent'), '[14.14] a Diligent Escort turned up at Fire rolls at once');
t.ok(has(dlt, 'To-hit'), '[14.14] ...and combat proceeds normally');

t.ok(!C.canPlaceTdc(fight([U('a9', 'h8emily2', 'B', { revealed: true })], '14.13'), 'a9').ok,
  '[14.13] no TDC marker on a revealed aircraft: markers go on ships');

/* ---------- [14.14] a face-down target turns out to be an aircraft ---------- */
var air = fight([U('a1', 'h8emily2', 'B', { tdc: 0, tdcDrawn: 0, tdcRevealed: true }),
                 U('m1', 'm5t20', 'B', { revealed: true, tdc: -3, tdcDrawn: -3, tdcRevealed: true })], '14.14');
air.tdcPool = air.tdcPool.slice(2);
air.allocations = [{ unit: 'a1', points: 3 }, { unit: 'm1', points: 3 }];
P.apply(air, { type: 'fire' }, seq([]));
t.eq(air.phase, '14.14', '[14.14] an aircraft turned up at Fire: back to the aim');
t.eq(air.allocations.map(function (a) { return a.unit; }), ['m1'], '[14.14] its points are freed to reallocate');
t.eq([C.unit(air, 'a1').tdc, air.tdcPool.length], [null, 23], '[14.14] its TDC marker is removed to the pool');
t.ok(!has(air, 'To-hit'), '...and nothing was fired yet');

/* ---------- [19.2] Combat Events ---------- */
function eventFight(die, units, extraDice) {
  var s = fight(units || [U('e1', 'combat_event', 'B'), U('m1', 'm5t20', 'B'), U('m2', 'm5t20', 'B')]);
  P.apply(s, { type: 'reveal', unit: 'e1' }, seq([die].concat(extraDice || [])));
  return s;
}
var e0 = eventFight(0);
t.eq(e0.roundEvent.id, 0, '[19.2] the event die is rolled when the marker is revealed');
t.ok(C.unit(e0, 'e1').returned, '[19.2] the marker leaves the display once resolved');
t.ok(!C.canPlaceTdc(e0, 'e1').ok && !C.canTarget(Object.assign(e0, { phase: '14.14' }), 'e1').ok,
  '[19.2] ...and can carry no TDC marker nor be targeted (found by learn_verify: the captain aimed at a departed marker)');
var e0b = fight([U('e1', 'combat_event', 'B'), U('e2', 'combat_event', 'B')]);
P.apply(e0b, { type: 'reveal', unit: 'e1' }, seq([5]));
var before = e0b.log.length;
P.apply(e0b, { type: 'reveal', unit: 'e2' }, seq([]));
t.ok(C.unit(e0b, 'e2').returned && e0b.roundEvent.id === 5 && e0b.log[before].result.indexOf('returned') > -1,
  '[14.12] a second Combat Event marker in the round goes back to the cup');

/* 0: target lumbers into way */
var lum = eventFight(0, [U('e1', 'combat_event', 'B'), U('m1', 'm5t20', 'B'), U('m2', 'm5t20', 'A')]);
lum.phase = '14.14';
t.eq(types(lum), ['lumber', 'lumber'], '[19.2] 0 Target lumbers: pick a face-down red-ball ship in reach first');
P.apply(lum, { type: 'lumber', unit: 'm2' }, seq([5]));            // 5-1 = 4 on the 5-9 line
t.ok(C.unit(lum, 'm2').revealed && has(lum, 'Attack Results'), '[19.2] ...it is revealed and rolled on the ART');
t.ok(types(lum).indexOf('lumber') < 0, '[19.2] ...once');

/* 1: surface gunnery */
var gun = eventFight(1, [U('e1', 'combat_event', 'B'), U('m1', 'm5t20', 'B', { revealed: true })]);
gun.phase = '14.14';
t.eq(types(gun), ['gunnery'], '[19.2] 1 Surface gunnery: shell a revealed merchant in your column, instead of the attack');
P.apply(gun, { type: 'gunnery', unit: 'm1' }, seq([9, 0]));
t.ok(gun.sub.spotted, '[19.2] ...the boat is Spotted');
t.ok(has(gun, 'Attack Results') && has(gun, 'Counterattack') && !has(gun, 'To-hit'), '[19.2] ...ART on the 26-35 line, then the counterattack');
var gunNo = eventFight(1, [U('e1', 'combat_event', 'B'), U('m1', 'm5t20', 'B', { revealed: true, tdc: -3, tdcRevealed: true }),
                           U('d1', 'dd2t71', 'C', { revealed: true })]);
gunNo.phase = '14.14';
t.ok(types(gunNo).indexOf('gunnery') < 0, '[19.2] ...ignored when a revealed IJN warship is present');

/* 2: circular running torpedo */
var circ = eventFight(2, [U('e1', 'combat_event', 'B'), U('m1', 'm5t20', 'B', { revealed: true, tdc: -3, tdcRevealed: true })]);
circ.phase = '14.14'; circ.allocations = [{ unit: 'm1', points: 6 }];
circ.tdcPool = [3];                                                // the specially drawn marker: +3
P.apply(circ, { type: 'fire' }, seq([9, 2]));                      // attack misses; circular roll 2 <= -1+1+3
t.ok(circ.log.some(function (r) { return r.context === 'Circular running torpedo'; }), '[19.2] 2 Circular run: the boat is attacked by its own torpedo');
t.eq(circ.outcome, 'lost', '[19.2] ...a roll = or < (Mk-XIV + 1 + TDC) sinks it');

/* 3: Betty bomber */
var betty = eventFight(3, null, [3, 0]);                           // aircraft row 3: spotted; endurance 0
t.ok(betty.sub.spotted && has(betty, 'Counterattack Table, Event Aircraft'), '[19.2] 3 Betty: the Event Aircraft row is applied');
t.ok(betty.phase === '16.0' && has(betty, 'Endurance'), '[19.2] ...then straight to the Endurance check');

/* 4: mechanical troubles */
var mechO = eventFight(4, null, [3]);
t.ok(mechO.sub.damaged && mechO.sub.rtb, '[19.2] 4 odd: Damage and RTB');
t.ok(!has(mechO, 'Endurance') && mechO.phase === '16.0', '[19.2] ...no Combat Phase, no Endurance roll');
var mechE = eventFight(4, null, [2]);
t.ok(!mechE.sub.damaged && !mechE.sub.rtb && !has(mechE, 'Endurance'), '[19.2] 4 even: fixed, and no Endurance roll this turn');

/* 5: perfect setup */
var perf = eventFight(5, [U('e1', 'combat_event', 'B'), U('m1', 'm5t20', 'B', { revealed: true, tdc: 2, tdcRevealed: true })]);
var pv = C.attackPreview(perf, { unit: 'm1', points: 6 });
t.ok(pv.defender.some(function (x) { return x.value === -2 && /Perfect/.test(x.label); }), '[19.2] 5 Perfect setup: a +2 marker counts -2');

/* 6: tonnage doubled */
var dbl = eventFight(6, [U('e1', 'combat_event', 'B'), U('m1', 'm5t20', 'B', { revealed: true, tdc: -3, tdcRevealed: true })]);
dbl.phase = '14.14'; dbl.allocations = [{ unit: 'm1', points: 6 }];
P.apply(dbl, { type: 'fire' }, seq([0, 9, 9]));                    // hit; ART 9-1: sunk; counterattack
P.apply(dbl, { type: 'withdraw' }, seq([0]));
t.eq([dbl.shipsSunk, dbl.tonnageSunk], [1, 10], '[19.2] 6 Tonnage doubled: the 5,000 t maru counts 10,000 t');

/* 7: counterattack - combat */
var c7 = eventFight(7, [U('e1', 'combat_event', 'B'), U('m1', 'm5t20', 'B', { revealed: true, tdc: -3, tdcRevealed: true })]);
c7.phase = '14.14'; c7.allocations = [{ unit: 'm1', points: 6 }];
P.apply(c7, { type: 'fire' }, seq([0, 9, 9]));
t.ok(idx(c7, 'Counterattack') > -1 && idx(c7, 'Counterattack') < idx(c7, 'To-hit'), '[19.2] 7: the escorts attack first, then the boat');
t.eq(c7.log.filter(function (r) { return /^Counterattack Table \[/.test(r.table); }).length, 1, '[19.2] ...and there is no second counterattack');

/* 8: counterattack, no attack */
var c8 = eventFight(8, [U('e1', 'combat_event', 'B'), U('m1', 'm5t20', 'B', { revealed: true, tdc: -3, tdcRevealed: true })]);
c8.phase = '14.14';
t.eq(types(c8), ['endure'], '[19.2] 8: held down, the boat cannot attack');
P.apply(c8, { type: 'endure' }, seq([0]));
t.ok(has(c8, 'Counterattack') && !has(c8, 'To-hit'), '[19.2] ...the escorts counterattack');

/* 9: combat - combat */
var c9 = eventFight(9, [U('e1', 'combat_event', 'B'), U('m1', 'm5t20', 'B', { revealed: true, tdc: -3, tdcRevealed: true })]);
c9.phase = '14.14'; c9.allocations = [{ unit: 'm1', points: 6 }];
P.apply(c9, { type: 'fire' }, seq([9]));
t.ok(has(c9, 'To-hit') && !has(c9, 'Counterattack') && c9.phase === '14.3', '[19.2] 9: the boat attacks and there is no counterattack');

/* ---------- [14.5] Super Skipper ---------- */
var ssS = fight([], '14.7');
ssS.sub.superSkipper = null;
ssS.combatSunk = [{ tonnage: 6, merchant: true }, { tonnage: 5, merchant: true }, { tonnage: 5, merchant: true }];
P.apply(Object.assign(ssS, { phase: '14.3' }), { type: 'withdraw' }, seq([0]));
t.eq(ssS.sub.superSkipper && ssS.sub.superSkipper.value, 1, '[14.5] 3 ships and 16,000 t: a Super Skipper at +1');
ssS.phase = '14.3'; ssS.done = false;
ssS.combatSunk = [{ tonnage: 6 }, { tonnage: 5 }, { tonnage: 5 }];
P.apply(ssS, { type: 'withdraw' }, seq([0]));
t.eq(ssS.sub.superSkipper.value, 2, '[14.5] ...again: flipped to +2');

/* ---------- [14.6] Sub vs. Sub ---------- */
t.eq(C.enemySubsAvailable('east_china_sea', { y: 1943, m: 2 }).map(function (e) { return e.cls; }).sort(),
  ['C1', 'K6', 'KD4', 'KD7', 'L4'], '[30.3] March 1943, East China Sea: the Japanese boats then in service');
t.ok(C.enemySubsAvailable('java_sea', { y: 1943, m: 7 }).some(function (e) { return e.nation === 'DE'; }),
  '[30.3] German boats only in the Java Sea / South China Sea 2, from mid-1943');
t.ok(!C.enemySubsAvailable('east_china_sea', { y: 1943, m: 7 }).some(function (e) { return e.nation !== 'JP'; }),
  '[30.3] ...never elsewhere');
var svs = P.create(soak.setup());
P.apply(svs, { type: 'stay' }, seq([]));
/* AAC die 0 on a white cell with colour in the row, second die 0: an enemy sub.
 * Then: detection 6 (+1 radar = 7: we see it first), enemy pick 0, TDC digits
 * 0 0 (a -? marker), attack die 0, ART 9, endurance 0. */
P.apply(svs, { type: 'search' }, seq([0, 0, 6, 0, 0, 0, 0, 9, 0]));
t.ok(has(svs, 'Sub vs. Sub') && has(svs, 'Enemy Submarines'), '[14.6] two zeros on the chart: an enemy submarine');
t.ok(svs.log.some(function (r) { return /you detected the enemy first/.test(String(r.result)); }), '[14.6B] 6 + radar: you detect it first');
t.ok(svs.log.some(function (r) { return /^You fire at/.test(r.context); }), '[14.6E] one attack round, by the boat that detected');
t.ok(!has(svs, 'Counterattack') && svs.phase === '16.0', '[14.6] no counterattack, no Re-Attack: on to Endurance');

t.done();
