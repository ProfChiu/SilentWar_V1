'use strict';
var t = require('./_harness.js');
var F = require('../apps/game/rules/sw_fog.js').SWFog;
var strip = require('./_strip.js');
t.suite('sw_fog');

var src = strip(require('fs').readFileSync(__dirname + '/../apps/game/rules/sw_fog.js', 'utf8'));
t.ok(src.indexOf('Math.random') === -1, 'sw_fog contains no Math.random');
t.ok(src.indexOf('document.') === -1, 'sw_fog touches no document');

/* The Spearfish board before any reveal: 14 face-down pieces, real ASW hidden. */
var units = [
  { id: 'a', column: 'A', asw: 0, defense: 2, tonnage: 5, revealed: false },
  { id: 'b', column: 'B', asw: 1, defense: 7, tonnage: 2, revealed: false },
  { id: 'c', column: 'B', asw: 2, defense: 1, tonnage: 3, revealed: false },
  { id: 'd', column: 'C', asw: 3, defense: 4, tonnage: 8, revealed: false }
];

var s = F.summarize(units);
t.eq(s.total, 4, 'counts every counter');
t.eq(s.revealedCount, 0, 'nothing revealed yet');
t.eq(s.unrevealedCount, 4, 'four face down');
t.eq(s.revealedAsw, 0, 'THE BINDING RULE: face-down ASW contributes nothing');
t.eq(s.revealedTonnage, 0, 'face-down tonnage contributes nothing');
t.eq(F.assertNoLeak(s, units), [], 'no leak with everything face down');
t.ok(s.trueAsw === undefined && s.hiddenAsw === undefined, 'no true/hidden total exists to read');

/* Reveal the destroyer only. */
units[1].revealed = true;
var s2 = F.summarize(units);
t.eq(s2.revealedAsw, 1, 'only the revealed escort counts');
t.eq(s2.unrevealedCount, 3, 'three still face down');
t.eq(F.phrase('revealed escort ASW', s2), 'revealed escort ASW: 1 (+3 unrevealed)',
  'renders exactly the phrasing the constraint mandates');
t.eq(F.assertNoLeak(s2, units), [], 'no leak after a partial reveal');

/* [2.3B] a damaged ship's ASW is zero. */
units[1].damaged = true;
t.eq(F.summarize(units).revealedAsw, 0, '[2.3B] damaged ship contributes ASW 0');
units[1].damaged = false;

/* [14.16 note] unrevealed units count as defense 1. */
t.eq(F.defenseFor(units[0]), 1, '[14.16] unrevealed target has defense 1');
t.eq(F.defenseFor(units[1]), 7, 'revealed target uses its printed defense');

/* Everything revealed: the summary may now be complete. */
units.forEach(function (u) { u.revealed = true; });
var s3 = F.summarize(units);
t.eq(s3.revealedAsw, 6, 'fully revealed board totals 0+1+2+3 = 6');
t.eq(F.phrase('revealed escort ASW', s3), 'revealed escort ASW: 6', 'no parenthetical when nothing is hidden');

/* Per-column, as the Combat Display side panel needs it. */
units[2].revealed = false;
var cols = F.byColumn(units, ['A', 'B', 'C', 'D']);
t.eq(cols.B.revealedAsw, 1, 'column B shows only the revealed destroyer');
t.eq(cols.B.unrevealedCount, 1, 'column B admits one hidden counter');
t.eq(cols.D.total, 0, 'empty column is empty');

t.done();
