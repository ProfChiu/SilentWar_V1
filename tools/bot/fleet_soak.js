'use strict';
/* fleet_soak.js — play whole campaigns headless (Phase 8).
 *
 *   node tools/bot/fleet_soak.js                    20 Rising Sun campaigns, all fights by Quick Resolution
 *   node tools/bot/fleet_soak.js --board 0.2        also mark ~20% of boats on station to fight on the board
 *   node tools/bot/fleet_soak.js --seeds 60 --record / (default) compare with the baseline
 *
 * The captain gives the orders: every boat Ready for Sea sails where the
 * teaching captain would send it; board fights are played by the captain too.
 * A campaign fails if it throws, stalls, offers an action with no rule, or
 * logs a record without a rule reference.
 */
var fs = require('fs'), path = require('path');
var G = 'apps/game/', root = path.join(__dirname, '..', '..');
function load(rel, name) { global[name] = require(path.join(root, rel))[name]; return global[name]; }
['rules/sw_resolution.js:SWResolution', 'data/sw_tables.js:SWTables', 'data/sw_ships.js:SWShips', 'data/sw_units.js:SWUnits',
 'data/sw_aac.js:SWAac', 'data/sw_layout.js:SWLayout', 'data/sw_map.js:SWMap', 'data/sw_subclasses.js:SWSubClasses',
 'data/sw_campaign.js:SWCampaignData', 'rules/sw_movement.js:SWMovement', 'rules/sw_search.js:SWSearch', 'rules/sw_combat.js:SWCombat',
 'rules/sw_cups.js:SWCups', 'rules/sw_patrol.js:SWPatrol', 'rules/sw_transit.js:SWTransit', 'rules/sw_war.js:SWWar',
 'rules/sw_base.js:SWBase', 'rules/sw_career.js:SWCareer', 'rules/sw_teacher.js:SWTeacher', 'rules/sw_fleet.js:SWFleet'
].forEach(function (x) { var p = x.split(':'); load(G + p[0], p[1]); });
var Fleet = global.SWFleet, Career = global.SWCareer, Dice = require(path.join(root, G + 'rules/sw_dice.js')).SWDice;

var args = process.argv.slice(2);
function arg(k, d) { var i = args.indexOf(k); return i > -1 ? Number(args[i + 1]) : d; }
var SEEDS = arg('--seeds', 20), BASE = arg('--seed-base', 1), BOARD = arg('--board', 0), RECORD = args.indexOf('--record') > -1;
var CAMPAIGN = (function () { var i = args.indexOf('--campaign'); return i > -1 ? args[i + 1] : 'rising_sun'; }()), AUTO = args.indexOf('--quick') > -1 ? 'quick' : 'captain';

/* --optional allied,surcouf,u2513,nautilus2,zeeleeuw,staggered  (or "all") [33.0]-[34.0] */
var OPTIONAL = (function () {
  var i = args.indexOf('--optional'); if (i === -1) return null;
  var ks = args[i + 1] === 'all' ? ['allied', 'surcouf', 'u2513', 'nautilus2', 'zeeleeuw', 'staggered'] : args[i + 1].split(',');
  var o = {}; ks.forEach(function (k) { o[k] = true; }); return o;
}());
/* --pace: the Historical pace house rule; PACE='{"W1":-2,...}' overrides its table for tuning */
var PACE = args.indexOf('--pace') > -1;
if (PACE) { OPTIONAL = OPTIONAL || {}; OPTIONAL.pace = true; }
var PACE_TABLE = process.env.PACE ? JSON.parse(process.env.PACE) : null;
/* the war's tonnage at the end of each quarter, against history (JANAC) */
global.SWPrimer = require(path.join(root, G + 'data/sw_primer.js')).SWPrimer;
function curve(f) {
  var out = {};
  (f.series || []).forEach(function (p) { if (p.m % 3 === 0 && p.w === 1) out[p.y + '-' + (p.m < 10 ? '0' : '') + p.m] = { tons: p.tons, lost: p.lost }; });
  return out;
}
function fingerprint(fleet) {
  var h = 0x811c9dc5;
  fleet.log.concat.apply(fleet.log, fleet.boats.map(function (b) { return b.log; })).forEach(function (r) {
    var s = r.table + '|' + r.die + '|' + r.modifiedDie + '|' + JSON.stringify(r.result) + ';';
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  });
  return ('00000000' + h.toString(16)).slice(-8);
}

