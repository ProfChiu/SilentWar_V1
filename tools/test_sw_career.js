'use strict';
/* Phase 6 — the campaign layer: data, Transit Events, bases, the war, and
 * the career engine. Worked examples from the rulebook where it gives them. */
var t = require('./_harness.js');
var path = require('path');
var G = path.join(__dirname, '..', 'apps', 'game') + '/';
function load(rel, name) { global[name] = require(G + rel)[name]; return global[name]; }
load('rules/sw_resolution.js', 'SWResolution');
var Tables = load('data/sw_tables.js', 'SWTables');
load('data/sw_ships.js', 'SWShips');
var Units = load('data/sw_units.js', 'SWUnits');
var Aac = load('data/sw_aac.js', 'SWAac');
load('data/sw_layout.js', 'SWLayout');
var Map_ = load('data/sw_map.js', 'SWMap');
var SubCls = load('data/sw_subclasses.js', 'SWSubClasses');
var Data = load('data/sw_campaign.js', 'SWCampaignData');
load('rules/sw_movement.js', 'SWMovement');
load('rules/sw_search.js', 'SWSearch');
var Combat = load('rules/sw_combat.js', 'SWCombat');
load('rules/sw_cups.js', 'SWCups');
load('rules/sw_patrol.js', 'SWPatrol');
var Transit = load('rules/sw_transit.js', 'SWTransit');
var War = load('rules/sw_war.js', 'SWWar');
var Base = load('rules/sw_base.js', 'SWBase');
var Career = load('rules/sw_career.js', 'SWCareer');
var Goal = load('rules/sw_goal.js', 'SWGoal');
load('rules/sw_teacher.js', 'SWTeacher');
var Dice = require(G + 'rules/sw_dice.js').SWDice;
t.suite('sw_career');

function tape(list) {
  var q = list.slice();
  return { rollDie: function () { if (!q.length) throw new Error('tape ran out'); return q.shift(); }, left: function () { return q.length; } };
}
var OPAREAS = Map_.opAreas.map(function (a) { return a.id; });

/* ---------------- data ---------------- */
Object.keys(Data.bases).forEach(function (b) {
  Data.bases[b].links.forEach(function (a) { t.ok(OPAREAS.indexOf(a) > -1, 'base ' + b + ' links to a real OpArea: ' + a); });
  var r = Data.bases[b].repair;
  t.ok(r[3] < r[2] && r[2] < r[1], 'base ' + b + ': repair gets easier toward Box 1 (' + r[3] + '/' + r[2] + '/' + r[1] + ')');
});
t.eq([Data.bases.pearl.repair[3], Data.bases.pearl.repair[2], Data.bases.pearl.repair[1]], [4, 6, 8], 'Pearl Harbor repair numbers read off the map');
t.eq(Data.bases.manila.subic.repair, { 3: 2, 2: 4, 1: 6 }, 'Subic Bay prints its own repair numbers');
Object.keys(Data.smzLinks).forEach(function (z) {
  Data.smzLinks[z].forEach(function (a) { t.ok(OPAREAS.indexOf(a) > -1, 'SMZ ' + z + ' is entered from a real OpArea: ' + a); });
});
var ids = {};
['W1', 'W2', 'W3', 'W4'].forEach(function (wp) {
  t.eq(Data.events[wp].length, 10, wp + ' War Events Table has ten lines (d10)');
  Data.events[wp].forEach(function (e) {
    [e].concat(e.again ? [e.again] : []).forEach(function (x) {
      if (x.id !== 'none' && !/_(u|n)\d$/.test(x.id)) { t.ok(!ids[x.id], 'event id is unique: ' + x.id); ids[x.id] = true; }
      (x.smz || []).forEach(function (z) { t.ok(!!Data.smzLinks[z], x.id + ': SMZ ' + z + ' has a link'); });
      (x.areas || []).forEach(function (a) { t.ok(OPAREAS.indexOf(a) > -1, x.id + ': ' + a + ' is an OpArea'); });
      ['insteadUnless', 'beforeUse', 'after'].forEach(function (k) {
        if (x[k]) t.ok(!!Data.eventById(x[k]), x.id + ': ' + k + ' names a real event (' + x[k] + ')');
      });
      if (x.type === 'mission') t.ok(typeof x.text === 'string' && x.count > 0, x.id + ': a mission says how many boats and why');
    });
  });
});
Data.careers.forEach(function (c) {
  var u = Units.boat(c.boat), cls = u && SubCls.forBoat(u);
  t.ok(!!u && !!cls, 'career ' + c.id + ': the boat is in the roster with ratings');
  t.ok(!!Data.bases[c.base] || !!Data.forwardBases[c.base], 'career ' + c.id + ': starts at a base');
  t.ok(OPAREAS.indexOf(c.destination) > -1 || !!Data.bases[c.destination], 'career ' + c.id + ': the book destination is on the map');
  t.ok(c.record.ships > 0 && c.record.tons > 0 && c.record.weeks > 0, 'career ' + c.id + ': the record to beat [32.1]');
  t.ok(War.allBases(War.create(c)).indexOf(c.base) > -1, 'career ' + c.id + ': its base is open in ' + c.warPeriod);
});
t.eq(Data.returnAfter('Wahoo', '1943-06'), '1943-08', 'Wahoo: withdrawn June 1943, back August 1943 [31.01]');
t.eq(Data.returnAfter('Rasher', '1944-09'), '1945-01', 'Rasher: withdrawn September 1944, back January 1945');
t.eq(Data.returnAfter('Tang', '1944-01'), null, 'Tang is never withdrawn');

/* ---------------- Transit Events [19.1] ---------------- */
var ecsW2 = Aac.charts.east_china_sea.grid[1].indexOf('high');
t.eq(Transit.threshold('east_china_sea', 'W2'), ecsW2, '[19.1] red results start at the first red box on the line');
t.eq(Transit.threshold('aleutians', 'W4'), null, 'no red box on the line: no threshold');
var gov = Transit.governing(['aleutians', 'east_china_sea', 'hawaiian'], 'W2');
t.ok(gov && gov.threshold === Math.min.apply(null, ['aleutians', 'east_china_sea', 'hawaiian']
  .map(function (a) { return Transit.threshold(a, 'W2'); }).filter(function (x) { return x !== null; })),
  '[19.1] the governing OpArea is the one with the lowest number');
