'use strict';
/* soak.js — play many seeded patrols headless and prove the engine holds.
 *
 *   node tools/bot/soak.js                         200 patrols from seed 1000, compare to baseline
 *   node tools/bot/soak.js --seeds 500 --seed-base 1
 *   node tools/bot/soak.js --record                write the baseline for this seed range
 *   node tools/bot/soak.js --trace 1003            one patrol's actions + summary as JSON (live_parity.py)
 *
 * A patrol fails the soak if it throws, stalls (no legal action while not
 * over), runs past the turn cap, offers an action with no rule, or produces a
 * record without a rule reference or with a die outside 0..9.
 *
 * The baseline is the fingerprint of every patrol: outcome, turns, ships and
 * tonnage sunk, dice drawn, and a hash of every roll and result. After a
 * presentation change, --check (the default) must report 0 differences.
 */
var fs = require('fs');
var path = require('path');
var G = 'apps/game/';
var root = path.join(__dirname, '..', '..');
function load(rel, name) { global[name] = require(path.join(root, rel))[name]; return global[name]; }
load(G + 'rules/sw_resolution.js', 'SWResolution');
load(G + 'rules/sw_fog.js', 'SWFog');
load(G + 'data/sw_tables.js', 'SWTables');
load(G + 'data/sw_ships.js', 'SWShips');
load(G + 'data/sw_units.js', 'SWUnits');
load(G + 'data/sw_aac.js', 'SWAac');
load(G + 'data/sw_layout.js', 'SWLayout');
load(G + 'data/sw_map.js', 'SWMap');
var SubClasses = load(G + 'data/sw_subclasses.js', 'SWSubClasses');
var Move = load(G + 'rules/sw_movement.js', 'SWMovement');
load(G + 'rules/sw_search.js', 'SWSearch');
load(G + 'rules/sw_combat.js', 'SWCombat');
load(G + 'rules/sw_cups.js', 'SWCups');
var Patrol = load(G + 'rules/sw_patrol.js', 'SWPatrol');
var Dice = require(path.join(root, G + 'rules/sw_dice.js')).SWDice;
var Policy = require('./policy.js');

var TURN_CAP = 400, ACTION_CAP = 20000;

/* Must match startPatrol() in swui.js; live_parity.py proves it does. */
function setup() {
  var cls = SubClasses.get('new_s2');
  return {
    warPeriod: 'W2', torpedoValue: -1, area: 'east_china_sea',
    activeBaseAreas: ['scs1'],
    start: { y: 1943, m: 2 },           // March 1943: radar is fitted [14.12]
    sub: { name: 'USS Spearfish', attack: cls.attack, defense: cls.defense,
           tactical: cls.tactical, endurance: cls.endurance,
           range: cls.range, speed: cls.speed,
           superSkipper: { name: 'Whitaker', value: 1 } }
  };
}

/* FNV-1a over every roll: which table, what die, what result. */
function fingerprint(log) {
  var h = 0x811c9dc5;
  log.forEach(function (r) {
    var s = r.table + '|' + r.die + '|' + r.modifiedDie + '|' + JSON.stringify(r.result) + ';';
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  });
  return ('00000000' + h.toString(16)).slice(-8);
}

function play(seed) {
  var dice = Dice.seeded(seed);
  var policy = Policy.create(seed, Move);
  var s = Patrol.create(setup());
  var actions = [], problems = [], cupTotal = null, gone = 0, forced = [];
  var LEAVE = ['shokaku', 'taiho', 'shinano', 'yamato', 'kaga', 'asahi', 'izumo', 'bv36t'];
  try {
    while (!s.done) {
      var legal = Patrol.legalActions(s);
      if (!legal.length) { problems.push('stall: no legal action in phase ' + s.phase); break; }
      legal.forEach(function (a) { if (!a.rule) problems.push('action without a rule: ' + a.type); });
      var a = policy.choose(s, legal);
      if (!a) { problems.push('policy found nothing in ' + s.phase); break; }
      actions.push(JSON.parse(JSON.stringify(a)));
      /* One legal action is not a decision; the page takes it by itself. */
      forced.push(legal.length === 1);
      Patrol.apply(s, a, dice);
      /* [14.8] conservation: between fights every TDC marker is back in the
       * pool and every Japanese unit is in a cup or out of the game. */
      if (a.type === 'fire') s.units.forEach(function (u) {
        if (u.sunk && !u.counted && LEAVE.indexOf(u.row) > -1) { u.counted = true; gone++; }
      });
      if (a.type === 'end_turn' && s.tdcPool && s.tdcPool.length !== 24) {
        problems.push('TDC pool holds ' + s.tdcPool.length + ' of 24 after clean-up');
      }
      if (a.type === 'end_turn' && s.cups) {
        var inCups = ['A', 'B', 'C', 'D'].reduce(function (n, c) { return n + s.cups[c].length; }, 0);
        if (cupTotal === null) cupTotal = inCups + gone;
        if (inCups + gone !== cupTotal) problems.push('cups hold ' + inCups + ' + ' + gone + ' gone, expected ' + cupTotal);
      }
      if (s.turn > TURN_CAP) { problems.push('turn cap ' + TURN_CAP + ' passed'); break; }
      if (actions.length > ACTION_CAP) { problems.push('action cap passed'); break; }
    }
  } catch (err) {
    problems.push('crash: ' + err.message);
  }
  s.log.forEach(function (r) {
    if (!r.ruleRef) problems.push('record without ruleRef: ' + r.table);
    if (r.die !== null && (r.die < 0 || r.die > 9)) problems.push('die out of range: ' + r.die);
  });
  return {
    actions: actions, problems: problems, forced: forced,
    summary: {
      seed: seed, outcome: s.done ? s.outcome : 'unfinished',
      turns: s.turn, shipsSunk: s.shipsSunk, tonnageSunk: s.tonnageSunk,
      rolls: s.log.length, draws: dice.draws, hash: fingerprint(s.log)
    }
  };
}