function play(seed) {
  var dice = Dice.seeded(seed), pick = Dice.seeded(seed + 999), tune = process.env.TUNE ? JSON.parse(process.env.TUNE) : null, teacher = global.SWTeacher.create(global, { careful: args.indexOf('--plain-captain') === -1, tune: tune });
  var problems = [], n = 0, f;
  try {
    f = Fleet.create(CAMPAIGN, dice, { auto: AUTO, noLongevity: args.indexOf('--no-longevity') > -1, careful: args.indexOf('--plain-captain') === -1, tune: tune, optional: OPTIONAL, paceTable: PACE_TABLE });
    while (!f.done && n++ < 200000) {
      var L = Fleet.legalActions(f);
      if (!L.length) { problems.push('stall in ' + f.phase); break; }
      L.forEach(function (a) { if (!a.rule) problems.push('action without a rule: ' + a.type); });
      var a;
      if (f.phase === 'fight') {
        a = (teacher.choose(f.active, L) || {}).action || L[0];
      } else {
        /* orders: sail every ready boat where the captain would, mark some fights, then run */
        a = null;
        var sails = {};
        L.forEach(function (x) { if (x.type === 'sail') (sails[x.boat] = sails[x.boat] || []).push(x); });
        var boat = Object.keys(sails)[0];
        if (boat) {
          var st = Fleet.byName(f, boat);
          var t = teacher.choose(st, Career.legalActions(st).filter(function (x) { return x.type === 'sail'; }));
          a = sails[boat].filter(function (x) { return t && t.action && x.area === t.action.area; })[0] || sails[boat][0];
        }
        if (!a) {
          /* the captain forms a wolfpack whenever one is allowed [24.1] */
          a = L.filter(function (x) { return x.type === 'form_pack'; })[0] || null;
        }
        if (!a && BOARD) {
          var fights = L.filter(function (x) { return x.type === 'fight'; });
          var fx = fights.filter(function () { return pick.rollDie(100) < BOARD * 100; })[0];
          if (fx && !f['marked' + f.turn + fx.boat]) { f['marked' + f.turn + fx.boat] = true; a = fx; }
        }
        if (!a) a = L.filter(function (x) { return x.type === 'run_week'; })[0];
      }
      Fleet.apply(f, a, dice);
    }
    if (!f.done) problems.push('did not finish');
    f.log.concat.apply(f.log, f.boats.map(function (b) { return b.log; })).forEach(function (r) {
      if (!r.ruleRef) problems.push('record without a rule: ' + r.context);
      if (r.die !== null && (r.die < 0 || r.die > 9)) problems.push('die out of range: ' + r.context);
    });
  } catch (e) {
    problems.push('crash: ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | '));
  }
  return { seed: seed, problems: problems, outcome: f && f.outcome, level: f && f.verdict && f.verdict.level,
           tons: f && Math.round(f.war.mine.tons), ships: f && f.war.mine.ships, lost: f && f.lost, capital: f && f.capital,
           boats: f && f.boats.length, weeks: f && f.turn, wp: f && f.war.warPeriod, torpedo: f && f.war.torpedo,
           hash: f ? fingerprint(f) : null, draws: dice.draws, actions: n, allied: f && f.allied, curve: f ? curve(f) : null };
}