t.eq(Transit.governing(['aleutians'], 'W4'), null, 'nothing red: nothing governs');
/* Roll one under the threshold: no event. */
var th = Transit.threshold('east_china_sea', 'W3');
var r0 = Transit.check({ areas: ['east_china_sea'], warPeriod: 'W3', transitSide: true, why: 't' }, tape([th]));
t.eq(r0.event, null, 'Transit side up is -1: a roll equal to the threshold is not enough');
var r1 = Transit.check({ areas: ['east_china_sea'], warPeriod: 'W3', transitSide: false, why: 't' }, tape([th, 9, 9]));
t.ok(r1.event !== null, 'Patrol Movement at the threshold: an event, two more dice on the table');
t.eq(r1.event, Tables.transitLookup('W3', 9, 9), 'the table result is the printed cell');
var r2 = Transit.check({ areas: ['east_china_sea'], warPeriod: 'W2', transitSide: true, spotted: true, smz: true, why: 't' }, tape([th - 2, 0, 0]));
t.ok(r2.records[0].drms.length === 3 && r2.records[0].modifiedDie === th - 2 - 1 + 1 + 2, 'drms: transit -1, spotted in W2 +1, SMZ +2, cumulative');
var r3 = Transit.check({ areas: ['kurile'], warPeriod: 'W1', seaOfJapan: true, ultraSeaOfJapan: true, why: 't' }, tape([0]));
t.eq(r3.records[0].drms[0].value, 1, '[7.1] ULTRA in the Sea of Japan: +1 instead of +2');
/* Routes */
var bases = ['pearl', 'fremantle', 'brisbane'];
t.eq(Transit.distance('pearl', 'hawaiian', bases), 1, 'leaving a base counts one step [15.1 note]');
t.eq(Transit.distance('hawaiian', 'pearl', bases), 1, 'entering a base counts one step');
var lg = Transit.leg('pearl', 'east_china_sea', 2, 8, bases, 'W2');
t.eq(lg.path[0], 'pearl', 'a leg starts where the boat is');
t.eq(lg.path.length - 1, 2, 'a leg uses the whole Speed when the goal is further');
t.ok(lg.path.every(function (a, i) { return i === 0 || !Transit.isBase(a); }), 'a leg never passes through a base');
var lg2 = Transit.leg('marianas', 'pearl', 3, 8, bases, 'W2');
t.eq(lg2.path[lg2.path.length - 1], 'pearl', 'Marianas to Pearl Harbor in three steps at Speed 3');

/* ---------------- Bases [9.0] [10.0] [18.3] ---------------- */
var b1 = Base.tripleR('broom', 'pearl', 5, {}, tape([5]));
t.eq(b1.box, 'ready', '[9.0] Broom Box: roll = or < Readiness -> Ready for Sea');
t.eq(Base.tripleR('broom', 'pearl', 5, {}, tape([6])).box, 'pierside', '[9.0] roll > Readiness -> Pier Side');
t.eq(Base.tripleR('pierside', 'pearl', 5, {}, tape([])).box, 'ready', '[9.0] Pier Side -> Ready for Sea, no roll');
t.eq(Base.tripleR('repair3', 'pearl', 5, {}, tape([4])).box, 'repair2', '[10.0] Pearl Box 3: roll = or < 4 advances');
t.eq(Base.tripleR('repair3', 'pearl', 5, {}, tape([5])).box, 'repair3', '[10.0] roll > 4 stays');
t.eq(Base.tripleR('repair1', 'pearl', 5, {}, tape([8])).box, 'broom', '[10.0] Box 1 advances into the Broom Box');
t.eq(Base.tripleR('repair2', 'manila', 5, { subic: true }, tape([4])).box, 'repair1', 'Subic Bay uses its own numbers (Box 2 = 4)');
t.eq(Base.tripleR('repair2', 'manila', 5, { subic: false }, tape([4])).box, 'repair2', 'Manila Box 2 = 3');
var a0 = Base.arrive({ damaged: false }, 'pearl', {}, tape([]));
t.eq(a0.box, 'broom', 'an undamaged boat arrives in the Broom Box, no roll');
t.eq(Base.arrive({ damaged: true, damageMarkers: 1 }, 'pearl', {}, tape([7])).box, 'repair2', '[18.3] Damage Table 6-7: Moderate, Repair Box 2');
t.eq(Base.arrive({ damaged: true, damageMarkers: 1 }, 'pearl', {}, tape([1])).box, 'broom', '[18.3] 0-2 Superficial: Broom Box');
t.eq(Base.arrive({ damaged: true, damageMarkers: 2 }, 'pearl', {}, tape([3, 6])).box, 'repair3', '[18.1] two markers: Light (1) + Moderate (2) = Box 3');
t.ok(Base.arrive({ damaged: true, damageMarkers: 2 }, 'pearl', {}, tape([8, 3])).ctl, '[18.1] Heavy (3) + Light (1) = beyond Box 3: constructive total loss');
t.eq(Base.arrive({ damaged: false }, 'dutch_harbor', {}, tape([9])).box, 'repair1', '[15.23] Dutch Harbor: undamaged boats roll; Heavy becomes Repair 1');

/* ---------------- [18.1] [18.2] Damage markers ---------------- */
var ds = { sub: { damaged: false, defense: 4 } };
Combat.damage(ds);
t.ok(ds.sub.damaged && !ds.sub.damagePending, 'first Damage marker: no roll');
Combat.damage(ds);
t.ok(ds.sub.damagePending, 'second Damage marker: the [18.1] roll is due');
Combat.resolveDamage(ds, tape([4]));
t.ok(!ds.sub.sunk, '[18.1] roll = or < Defense 4: survives');
Combat.damage(ds);
Combat.resolveDamage(ds, tape([]));
t.ok(ds.sub.sunk, '[18.2] a third Damage marker sinks the boat, no roll');
var ds2 = { sub: { damaged: true, defense: 4 } };
Combat.damage(ds2);
Combat.resolveDamage(ds2, tape([5]));
t.ok(ds2.sub.sunk, '[18.1] roll > Defense: sunk');

