'use strict';
/* The lesson library (apps/game/data/sw_lessons.js) against the engine.
 * Every lesson must replay legally from its seed, show what its title
 * promises, and be exactly what tools/lessons/build_lessons.js produces now
 * (so an engine change that alters a lesson is caught, not shipped stale). */
var t = require('./_harness.js');
var soak = require('./bot/soak.js');                  // loads every module as a global
var Dice = require('../apps/game/rules/sw_dice.js').SWDice;
var Lessons = require('../apps/game/data/sw_lessons.js').SWLessons;
['data/sw_campaign.js:SWCampaignData', 'rules/sw_transit.js:SWTransit', 'rules/sw_war.js:SWWar',
 'rules/sw_base.js:SWBase', 'rules/sw_career.js:SWCareer'].forEach(function (x) {
  var q = x.split(':'); global[q[1]] = require('../apps/game/' + q[0])[q[1]];
});
t.suite('sw_lessons');
var P = global.SWPatrol;

function run(seed, decisions, careerId) {
  var P = careerId ? global.SWCareer : global.SWPatrol;
  var s = careerId ? P.create(careerId) : P.create(soak.setup()), d = Dice.seeded(seed), illegal = null;
  function settle() {
    for (var g = 0; g < 50 && !s.done; g++) { var l = P.legalActions(s); if (l.length !== 1) return; P.apply(s, l[0], d); }
  }
  decisions.forEach(function (a, i) {
    if (illegal || s.done) return;
    settle();
    if (!P.isLegal(s, a)) { illegal = i + ': ' + a.type + ' in ' + s.phase; return; }
    P.apply(s, a, d);
  });
  settle();
  return { s: s, illegal: illegal };
}
function all(L, upTo) { return L.steps.slice(0, upTo).reduce(function (x, st) { return x.concat(st.actions); }, []); }

t.eq(Lessons[0].id, 'rulebook', 'lesson 0 is the rulebook example (the demo tape)');
t.ok(Lessons.length >= 6, 'the library has the rulebook example and five engine lessons (' + Lessons.length + ')');
t.eq(Lessons.filter(function (L) { return L.career; }).map(function (L) { return L.id; }), ['port', 'transit', 'mission', 'war', 'wolfpack', 'tender'],
  'Phases 6-7: six career lessons, each found in a real career');