var t0 = Date.now(), results = [];
for (var i = 0; i < SEEDS; i++) results.push(play(BASE + i));
var bad = results.filter(function (r) { return r.problems.length; });
console.log('fleet soak: ' + results.length + ' ' + CAMPAIGN + ' campaigns (seeds ' + BASE + '-' + (BASE + SEEDS - 1) + (BOARD ? ', ' + BOARD * 100 + '% of fights on the board' : '') + ', the rest by ' + (AUTO === 'quick' ? 'Quick Resolution' : 'the captain on the full rules') +
  '), ' + bad.length + ' with problems, ' + Math.round((Date.now() - t0) / results.length) + ' ms each');
bad.slice(0, 6).forEach(function (r) { console.log('  seed ' + r.seed + ': ' + r.problems.slice(0, 3).join('; ')); });
var lv = {};
results.forEach(function (r) { lv[r.level] = (lv[r.level] || 0) + 1; });
function med(k) { var v = results.map(function (r) { return r[k]; }).sort(function (a, b) { return a - b; }); return v[Math.floor(v.length / 2)]; }
console.log('  results ' + JSON.stringify(lv) + ' · tons median ' + med('tons') + 'k · ships ' + med('ships') + ' · boats lost ' + med('lost') +
  ' · capital ships ' + med('capital') + ' · boats in the war ' + med('boats') + ' · end period ' +
  JSON.stringify(results.reduce(function (m, r) { m[r.wp] = (m[r.wp] || 0) + 1; return m; }, {})));
if (OPTIONAL && OPTIONAL.allied) console.log('  Allied boats: tons median ' + (function () { var v = results.map(function (r) { return r.allied ? r.allied.tons : 0; }).sort(function (a, b) { return a - b; }); return v[Math.floor(v.length / 2)]; }()) + 'k');
/* --curve: the median tonnage at each quarter against history (for tuning the pace) */
if (args.indexOf('--curve') > -1) {
  var keys = {};
  results.forEach(function (r) { Object.keys(r.curve || {}).forEach(function (k) { keys[k] = 1; }); });
  Object.keys(keys).sort().forEach(function (k) {
    var v = results.map(function (r) { return r.curve && r.curve[k]; }).filter(Boolean), y = +k.slice(0, 4), m = +k.slice(5);
    var t = v.map(function (x) { return x.tons; }).sort(function (a, b) { return a - b; }), l = v.map(function (x) { return x.lost; }).sort(function (a, b) { return a - b; });
    var h = global.SWPrimer.at(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1);
    console.log('  ' + k + ' (' + v.length + ' runs): tons ' + t[Math.floor(t.length / 2)] + 'k vs history ' + h.tons + 'k · lost ' + l[Math.floor(l.length / 2)] + ' vs ' + h.lost);
  });
}
var optSuffix = !OPTIONAL ? '' : (Object.keys(OPTIONAL).length === 1 && OPTIONAL.pace) ? '_pace' : '_opt' + (OPTIONAL.pace ? '_pace' : '');
var BL = path.join(__dirname, 'baselines', 'fleet_' + (CAMPAIGN === 'rising_sun' ? '' : CAMPAIGN + '_') + BASE + '_' + SEEDS + (BOARD ? '_board' : '') + (AUTO === 'quick' ? '_quick' : '') +
  optSuffix + '.json');
var fp = results.map(function (r) { return { seed: r.seed, outcome: r.outcome, level: r.level, tons: r.tons, lost: r.lost, draws: r.draws, hash: r.hash }; });
if (RECORD) { fs.writeFileSync(BL, JSON.stringify(fp)); console.log('  baseline recorded: ' + path.relative(root, BL)); }
else if (fs.existsSync(BL)) {
  var old = JSON.parse(fs.readFileSync(BL, 'utf8')), same = old.filter(function (o, k) { return JSON.stringify(o) === JSON.stringify(fp[k]); }).length;
  console.log('  baseline: ' + same + '/' + old.length + ' identical');
  if (same !== old.length) process.exitCode = 1;
}
if (bad.length) process.exitCode = 1;
