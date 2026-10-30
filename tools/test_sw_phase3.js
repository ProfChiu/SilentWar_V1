'use strict';
/* Phase 3 data. Wherever the rulebook states a fact independently, it is used
 * as the check — a table that merely agrees with itself proves nothing. */
var t = require('./_harness.js');
var T = require('../apps/game/data/sw_tables.js').SWTables;
var A = require('../apps/game/data/sw_aac.js').SWAac;
var S = require('../apps/game/data/sw_ships.js').SWShips;
var C = require('../apps/game/data/sw_subclasses.js').SWSubClasses;
var U = require('../apps/game/data/sw_units.js').SWUnits;
var M = require('../apps/game/data/sw_map.js').SWMap;
t.suite('sw_phase3');

/* ---- Area Activity Charts: 920 cells ---- */
t.eq(A.ids().length, 23, '23 Area Activity Charts');
var cells = 0;
A.ids().forEach(function (id) {
  var g = A.charts[id].grid;
  t.eq(g.length, 4, id + ' has four War Period rows');
  g.forEach(function (r) { t.eq(r.length, 10, id + ' row covers die 0-9'); cells += r.length; });
});
t.eq(cells, 920, '920 AAC cells in total');
t.ok(A.ids().every(function (id) {
  return A.charts[id].grid.every(function (row) {
    return row.every(function (v) { return A.levels.indexOf(v) > -1; });
  });
}), 'every AAC cell is a known Activity Level');

/* Within a row, activity never decreases as the die roll rises. */
var order = { none: 0, sparse: 1, low: 2, moderate: 3, high: 4 };
A.ids().forEach(function (id) {
  A.charts[id].grid.forEach(function (row, r) {
    var v = row.map(function (x) { return order[x]; });
    t.ok(v.every(function (x, i) { return i === 0 || x >= v[i - 1]; }),
      id + ' W' + (r + 1) + ' never cools off as the die rises');
  });
});

/* RULEBOOK FIXTURE [14.2]: the Spearfish counterattack cites East China Sea in
 * War Period 2 as having 3 red boxes. */
t.eq(A.redBoxes('east_china_sea', 'W2'), 3,
  '[14.2] East China Sea W2 has 3 red boxes (rulebook example)');
/* redBoxes must agree with the grid it was derived from. */
A.ids().forEach(function (id) {
  var c = A.charts[id];
  c.grid.forEach(function (row, r) {
    t.eq(c.redBoxes[r], row.filter(function (v) { return v === 'high'; }).length,
      id + ' W' + (r + 1) + ' red-box count matches its row');
  });
});
/* TAPE FIXTURE: the Phase 2 demo tape asserts a Moderate result. */
t.eq(A.lookup('east_china_sea', 'W2', 5), 'moderate',
  'East China Sea W2, die 5 is Moderate Density (demo tape)');

/* ---- Tables ---- */
t.eq(T.status, 'complete', 'tables are no longer partial');

/* RULEBOOK FIXTURE [13.2B]/[13.2C], as used by the demo tape. */
t.eq(T.contactLookup('W2', 6), 'C2', '[13.2B] W2 + 6 = C2');
t.eq(T.engagementLookup('moderate', 'C2', false), [5, 4, 3, 2], '[13.2C] Moderate x C2');
t.eq(T.engagementLookup('moderate', 'C2', true), [6, 5, 4, 3], '[13.2C] ULTRA adds one per cup');
t.eq(T.engagementLookup('sparse', 'C1', true), [3, 2, null, null], 'ULTRA never creates a draw');

/* ART: every row is non-decreasing in severity, and the diagonal walks right. */
t.eq(T.art.length, 7, 'ART has seven tonnage bands');
var sev = { none: 0, damaged: 1, sunk: 2 };
T.art.forEach(function (row, i) {
  t.eq(row.length, 10, 'ART row ' + i + ' covers die 0-9');
  var v = row.map(function (x) { return sev[x]; });
  t.ok(v.every(function (x, j) { return j === 0 || x >= v[j - 1]; }),
    'ART row ' + i + ' never gets less severe as the die rises');
});
t.eq(T.artLookup(2, 0), 'none', 'ART: a 1-4kt target survives a 0');
t.eq(T.artLookup(2, 1), 'damaged', 'ART: 1-4kt damaged on a 1');
t.eq(T.artLookup(2, 3), 'sunk', 'ART: 1-4kt sunk on a 3');
t.eq(T.artLookup(60, 8), 'damaged', 'ART: 56+ only damaged on an 8');
t.eq(T.artLookup(60, 9), 'sunk', 'ART: 56+ sunk on a 9');
/* TAPE FIXTURE: cargo maru #3 is 3,000 tons, die 8 with torpedo -1 = 7. */
t.eq(T.artLookup(3, 7), 'sunk', 'demo tape: 3kt maru sunk on a modified 7');

