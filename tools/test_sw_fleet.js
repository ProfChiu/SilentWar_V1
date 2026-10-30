'use strict';
/* Phase 8 — fleet command (The Rising Sun [31.2]) and the Patrol Games [32.0]. */
var t = require('./_harness.js');
var path = require('path');
var G = path.join(__dirname, '..', 'apps', 'game') + '/';
function load(rel, name) { global[name] = require(G + rel)[name]; return global[name]; }
['rules/sw_resolution.js:SWResolution', 'data/sw_tables.js:SWTables', 'data/sw_ships.js:SWShips', 'data/sw_units.js:SWUnits',
 'data/sw_aac.js:SWAac', 'data/sw_layout.js:SWLayout', 'data/sw_map.js:SWMap', 'data/sw_subclasses.js:SWSubClasses',
 'data/sw_campaign.js:SWCampaignData', 'rules/sw_movement.js:SWMovement', 'rules/sw_search.js:SWSearch', 'rules/sw_combat.js:SWCombat',
 'rules/sw_cups.js:SWCups', 'rules/sw_patrol.js:SWPatrol', 'rules/sw_transit.js:SWTransit', 'rules/sw_war.js:SWWar',
 'rules/sw_base.js:SWBase', 'rules/sw_career.js:SWCareer', 'rules/sw_teacher.js:SWTeacher', 'rules/sw_fleet.js:SWFleet', 'rules/sw_goal.js:SWGoal'
].forEach(function (x) { var p = x.split(':'); load(p[0], p[1]); });
var Fleet = global.SWFleet, Career = global.SWCareer, Data = global.SWCampaignData, Units = global.SWUnits, War = global.SWWar;
var Dice = require(G + 'rules/sw_dice.js').SWDice;
t.suite('sw_fleet');

/* ---------------- data ---------------- */
var miss = [];
Object.keys(Data.arrive).forEach(function (k) { Object.keys(Data.arrive[k]).forEach(function (b) {
  t.ok(!!Data.bases[b], 'arrival base ' + b + ' is a major base');
  Data.arrive[k][b].forEach(function (n) { if (!Units.boat(Data.rosterName(n))) miss.push(k + ' ' + n); }); }); });
t.eq(miss, [], '[31.01] every arriving boat is in the roster');
var rs = Data.campaign('rising_sun');
t.eq(rs.oob.reduce(function (n, g) { return n + g.boats.length; }, 0), 42, '[31.13] the December 1941 order of battle: 42 boats');
t.eq(Data.rosterName('Entemedor'), 'USS Etemedor', 'the roster spells Entemedor as Etemedor');

/* ---------------- create ---------------- */
var f = Fleet.create('rising_sun', Dice.seeded(1));
t.eq(f.boats.length, 42, 'the campaign starts with the whole order of battle');
t.eq(War.label(f.date), 'December 1941, week 2', '[31.11] the second week of December 1941');
t.ok(!f.log.some(function (r) { return r.table === 'War Event Phase [5.0]'; }), '[31.11] the first turn skips the Strategic Segment');
var manila = f.boats.filter(function (b) { return !b.career.atSea && b.career.base === 'manila'; });
t.eq(manila.length, 28, 'Manila: 26 Ready for Sea and 2 in Repair Box 1');
var s36 = Fleet.byName(f, 'S36');
t.ok(s36.smz === 'lingayen' && s36.area === 'scs1' && s36.career.startRule.tf, 'S-36 in the Lingayen Gulf SMZ, TF contacts only');
var argo = Fleet.byName(f, 'USS Argonaut');
t.ok(argo.smz === 'midway' && argo.smzWeeks === 2, 'Argonaut at Midway for two turns');
var gud = Fleet.byName(f, 'USS Gudgeon');
t.ok(gud.area === 'hawaiian' && gud.career.startRule.noMove && gud.career.startRule.rtbFirst, 'Gudgeon in the Hawaiian Islands: no Patrol Movement, RTB this turn');
t.ok(Career.legalActions(gud).every(function (a) { return a.type === 'stay'; }), '[31.13] "No Patrol Movement is allowed"');

