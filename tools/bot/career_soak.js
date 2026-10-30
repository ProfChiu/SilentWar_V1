'use strict';
/* career_soak.js — play many seeded careers headless and prove the campaign
 * layer holds (Phase 6).
 *
 *   node tools/bot/career_soak.js                  25 seeds x 8 careers, teacher at the helm, vs baseline
 *   node tools/bot/career_soak.js --seeds 400      more seeds (no baseline compare unless it exists)
 *   node tools/bot/career_soak.js --random         a random legal player instead of the teacher
 *   node tools/bot/career_soak.js --record         write the baseline for this seed range
 *   node tools/bot/career_soak.js --calibrate      also print the war clock against history
 *
 * A career fails if it throws, stalls (no legal action while not over), runs
 * past the week cap, offers an action with no rule, or logs a record without a
 * rule reference or with a die outside 0..9.
 */
var fs = require('fs');
var path = require('path');
var G = 'apps/game/';
var root = path.join(__dirname, '..', '..');
function load(rel, name) { global[name] = require(path.join(root, rel))[name]; return global[name]; }
load(G + 'rules/sw_resolution.js', 'SWResolution');
load(G + 'data/sw_tables.js', 'SWTables');
load(G + 'data/sw_ships.js', 'SWShips');
load(G + 'data/sw_units.js', 'SWUnits');
load(G + 'data/sw_aac.js', 'SWAac');
load(G + 'data/sw_layout.js', 'SWLayout');
load(G + 'data/sw_map.js', 'SWMap');
load(G + 'data/sw_subclasses.js', 'SWSubClasses');
var Data = load(G + 'data/sw_campaign.js', 'SWCampaignData');
load(G + 'rules/sw_movement.js', 'SWMovement');
load(G + 'rules/sw_search.js', 'SWSearch');
load(G + 'rules/sw_combat.js', 'SWCombat');
load(G + 'rules/sw_cups.js', 'SWCups');
load(G + 'rules/sw_patrol.js', 'SWPatrol');
load(G + 'rules/sw_transit.js', 'SWTransit');
var War = load(G + 'rules/sw_war.js', 'SWWar');
load(G + 'rules/sw_base.js', 'SWBase');
var Career = load(G + 'rules/sw_career.js', 'SWCareer');
var Teacher = load(G + 'rules/sw_teacher.js', 'SWTeacher');
var Dice = require(path.join(root, G + 'rules/sw_dice.js')).SWDice;

var args = process.argv.slice(2);
function arg(k, d) { var i = args.indexOf(k); return i > -1 ? Number(args[i + 1]) : d; }
var SEEDS = arg('--seeds', 25), BASE = arg('--seed-base', 1);
var RANDOM = args.indexOf('--random') > -1, RECORD = args.indexOf('--record') > -1, CAL = args.indexOf('--calibrate') > -1;
var IJN = args.indexOf('--ijn') > -1;             // Phase 7: the optional IJN Expansion rules
var PG = args.indexOf('--patrol-games') > -1;     // Phase 8: the Patrol Games [32.0], one patrol each
var BOATS = Data.careers.filter(function (c) { return PG || !c.patrolOnly; });
var ACTION_CAP = 60000;

function fingerprint(log) {
  var h = 0x811c9dc5;
  log.forEach(function (r) {
    var s = r.table + '|' + r.die + '|' + r.modifiedDie + '|' + JSON.stringify(r.result) + ';';
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  });
  return ('00000000' + h.toString(16)).slice(-8);
}