Lessons.filter(function (L) { return !L.tape; }).forEach(function (L) {
  var r = run(L.seed, all(L, L.steps.length), L.career);
  t.ok(!r.illegal, L.id + ': every step is legal when replayed (' + r.illegal + ')');
  t.ok(L.start >= 0 && L.start < L.steps.length, L.id + ': starts inside the lesson');
  t.ok(L.tryAt === null || (L.tryAt >= L.start && L.tryAt < L.steps.length), L.id + ': the take-the-helm point is inside it');
  t.ok(L.steps.slice(L.start).every(function (st) { return st.why && st.why.length > 20; }),
    L.id + ': every step the learner sees carries the captain\'s reason');
  t.ok(L.steps.every(function (st) { return st.actions.every(function (a) { return a.rule; }); }), L.id + ': every action cites its rule');
  var log = r.s.log, part = all(L, L.steps.length);
  switch (L.id) {
    case 'search':
      t.ok(log.some(function (x) { return x.turn === 1 && /^Area Activity/.test(x.table); }) &&
           !log.some(function (x) { return x.turn === 1 && /^Engagement/.test(x.table); }), 'search: week 1 finds nothing');
      t.ok(log.some(function (x) { return /^Endurance/.test(x.table) && x.drms.some(function (d) { return d.value === -1; }); }),
        'search: the empty week gives −1 on Endurance, which helps it stay out [14.7]');
      t.ok(log.some(function (x) { return /^Engagement/.test(x.table); }), 'search: a later search makes contact');
      break;
    case 'attack':
      t.ok(r.s.shipsSunk >= 1, 'attack: the lesson ends with a ship sunk');
      t.ok(part.some(function (a) { return a.type === 'place'; }) && part.some(function (a) { return a.type === 'fire'; }),
        'attack: column, then fire');
      break;
    case 'reattack':
      t.ok(part.some(function (a) { return a.type === 'reattack'; }), 'reattack: the captain re-attacks');
      t.ok(log.some(function (x) { return /^Counterattack/.test(x.table) && x.drms.some(function (d) { return /Re-Attack/.test(d.label); }); }),
        'reattack: the second counterattack carries the +1 [14.2C2]');
      break;
    case 'home':
      t.eq(r.s.outcome, 'returned', 'home: the boat reaches base');
      t.ok(log.some(function (x) { return /^Endurance/.test(x.table) && /RTB/.test(String(x.result)); }), 'home: a failed Endurance roll sent it');
      t.ok(part.some(function (a) { return a.type === 'transit'; }), 'home: it transits');
      break;
    case 'lost':
      t.eq(r.s.outcome, 'lost', 'lost: the boat is sunk');
      break;
    case 'radar':
      t.ok(part.some(function (a) { return a.type === 'unflip'; }), 'radar: the captain unflips a unit');
      break;
    case 'events':
      t.ok(log.some(function (x) { return x.context === 'Combat Event'; }), 'events: a Combat Event is rolled');
      break;
    case 'subvssub':
      t.ok(log.some(function (x) { return x.table === 'Sub vs. Sub [14.6B]'; }), 'subvssub: an enemy submarine is met');
      break;
    case 'port':
      t.ok(part.some(function (a) { return a.type === 'rtb_to'; }), 'port: the captain chooses a base [15.2]');
      t.ok(log.some(function (x) { return x.table === 'Repair [10.0]'; }), 'port: the boat goes through the Repair Boxes [10.0]');
      t.ok(log.some(function (x) { return /Readying/.test(x.table); }), 'port: then it is readied [9.0]');
      t.eq(part[part.length - 1].type, 'sail', 'port: and sails again');
      break;
    case 'transit':
      t.ok(log.some(function (x) { return x.table === 'Transit Event Table [19.1]'; }), 'transit: a Transit Event happens [19.1]');
      break;
    case 'mission':
      t.ok(part.some(function (a) { return a.type === 'enter_smz'; }), 'mission: the boat enters the mission zone [20.3]');
      t.ok(log.some(function (x) { return x.table === 'War Events Table [5.0]'; }), 'mission: a War Event sent it [5.0]');
      break;
    case 'war':
      t.ok(log.some(function (x) { return x.table === 'Reinforcements [8.0C]'; }), 'war: the boat is withdrawn for overhaul [8.0C]');
      t.ok(log.some(function (x) { return x.table === 'Reinforcements [8.0D]'; }), 'war: and returns [8.0D]');
      break;
    case 'wolfpack':
      t.ok(part.filter(function (a) { return a.type === 'place'; }).length >= 3, 'wolfpack: every boat is placed [24.5]');
      t.ok(part.filter(function (a) { return a.type === 'fire'; }).length >= 2, 'wolfpack: at least two boats fire [24.53]');
      break;
    case 'tender':
      t.ok(log.some(function (x) { return /At the tender|Minor repairs/.test(x.context); }), 'tender: the boat puts in at a tender [21.2]');
      t.eq(part[part.length - 1].type, 'sail', 'tender: and sails again');
      break;
    default:
      t.ok(false, 'unknown lesson ' + L.id);
  }
});

/* Drills: each replays legally to a moment where its decision is on offer. */
var Drills = require('../apps/game/data/sw_lessons.js').SWDrills;
t.eq(Drills.map(function (D) { return D.id; }), ['column', 'aim', 'reattack'], 'three drills, in boot-camp order');
Drills.forEach(function (D) {
  var r = run(D.seed, D.prefix);
  t.ok(!r.illegal && !r.s.done, D.id + ' drill: the prefix replays legally (' + r.illegal + ')');
  var legal = P.legalActions(r.s);
  t.ok(legal.some(function (a) { return D.types.indexOf(a.type) > -1 || (D.id === 'aim' && a.type === 'target'); }),
    D.id + ' drill: its decision is on offer at the start (' + r.s.phase + ')');
  t.ok(P.isLegal(r.s, D.captain.action), D.id + ' drill: the captain\'s answer is legal there');
  t.ok(D.captain.why && D.task, D.id + ' drill: has a task and the captain\'s reason');
});

/* The shipped file is what the builder makes today. */
var B = require('./lessons/build_lessons.js');
var fresh = B.build().concat(B.buildCareerLessons());
t.eq(JSON.stringify(fresh), JSON.stringify(Lessons), 'sw_lessons.js is up to date with the builder and the engine');
t.eq(JSON.stringify(require('./lessons/build_lessons.js').buildDrills()), JSON.stringify(Drills), '...and so are the drills');
t.done();