/* Counterattack: 6 rows x 13 columns, and the sheet's own procedure notes. */
t.eq(T.counterattack.length, 6, 'Counterattack has six differential rows');
T.counterattack.forEach(function (r, i) {
  t.eq(r.length, 13, 'Counterattack row ' + i + ' covers die 0-12');
});
t.eq(T.counterattackLookup(-1, 5), null, '[14.2] below zero there is no counterattack');
t.eq(T.counterattackLookup(12, 0), T.counterattackLookup(8, 0), '[14.2] over 8 uses the 8+ line');
/* RULEBOOK FIXTURE [14.2]: Spearfish consults the '1' line and takes no damage. */
t.eq(T.counterattackLookup(1, 6), 'none', "[14.2] the '1' line, die 6 (demo tape: no damage)");
t.eq(T.diligentEscort.length, 10, 'Diligent Escort row covers die 0-9');
t.eq(T.eventAircraft.length, 10, 'Event Aircraft row covers die 0-9');
/* The extra-roll disc only ever sits on a damaged-RTB or sunk cell. */
var glyphs = [];
T.counterattack.concat([T.diligentEscort, T.eventAircraft]).forEach(function (row) {
  row.forEach(function (v) { if (v.slice(-1) === '+') glyphs.push(v); });
});
t.eq(glyphs.length, 10, 'ten cells carry the extra-roll disc');
t.ok(glyphs.every(function (v) { return v === 'damaged_rtb+' || v === 'sunk+'; }),
  'the disc only appears on damaged-RTB or sunk cells');

/* RULEBOOK FIXTURE [14.7]: the demo tape rolls Endurance B at torpedo -1
 * against a target of 4. */
t.eq(T.enduranceTarget(-1, 'B'), 4, '[14.7] Endurance B at torpedo -1 needs = or < 4');
t.eq(T.enduranceTarget(-2, 'D'), 2, '[14.7] worst case is 2');
t.eq(T.enduranceTarget(2, 'A'), 7, '[14.7] best case is 7');
['-2', '-1', '0', '1', '2'].forEach(function (k) {
  var r = T.endurance[k];
  t.ok(r.A >= r.B && r.B >= r.C && r.C >= r.D, 'endurance row ' + k + ' falls A to D');
});

/* Transit Event [19.1]. */
t.eq(T.transit.length, 5, 'Transit Event has five rows');
t.eq(T.transitRowFor('W1', 9), 3, '[19.1] W1 first-die 9 is the fourth row');
t.eq(T.transitRowFor('W4', 9), 2, '[19.1] W4 folds 8-9 into one row');
t.eq(T.transitRowFor('W4', 99), null, 'an impossible first die selects no row');
t.eq(T.transitLookup('W1', 0, 0), 'none', 'quiet transit on a low double');
t.eq(T.transitLookup('W2', 9, 9), 'lost', 'the worst transit result is lost at sea');

/* War Period [17.1]. */
t.eq(T.generalAsw, { W1: 0, W2: 1, W3: 2, W4: 1 }, '[17.1] general ASW by War Period');
t.eq(T.warPeriodModGrid.length, 5, 'modification grid is 5x5');
/* The chart's own worked hint sits on the ->W2 line, whose tonnage bands run
 * 400/350/300/250/200: "if 310, then use 300". */
t.eq(T.warPeriodModifier('W2', 310, 0), -2,
  '[17.1A] 310 tons uses the 300 line (the chart says so)');
t.eq(T.warPeriodModifier('W2', 300, 0), -2, '[17.1A] exactly 300 uses the same line');
t.eq(T.warPeriodModifier('W2', 349, 0), -2, '[17.1A] 349 still uses the 300 line');
t.eq(T.warPeriodModifier('W2', 350, 0), -1, '[17.1A] 350 steps up a line');
t.eq(T.warPeriodModifier('W2', 400, 125), 4, '[17.1A] best case on the ->W2 line');
t.eq(T.warPeriodModifier('W2', 200, 25), -4, '[17.1A] lowest line, lowest column');
t.eq(T.warPeriodModifier('W3', 310, 0), -4,
  '[17.1A] below every ->W3 tonnage line, so the worst line applies');