/* ---------------- the war ---------------- */
function war0(wp) { return { warPeriod: wp, occurred: {}, torpedo: -2, fleet: { ships: 0, tons: 0, lost: 0 }, mine: { ships: 0, tons: 0 }, torpedoTried: [], ultra: [] }; }
var w = war0('W1'), d42 = { y: 1942, m: 1, w: 1 };
t.eq(War.resolveEvent('W1', 1, w, d42).id, 'w1_luzon', '[5.0] W1-1: Fall of Luzon first if it has not occurred');
w.occurred.w1_luzon = 1;
t.eq(War.resolveEvent('W1', 1, w, d42).id, 'w1_dei', 'W1-1 once Luzon has fallen: Fall of the Dutch East Indies');
t.eq(War.resolveEvent('W1', 0, w, d42).id, 'w1_corregidor', 'W1-0 rolled a second time: Run to Corregidor');
w.occurred.w1_dei = 1;
t.eq(War.resolveEvent('W1', 1, w, d42).id, 'w1_barrier', 'W1-1 again: the Barrier mission');
t.eq(War.resolveEvent('W1', 9, w, d42).id, 'w1_bear', 'W1-9: the Hunt for Wounded Bear comes before Midway');
w.occurred.w1_bear = 1;
t.eq(War.resolveEvent('W1', 9, w, d42).id, 'w1_midway', 'then the Battle of Midway');
w.occurred.w1_midway = 1;
t.eq(War.resolveEvent('W1', 9, w, d42).id, 'none', 'one time only: then No Event');
var w3 = war0('W3');
t.eq(War.resolveEvent('W3', 0, w3, { y: 1943, m: 8 }).id, 'w3_relegate', 'W3-0 before October 1943: Relegation instead');
t.eq(War.resolveEvent('W3', 0, w3, { y: 1943, m: 9 }).id, 'w3_aleutians_end', 'W3-0 from October 1943: End of the Aleutians Campaign');
t.eq(War.resolveEvent('W3', 9, w3, { y: 1944, m: 2 }).type, 'ultra2', 'W3-9 before April 1944: roll twice on ULTRA');
t.eq(War.resolveEvent('W3', 9, w3, { y: 1944, m: 3 }).id, 'w3_saipan', 'W3-9 from April 1944: Invasion of Saipan');
w3.occurred.w3_saipan = 1;
t.eq(War.resolveEvent('W3', 9, w3, { y: 1944, m: 5 }).id, 'w3_guam', 'rolled again: Invasion of Guam');
w3.occurred.w3_guam = 1;
t.eq(War.resolveEvent('W3', 9, w3, { y: 1944, m: 6 }).id, 'none', 'and after that, No Event');
var w4 = war0('W4');
t.eq(War.resolveEvent('W4', 0, w4, { y: 1944, m: 10 }).id, 'w4_ryukyus', 'W4-0 in 1944: Airstrike on Ryukyus');
t.eq(War.resolveEvent('W4', 0, w4, { y: 1945, m: 2 }).id, 'w4_okinawa', 'W4-0 in 1945: Okinawa and the Hunt for Iron Maiden');
w4.occurred.w4_okinawa = 1;
t.eq(War.resolveEvent('W4', 0, w4, { y: 1945, m: 3 }).id, 'w4_relegate', 'after Okinawa: relegation');
w4.occurred.w4_ise = 1;
t.eq(War.resolveEvent('W4', 8, w4, { y: 1945, m: 0 }).id, 'w4_b29', 'after Ise & Hyuga: Support B-29 raids');
w4.occurred.w4_iwo = 1;
t.eq(War.resolveEvent('W4', 9, w4, { y: 1945, m: 0 }).id, 'w4_guam2', 'Iwo Jima again: a second tender at Guam');
w4.occurred.w4_guam2 = 1;
t.eq(War.resolveEvent('W4', 9, w4, { y: 1945, m: 1 }).id, 'none', 'and yet again: No Event');
var we = War.warEventPhase(war0('W2'), { y: 1943, m: 0, w: 1 }, tape([4]));
t.eq(we.event, null, '[5.0] a check of 4-9: no War Event');
we = War.warEventPhase(war0('W2'), { y: 1943, m: 0, w: 1 }, tape([3, 5]));
t.eq(we.event.id, 'w2_truk', '[5.0] a check of 0-3, then the table: 5 = Blockade of Truk');

/* [6.0] the rulebook's example: 70 ships, a 6 (needed 9): no change; no
 * further roll until 75, where an 8 or 9 improves the torpedo to -1. */
var wt = war0('W2'); wt.fleet.ships = 70;
var tp1 = War.torpedoPhase(wt, tape([6]));
t.ok(!tp1.improved && wt.torpedo === -2, '[6.0] example: 70 ships, rolled 6 against 9: no improvement');
t.eq(War.torpedoPhase(wt, tape([])).records.length, 0, '[6.0] example: no further roll at 70-74 ships');
wt.fleet.ships = 75;
var tp2 = War.torpedoPhase(wt, tape([8]));
t.ok(tp2.improved && wt.torpedo === -1, '[6.0] example: at 75 ships an 8 improves the torpedo to -1');

/* [7.3] the rulebook's example: W3, rolls 2 then 4 -> Empire Pacific, Bismarck
 * Sea and the Kuriles; no marker in the Carolines. */
var wu = war0('W3');
var up = War.ultraPhase(wu, { type: 'ultra2' }, tape([2, 4]));
t.eq(up.areas, ['empire_pacific', 'bismarck_sea', 'kurile'], '[7.3] example: three ULTRA Areas at most, in the order received');
t.eq(War.ultraPhase(war0('W3'), { type: 'noultra' }, tape([])).areas, [], 'No roll on the ULTRA table this turn');