function arg(name, dflt) {
  var i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : dflt;
}

if (require.main === module) {
  /* --find-sinking [from]: the first seed whose patrol sinks a ship (browser
   * tests use it so a rules change never leaves them on a seed that no longer
   * fights). */
  if (process.argv.indexOf('--find-sinking') > -1) {
    for (var fs0 = parseInt(arg('--find-sinking', '1000'), 10) || 1000; ; fs0++) {
      if (play(fs0).summary.shipsSunk > 0) { process.stdout.write(String(fs0)); process.exit(0); }
    }
  }
  if (process.argv.indexOf('--trace') > -1) {
    var one = play(parseInt(arg('--trace'), 10));
    process.stdout.write(JSON.stringify(one));
    process.exit(one.problems.length ? 1 : 0);
  }
  var n = parseInt(arg('--seeds', '200'), 10);
  var base = parseInt(arg('--seed-base', '1000'), 10);
  var file = path.join(__dirname, 'baselines', 'soak_' + base + '_' + n + '.json');
  var results = [], bad = 0, counts = {}, nAct = 0, nForced = 0;
  for (var seed = base; seed < base + n; seed++) {
    var r = play(seed);
    results.push(r.summary);
    nAct += r.actions.length;
    nForced += r.forced.filter(Boolean).length;
    counts[r.summary.outcome] = (counts[r.summary.outcome] || 0) + 1;
    if (r.problems.length) { bad++; console.error('seed ' + seed + ': ' + r.problems.slice(0, 3).join('; ')); }
  }
  var turns = results.map(function (x) { return x.turns; }).sort(function (a, b) { return a - b; });
  var sunk = results.reduce(function (t, x) { return t + x.shipsSunk; }, 0);
  console.log('soak: ' + n + ' patrols (seeds ' + base + '-' + (base + n - 1) + '), ' + bad + ' with problems');
  console.log('  outcomes ' + JSON.stringify(counts) + ' · median turns ' + turns[n >> 1] +
              ' (max ' + turns[n - 1] + ') · ships sunk ' + sunk);
  /* Presses per real decision (Ambush v2's measure). Clicking every step,
   * as before 2026-09-20, costs nAct presses for nAct - nForced decisions;
   * with forced steps taken automatically it is one press per decision. */
  console.log('  presses per decision: ' + (nAct / (nAct - nForced)).toFixed(2) + ' if every step is clicked, ' +
              '1.00 with auto-advance (' + nForced + ' of ' + nAct + ' steps are forced)');

  if (process.argv.indexOf('--record') > -1) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(results, null, 1) + '\n');
    console.log('  baseline written: ' + path.relative(root, file));
  } else if (fs.existsSync(file)) {
    var want = JSON.parse(fs.readFileSync(file, 'utf8')), diff = 0;
    want.forEach(function (w, i) {
      if (JSON.stringify(w) !== JSON.stringify(results[i])) {
        diff++;
        if (diff <= 5) console.error('  differs, seed ' + w.seed + ': ' + JSON.stringify(w) + ' -> ' + JSON.stringify(results[i]));
      }
    });
    console.log('  baseline: ' + (want.length - diff) + '/' + want.length + ' identical');
    if (diff) bad++;
  } else {
    console.log('  no baseline for this range (run with --record)');
  }
  process.exit(bad ? 1 : 0);
}

module.exports = { play: play, setup: setup, fingerprint: fingerprint };