t.eq(T.transitionTarget(1942, 2), 9, '[17.1B] March 1942 needs a 9');
t.eq(T.transitionTarget(1943, 6), 2, '[17.1B] July 1943 needs a 2');
t.eq(T.transitionTarget(1941, 0), null, '[17.1B] no roll in January 1941');
Object.keys(T.warPeriodTransition).forEach(function (y) {
  t.eq(T.warPeriodTransition[y].length, 12, y + ' has twelve months');
});

/* Torpedo Improvement [6.0]. The rulebook example: 70 ships sunk needs a 9,
 * and the next attempt is at 75, needing an 8. */
var first = T.torpedoImprovement['-2->-1'];
t.eq(first[0], [70, 9], '[6.0] 70 ships sunk needs a 9 (rulebook example)');
t.eq(first[1], [75, 8], '[6.0] next attempt at 75 needs an 8 (rulebook example)');
Object.keys(T.torpedoImprovement).forEach(function (k) {
  var rows = T.torpedoImprovement[k];
  t.eq(rows.length, 10, k + ' has ten steps');
  t.ok(rows.every(function (r, i) { return i === 0 || r[0] > rows[i - 1][0]; }),
    k + ' ships-sunk thresholds rise');
  t.ok(rows.every(function (r, i) { return i === 0 || r[1] < rows[i - 1][1]; }),
    k + ' required die falls as more ships are sunk');
});

/* Enemy submarines [30.3] and ULTRA [7.0]. */
t.eq(T.enemySubs.length, 8, '[30.3] eight enemy submarine classes');
t.eq(T.enemySubs.filter(function (s) { return s.nation !== 'JP'; }).length, 3,
  '[30.3] three Axis-European boats');
t.eq(T.enemySubAreas, ['java_sea', 'scs2'],
  '[30.3] German and Italian boats only in the Java Sea or South China Sea 2');
['W1', 'W2', 'W3', 'W4'].forEach(function (w) {
  t.eq(T.ultra[w].length, 10, '[7.0] ULTRA ' + w + ' covers die 0-9');
  T.ultra[w].forEach(function (areas, d) {
    t.ok(areas.length >= 1 && areas.length <= 2, '[7.0] ' + w + ' die ' + d + ' names one or two areas');
    areas.forEach(function (a) {
      t.ok(A.charts[a] !== undefined, '[7.0] ULTRA area "' + a + '" is a real OpArea');
    });
  });
});
t.eq(T.combatEvents.length, 10, '[19.2] ten combat events');

/* ---- Japanese pieces and the War Mix ---- */
t.eq(S.pieces.length, 50, '47 ship counters, two aircraft and the Combat Event marker');
t.eq(S.byType('AIR').length, 2, 'two aircraft');
t.ok(S.byType('AIR').every(function (p) { return p.defense === null && p.asw === 2; }),
  '[2.3B] aircraft have no defense rating and an ASW of 2');
t.ok(S.pieces.filter(function (p) { return ['AIR', 'EVENT'].indexOf(p.type) === -1; })
  .every(function (p) { return p.tonnage > 0 && p.defense > 0; }),
  'every ship has a tonnage and a defense rating');
t.eq(S.byType('EVENT').length, 1, 'the Combat Event marker is in the roster');
t.ok(S.piece('combat_event').defense === null, 'a Combat Event has no defense rating');
/* RULEBOOK FIXTURE [14.14]: the example names a 7-1 destroyer and 2-0/1-0 marus. */
t.ok(S.pieces.some(function (p) { return p.type === 'DD' && p.defense === 7 && p.asw === 1; }),
  '[14.14] a 7-1 destroyer exists');
t.ok(S.pieces.some(function (p) { return p.type === 'M' && p.defense === 2 && p.asw === 0; }),
  '[14.14] a 2-0 cargo maru exists');
t.ok(S.pieces.some(function (p) { return p.type === 'M' && p.defense === 1 && p.asw === 0; }),
  '[14.14] a 1-0 cargo maru exists');
t.eq(S.piece('dd2t74(diligent)').defense, 7, 'the Diligent Escort is a 7-4 destroyer');
t.eq(S.piece('dd1t6half').asw, 0.5, '[2.3B] a half-ASW escort exists');

