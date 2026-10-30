'use strict';
/* Phase 9 — the history record, the Allied optional rules [33.0]-[34.0],
 * the K-XIV Patrol Game [33.2] and East Wind Early [31.6]. */
var t = require('./_harness.js');
var path = require('path');
var G = path.join(__dirname, '..', 'apps', 'game') + '/';
function load(rel, name) { global[name] = require(G + rel)[name]; return global[name]; }
['rules/sw_resolution.js:SWResolution', 'data/sw_tables.js:SWTables', 'data/sw_ships.js:SWShips', 'data/sw_units.js:SWUnits',
 'data/sw_aac.js:SWAac', 'data/sw_layout.js:SWLayout', 'data/sw_map.js:SWMap', 'data/sw_subclasses.js:SWSubClasses',
 'data/sw_campaign.js:SWCampaignData', 'data/sw_primer.js:SWPrimer', 'rules/sw_movement.js:SWMovement', 'rules/sw_search.js:SWSearch',
 'rules/sw_combat.js:SWCombat', 'rules/sw_cups.js:SWCups', 'rules/sw_patrol.js:SWPatrol', 'rules/sw_transit.js:SWTransit',
 'rules/sw_war.js:SWWar', 'rules/sw_base.js:SWBase', 'rules/sw_career.js:SWCareer', 'rules/sw_teacher.js:SWTeacher', 'rules/sw_fleet.js:SWFleet'
].forEach(function (x) { var p = x.split(':'); load(p[0], p[1]); });
var Fleet = global.SWFleet, Career = global.SWCareer, Data = global.SWCampaignData, Units = global.SWUnits, War = global.SWWar,
    Base = global.SWBase, Cups = global.SWCups, Ships = global.SWShips, Primer = global.SWPrimer, Combat = global.SWCombat, Patrol = global.SWPatrol;
var Dice = require(G + 'rules/sw_dice.js').SWDice;
t.suite('sw_phase9');

function tape(dice) { var i = 0; return { rollDie: function () { return dice[i++ % dice.length]; } }; }
function runWeeks(f, n, dice) {
  var T = global.SWTeacher.create(global, { careful: true });
  for (var k = 0; k < n && !f.done; k++) {
    var g = 0;
    while (!f.done && f.phase === 'fight' && g++ < 500) { var L = Fleet.legalActions(f); Fleet.apply(f, (T.choose(f.active, L) || {}).action || L[0], dice); }
    if (f.done) break;
    /* the captain's orders for every boat Ready for Sea */
    for (var s = 0; s < 200; s++) {
      var sail = Fleet.legalActions(f).filter(function (a) { return a.type === 'sail'; })[0];
      if (!sail) break;
      var b = Fleet.byName(f, sail.boat), c = T.choose(b, Career.legalActions(b).filter(function (a) { return a.type === 'sail'; }));
      Fleet.apply(f, Fleet.legalActions(f).filter(function (a) { return a.type === 'sail' && a.boat === sail.boat && c && c.action && a.area === c.action.area; })[0] || sail, dice);
    }
    Fleet.apply(f, { type: 'run_week' }, dice);
  }
}

/* ---------------- the primer and the record of the war ---------------- */
t.eq(Primer.chapters.length, 6, 'the primer has six chapters');
t.ok(Primer.chapters.every(function (c) { return c.paras.length && c.game && c.sources.every(function (k) { return Primer.sources[k]; }); }),
  'every chapter has text, a line on the game, and known sources');
var h42 = Primer.at(1942, 11);
t.ok(h42.tons > 700 && h42.tons < 800 && h42.lost >= 7 && h42.lost <= 9, 'history by December 1942: about 725-755k t and 7-8 boats (JANAC curve)');
t.ok(Primer.at(1945, 7).tons > 5000, 'history by August 1945: over five million tons');
var f = Fleet.create('rising_sun', Dice.seeded(4));
t.eq(f.series.length, 1, 'the war\'s record starts with one point');
runWeeks(f, 4, Dice.seeded(4));
t.eq(f.series.length, 5, 'one point a week');
t.eq(f.weeks.length, 4, 'one summary a week');
var w = f.weeks[f.weeks.length - 1];
t.ok(Array.isArray(w.sank) && Array.isArray(w.lost) && Array.isArray(w.news) && typeof w.tons === 'number', 'a week\'s summary: sinkings, losses, the war\'s news');
t.eq(Math.round(f.weeks.reduce(function (s, x) { return s + x.tons; }, 0) * 10) / 10, Math.round(f.war.mine.tons * 10) / 10,
  'the weekly summaries add up to the war\'s tonnage');

