'use strict';
/* The Combat Phase engine, tested against the rulebook's own worked example.
 * If this file passes, [14.14], [14.15] and [14.2] are implemented as printed. */
var t = require('./_harness.js');
global.SWResolution = require('../apps/game/rules/sw_resolution.js').SWResolution;
global.SWFog        = require('../apps/game/rules/sw_fog.js').SWFog;
global.SWTables     = require('../apps/game/data/sw_tables.js').SWTables;
global.SWShips      = require('../apps/game/data/sw_ships.js').SWShips;
global.SWAac        = require('../apps/game/data/sw_aac.js').SWAac;
global.SWLayout     = require('../apps/game/data/sw_layout.js').SWLayout;
var K = require('../apps/game/rules/sw_combat.js').SWCombat;
var strip = require('./_strip.js');
t.suite('sw_combat');

var src = strip(require('fs').readFileSync(__dirname + '/../apps/game/rules/sw_combat.js', 'utf8'));
t.ok(src.indexOf('Math.random') === -1, 'sw_combat has no Math.random');
t.ok(src.indexOf('document.') === -1, 'sw_combat touches no document');

function dice(seq) {
  var i = 0;
  return { rollDie: function () {
    if (i >= seq.length) throw new Error('test ran out of scripted dice');
    return seq[i++];
  } };
}

/* The board from the rulebook example: USS Spearfish (6-3-4) with Whitaker,
 * War Period 2, East China Sea, Mk-XIV at -1. */
function board() {
  return {
    warPeriod: 'W2', area: 'east_china_sea', torpedoValue: -1,
    round: 1, revealedThisRound: 0, tdcPlaced: 0,
    sub: { name: 'USS Spearfish', column: 'B', attack: 6, defense: 3, tactical: 4,
           endurance: 'B', superSkipper: { name: 'Whitaker', value: 1 },
           damaged: false, spotted: false, rtb: false, sunk: false },
    units: [
      { uid: 'a1', piece: 'm5t20',  column: 'A', revealed: false, damaged: false, sunk: false, tdc: null },
      { uid: 'b1', piece: 'm5t20',  column: 'B', revealed: false, damaged: false, sunk: false, tdc: null },
      { uid: 'b2', piece: 'm3t10',  column: 'B', revealed: false, damaged: false, sunk: false, tdc: null },
      { uid: 'b3', piece: 'dd2t71', column: 'B', revealed: false, damaged: false, sunk: false, tdc: null }
    ]
  };
}

/* ---- [14.12] reveal is bounded by Tactical and by column ---- */
var s = board();
t.eq(K.eligibleColumns(s), ['B', 'A', 'C'], '[14.12] own column plus adjacent');
t.eq(K.revealBudget(s), 4, 'Tactical 4 reveals four counters');
t.ok(K.canReveal(s, 'a1').ok, 'column A is adjacent to B, so it may be revealed');
s.units.push({ uid: 'd1', piece: 'm5t20', column: 'D', revealed: false, damaged: false, sunk: false, tdc: null });
t.eq(K.canReveal(s, 'd1').ok, false, 'column D is not adjacent to B');
t.ok(K.canReveal(s, 'd1').why.indexOf('[14.12]') > -1, 'the refusal cites the rule');
s.units.pop();

['a1', 'b1', 'b2', 'b3'].forEach(function (u) { K.reveal(s, u, dice([])); });
t.eq(s.revealedThisRound, 4, 'four counters revealed');
t.eq(K.canReveal(s, 'a1').ok, false, 'a revealed counter cannot be revealed again');

/* ---- [14.13] TDC placement ---- */
t.ok(K.canPlaceTdc(s, 'a1').ok, 'a TDC may go on a revealed ship');
K.placeTdc(s, 'a1', -2);
K.placeTdc(s, 'b1', 1);
K.placeTdc(s, 'b2', 1);
K.placeTdc(s, 'b3', 0);
t.eq(K.canPlaceTdc(s, 'a1').ok, false, '[14.13] TDC markers may not be moved once placed');
t.ok(K.canPlaceTdc(s, 'a1').why.indexOf('[14.13]') > -1, 'the refusal cites the rule');
K.revealTdcs(s);