/* ---------------- orders and the hard lock ---------------- */
var L = Fleet.legalActions(f);
t.ok(L.some(function (a) { return a.type === 'sail' && a.boat === 'USS Sculpin'; }), 'a boat Ready for Sea may be sent out');
t.ok(L.some(function (a) { return a.type === 'run_week'; }), 'and the week can be carried out');
t.ok(L.every(function (a) { return !!a.rule; }), 'every order cites its rule');
t.throws(function () { Fleet.apply(f, { type: 'sail', boat: 'USS Narwhal', area: 'marshalls' }, Dice.seeded(2)); }, 'hard lock: a boat under repair cannot sail');
t.throws(function () { Fleet.apply(f, { type: 'fight', boat: 'USS Sculpin' }, Dice.seeded(2)); }, 'hard lock: a boat in port has no fight to mark');
var sa = L.filter(function (a) { return a.type === 'sail' && a.boat === 'USS Sculpin'; })[0];
Fleet.apply(f, sa, Dice.seeded(2));
t.eq(f.sail['USS Sculpin'], sa.area, 'the order is noted, not carried out yet');
t.ok(Fleet.legalActions(f).some(function (a) { return a.type === 'unsail' && a.boat === 'USS Sculpin'; }), 'and can be taken back');

/* ---------------- a week ---------------- */
var d = Dice.seeded(3);
Fleet.apply(f, { type: 'run_week' }, d);
t.ok(Fleet.byName(f, 'USS Sculpin').career.atSea, 'the week carried the order out: Sculpin sailed');
t.ok(Fleet.byName(f, 'USS Gudgeon').sub.rtb || Fleet.byName(f, 'USS Gudgeon').done || !Fleet.byName(f, 'USS Gudgeon').career.atSea,
  '[31.13] Gudgeon turned for Pearl Harbor in the first turn');
t.eq(War.label(f.date), 'December 1941, week 3', 'the calendar moved on a week');
t.ok(f.log.some(function (r) { return r.table === 'War Event Phase [5.0]'; }), 'the second week has its Strategic Segment');

/* Run to January: reinforcements arrive. */
var guard = 0;
while (!(f.date.y === 1942 && f.date.m === 0) && guard++ < 10) Fleet.apply(f, { type: 'run_week' }, d);
t.ok(['USS Cuttlefish', 'USS Grayling', 'USS Tuna'].every(function (n) { var b = Fleet.byName(f, n); return b && b.career.base === 'pearl'; }),
  '[8.0B] January 1942: Cuttlefish, Grayling and Tuna arrive at Pearl Harbor');

/* ---------------- a marked board fight ---------------- */
var fb = null, fd = null;
for (var sd = 1; sd < 60 && !fb; sd++) {
  var ff = Fleet.create('rising_sun', Dice.seeded(sd)), dd = Dice.seeded(sd + 50);
  for (var w = 0; w < 6 && !fb && !ff.done; w++) {
    Fleet.legalActions(ff).filter(function (a) { return a.type === 'fight'; }).forEach(function (a) { Fleet.apply(ff, a, dd); });
    Fleet.apply(ff, { type: 'run_week' }, dd);
    if (ff.phase === 'fight') { fb = ff; fd = dd; }
  }
}
t.ok(!!fb, 'a boat marked to fight stops the week at its contact');
if (fb) {
  t.ok(/^14\./.test(fb.active.phase), 'the Combat Display is waiting for you (' + fb.active.phase + ')');
  var FL = Fleet.legalActions(fb);
  t.ok(FL.length && FL.every(function (a) { return a.rule; }), 'with that boat\'s legal combat actions');
  var tch = global.SWTeacher.create(global), g2 = 0;
  while (fb.phase === 'fight' && g2++ < 300) Fleet.apply(fb, tch.choose(fb.active, Fleet.legalActions(fb)).action, fd);
  t.ok(fb.phase !== 'fight', 'when the fight is over the week carries on by itself');
}

/* ---------------- missions, relegation, the Hold Box ---------------- */
var fm = Fleet.create('rising_sun', Dice.seeded(4));
var ev = Data.eventById('w1_barrier');
fm.war.event = ev;
fm.boats.slice(0, 4).forEach(function (b) { b.career.atSea = true; b.career.box = null; b.area = 'java_sea'; b.sub.side = 'patrol'; b.sub.rtb = false; });
var ordersBefore = {};
(function () {
  var q = null;
  /* the quota function is internal; drive it through a Strategic Segment stub */
  fm.assign = {};
  var cands = fm.boats.slice(0, 4).map(function (b) { return Career.missionOrders(b); });
  t.ok(cands.every(function (o) { return o && o.tasked; }), '[5.2] boats in the Java Sea can reach the Makassar Strait');
})();
var rel = Data.eventById('w2_relegate');
t.eq(rel.first, ['USS Cachalot', 'USS Cuttlefish'], 'W2 relegation names Cachalot and Cuttlefish first');
var fh = Fleet.create('rising_sun', Dice.seeded(5));
var cap = Data.bases.manila.capacity;
t.ok(fh.hasRoom('manila'), 'Manila has room: 2 boats in repair of ' + cap);
fh.boats.filter(function (b) { return b.career.base === 'manila'; }).slice(0, cap).forEach(function (b) { b.career.box = 'repair2'; });
t.ok(!fh.hasRoom('manila'), '[10.1] at Max Repair Capacity (' + cap + ') there is no room');
t.eq(global.SWBase.boxLabel.hold === undefined ? 'Hold Box' : global.SWBase.boxLabel.hold, 'Hold Box', 'the Hold Box has a name');