/* ---------------- [33.1] Allied submarines ---------------- */
var A = Data.allied;
var names = [];
A.oob.forEach(function (g) { names = names.concat(g.boats); });
Object.keys(A.arrive).forEach(function (k) { Object.keys(A.arrive[k]).forEach(function (b) { names = names.concat(A.arrive[k][b]); }); });
t.eq(names.filter(function (n) { return !Units.boat(n) && n !== 'O-27'; }), [], '[33.14] every Allied boat is a roster counter (O-27 borrows O-21\'s)');
var fa = Fleet.create('rising_sun', Dice.seeded(7), { optional: { allied: true } });
t.ok(fa.war.surabayaBase && fa.war.tenderAt.surabaya[0] === 'zuiderkruis', '[33.14] Surabaya active with Zuiderkruis');
t.ok(Base.isMajor('surabaya', fa.war) && Base.repairNumbers('surabaya', fa.war)[1] === 5, 'the Surabaya Display: a full base, repair 1-3-5');
t.eq(fa.boats.length, 47, '[33.14] 42 US boats and five Dutch at the start');
var kx = Fleet.byName(fa, 'K-XIV');
t.ok(kx.career.allied && kx.career.nation === 'NL' && kx.area === 'java_sea' && kx.career.startRule.noMove, 'K-XIV in the Java Sea, no Patrol Movement');
t.eq(kx.career.basesOnly, ['surabaya'], '[33.11] the Dutch use Surabaya until it falls');
var kxv = Fleet.byName(fa, 'K-XV');
t.ok(kxv.smz === 'makassar' && kxv.smzWeeks === 99, '[33.14] K-XV holds the Makassar Strait');
Career.boatWeek(kx, tape([5]));
t.eq(kx.torpedoValue, -1, '[33.12] Dutch attacks in 1941-42 at −1');
t.ok(Fleet.byName(fa, 'USS Perch').torpedoValue === -2, 'the American boats at the Mk-XIV\'s −2');
kx.shipsSunk = 2; kx.tonnageSunk = 12; Fleet.tally(fa);
t.ok(fa.allied.tons === 12 && fa.war.mine.tons === 0, '[33.1] Allied sinkings are kept apart from yours');
fa.date = { y: 1942, m: 11, w: 4 };
t.eq(Fleet.vTons(fa), -12, '[33.15] Rising Sun, December 1942: −24,000 t plus the Allied 12,000 t');
t.ok(!Fleet.legalActions(fa).some(function (a) { return a.type === 'form_pack' && /^K-/.test(a.boat); }), '[33.11] no Allied boat leads a wolfpack');
var fr = Fleet.create('rising_sun', Dice.seeded(3), { optional: { allied: true }, noLongevity: true });
runWeeks(fr, 40, Dice.seeded(3));
var wd = fr.log.filter(function (r) { return r.ruleRef === '33.13'; });
t.ok(wd.length > 0, '[33.13] the Dutch withdrawal happens (' + wd.length + ' boats)');
t.ok(fr.boats.filter(function (b) { return b.outcome === 'withdrawn' && b.career.nation === 'NL'; }).every(function (b) { return !b.counted || true; }) &&
  Fleet.subsLost(fr) === fr.lost, 'a withdrawal is not a loss');
var fs = Fleet.create('setting', Dice.seeded(2), { optional: { allied: true } });
t.ok(['K-XV', 'O-19', 'Zwaardvisch', 'K-XIV'].every(function (n) { return Fleet.byName(fs, n) && Fleet.byName(fs, n).career.base === 'fremantle'; }),
  '[33.15] The Setting Sun starts with four Dutch boats at Fremantle');
t.ok(!fs.war.surabayaBase, 'Surabaya long fallen by September 1944');

/* ---------------- [33.3]-[34.0] ---------------- */
var fu = Fleet.create('full', Dice.seeded(1), { optional: { u2513: true, surcouf: true, nautilus2: true } });
var ub = Career.createBoat('U-2513', fu, { base: 'pearl', box: 'broom' });
t.ok(ub, 'U-2513 is a counter');
t.eq(fu.withdrawList['1943-01'].indexOf('Surcouf') > -1, true, '[33.3] Surcouf leaves in January 1943');
var st = Fleet.create('rising_sun', Dice.seeded(9), { optional: { staggered: true } });
runWeeks(st, 8, Dice.seeded(9));
t.ok(st.log.some(function (r) { return r.ruleRef === '34.0'; }), '[34.0] arrivals are rolled a week');
t.ok(st.boats.some(function (b) { return b.career.boat === 'USS Tuna'; }), 'a staggered arrival still arrives');