function play(careerId, seed) {
  var dice = Dice.seeded(seed), pick = Dice.seeded(seed + 7777);
  var teacher = Teacher.create(global);
  var s = Career.create(careerId, { ijn: IJN, patrolGame: PG }), n = 0, problems = [], seen = 0, forced = 0;
  var clock = { wp: {}, torpedo: {} }, lastWp = s.war.warPeriod, lastT = s.war.torpedo;
  try {
    while (!s.done) {
      var legal = Career.legalActions(s);
      if (!legal.length) { problems.push('stall in phase ' + s.phase); break; }
      legal.forEach(function (a) { if (!a.rule) problems.push('action without a rule: ' + a.type); });
      if (legal.length === 1) forced++;
      var a = RANDOM ? legal[pick.rollDie(legal.length)] : (teacher.choose(s, legal) || {}).action;
      if (!a) { problems.push('teacher found nothing in ' + s.phase + ' among ' + legal.map(function (x) { return x.type; })); break; }
      Career.apply(s, a, dice);
      if (++n > ACTION_CAP) { problems.push('action cap'); break; }
      if (s.war.warPeriod !== lastWp) { clock.wp[s.war.warPeriod] = War.monthKey(s.career.date); lastWp = s.war.warPeriod; }
      if (s.war.torpedo !== lastT) { clock.torpedo[s.war.torpedo] = War.monthKey(s.career.date); lastT = s.war.torpedo; }
      for (; seen < s.log.length; seen++) {
        var r = s.log[seen];
        if (!r.ruleRef) problems.push('record without a rule: ' + r.context);
        if (r.die !== null && (r.die < 0 || r.die > 9)) problems.push('die out of range: ' + r.context);
      }
    }
  } catch (e) {
    problems.push('crash: ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]);
  }
  var c = s.career;
  return {
    career: careerId, seed: seed, outcome: s.outcome, patrols: c.patrols.length,
    ships: c.own.shipsSunk || 0, tons: Math.round((c.own.tonsSunk || 0) * 10) / 10, packTons: Math.round(s.tonnageSunk * 10) / 10,
    packs: c.patrols.filter(function (p) { return p.pack; }).length, weeks: s.turn, draws: dice.draws,
    hash: fingerprint(s.log), problems: problems, clock: clock, forced: forced, actions: n,
    first: Career.patrolVerdict(c.def, c.patrols[0]) ? Career.patrolVerdict(c.def, c.patrols[0]).level : null
  };
}

var results = [];
BOATS.forEach(function (c) {
  for (var i = 0; i < SEEDS; i++) results.push(play(c.id, BASE + i));
});
var bad = results.filter(function (r) { return r.problems.length; });
console.log((PG ? 'patrol-game soak: ' : 'career soak: ') + results.length + (PG ? ' patrols (' : ' careers (') + BOATS.length + ' boats x ' + SEEDS + ' seeds from ' + BASE + ', ' +
  (RANDOM ? 'random player' : 'teacher') + (IJN ? ', IJN rules on' : '') + '), ' + bad.length + ' with problems');
bad.slice(0, 10).forEach(function (r) { console.log('  ' + r.career + ' seed ' + r.seed + ': ' + r.problems.slice(0, 3).join('; ')); });

BOATS.forEach(function (c) {
  var rs = results.filter(function (r) { return r.career === c.id; });
  var out = {};
  rs.forEach(function (r) { out[r.outcome] = (out[r.outcome] || 0) + 1; });
  var tons = rs.map(function (r) { return r.tons; }).sort(function (a, b) { return a - b; });
  var med = tons[Math.floor(tons.length / 2)];
  var pats = rs.reduce(function (t, r) { return t + r.patrols; }, 0) / rs.length;
  var beat = rs.filter(function (r) { return r.first >= 1; }).length;
  var packs = rs.reduce(function (t, r) { return t + r.packs; }, 0);
  console.log('  ' + (c.id + '        ').slice(0, 8) + ' ' + JSON.stringify(out) + ' · patrols ' + pats.toFixed(1) + (packs ? ' (' + packs + ' as a wolfpack)' : '') +
    ' · tons median ' + med + 'k (p75 ' + tons[Math.floor(tons.length * 0.75)] + 'k, p90 ' + tons[Math.floor(tons.length * 0.9)] + 'k)' +
    ' · first patrol beats the book ' + Math.round(100 * beat / rs.length) + '%');
});
var allTons = results.map(function (r) { return r.tons; }).sort(function (a, b) { return a - b; });
function q(p) { return allTons[Math.floor(allTons.length * p)]; }
console.log('  all careers: tons p25 ' + q(0.25) + 'k, median ' + q(0.5) + 'k, p75 ' + q(0.75) + 'k, p90 ' + q(0.9) + 'k; ' +
  'nothing sunk ' + Math.round(100 * results.filter(function (r) { return r.tons === 0; }).length / results.length) + '%; lost ' +
  Math.round(100 * results.filter(function (r) { return r.outcome === 'lost'; }).length / results.length) + '%');

if (CAL) {
  /* When did the war move, across every career that lived to see it? */
  function spread(list) {
    if (!list.length) return 'never seen';
    list.sort();
    return 'median ' + list[Math.floor(list.length / 2)] + ' (p10 ' + list[Math.floor(list.length * 0.1)] + ', p90 ' + list[Math.floor(list.length * 0.9)] + ', n=' + list.length + ')';
  }
  ['W3', 'W4'].forEach(function (wp) {
    console.log('  war period ' + wp + ': ' + spread(results.map(function (r) { return r.clock.wp[wp]; }).filter(Boolean)));
  });
  ['0', '1', '2'].forEach(function (t) {
    console.log('  Mk-XIV ' + (t > 0 ? '+' : '') + t + ': ' + spread(results.map(function (r) { return r.clock.torpedo[t]; }).filter(Boolean)));
  });
  console.log('  history: W3 ~ early 1943 (Solomons), W4 ~ Oct 1944 (Leyte); Mk-XIV fixed ~ Sep 1943; the book\'s patrols: 0 in 8/43, +1 in 5/44, +2 in 3/45');
}

var BL = path.join(__dirname, 'baselines', 'career_' + BASE + '_' + SEEDS + (RANDOM ? '_random' : '') + (IJN ? '_ijn' : '') + (PG ? '_patrolgames' : '') + '.json');
var fp = results.map(function (r) {
  return { career: r.career, seed: r.seed, outcome: r.outcome, patrols: r.patrols, ships: r.ships, tons: r.tons, weeks: r.weeks, draws: r.draws, hash: r.hash };
});
if (RECORD) {
  fs.writeFileSync(BL, JSON.stringify(fp, null, 0));
  console.log('  baseline recorded: ' + path.relative(root, BL));
} else if (fs.existsSync(BL)) {
  var old = JSON.parse(fs.readFileSync(BL, 'utf8')), same = 0;
  old.forEach(function (o, i) {
    if (JSON.stringify(o) === JSON.stringify(fp[i])) same++;
    else if (same + 3 > i) console.log('  differs: ' + JSON.stringify(o) + ' -> ' + JSON.stringify(fp[i]));
  });
  console.log('  baseline: ' + same + '/' + old.length + ' identical');
  if (same !== old.length) process.exitCode = 1;
}
if (bad.length) process.exitCode = 1;