/* [17.0] War Progress */
var wp = war0('W2'); wp.fleet = { ships: 0, tons: 0, lost: 0 };
t.eq(War.warProgress(wp, { y: 1943, m: 7, w: 1 }, tape([])).advanced, true, '[17.2] August 1943: every W3 number tried, automatic advance');
t.eq(wp.warPeriod, 'W3', 'the war is in Period 3');
var wq = war0('W2'); wq.fleet = { ships: 300, tons: 1150, lost: 0 };
var need = Tables.transitionTarget(1943, 2), mod = Tables.warPeriodModifier('W3', 1150, 300);
var wr = War.warProgress(wq, { y: 1943, m: 2, w: 1 }, tape([Math.max(0, need - mod)]));
t.ok(wr.advanced, '[17.1] March 1943: roll + modifier (' + mod + ') = or > ' + need + ' advances');
t.eq(War.warProgress(war0('W2'), { y: 1943, m: 2, w: 2 }, tape([])).records.length, 0, 'War Progress is tried at the start of the month only');
var fa = War.fleetAt({ y: 1943, m: 0 });
t.ok(fa.ships > 150 && fa.ships < 220, 'the fleet has sunk about 190 ships by January 1943 (' + fa.ships + ')');

/* ---------------- the career ---------------- */
var s = Career.create('wahoo');
t.eq(s.phase, 'base', 'a career starts in port');
t.eq(s.career.box, 'ready', 'Ready for Sea, as the Patrol Games begin [32.0]');
t.eq(s.warPeriod, 'W2', 'Wahoo, February 1943: War Period 2 [32.13]');
t.eq(s.torpedoValue, -1, 'Mk-XIV -1 [32.13]');
t.ok(s.radar, 'radar from January 1943');
var L = Career.legalActions(s);
t.ok(L.some(function (a) { return a.type === 'sail' && a.area === 'east_china_sea'; }), 'Wahoo may sail for the East China Sea');
t.ok(L.some(function (a) { return a.type === 'wait'; }), 'or stay in port');
t.ok(L.every(function (a) { return !!a.rule; }), 'every career action cites its rule');
t.ok(L.filter(function (a) { return a.type === 'sail'; }).every(function (a) { return Transit.distToBase(a.area, s.war.bases) <= 8; }),
  'every destination offered is within Range 8 of an open base [2.3A]');
var sS = Career.create('s38');
t.ok(!Career.legalActions(sS).some(function (a) { return a.area === 'yellow_sea'; }), 'an S-boat (Range 3) is not offered the Yellow Sea, 4 from the nearest base');
t.throws(function () { Career.apply(s, { type: 'move', area: 'hawaiian' }, tape([])); }, 'hard lock: a patrol move from port is refused');
t.throws(function () { Career.apply(s, { type: 'sail', area: 'nowhere' }, tape([])); }, 'hard lock: an area not offered is refused');

/* Sail: one Transit Event check for the route, then the week ends. */
var s2 = Career.create('wahoo');
Career.apply(s2, { type: 'sail', area: 'east_china_sea' }, tape([0]));
t.ok(s2.career.atSea && s2.career.current && s2.career.current.n === 1, 'sailing opens patrol 1');
t.eq(s2.phase, '16.0', 'deployment is the Transit phase: then the week ends');
t.eq(s2.sub.side, 'transit', 'still on the Transit side short of the goal [15.1]');
t.eq(Transit.distance('pearl', s2.area, s2.war.bases), 2, 'Speed 2: two steps out of Pearl Harbor');

/* A week ends: Strategic Segment of the next one rolls on. */
var seed = Dice.seeded(4242);
Career.apply(s2, { type: 'end_turn' }, seed);
t.eq(s2.career.date.w, 2, 'the calendar moves on a week [16.5]');
t.ok(s2.log.some(function (r) { return r.table === 'War Event Phase [5.0]'; }), 'the next week starts with the War Event check [5.0]');
t.ok(s2.log.some(function (r) { return r.table === 'ULTRA Table [7.0]'; }) ||
     s2.log.some(function (r) { return /no ULTRA roll/.test(r.result); }), 'and the ULTRA Phase [7.0]');
t.eq(s2.phase, '15.0', 'a Transit-side boat transits again [15.11]');
var T = Career.legalActions(s2);
t.ok(T.some(function (a) { return a.type === 'transit_on' && !a.cautious; }) && T.some(function (a) { return a.cautious; }),
  'continue at Speed, or Cautious Transit [15.24]');

/* Orders: a mission the boat can reach binds its Patrol Movement. */
var sm = Career.create('harder');
sm.career.atSea = true; sm.career.box = null; sm.area = 'carolines'; sm.sub.side = 'patrol';
sm.war.event = Data.eventById('w3_truk');
sm.career.current = { n: 1, depart: sm.career.date, from: 'pearl', ships0: 0, tons0: 0 };
sm.career.orders = null;
sm.phase = '12.0';
(function () {
  var ordersFn = Career.legalActions;
  sm.career.orders = { id: 'w3_truk', name: 'Airstrike on Truk', text: '', areas: [], smz: ['truk'], contacts: 'C2TF', tasked: true };
  var acts = ordersFn(sm);
  t.ok(acts.length && acts.every(function (a) { return a.type === 'enter_smz'; }), 'tasked: only the mission zone is offered [5.0]');
  t.ok(Career.refusals(sm).some(function (r) { return r.type === 'move' && r.cite === '5.0'; }), 'and the refusal says why');
  Career.apply(sm, acts[0], tape([0]));
  t.eq(sm.smz, 'truk', 'the boat is in the Truk SMZ');
  t.eq(sm.phase, '13.1', 'then Search and Contact');
  t.eq(sm.contactsOnly, ['C2', 'TF'], 'only C2 and TF contacts are used [5.0]');
})();
var smLog = sm.log.filter(function (r) { return r.table === 'Transit Event [19.1]'; }).pop();
t.ok(Transit.threshold('carolines', 'W3') === null ? /no check/.test(smLog.result) : smLog.drms.some(function (d) { return d.value === 2; }),
  '[20.3] entering an SMZ is checked on the Carolines line (+2 when it has a red box)');