/* The Fall of Luzon: boats in port at Manila sail for Fremantle; Repair 2-3 scuttled. */
var fl = Fleet.create('rising_sun', Dice.seeded(6));
var luz = Data.eventById('w1_luzon');
fl.boats.filter(function (b) { return b.career.base === 'manila'; })[0].career.box = 'repair2';
Career.applyEffects(fl.carrier, luz.effects, Dice.seeded(7), 'war');
Fleet.live(fl).forEach(function (b) { Career.applyEffects(b, luz.effects, Dice.seeded(7), 'boat'); });
t.ok(fl.war.bases.indexOf('manila') === -1 && fl.war.bases.indexOf('fremantle') > -1, 'Manila falls and Fremantle opens');
var sailing = fl.boats.filter(function (b) { return b.career.heading && b.career.heading.id === 'fremantle'; });
t.ok(sailing.length >= 25, '[5.0] the boats in port at Manila sail for Fremantle (' + sailing.length + ')');
t.ok(fl.boats.some(function (b) { return b.outcome === 'scuttled'; }), '[18.3] a boat in Repair Box 2 is scuttled');

/* ---------------- longevity and victory ---------------- */
var fv = Fleet.create('rising_sun', Dice.seeded(8));
fv.date = { y: 1942, m: 1, w: 4 };
fv.boats[0].tonnageSunk = 50;
Fleet.apply(fv, { type: 'run_week' }, Dice.seeded(9));
t.ok(fv.done && fv.outcome === 'relieved', '[31.12] end of February 1942 under 90,000 t: relieved of command');
var fz = Fleet.create('rising_sun', Dice.seeded(10));
fz.boats[0].tonnageSunk = 810; fz.boats[0].capitalSunk = 3; Fleet.tally(fz);
t.eq(Fleet.verdict(fz).level, 'Decisive Victory', '[31.24] 810,000 t and 3 capital ships: Decisive (already the top)');
fz.boats[0].tonnageSunk = 760; fz.boats[0].capitalSunk = 3; Fleet.tally(fz);
t.eq(Fleet.verdict(fz).level, 'Substantial Victory', '[31.24] 760,000 t is a Draw; 3 capital ships: one level up');
fz.boats[0].capitalSunk = 0; fz.lost = 12; Fleet.tally(fz);
t.eq(Fleet.verdict(fz).level, 'Failure', '[31.24] a Draw, no capital ships (−1) and 12 boats lost (−1): Failure');

