'use strict';
var t = require('./_harness.js');
var Map = require('../apps/game/data/sw_map.js').SWMap;
var Layout = require('../apps/game/data/sw_layout.js').SWLayout;
var Tables = require('../apps/game/data/sw_tables.js').SWTables;
var Units = require('../apps/game/data/sw_units.js').SWUnits;
var Sop = require('../apps/game/data/sw_sop.js').SWSop;
var Glossary = require('../apps/game/data/sw_glossary.js').SWGlossary;
var Charts = require('../apps/game/data/sw_charts.js').SWCharts;
t.suite('sw_data');

/* Combat Display geometry — pixel-exact from the Vassal buildFile. */
var cd = Layout.combatDisplay;
t.eq(cd.subSlots.length, 8, '8 submarine boxes');
t.eq(cd.targetSlots.length, 22, '22 target slots');
t.eq(cd.tdcSlots.length, 22, '22 TDC slots');
t.eq(Layout.slotsInColumn('sub', 'A').length, 2, 'two submarine boxes per column [14.11]');
t.eq(Layout.slotsInColumn('target', 'A').length, 6, 'column A holds six targets');
t.eq(Layout.slotsInColumn('target', 'B').length, 5, 'column B holds five targets');
t.ok(cd.subSlots.concat(cd.targetSlots, cd.tdcSlots).every(function (s) {
  return s.x > 0 && s.x < 1 && s.y > 0 && s.y < 1;
}), 'every slot is normalised inside the image');

/* Adjacency of columns drives reveal, TDC, targeting and ASW totals. */
t.eq(Layout.adjacentColumns('A'), ['B'], 'A is adjacent to B only');
t.eq(Layout.adjacentColumns('B'), ['A', 'C'], 'B is adjacent to A and C');
t.eq(Layout.adjacentColumns('D'), ['C'], 'D is adjacent to C only');

/* Map geometry. */
t.eq(Map.opAreas.length, 23, '23 OpAreas with Area Activity Charts');
t.eq(Map.smzs.length, 16, '16 SMZs (circles without an AAC) [20.0]');
t.eq(Map.bases.filter(function (b) { return b.major; }).length, 5, 'five major bases [21.0]');
t.ok(Map.opAreas.concat(Map.smzs, Map.bases).every(function (a) {
  return a.x > 0 && a.x < 1 && a.y > 0 && a.y < 1;
}), 'every area centre is normalised inside the map');
t.ok(Map.opAreas.concat(Map.smzs, Map.bases).every(function (a) { return a.id && a.name; }),
  'every area has an id and a name');
var ids = Map.opAreas.concat(Map.smzs, Map.bases).map(function (a) { return a.id; });
t.eq(ids.length, new Set(ids).size, 'area ids are unique');
/* Phase 3 replaced both of these: adjacency is now traced (as a draft), and the
 * OpArea coordinates are pixel-derived. Details are checked in test_sw_phase3. */
t.ok(Map.adjacency && Object.keys(Map.adjacency).length === 23,
  'adjacency now covers all 23 OpAreas');
t.eq(Map.adjacencyStatus, 'read-from-map', 'the movement graph was confirmed in Phase 4');
t.eq(Map.geometryStatus.opAreas, 'pixel-derived', 'OpArea geometry is pixel-derived');
t.eq(Map.geometryStatus.smzs, 'temp', 'SMZ geometry is still eyeballed');
t.ok(Map.byId('east_china_sea') !== null, 'the demo tape OpArea resolves');

/* Contact Table [13.2B] — every row covers all ten die faces. */
['W1', 'W2', 'W3', 'W4'].forEach(function (w) {
  t.eq(Tables.contact[w].length, 10, w + ' contact row covers die 0-9');
});
t.eq(Tables.contactLookup('W2', 6), 'C2', '[13.2B] W2 + 6 = C2 (the demo tape lookup)');
t.eq(Tables.contactLookup('W1', 9), 'TF', '[13.2B] W1 + 9 = TF');
t.eq(Tables.contactLookup('W4', 0), 'C1', '[13.2B] W4 + 0 = C1');
t.throws(function () { Tables.contactLookup('W5', 0); }, 'unknown war period throws');

/* Engagement Table [13.2C]. */
t.eq(Tables.engagementLookup('moderate', 'C2', false), [5, 4, 3, 2],
  '[13.2C] Moderate x C2 = A5 B4 C3 D2 (the demo tape draw)');