/* No-attack missions: Search is refused. */
var sn = Career.create('tang');
sn.career.atSea = true; sn.career.box = null; sn.area = 'empire_pacific'; sn.sub.side = 'patrol';
sn.career.current = { n: 1, depart: sn.career.date, from: 'pearl', ships0: 0, tons0: 0 };
sn.career.orders = { id: 'w4_b29', name: 'Support B-29 raids on Japan', text: '', areas: [], smz: ['inland_sea'], contacts: 'none', tasked: true };
sn.phase = '12.0';
Career.apply(sn, { type: 'enter_smz', smz: 'inland_sea', via: 'empire_pacific' }, tape([0]));
t.ok(sn.noAttack && !Career.legalActions(sn).some(function (a) { return a.type === 'search'; }), 'no attacks may be made: Search is not offered');
t.ok(Career.refusals(sn).some(function (r) { return r.type === 'search'; }), 'and the refusal cites the War Event');

/* [20.5] after an SMZ week: no Endurance roll, marked RTB. */
var sz = Dice.seeded(99);
Career.apply(sn, { type: 'bypass' }, sz);
t.ok(sn.sub.rtb, '[20.5] after the mission the boat is marked RTB');
t.ok(!sn.log.some(function (r) { return r.table === 'Endurance Table [14.7]'; }), '[20.5] and makes no Endurance roll');

/* Overhaul [8.0C-D]: Wahoo is withdrawn in June 1943 and back in August. */
var so = Career.create('wahoo');
so.career.date = { y: 1943, m: 4, w: 4 };
so.career.box = 'ready';
var sd = Dice.seeded(7);
Career.apply(so, { type: 'wait' }, sd);
t.eq(so.career.box, 'overhaul', '[8.0C] June 1943: Wahoo goes to the West Coast');
var ow = Career.legalActions(so);
t.ok(ow.length === 1 && /fast-forward/.test(ow[0].label), 'in overhaul the only action fast-forwards to the return');
Career.apply(so, ow[0], sd);
t.ok(so.career.box !== 'overhaul' && so.career.base === 'pearl', '[8.0D] back at Pearl Harbor');
t.eq(War.monthKey(so.career.date), '1943-08', 'in August 1943');

/* Relegation: S-38 goes when the S-boats are retired. */
var sr = Career.create('s38');
(function () {
  var ev = Data.eventById('w3_aleutians_end');
  sr.war.warPeriod = 'W3';
  // apply through a week start with the event forced: the effects list
  var f = ev.effects.filter(function (e) { return e.relegateSBoats; });
  t.ok(f.length === 1, 'the End of the Aleutians retires the S-boats');
})();

/* Hard lock over a whole career, both players: never an action the engine did not offer. */
['s38', 'tang', 'flasher'].forEach(function (id) {
  var st = Career.create(id), dd = Dice.seeded(11), pk = Dice.seeded(12), n = 0, ok = true;
  while (!st.done && n < 50000) {
    var acts = Career.legalActions(st);
    if (!acts.length) { ok = false; break; }
    Career.apply(st, acts[pk.rollDie(acts.length)], dd); n++;
  }
  t.ok(ok && st.done, 'career ' + id + ' runs to an end with a random legal player (' + st.outcome + ')');
});

/* ---------------- Phase 7: tenders and forward bases [21.1-21.2] ---------------- */
var wT = War.create(Data.career('tirante'));
t.ok(wT.tenders.indexOf('saipan') > -1 && wT.tenderAt.saipan.length === 1, 'Tirante, March 1945: Saipan has a tender, as the book sails from it [32.18]');
t.eq(Transit.distance('saipan', 'marianas', War.allBases(wT)), 0, '[15.1 note] leaving a forward base costs no Speed');
t.eq(Transit.distance('bonins', 'saipan', War.allBases(wT)), 1, 'reaching one from an OpArea next to its link costs only that step');
t.ok(Transit.distToBase('marianas', War.allBases(wT)) === 0, 'a forward base extends Range: its OpArea is 0 from a friendly base');
var wP = War.create(Data.career('harder'));
var pl = War.placeTender(wP, 'majuro', { y: 1944, m: 0 }, tape([0]));
t.ok(pl.tender && wP.tenderAt.majuro[0] === pl.tender.id, '[21.21] a tender is drawn for the new forward base');
t.ok(War.tendersAvailable(wP, { y: 1943, m: 0 }).every(function (x) { return !x.from || x.from.y < 1943 || (x.from.y === 1943 && x.from.m <= 0); }),
  '[21.21] only tenders past their deployment date can be drawn');
t.ok(War.tenderCapacity(wP, 'majuro') >= 4, '[21.22] the base\'s support capacity is its tender\'s');
var wI = War.create(Data.career('tirante')), before = War.tenderCapacity(wI, 'guam');
War.placeTender(wI, 'guam', { y: 1945, m: 2 }, tape([0]));
t.ok(War.tenderCapacity(wI, 'guam') > before, 'Iwo Jima again: a second tender at Guam adds its capacity');
t.eq(Base.arriveTender({ damaged: false }, 'saipan', wT, tape([])).box, 'broom', 'an undamaged boat goes to the tender\'s Broom Box');
t.eq(Base.arriveTender({ damaged: true, damageMarkers: 1 }, 'saipan', wT, tape([2])).box, 'broom', '[21.23] Superficial damage is fixed at the tender');
var on = Base.arriveTender({ damaged: true, damageMarkers: 1 }, 'saipan', wT, tape([5]));
t.ok(on.onward && on.box === null, '[21.23] anything worse must go on to a major base');
t.eq(Base.tripleR('broom', 'saipan', 5, wT, tape([7])).box, 'shipside', '[9.0] at a tender the waiting box is Ship Side');
var st = Career.create('tirante');
t.eq(st.career.base, 'saipan', 'Tirante starts at Saipan');
t.ok(Career.legalActions(st).some(function (a) { return a.type === 'sail' && a.area === 'east_china_sea'; }), 'and may sail for the East China Sea');
/* Docking at a tender with heavy damage sends the boat on. */
var sd2 = Career.create('tirante');
Career.apply(sd2, { type: 'sail', area: 'marianas' }, tape([0]));
sd2.sub.damaged = true; sd2.sub.damageMarkers = 1; sd2.sub.rtb = true; sd2.phase = '15.0'; sd2.career.heading = null;
t.ok(Career.legalActions(sd2).some(function (a) { return a.type === 'rtb_to' && a.base === 'saipan'; }), 'a damaged boat may try a tender');
Career.apply(sd2, { type: 'rtb_to', base: 'saipan' }, tape([8]));
t.ok(sd2.career.atSea && sd2.career.majorOnly, '[21.23] Heavy damage at the tender: still at sea, major base only');
sd2.phase = '15.0';
t.ok(Career.legalActions(sd2).every(function (a) { return a.type !== 'rtb_to' || !!Data.bases[a.base]; }), '...and only major bases are offered');

