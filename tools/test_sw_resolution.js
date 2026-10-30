'use strict';
var t = require('./_harness.js');
var R = require('../apps/game/rules/sw_resolution.js').SWResolution;
t.suite('sw_resolution');

/* [2.5] zero is zero, not ten; and the module must never roll its own dice. */
t.throws(function () { R.d10(); }, 'd10 refuses to run without an injected rollDie');
t.throws(function () { R.d10({ rollDie: function () { return 10; } }); }, 'd10 rejects a 10');
t.throws(function () { R.d10({ rollDie: function () { return -1; } }); }, 'd10 rejects a negative');
t.eq(R.d10({ rollDie: function () { return 0; } }), 0, 'd10 accepts 0');

/* The module contains no randomness and no DOM of its own — comments stripped,
 * since the file talks ABOUT Math.random in its header. */
var strip = require('./_strip.js');
var src = strip(require('fs').readFileSync(__dirname + '/../apps/game/rules/sw_resolution.js', 'utf8'));
t.ok(src.indexOf('Math.random') === -1, 'sw_resolution contains no Math.random');
t.ok(src.indexOf('document.') === -1, 'sw_resolution touches no document');

/* [2.5] Fraction rounding: < 0.499 down, >= 0.5 up. */
t.eq(R.roundHalfUp(0.5), 1, 'roundHalfUp(0.5) = 1');
t.eq(R.roundHalfUp(1.4), 1, 'roundHalfUp(1.4) = 1');
t.eq(R.roundHalfUp(2.5), 3, 'roundHalfUp(2.5) = 3');

/* Record contract. */
t.throws(function () { R.makeRecord({ table: 'x', ruleRef: '1' }); }, 'record requires context');
t.throws(function () { R.makeRecord({ context: 'c', table: 't', ruleRef: '1',
  inputs: [{ label: 'x' }] }); }, 'inputs need a numeric value');

/* --- RULEBOOK FIXTURE [14.15C], Spearfish, Cargo Ship #1 (2-0, adjacent) ---
 * a) 3 + 1 + (-1) = +3   b) 2 + 1 + (-2) + 1 = +2   c) roll = or < 1 to hit */
var atk1 = R.attackRecord({
  context: 'Cargo Ship #1',
  attacker: [{ label: 'attack', value: 3 }, { label: 'skipper', value: 1 }, { label: 'torpedo', value: -1 }],
  defender: [{ label: 'defense', value: 2 }, { label: 'escort ASW', value: 1 },
             { label: 'TDC', value: -2 }, { label: 'adjacent column', value: 1 }],
  die: 4
}, null);
t.eq(atk1.sides[0].total, 3, '[14.15A] attacker total = +3');
t.eq(atk1.sides[1].total, 2, '[14.15B] target total = +2');
t.eq(atk1.target, 1, '[14.15C] must roll = or < 1');
t.eq(atk1.result, 'miss', 'rolled 4 vs need 1 -> miss');

/* --- RULEBOOK FIXTURE [14.15C], Cargo Ship #3 (1-0, same column) ---
 * a) 3 + 1 + (-1) = +3   b) 1 + 1 + 1 = +3   c) roll = or < 0 to hit */
var atk2 = R.attackRecord({
  context: 'Cargo Ship #3',
  attacker: [{ label: 'attack', value: 3 }, { label: 'skipper', value: 1 }, { label: 'torpedo', value: -1 }],
  defender: [{ label: 'defense', value: 1 }, { label: 'escort ASW', value: 1 }, { label: 'TDC', value: 1 }],
  die: 0
}, null);
t.eq(atk2.sides[0].total, 3, '[14.15A] attacker total = +3');
t.eq(atk2.sides[1].total, 3, '[14.15B] target total = +3');
t.eq(atk2.target, 0, '[14.15C] must roll = or < 0');
t.eq(atk2.result, 'HIT', 'rolled 0 vs need 0 -> hit (= or < is inclusive)');

/* [14.15C] "round down" on a fractional difference. */
t.eq(R.attackRecord({ context: 'frac',
  attacker: [{ label: 'a', value: 3 }], defender: [{ label: 'd', value: 0.5 }], die: 0 }, null).target,
  2, '[14.15C] 3 - 0.5 rounds DOWN to 2');

/* --- RULEBOOK FIXTURE [14.2], Spearfish counterattack ---
 * a) 1 + 3 + 1 = +5   b) 3 + 1 = +4   c) the '1' line (5-4) */
var ca = R.counterattackRecord({
  japanese: [{ label: 'revealed ASW', value: 1 }, { label: 'red boxes', value: 3 },
             { label: 'general ASW', value: 1 }],
  submarine: [{ label: 'defense', value: 3 }, { label: 'skipper', value: 1 }],
  die: 6
}, null);
t.eq(ca.sides[0].total, 5, '[14.2A] Japanese total = +5');
t.eq(ca.sides[1].total, 4, '[14.2B] submarine total = +4');
t.eq(ca.target, 1, "[14.2C] consult the '1' line");

/* [14.2A1] "fractions rounded up" — a half-ASW escort. */
t.eq(R.counterattackRecord({
  japanese: [{ label: 'revealed ASW', value: 0.5 }, { label: 'general ASW', value: 1 }],
  submarine: [{ label: 'defense', value: 1 }], die: 0 }, null).sides[0].total,
  2, '[14.2A1] 1.5 ASW rounds UP to 2');

/* Ledger renders the rulebook's own arithmetic, and the plan's example line. */
var lines = R.ledgerLines(atk1);
t.eq(lines[0].text, 'attack +3 skipper +1 torpedo -1 = +3', 'attacker ledger line');
t.eq(lines[1].text, 'defense +2 escort ASW +1 TDC -2 adjacent column +1 = +2', 'target ledger line');
t.ok(R.ledgerText(atk1).indexOf('need = or < 1') > -1, 'ledger states the target number');
t.ok(R.ledgerText(atk1).indexOf('rolled 4') > -1, 'ledger states the die');

/* Injected dice really are used when a step fixes none. */
var seq = [7], i = 0;
t.eq(R.attackRecord({ context: 'x', attacker: [{ label: 'a', value: 9 }], defender: [] },
  { rollDie: function () { return seq[i++]; } }).die, 7, 'injected rollDie supplies the die');

t.done();