t.eq(Tables.engagementLookup('moderate', 'C2', true), [6, 5, 4, 3],
  '[13.2C] ULTRA adds one per cup');
t.eq(Tables.engagementLookup('sparse', 'C1', true), [3, 2, null, null],
  '[13.2C] ULTRA does not turn "no draw" into a draw');
t.eq(Tables.engagementLookup('none', 'C1', false), null, 'No Contact draws nothing');
t.eq(Tables.generalAsw.W2, 1, '[14.2A3] general ASW in War Period 2 is 1 (rulebook example)');

/* TDC pool, resolved from the Vassal buildFile. */
t.eq(Units.tdcPool.total, 24, '24 TDC markers');
t.eq(Units.tdcDrawPool().length, 24, 'draw pool expands to 24 entries');
var mix = {};
Units.tdcDrawPool().forEach(function (v) { mix[v] = (mix[v] || 0) + 1; });
t.eq(mix, { '-3': 2, '-2': 4, '-1': 4, '0': 4, '1': 4, '2': 4, '3': 2 },
  'pool is -3x2, -2x4, -1x4, 0x4, +1x4, +2x4, +3x2');
t.eq(Units.submarines.length, 309, '309 boats with class and entry date');
t.ok(Units.boat('USS Spearfish') !== null, 'the demo tape boat is in the roster');

/* Submarine art paths are BUILT at runtime, so verify_assets.py cannot see them.
 * Check every one here instead. */
var fs = require('fs'), path = require('path');
var gameDir = path.join(__dirname, '..', 'apps', 'game');
var missingArt = [];
Units.submarines.forEach(function (u) {
  [Units.art(u), Units.transitArt(u)].forEach(function (rel) {
    if (!fs.existsSync(path.resolve(gameDir, rel))) missingArt.push(rel);
  });
});
t.eq(Array.from(new Set(missingArt)).sort(), [], 'every submarine patrol/transit art file exists');

/* TDC art, also built at runtime. */
t.eq(Units.tdcArt(-2), '../../Source/images/tdc_-2.gif', 'negative TDC art path');
t.eq(Units.tdcArt(0), '../../Source/images/tdc_+0.gif', 'the printed zero marker is "+0"');
t.eq(Units.tdcArt(3), '../../Source/images/tdc_+3.gif', 'positive TDC art path');
t.eq(Units.tdcArtFiles.concat([Units.tdcBackArt]).filter(function (f) {
  return !fs.existsSync(path.resolve(gameDir, f));
}), [], 'every TDC art file exists');
t.eq(Units.tdcArtFiles.length, 7, 'seven TDC marker faces, -3 through +3');
t.eq(Units.tdcArtFiles.filter(function (f) {
  return Units.tdcArtFiles.indexOf(f) > -1;
}).length, 7, 'TDC art list is complete');
Object.keys(Units.tdcPool.mix).forEach(function (v) {
  t.ok(Units.tdcArtFiles.indexOf(Units.tdcArt(parseInt(v, 10))) > -1,
    'pool value ' + v + ' has art in the enumerated list');
});

/* Sequence of play [4.0]. */
t.eq(Sop.all().length, 13, '13 phases across four segments [4.0]');
t.eq(Sop.patrol().length, 6, 'patrol scenarios run six phases [4.0]');
t.ok(Sop.find('14.2').step.label === 'Counterattack Round', 'a combat step resolves by id');
t.eq(Sop.find('13.0').segmentLabel, 'III. Operations', 'phases know their segment');

/* Glossary covers every rating addition C names. */
['attack', 'defense', 'tactical', 'endurance', 'range', 'speed', 'readiness', 'tonnage',
 'defense_rating', 'asw', 'tdc', 'super_skipper', 'activity_level', 'contact_c1',
 'contact_c2', 'contact_tf', 'cups', 'war_period', 'crash_dive'].forEach(function (id) {
  var g = Glossary.get(id);
  t.ok(g && g.short && g.ruleRef, 'glossary covers "' + id + '" with a rule reference');
});

/* Charts. */
t.eq(Charts.all[0].id, 'combat_tables', 'Combat Tables is the first-priority overlay');
t.ok(Charts.all.every(function (c) { return c.file && c.ruleRef; }), 'every chart has a file and a rule ref');

t.done();