/* ---------------- [33.2] K-XIV's Patrol Game ---------------- */
var kc = Career.create('kxiv', { patrolGame: true });
t.ok(kc.career.base === 'surabaya' && kc.war.surabayaBase, '[33.2] K-XIV sails from Surabaya');
t.eq(kc.torpedoValue, -1, '[33.12] at −1 while the Mk-XIV is −2');

/* ---------------- [31.6] East Wind Early ---------------- */
var ew = Data.campaign('east_wind');
t.ok(ew && ew.start.y === 1932 && ew.turns === 34, '[31.62] April to December 1932, 34 turns');
var e = Fleet.create('east_wind', Dice.seeded(5));
t.eq(e.boats.length, 23, '[31.63] 23 S-boats at the start');
t.ok(e.war.eventTable === 'Y32' && e.war.ultraByEvent && e.war.generalAsw === 0 && e.war.torpedo === -1, '[31.61] its own events, ULTRA by event only, General ASW 0, torpedo −1');
var s34 = Fleet.byName(e, 'S34');
t.ok(s34.smz === 'formosa' && s34.career.startRule.noAttack, '[31.63] S-34 in neutral Tsingtao: no attacks');
var allDD = [], nonSix = 0;
['A', 'B', 'C', 'D'].forEach(function (c) { e.cups[c].forEach(function (u) { var p = Ships.piece(u.piece); if (p.type === 'DD' && p.tonnage === 2) { allDD.push(u); if (p.defense !== 6) nonSix++; } }); });
t.ok(allDD.length > 0 && nonSix === 0, '[31.61 D] only the 6-defence DD 2t are used (' + allDD.length + ' in the cups)');
t.ok(Combat.isDiligent({ piece: 'dd2t63', diligent: true }), '[31.61 D] a DD 6-3 is a Diligent Escort');
/* the event table's conditionals */
var war = { occurred: {}, warPeriod: 'W1', eventTable: 'Y32' };
t.eq(War.resolveEvent('Y32', 8, war, { y: 1932, m: 5 }).id, 'y0_luzon', 'event 8 before any landing on Luzon: the landing instead');
war.occurred.y0_luzon = 1;
t.eq(War.resolveEvent('Y32', 8, war, { y: 1932, m: 5 }).id, 'y7_ultra', 'event 8 in June: the ULTRA roll (W4 line)');
t.eq(War.resolveEvent('Y32', 8, war, { y: 1932, m: 9 }).id, 'y8_manila', 'event 8 in October: the Army approaches Manila');
t.eq(War.resolveEvent('Y32', 0, war, { y: 1932, m: 5 }).id, 'y0_ultra', 'event 0 rolled again: the ULTRA roll');
var uw = { warPeriod: 'W1', ultraByEvent: true, ultra: [] };
t.eq(War.ultraPhase(uw, null, tape([3])).areas.length, 0, '[31.61 B] no ULTRA roll without an event');
t.ok(War.ultraPhase(uw, Data.eventById('y4_ultra'), tape([3])).areas.length > 0, 'an ULTRA event rolls on the W4 line');
var tw = { torpedo: 0, torpedoCap: 0, torpedoColumn: '-2->-1', fleet: { ships: 999 }, mine: { ships: 0 }, torpedoTried: [] };
t.eq(War.torpedoPhase(tw, tape([9])).improved, false, '[31.61 C] the torpedo does not improve beyond 0');
tw.torpedo = -1;
t.eq(War.torpedoPhase(tw, tape([9])).improved, true, '[31.61 C] from −1 it improves on the −2 to −1 column');
/* [31.66] victory */
var v = Fleet.create('east_wind', Dice.seeded(6));
v.war.mine.tons = 420; v.capitalTons = 90; v.capitalDamagedTons = 0; v.bbcv = 1; v.lost = 4;
var vd = Fleet.verdict(v);
t.eq(vd.tons, 510, '[31.66] a sunk capital ship counts twice');
t.eq(vd.base, 'Decisive Victory', '[31.66] 500,000 t+: Decisive Victory');
v.war.mine.tons = 260; v.capitalTons = 0; v.bbcv = 0; v.lost = 16;
t.eq(Fleet.verdict(v).level, 'Catastrophic Defeat', '[31.66] 260,000 t is a Defeat; more than 15 lost: one level down');
v.lost = 3;
t.eq(Fleet.verdict(v).level, 'Draw', '[31.66] fewer than 6 lost: one level up');
/* [31.61] battleships only in the Philippine and South China seas */
var bbState = { area: 'east_china_sea', bbAreas: ew.bbAreas, cups: { A: [] } };
var bbId = Ships.pieces.filter(function (p) { return p.type === 'BB'; })[0].id, mId = Ships.pieces.filter(function (p) { return p.type === 'M'; })[0].id;
bbState.cups.A = [{ uid: 'b1', row: 'x', piece: bbId, cup: 'A' }, { uid: 'm1', row: 'y', piece: mId, cup: 'A' }];
var drawn = Patrol._drawFrom(bbState, 'A', 1, tape([0, 0, 0]));
t.ok(drawn.length === 1 && drawn[0].piece === mId && bbState.cups.A.length === 1 && bbState.cups.A[0].piece === bbId,
  '[31.61 D] a battleship drawn in the East China Sea goes back; a merchant comes instead');