/* ---- [14.14] target selection ---- */
t.ok(K.canTarget(s, 'a1').ok, 'a TDC-marked ship in an adjacent column is a legal target');
var noTdc = board();
t.eq(K.canTarget(noTdc, 'b1').ok, false, '[14.14] a target must carry a TDC marker');
t.eq(K.canAllocate(s, []).ok, false, '[14.14] at least one target is required');
t.eq(K.canAllocate(s, [{ unit: 'a1', points: 4 }, { unit: 'b2', points: 4 }]).ok, false,
  '[14.14] 8 points exceeds an attack value of 6');
t.ok(K.canAllocate(s, [{ unit: 'a1', points: 3 }, { unit: 'b2', points: 3 }]).ok,
  '[14.14] the rulebook allocation of 3 + 3 is legal');

/* ---- [14.15] the two printed attacks ---- */
t.eq(K.revealedEscortAsw(s), 1, '[14.15B2] one revealed escort, ASW 1');

/* Cargo Ship #1: 2-0 in an adjacent column, TDC -2. Rulebook: need = or < 1. */
var atk1 = K.attack(s, { unit: 'a1', points: 3 }, dice([4]));
t.eq(atk1.record.sides[0].total, 3, '[14.15A] attacker total is +3');
t.eq(atk1.record.sides[1].total, 2, '[14.15B] target total is +2');
t.eq(atk1.record.target, 1, '[14.15C] must roll = or < 1 (rulebook says 20%)');
t.eq(atk1.hit, false, 'rolled 4, so it misses');
t.eq(atk1.artRecord, null, 'no ART roll on a miss');

/* Cargo Ship #3: 1-0 in the same column, TDC +1. Rulebook: need = or < 0. */
var atk2 = K.attack(s, { unit: 'b2', points: 3 }, dice([0, 8]));
t.eq(atk2.record.sides[0].total, 3, '[14.15A] attacker total is +3');
t.eq(atk2.record.sides[1].total, 3, '[14.15B] target total is +3');
t.eq(atk2.record.target, 0, '[14.15C] must roll = or < 0 (rulebook says 10%)');
t.eq(atk2.hit, true, 'rolled 0, so it hits');
/* [14.15D] 3,000 tons, die 8 with the Mk-XIV at -1 = 7 -> red. */
t.eq(atk2.artRecord.modifiedDie, 7, '[14.15D] the torpedo value modifies the ART roll');
t.eq(atk2.sunk, true, '[14.15D] a modified 7 sinks a 3,000-ton target');
t.eq(K.unit(s, 'b2').sunk, true, 'the maru is removed from the board');

/* ---- [14.2] the printed counterattack ---- */
var ca = K.counterattack(s, dice([6]));
t.eq(ca.record.sides[0].total, 5, '[14.2A] Japanese total is +5 (1 ASW + 3 red boxes + 1 general)');
t.eq(ca.record.sides[1].total, 4, '[14.2B] submarine total is +4 (3 defense + 1 skipper)');
t.eq(ca.record.target, 1, "[14.2C] the '1' line of the Counterattack Table");
t.eq(ca.result, 'none', 'a 6 on the 1 line does nothing');
t.eq(ca.extraRecord, null, 'no extra roll was called for');

/* The red-box term came from the sampled map, not from a constant. */
t.eq(ca.record.sides[0].terms[1].value, 3,
  '[14.2A2] the 3 red boxes come from the sampled East China Sea AAC');

/* ---- [2.3B] a damaged ship contributes no ASW ---- */
var dmg = board();
dmg.units.forEach(function (u) { u.revealed = true; });
t.eq(K.revealedEscortAsw(dmg), 1, 'the destroyer contributes ASW 1');
K.unit(dmg, 'b3').damaged = true;
t.eq(K.revealedEscortAsw(dmg), 0, '[2.3B] a damaged escort contributes ASW 0');