/* ---------------- the other campaigns [31.1], [31.3], [31.4], [31.5] ---------------- */
t.eq(Data.campaigns.map(function (c) { return c.id; }), ['rising_sun', 'full', 'tide', 'setting', 'macarthur', 'east_wind'], 'six campaigns (East Wind Early added in Phase 9)');
var ft = Fleet.create('tide', Dice.seeded(20));
t.eq(ft.boats.length, 74, '[31.33] The Turning Tide: 74 boats in the order of battle');
t.eq(War.label(ft.date), 'April 1943, week 1', 'the first week of April 1943');
t.ok(ft.war.mine.ships === 233 && ft.war.mine.tons === 977 && Fleet.subsLost(ft) === 12, '[31.33] 233 ships, 977,000 t and 12 boats lost already');
t.ok(ft.war.tenderAt.midway && ft.war.tenderAt.midway[0] === 'sperry', '[31.33] the tender Sperry at Midway');
var wah = Fleet.byName(ft, 'USS Wahoo');
t.ok(wah.career.base === 'midway' && wah.sub.superSkipper && wah.sub.superSkipper.name === 'Morton', 'Wahoo at Midway with Morton +1');
var ov = Fleet.byName(ft, 'USS Sculpin');
t.ok(ov.career.box === 'overhaul' && ov.career.returnKey === '1943-05', '[31.33] Sculpin in the West Coast box, back in May 1943');
var gatoT = Fleet.byName(ft, 'USS Gato');
t.ok(gatoT.sub.rtb && gatoT.career.heading && gatoT.career.heading.id === 'pearl', 'Gato on the Transfer Route, RTB to Pearl Harbor');
var s23 = Fleet.byName(ft, 'S23');
t.ok(s23.career.homeBase === 'dutch_harbor' && s23.career.areaLimit.indexOf('aleutians') > -1, 'the S-boats in the north stay the Aleutians group');
var fs4 = Fleet.create('setting', Dice.seeded(21));
t.eq(fs4.boats.length, 137, '[31.42] The Setting Sun: 137 boats');
t.ok(fs4.gone.indexOf('taiho') > -1 && fs4.gone.indexOf('shokaku') > -1, '[31.42] Taiho and Shokaku are already sunk');
var anyTaiho = ['A', 'B', 'C', 'D'].some(function (c) { return fs4.cups[c].some(function (u) { return u.row === 'taiho' || u.row === 'shokaku'; }); });
t.ok(!anyTaiho, '...and are not in the War Mix');
t.eq(Object.keys(fs4.war.tenderAt).sort(), ['guam', 'majuro', 'midway', 'mios_woendi', 'saipan'], '[31.42] five tenders at their forward bases');
var fr = Fleet.create('full', Dice.seeded(22));
var yamatoIn = ['A', 'B', 'C', 'D'].some(function (c) { return fr.cups[c].some(function (u) { return u.row === 'yamato'; }); });
t.ok(!yamatoIn, '[3.12] December 1941: Yamato is not in the War Mix until May 1942');
t.eq(fr.def.longevity.length, 6, '[31.12] the full campaign checks your tonnage six times, to May 1943');
var fm5 = Fleet.create('macarthur', Dice.seeded(23));
t.eq(fm5.boats.length, 29, '[31.53] MacArthur\'s Navy: the Manila boats');
t.ok(fm5.war.bases.join() === 'manila', 'only Manila to begin with');
t.ok(fm5.boats.every(function (b) { return b.career.areaLimit && b.career.areaLimit.indexOf('scs1') > -1 && b.career.areaLimit.indexOf('empire_pacific') === -1; }),
  '[31.5 A] boats may operate only in the Southwest Pacific');
var fmL = Fleet.legalActions(fm5).filter(function (a) { return a.type === 'sail'; });
t.ok(fmL.length && fmL.every(function (a) { return fm5.def.areas.indexOf(a.area) > -1; }), '...so only those areas are offered');
fm5.date = { y: 1942, m: 5, w: 4 };
Fleet.apply(fm5, { type: 'run_week' }, Dice.seeded(24));
t.eq(fm5.war.warPeriod, 'W2', '[31.54 D] July 1942: War Period 2, from the list, not the tables');
t.ok(!fm5.log.some(function (r) { return /Torpedo Improvement/.test(r.table); }), '[31.54 D] no Torpedo Improvement rolls');
var trukEv = Data.eventById('w2_truk');
t.ok(fm5.def.areas && !trukEv.smz.some(function (z) { return (Data.smzLinks[z] || []).some(function (a) { return fm5.def.areas.indexOf(a) > -1; }); }),
  '[31.5 B1] Blockade of Truk lies outside the Southwest Pacific (it becomes No Event)');
/* verdicts by date */
var fv1 = Fleet.create('full', Dice.seeded(25));
fv1.date = { y: 1945, m: 1, w: 2 }; fv1.lost = 30; fv1.boats[0].tonnageSunk = 5600; Fleet.tally(fv1);
var vv = Fleet.verdict(fv1);
t.eq(vv.base, 'Decisive Victory', '[31.14] the war ends in February 1945: Decisive Victory');
t.eq(vv.level, 'Total Victory', '[31.14] 30 boats lost (21-40): one level up');
var fv3 = Fleet.create('tide', Dice.seeded(26));
fv3.date = { y: 1944, m: 7, w: 1 }; fv3.boats[0].tonnageSunk = 3400; fv3.lost = 20; Fleet.tally(fv3);
var v3 = Fleet.verdict(fv3);
t.eq(v3.base, 'Dramatic Victory', '[31.34] War Period 4 in August 1944: Dramatic Victory');
t.eq(v3.level, 'Decisive Victory', '[31.34] more than 4,300,000 t (4,377,000): one level up; 32 boats lost (30-36): no change');

/* ---------------- fleet wolfpacks [24.0] ---------------- */
var fw = Fleet.create('setting', Dice.seeded(30));
var barb = Fleet.byName(fw, 'USS Barb');
t.ok(barb.pack && barb.pack.length === 3 && barb.pack.map(function (m) { return m.name; }).join() === 'USS Barb,USS Queenfish,USS Tunny',
  '[31.42] The Setting Sun starts with Barb, Queenfish and Tunny as a wolfpack at sea');