/* War Mix: the derived cup totals must equal the totals printed on the chart. */
['W1', 'W2', 'W3', 'W4', 'Y32'].forEach(function (p) {
  t.eq(S.cupTotals(p), S.printedCupTotals[p],
    '[3.1] ' + p + ' cup totals match the printed chart');
});
t.eq(S.warMix.reduce(function (n, r) { return n + r.total; }, 0), 108,
  '[3.1] 108 pieces in the War Mix');
S.warMix.forEach(function (r) {
  ['W1', 'W2', 'W3', 'W4', 'Y32'].forEach(function (p) {
    var m = r.mix[p];
    t.eq(m.length, 5, r.id + '/' + p + ' is [A,B,C,D,notUsed]');
    t.eq(m.reduce(function (a, b) { return a + b; }, 0), r.total,
      '[3.1] ' + r.id + '/' + p + ' distributes exactly its ' + r.total + ' piece(s)');
  });
});
/* RULEBOOK FIXTURE [3.12]: nine pieces carry printed Entry Dates. */
t.eq(S.datedPieceCount(), 9, '[3.12] nine pieces have printed entry dates');

/* ---- Submarine classes ---- */
t.eq(C.classes.length, 40, '40 submarine classes');
t.ok(C.classes.every(function (c) {
  return c.attack > 0 && c.defense > 0 && c.tactical > 0 &&
         'ABCDN'.indexOf(c.endurance) > -1 && c.speed > 0 && c.readiness > 0;
}), 'every class carries both sides of its counter');
/* RULEBOOK FIXTURE [14.14]: USS Spearfish is a 6-3-4. */
var spear = C.forBoat(U.boat('USS Spearfish'));
t.eq([spear.attack, spear.defense, spear.tactical], [6, 3, 4],
  '[14.14] USS Spearfish is a 6-3-4');
t.eq(spear.endurance, 'B', 'Spearfish has endurance B (demo tape)');
/* Every boat in the 309-strong roster resolves to a class. */
t.eq(U.submarines.filter(function (b) { return !C.get(b.art); }).length, 0,
  'all 309 boats resolve to a class with ratings');
t.ok(C.byNation('US').length > 20, 'most classes are American');
t.eq(C.get('ssn21').range, null, 'the SSN21 prints a reactor symbol, not a range');

/* ---- Map geometry and the movement graph ---- */
t.eq(M.geometryStatus.opAreas, 'pixel-derived', 'OpArea geometry is no longer eyeballed');
t.ok(M.opAreas.every(function (a) { return a.aac && a.aac.length === 2; }),
  'every OpArea knows where its AAC is printed');
t.ok(M.opAreas.every(function (a) { return A.charts[a.id] !== undefined; }),
  'every OpArea has an Area Activity Chart');
/* Phase 4 rebuilt this after finding the coastal-halo contamination. */
t.eq(M.adjacencyStatus, 'read-from-map', 'the movement graph was re-read from the map');
t.eq(M.unresolved, undefined, 'no area is left unresolved any more');
t.eq(M.uncertain.length, 1, 'one pair remains genuinely ambiguous');
var degs = Object.keys(M.adjacency).map(function (k) { return M.adjacency[k].length; });
t.ok(Math.min.apply(null, degs) >= 1, 'every area has at least one neighbour');
t.ok(Math.max.apply(null, degs) <= 6, 'no area has an implausible number of neighbours');
/* Connectivity: a submarine must be able to reach every area from any other. */
(function () {
  var seen = { kurile: true }, stack = ['kurile'];
  while (stack.length) {
    var x = stack.pop();
    M.adjacency[x].forEach(function (y) { if (!seen[y]) { seen[y] = true; stack.push(y); } });
  }
  t.eq(Object.keys(seen).length, 23, 'the movement graph is fully connected');
}());
/* Adjacency must at least be symmetric and self-consistent. */
Object.keys(M.adjacency).forEach(function (a) {
  M.adjacency[a].forEach(function (b) {
    t.ok(M.adjacency[b] && M.adjacency[b].indexOf(a) > -1,
      'adjacency is symmetric: ' + a + ' <-> ' + b);
    t.ok(a !== b, 'no area is adjacent to itself');
  });
});
t.ok(Object.keys(M.adjacency).every(function (k) { return A.charts[k] !== undefined; }),
  'every graph node is a real OpArea');
t.ok(M.adjacency.east_china_sea.indexOf('yellow_sea') > -1,
  'East China Sea connects to the Yellow Sea');

t.done();