/* ---- [14.16] an impossible attack is an automatic miss ---- */
var hard = board();
hard.torpedoValue = -2;
hard.sub.superSkipper = null;
hard.units.forEach(function (u) { u.revealed = true; });
K.placeTdc(hard, 'b1', 3);
var imp = K.attack(hard, { unit: 'b1', points: 1 }, dice([0]));
t.ok(imp.record.target < 0, 'the target number is below zero');
t.eq(imp.record.result, 'automatic miss', '[14.16] the attack goes through as an automatic miss');

/* ---- [14.4] Re-Attack: the round's TDC markers return to the pool ----
 * (Phase 4 kept them and subtracted one; corrected in Phase 5, 2026-09-21:
 * "TDC markers from the first round are removed and mixed back into the draw
 * pool"; the -1, except a -3, applies to the markers drawn for the Re-Attack.) */
var re = board();
re.units.forEach(function (u) { u.revealed = true; });
K.placeTdc(re, 'a1', -3);
K.placeTdc(re, 'b1', 2);
K.placeTdc(re, 'b2', 0);
var back = K.beginReAttack(re);
t.eq(re.round, 2, 'the round advances');
t.eq(back.sort(), [-3, 0, 2], '[14.4] the three markers go back to the pool');
t.ok(re.units.every(function (u) { return u.tdc === null; }), '[14.4] and leave the display');
t.eq([K.tdcEffective(re, -3), K.tdcEffective(re, 2), K.tdcEffective(re, 0)], [-3, 1, -1],
  '[14.4] a marker drawn for the Re-Attack counts one better, except a -3');
t.eq(re.revealedThisRound, 0, 'the reveal budget resets');

/* [14.4A] Rising Sun flags first in a Re-Attack. */
var order = board();
K.beginReAttack(order);
t.eq(K.canReveal(order, 'b1').ok, false,
  '[14.4A] a merchant back may not be turned while a Rising Sun flag waits');
t.ok(K.canReveal(order, 'b3').ok, '[14.4A] the destroyer carries the Rising Sun flag');
t.eq(K.backOf({ piece: 'm5t20' }), 'merchant', 'a maru shows the red-ball flag');
t.eq(K.backOf({ piece: 'dd2t71' }), 'battle', 'a destroyer shows the Rising Sun flag');

/* ---- [14.7] endurance, and [14.5] the super skipper threshold ---- */
var end = K.endurance(board(), 0, dice([2]));
t.eq(end.record.target, 4, '[14.7] Endurance B at torpedo -1 needs = or < 4');
t.eq(end.stays, true, 'a 2 keeps the boat on patrol');
t.eq(K.endurance(board(), 0, dice([5])).stays, false, 'a 5 forces RTB');
t.eq(K.endurance(board(), -1, dice([5])).stays, true, '[14.7] the no-contact drm is -1');

t.eq(K.superSkipperEarned([{ tonnage: 6 }]), false, '[14.5] one small ship is not enough');
t.eq(K.superSkipperEarned([{ tonnage: 6 }, { tonnage: 5 }, { tonnage: 5 }]), true,
  '[14.5] three ships totalling 16,000 tons earns a Super Skipper');
t.eq(K.superSkipperEarned([{ tonnage: 5 }, { tonnage: 5 }, { tonnage: 5 }]), false,
  '[14.5] three ships under 16,000 tons do not');

/* ---- counterattack extremes ---- */
var deadly = board();
deadly.sub.defense = 1; deadly.sub.superSkipper = null;
deadly.units.forEach(function (u) { u.revealed = true; });
var ca2 = K.counterattack(deadly, dice([9]));
t.ok(ca2.record.target >= 3, 'a weak boat faces a worse line');
var sunkState = board();
K.applyCounterattack(sunkState, 'sunk');
t.eq(sunkState.sub.sunk, true, 'a sunk result sinks the submarine');
var rtbState = board();
K.applyCounterattack(rtbState, 'damaged_rtb');
t.ok(rtbState.sub.damaged && rtbState.sub.rtb, 'damaged-RTB sets both flags');

t.done();