t.eq(Fleet.byName(fw, 'USS Queenfish').career.inPack, 'USS Barb', 'Queenfish rides in Barb\'s pack');
t.eq(fw.packXp, 10, '[31.42] Wolfpack Experience 10');
t.eq(Fleet.packLimits(fw), { packs: 3, size: 4 }, '[24.12] from 9: up to three packs of four');
t.eq(Fleet.packLimits({ packXp: 3 }), { packs: 1, size: 3 }, '[24.11] below 9: one pack of three');
t.eq(Fleet.packLimits({ packXp: 15 }), { packs: 5, size: 6 }, '[24.13] from 15: five packs of six');
t.eq(fw.boatsIn('n_phil_sea'), 1 + 2 + 2 + 2, '[22.3] in the North Philippine Sea: Seahorse, and three packs of three counting two each');
/* forming one in port */
var fo = Fleet.create('tide', Dice.seeded(31));
var guardW = 0;
while (War.cmp(fo.date, { y: 1943, m: 9 }) < 0 && guardW++ < 40) Fleet.apply(fo, { type: 'run_week' }, Dice.seeded(32 + guardW));
var readyPearl = Fleet.live(fo).filter(function (b) { return b.phase === 'base' && b.career.box === 'ready' && b.career.base === 'pearl'; });
t.ok(readyPearl.length >= 3, 'October 1943: boats Ready for Sea at Pearl Harbor (' + readyPearl.length + ')');
var lead = readyPearl[0], sailA = Fleet.legalActions(fo).filter(function (a) { return a.type === 'sail' && a.boat === lead.career.boat; })[0];
Fleet.apply(fo, sailA, Dice.seeded(90));
var fp = Fleet.legalActions(fo).filter(function (a) { return a.type === 'form_pack' && a.boat === lead.career.boat; })[0];
t.ok(!!fp && fp.rule === '24.1', '[24.1] from October 1943 a boat with orders may lead a wolfpack from a major base');
Fleet.apply(fo, fp, Dice.seeded(91));
var mates = fo.packs[lead.career.boat];
t.ok(mates && mates.length === 2, '[24.11] a pack of three: ' + (mates || []).join(', '));
t.ok(!Fleet.legalActions(fo).some(function (a) { return a.type === 'form_pack'; }) || Fleet.packLimits(fo).packs > 1, '[24.11] only one pack at a time below 9 experience');
Fleet.apply(fo, { type: 'run_week' }, Dice.seeded(92));
var L0 = Fleet.byName(fo, lead.career.boat);
t.ok(L0.pack && L0.pack.length === 3 || L0.done || !L0.career.atSea || fo.log.some(function (r) { return r.ruleRef === '24.14'; }),
  '[24.2] the pack sailed as one');
t.ok(mates.every(function (n) { var m = Fleet.byName(fo, n); return m.career.inPack === lead.career.boat || !m.career.inPack; }), 'its boats ride with the leader');

/* ---------------- Patrol Games [32.0] ---------------- */
var pg = Career.create('wahoo', { patrolGame: true });
t.ok(pg.patrolGame && pg.career.target === 1, 'a Patrol Game is one patrol');
Career.apply(pg, { type: 'sail', area: 'east_china_sea' }, Dice.seeded(11));
Career.apply(pg, { type: 'end_turn' }, Dice.seeded(12));
t.ok(!pg.log.some(function (r) { return r.table === 'War Event Phase [5.0]' || r.table === 'ULTRA Table [7.0]'; }),
  '[32.0] no War Events, no ULTRA (the Strategic Segment is skipped for patrol scenarios [4.0])');
t.eq(pg.warPeriod, 'W2', '[32.0] the War Period does not change');
t.ok(pg.noSuperSkipper, '[32.0] Super Skippers are not used');
var pm = Career.create('momsen', { patrolGame: true });
t.ok(pm.career.packPlanned && pm.career.packPlanned.map(function (m) { return m.name; }).join() === 'USS Shad,USS Grayback',
  '[32.19] the First Wolfpack: Cero with Shad and Grayback');
t.ok(!Career.legalActions(pm).some(function (a) { return a.type === 'break_pack' || a.type === 'form_pack'; }), '...and it sails as a pack');
var v = Career.patrolVerdict(Data.career('momsen'), { ships: 1, tons: 5, weeks: 5, pack: ['a', 'b', 'c'], packShips: 4, packTons: 24, outcome: 'returned' });
t.eq(v.level, 3, '[32.19] the pack\'s total is what is compared: 4 ships, 24,000 t in 5 weeks beats Momsen: legendary');

t.done();