/* ---------------- [22.0] Congregating Risk ---------------- */
var sc2 = Career.create('harder');
sc2.war.warPeriod = 'W3';
sc2.war.event = Data.eventById('w3_aleutians_end');           // twelve boats to the Aleutians and Kuriles
var redOrBlue = function (a) { var l = Aac.charts[a].grid[2]; return l.indexOf('high') > -1 || l.indexOf('moderate') > -1; };
t.eq(Career.congregation(sc2, 'kurile'), redOrBlue('kurile') ? 1 : 0, '[22.1] six mission boats plus yours in the Kuriles: 7, one multiple beyond four');
t.eq(Career.congregation(sc2, 'east_china_sea'), 0, 'an area without a mission quota: no penalty');
t.eq(Career.congregation(sc2, 'truk'), 0, '[20.2] SMZs are exempt');
var cs = { area: 'kurile', warPeriod: 'W3', congregating: 1 };
t.ok(global.SWSearch.activityDrms(cs).some(function (d) { return d.value === -1 && d.rule === '22.1B'; }), '[22.1B] −1 on the search');
var ck2 = Transit.check({ areas: ['east_china_sea'], warPeriod: 'W3', congregating: 2, why: 't' }, tape([0]));
t.ok(ck2.records[0].drms.some(function (d) { return d.value === 2 && d.rule === '22.1A'; }), '[22.1A] +1 per multiple on the Transit Event check');

/* ---------------- [27.0] Quick Resolution ---------------- */
t.eq(Tables.quickLookup(7, 3), 3, '[27.0] table: attack 7, three non-white boxes = 3');
t.eq(Tables.quickLookup(9, 12), 5, 'attack above 7 reads the 7 line; more than 10 boxes the 10 column');
t.eq(Tables.quickLookup(-1, 4), 2, 'attack below 0 reads the 0 line');
function quickState(area) {
  var q = Career.create('wahoo');
  q.career.atSea = true; q.career.box = null; q.area = area; q.sub.side = 'patrol';
  q.career.current = { n: 1, depart: q.career.date, from: 'pearl', ships0: 0, tons0: 0 };
  q.phase = '13.1';
  return q;
}
var q1 = quickState('east_china_sea');
t.ok(Career.legalActions(q1).some(function (a) { return a.type === 'quick' && a.rule === '27.0'; }), 'a career offers Quick Resolution at [13.1]');
t.ok(!global.SWPatrol.legalActions(global.SWPatrol.create({ warPeriod: 'W2', torpedoValue: -1, area: 'east_china_sea',
  activeBaseAreas: ['scs1'], sub: { name: 'x', attack: 6, defense: 3, tactical: 4, endurance: 'B', range: 6, speed: 2 } }))
  .concat([]).some(function (a) { return a.type === 'quick'; }), 'a single patrol does not (it stays as the core rules)');
/* The book's example: table value 3, die 2 -> one ship. Wahoo 7 attack, Mk-XIV -1 = 6;
 * find the die that gives table 3 - 2 = 1 ship on this line. */
var line = Aac.charts.east_china_sea.grid[1], boxes = line.filter(function (c) { return c !== 'none'; }).length;
var tv = Tables.quickLookup(6, boxes);
var dieFor1 = tv - 1 + 1;          // radar (1943): -1 on the die
var qa = quickState('east_china_sea');
var ctr = 0;
var qd = { rollDie: function (n) { ctr++; if (ctr <= 2) return 5; if (ctr === 3) return Math.min(9, dieFor1); return 0; } };
Career.apply(qa, { type: 'quick' }, qd);
var qrec = qa.log.filter(function (r) { return r.table === 'Quick Resolution [27.0]'; }).pop();
t.ok(qrec && qrec.inputs.some(function (x) { return x.value === 6 && /Attack value/.test(x.label); }), '[27.0] attack value: 7 + Mk-XIV −1 = 6');
t.ok(/1 ship drawn/.test(qrec.result) || dieFor1 > 9, '[27.0] table ' + tv + ', die ' + dieFor1 + ' − 1 radar: one ship drawn');
t.ok(qa.log.some(function (r) { return r.table === 'Quick Resolution Counter Attack [27.1]'; }) || qa.sub.sunk || qa.phase === '16.0',
  '[27.1] then the quick counterattack');
var qz = quickState('east_china_sea'); qz.smz = 'formosa';
t.ok(!Career.legalActions(qz).some(function (a) { return a.type === 'quick'; }), 'not in a Special Mission Zone');