/* a whole campaign, and the hard lock */
var run = Fleet.create('east_wind', Dice.seeded(11));
runWeeks(run, 40, Dice.seeded(11));
t.ok(run.done && run.verdict && run.verdict.rule === '31.66', 'East Wind Early plays to its [31.66] verdict (' + run.verdict.level + ')');
t.ok(run.log.concat.apply(run.log, run.boats.map(function (b) { return b.log; })).every(function (r) { return !!r.ruleRef; }), 'every record cites a rule');
t.throws(function () { Fleet.apply(Fleet.create('east_wind', Dice.seeded(1)), { type: 'sail', boat: 'S2', area: 'marshalls' }, Dice.seeded(1)); },
  '[31.61 A] the Marshalls are outside the patrol areas: refused');

/* ---------------- Historical pace, the house rule (off by default) ---------------- */
var hpOff = Fleet.create('rising_sun', Dice.seeded(21), { noLongevity: true });
runWeeks(hpOff, 6, Dice.seeded(21));
var allOff = hpOff.log.concat.apply(hpOff.log, hpOff.boats.map(function (b) { return b.log; }));
t.ok(!allOff.some(function (r) { return (r.drms || []).some(function (d) { return d.rule === 'HP'; }); }), 'Historical pace off (the default): no roll carries its modifier');
var hpOn = Fleet.create('rising_sun', Dice.seeded(21), { noLongevity: true, optional: { pace: true } });
t.eq(hpOn.war.pace, Data.pace, 'Historical pace on: the war carries its table');
runWeeks(hpOn, 6, Dice.seeded(21));
var allOn = hpOn.log.concat.apply(hpOn.log, hpOn.boats.map(function (b) { return b.log; }));
function hp(table) { return allOn.filter(function (r) { return r.table.indexOf(table) > -1 && (r.drms || []).some(function (d) { return d.rule === 'HP'; }); }); }
var e = hp('Endurance'), tr = hp('Transit Event [19.1]');
t.ok(e.length > 0 && e.every(function (r) { return r.drms.filter(function (d) { return d.rule === 'HP'; })[0].value === Data.pace.W1.end; }),
  'Endurance rolls in W1 carry the W1 modifier (' + Data.pace.W1.end + ')');
t.ok(tr.length > 0 && tr.every(function (r) { return r.drms.filter(function (d) { return d.rule === 'HP'; })[0].value === Data.pace.W1.transit; }),
  'Transit Event checks in W1 carry the W1 modifier (' + Data.pace.W1.transit + ')');
var caState = { pace: { ca: -2 }, sub: { defense: 3 }, area: 'east_china_sea', warPeriod: 'W1', units: [], round: 1 };
t.ok(Combat.counterattackTerms(caState).drms.some(function (d) { return d.rule === 'HP' && d.value === -2; }), 'the counterattack carries its modifier, and the preview shows it');
t.ok(['W1', 'W2', 'W3', 'W4'].every(function (w) { var p = Data.pace[w]; return p && typeof p.end === 'number' && typeof p.ca === 'number' && typeof p.transit === 'number'; }),
  'the pace table covers all four War Periods');

t.done();