/* ---------------- [28.0] IJN Expansion rules (optional) ---------------- */
var sI = Career.create('wahoo', { ijn: true });
t.ok(sI.ijn && sI.war.ijn, 'the IJN rules are a career option');
t.ok(!Career.create('wahoo').ijn, '...off by default');
/* [IJN 4.1] Loners: East China Sea W2, a white box then a red one. */
var ecs = Aac.charts.east_china_sea.grid[1], white = ecs.indexOf('none'), red = ecs.indexOf('high');
var lr = global.SWSearch.areaActivity({ area: 'east_china_sea', warPeriod: 'W2', ijn: true }, tape([white === 0 ? 1 : white, red]));
t.ok(white > -1 && red > -1 && (white === 0 ? true : lr.loner), '[IJN 4.1] white, then a red box on the second roll: a loner');
var lr2 = global.SWSearch.areaActivity({ area: 'east_china_sea', warPeriod: 'W2', ijn: false }, tape([white === 0 ? 1 : white]));
t.ok(!lr2.loner, '...not without the option');
/* [IJN 5] Crash Dive */
t.eq(Combat.crashRating('new_s2'), 1, '[IJN 5.2] New S-2 class: rating 1');
t.eq(Combat.crashRating('gato'), 0, 'Gato: 0 (a 10% chance)');
t.eq(Combat.crashRating('narwhal'), null, 'Narwhal: X, cannot');
var cdS = { ijn: true, sub: { cls: 'gato', superSkipper: null } };
t.ok(Combat.crashDive(cdS, 'x', tape([0])).ok && !Combat.crashDive(cdS, 'x', tape([1])).ok, '[IJN 5.1] roll = or < the rating dives in time');
t.eq(Combat.softened('damaged_rtb'), 'spotted', '[IJN 5.1] success: any result but No Effect becomes Spotted');
t.eq(Combat.crashDive({ ijn: false, sub: { cls: 'gato' } }, 'x', tape([])), null, 'no crash dive without the option');
/* [IJN 6] Targeting an escort: its own ASW leaves its defense, once. */
var dd = global.SWShips.pieces ? null : null;
var esc = { ijn: true, round: 1, sub: { column: 'B', attack: 7, spotted: false, superSkipper: null }, torpedoValue: 0, roundEvent: null,
  units: [{ uid: 'e1', piece: 'dd2t72', column: 'B', revealed: true, tdc: 0, damaged: false, sunk: false }], allocations: [] };
var escPiece = Combat.piece(esc.units[0]);
if (escPiece && escPiece.asw > 0) {
  esc.allocations = [{ unit: 'e1', points: 7 }];
  var withOpt = Combat.attackPreview(esc, esc.allocations[0]);
  esc.ijn = false;
  var without = Combat.attackPreview(esc, esc.allocations[0]);
  t.eq(withOpt.defense, without.defense - escPiece.asw, '[IJN 6.0] the targeted escort\'s own ASW is not part of its defense');
  esc.ijn = true; esc.sub.spotted = true;
  t.eq(Combat.attackPreview(esc, esc.allocations[0]).defense, without.defense, '[IJN 6.1a] not when the boat is Spotted');
} else { t.ok(false, 'test escort piece dd2t has ASW'); }
/* [IJN 7.0] Early War Period 4 */
var wE = War.create(Data.career('harder')); wE.ijn = true;
wE.fleet.ships = 900; wE.fleet.tons = 3900;
var er = War.warProgress(wE, { y: 1944, m: 2, w: 1 }, tape([9]));
t.ok(wE.earlyW4 && wE.earlyW4.m === 2, '[IJN 7.0] 860 ships and 3.8 million tons: the W4 transition starts this month');
t.ok(er.records.some(function (r) { return r.target === 9; }), '[IJN 7.0] ...counted as 9');
var wE2 = War.create(Data.career('harder')); wE2.fleet.ships = 900; wE2.fleet.tons = 3900;
t.eq(War.warProgress(wE2, { y: 1944, m: 2, w: 1 }, tape([])).records.length, 0, 'without the option: no roll before June 1944');

/* ---------------- [24.0] Wolfpacks ---------------- */
var wp0 = Career.create('wahoo');
t.ok(!Career.legalActions(wp0).some(function (a) { return a.type === 'form_pack'; }), '[24.1] no wolfpacks before October 1943');
var wp1 = Career.create('tang');                                  // May 1944, Pearl Harbor
t.ok(Career.legalActions(wp1).some(function (a) { return a.type === 'form_pack' && a.rule === '24.1'; }), '[24.1] from October 1943 at a major base: Form a wolfpack');
var wt1 = Career.create('tirante');
t.ok(!Career.legalActions(wt1).some(function (a) { return a.type === 'form_pack'; }), '[24.0] not from a forward base');
Career.apply(wp1, { type: 'form_pack' }, Dice.seeded(3));
var mates = wp1.career.packPlanned;
t.ok(mates && mates.length === 2 && mates.every(function (m) { return m.name !== 'USS Tang' && ['gato', 'balao', 'tench'].indexOf(m.cls) > -1; }),
  'two fleet boats join: ' + (mates || []).map(function (m) { return m.name; }).join(', '));
t.ok(Career.legalActions(wp1).some(function (a) { return a.type === 'break_pack'; }), 'the pack may be stood down again');
Career.apply(wp1, { type: 'sail', area: 'marianas' }, Dice.seeded(4));
t.ok(wp1.pack && wp1.pack.length === 3 && wp1.flag === wp1.career.own, '[24.2] the pack sails as one, led by your boat');
var tc = wp1.log.filter(function (r) { return r.table === 'Transit Event [19.1]' && r.die !== null; });
t.ok(!tc.length || tc.every(function (r) { return r.drms.some(function (d) { return d.rule === '24.4'; }); }), '[24.4] each boat rolls its own Transit Event check, −1');

/* Combat: a hand-built pack contact. */
function packFight() {
  var st = Career.create('tang');
  Career.apply(st, { type: 'form_pack' }, Dice.seeded(3));
  st.pack = [st.career.own].concat(st.career.packPlanned); st.flag = st.career.own; st.career.packPlanned = null;
  st.career.atSea = true; st.career.box = null; st.area = 'east_china_sea'; st.sub.side = 'patrol';
  st.career.current = { n: 1, depart: st.career.date, from: 'pearl', ships0: 0, tons0: 0, own0: 0, ownT0: 0 };
  st.phase = '13.1';
  return st;
}
var pf = packFight();
var la = Career.legalActions(pf).filter(function (a) { return a.type === 'search'; });
t.ok(la.length === 2 && la.some(function (a) { return a.barrier && a.rule === '24.32'; }), '[24.3] the pack searches as a Group or a Barrier');
/* find a seed that makes contact with a group search */
var seedC = null;
for (var sc9 = 1; sc9 < 400 && seedC === null; sc9++) {
  var tr = packFight(); Career.apply(tr, { type: 'search' }, Dice.seeded(sc9));
  if (tr.phase === '14.11' && tr.pc) seedC = sc9;
}
t.ok(seedC !== null, 'a group search finds a convoy (seed ' + seedC + ')');
var pk = packFight(), dk = Dice.seeded(seedC);
Career.apply(pk, { type: 'search' }, dk);
t.eq(pk.pc.order.length, 3, '[24.31] a Group pack: every boat engages');
t.eq(pk.sub, pk.pc.order[0], '[24.5] boats are placed one by one');
Career.apply(pk, { type: 'place', column: 'B' }, dk);
Career.apply(pk, { type: 'place', column: 'B' }, dk);
t.ok(!Career.legalActions(pk).some(function (a) { return a.column === 'B'; }), '[24.5] no more than two boats in a column');
Career.apply(pk, { type: 'place', column: 'D' }, dk);
t.eq(pk.phase, '14.12', 'then the first boat reveals [24.53]');
t.eq(pk.sub, pk.pc.order[0], '...the first boat acts first');
/* [24.54] an escort in column C: counts for the boats in B and D only if C is empty of boats (it is). */
var third = pk.pc.order[2];
t.eq(third.column, 'D', 'the third boat is in D');
t.ok(Combat.revealedEscortAsw(pk) >= 0, 'the escort level is per boat');
pk.pc.order[1].column = 'C';                                      // put a boat in C: B's escort level no longer sees D's escorts
var fakeEsc = { uid: 'x1', piece: 'dd2t72', column: 'A', revealed: true, damaged: false, sunk: false };
pk.units.push(fakeEsc);
var lvlB = Combat.revealedEscortAsw(pk);
pk.pc.order[1].column = 'A';
var lvlB2 = Combat.revealedEscortAsw(pk);
t.ok(lvlB2 < lvlB, '[24.54] an escort in an adjacent column stops counting when another boat is in that column');
pk.units.pop(); pk.pc.order[1].column = 'B';
/* Play the pack's turns through with the captain until the combat ends. */
var tch = global.SWTeacher.create(global), guard = 0, sawSecond = false, sawDecide = false;
while (pk.pc && guard++ < 300 && !pk.done) {
  if (pk.pc.stage === 'turns' && pk.sub !== pk.pc.order[0]) sawSecond = true;
  if (pk.pc.stage === 'decide') sawDecide = true;
  var L2 = Career.legalActions(pk);
  Career.apply(pk, (tch.choose(pk, L2).action || L2[0]), dk);
}
t.ok(sawSecond, '[24.53] after the first boat\'s attack and counterattack, the next boat takes its turn');
t.ok(!pk.pc && pk.phase !== '14.12', 'the pack\'s combat ends');
t.ok(pk.log.filter(function (r) { return r.table === 'Endurance Table [14.7]'; }).length >= 1, '[14.7] Endurance for the pack\'s boats');
t.ok(pk.sub === pk.flag || pk.done, 'after the fight your boat is the one in command again');
/* [24.55] Re-Attack: each boat rolls its Tactical or less. */
var pr = packFight(), dr = Dice.seeded(seedC);
Career.apply(pr, { type: 'search' }, dr);
['A', 'B', 'D'].forEach(function (col) { Career.apply(pr, { type: 'place', column: col }, dr); });
pr.pc.stage = 'decide'; pr.phase = '14.3'; pr.sub = pr.flag;
t.ok(Career.legalActions(pr).some(function (a) { return a.type === 'reattack' && a.rule === '24.55'; }), '[24.55] the pack may Re-Attack once');
Career.apply(pr, { type: 'reattack' }, dr);
t.eq(pr.log.filter(function (r) { return r.table === 'Wolfpack Re-Attack [24.55]'; }).length, 3, '[24.55] one roll for each boat');
if (pr.pc && pr.pc.stage === 'turns') {
  pr.pc.stage = 'decide'; pr.phase = '14.3'; pr.sub = pr.flag;
  t.ok(!Career.legalActions(pr).some(function (a) { return a.type === 'reattack'; }), '[24.55] never twice');
}
/* [24.14] below three boats: the pack disbands. */
var pd = packFight();
pd.pack[1].rtb = true;                                          // one boat must go home
Career.apply(pd, { type: 'bypass' }, Dice.seeded(1));
t.ok(pd.pack === null, '[24.14] a boat leaves: below three, the pack disbands at once');
t.ok(pd.log.some(function (r) { return r.ruleRef === '24.14'; }), '...and the log says so [24.14]');
/* [24.6] one boat spotted spots the pack. */
var ps = packFight();
ps.pack[2].spotted = true;
Career.apply(ps, { type: 'bypass' }, Dice.seeded(2));
t.ok(!ps.pack || ps.pack.every(function (m) { return m.spotted; }), '[24.6] one spotted boat spots them all');

/* ---------------- Rating ---------------- */
var sc = Career.create('tang');
sc.done = true; sc.outcome = 'complete'; sc.career.own.tonsSunk = 45; sc.career.own.shipsSunk = 9; sc.tonnageSunk = 90;
t.eq(Goal.rateCareer(sc).final, 'gold', 'career medals: 45,000 t and home is Gold');
sc.career.own.tonsSunk = 0.8; sc.career.own.shipsSunk = 1;
t.eq(Goal.rateCareer(sc).final, 'bronze', 'any ship and the boat survives: Bronze');
sc.outcome = 'lost';
t.eq(Goal.rateCareer(sc).final, 'failed', 'the boat lost: failed');
var v = Career.patrolVerdict(Data.career('tang'), { ships: 11, tons: 40, weeks: 4, outcome: 'returned' });
t.eq(v.level, 3, '[32.1] more ships and tons than O\'Kane, in fewer weeks: legendary');
v = Career.patrolVerdict(Data.career('tang'), { ships: 11, tons: 40, weeks: 4, outcome: 'lost' });
t.eq(v.level, 2, '[32.1] losing the boat takes a level off');

t.done();
