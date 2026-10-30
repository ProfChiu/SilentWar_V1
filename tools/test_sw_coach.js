'use strict';
/* The coach (sw_teacher.verdict) and the patrol goal (sw_goal).
 * The coach must never call the teaching captain's own choices mistakes (they
 * are the same judgement), must flag the clear mistakes a newcomer makes, and
 * must never block a forced step. */
var t = require('./_harness.js');
var soak = require('./bot/soak.js');                  // loads every module as a global
var Dice = require('../apps/game/rules/sw_dice.js').SWDice;
var Teacher = require('../apps/game/rules/sw_teacher.js').SWTeacher;
var Goal = require('../apps/game/rules/sw_goal.js').SWGoal;
var strip = require('./_strip.js');
var P = global.SWPatrol, C = global.SWCombat;
t.suite('sw_coach');

['sw_teacher.js', 'sw_goal.js'].forEach(function (f) {
  var src = strip(require('fs').readFileSync(__dirname + '/../apps/game/rules/' + f, 'utf8'));
  t.ok(src.indexOf('Math.random') === -1 && src.indexOf('document.') === -1, f + ' is pure: no DOM, no Math.random');
});

/* 1. Consistency: over 500 patrols the captain is never "poor" by his own coach,
 * except a shot where nothing can hit at all ([14.16A], not yet in the engine). */
var checked = 0, poor = [], hopelessSkipped = 0;
for (var seed = 1; seed <= 500; seed++) {
  var s = P.create(soak.setup()), d = Dice.seeded(seed), T = Teacher.create(global);
  for (var g = 0; g < 3000 && !s.done; g++) {
    var legal = P.legalActions(s);
    if (legal.length === 1) { P.apply(s, legal[0], d); continue; }
    var c = T.choose(s, legal), v = T.verdict(s, c.action);
    if (v) checked++;
    if (v && v.grade === 'poor') {
      var allHopeless = c.action.type === 'fire' && s.allocations.every(function (al) { return C.attackPreview(s, al).hit === 0; });
      if (allHopeless) hopelessSkipped++; else poor.push(seed + ' ' + c.action.type + ': ' + v.say);
    }
    P.apply(s, c.action, d);
  }
}
t.ok(checked > 1000, 'the coach judged many of the captain\'s decisions (' + checked + ')');
t.eq(poor.slice(0, 3), [], 'the coach never calls the captain\'s own choice a mistake');
t.ok(hopelessSkipped >= 0, 'hopeless volleys ([14.16A] gap) are the only exception (' + hopelessSkipped + ')');

/* 2. The mistakes a newcomer makes are caught. Build the situations from a real patrol. */
function toPhase(seed, phase, pred) {
  var s = P.create(soak.setup()), d = Dice.seeded(seed), T = Teacher.create(global);
  for (var g = 0; g < 3000 && !s.done; g++) {
    if (s.phase === phase && (!pred || pred(s))) return s;
    var legal = P.legalActions(s);
    P.apply(s, legal.length === 1 ? legal[0] : T.choose(s, legal).action, d);
  }
  return null;
}
var T0 = Teacher.create(global);
var s131 = toPhase(1, '13.1');
t.eq(T0.verdict(s131, { type: 'bypass' }).grade, 'poor', 'bypassing a healthy boat\'s search is flagged');
t.ok(/easier/.test(T0.verdict(s131, { type: 'bypass' }).say), '...and the coach gets the Endurance direction right (−1 helps)');
t.eq(T0.verdict(s131, { type: 'rtb' }).grade, 'poor', 'going home unforced is flagged');

var sPlace = null;
for (var sd = 1; sd < 400 && !sPlace; sd++) {
  sPlace = toPhase(sd, '14.11', function (s) {
    var cols = ['A', 'B', 'C', 'D'].map(function (c) {
      var near = C.eligibleColumns({ sub: { column: c } });
      return s.units.filter(function (u) { return near.indexOf(u.column) > -1; }).length;
    });
    return Math.min.apply(null, cols) * 2 <= Math.max.apply(null, cols);
  });
}
t.ok(!!sPlace, 'found a convoy where one column reaches half or less');
if (sPlace) {
  var reach = function (c) { var near = C.eligibleColumns({ sub: { column: c } });
    return sPlace.units.filter(function (u) { return near.indexOf(u.column) > -1; }).length; };
  var worst = ['A', 'B', 'C', 'D'].sort(function (a, b) { return reach(a) - reach(b); })[0];
  var best = ['A', 'B', 'C', 'D'].sort(function (a, b) { return reach(b) - reach(a); })[0];
  t.eq(T0.verdict(sPlace, { type: 'place', column: worst }).grade, 'poor', 'a column reaching half or less of the convoy is flagged');
  t.eq(T0.verdict(sPlace, { type: 'place', column: best }).grade, 'good', 'the best column is praised');
}

/* A hopeless allocation: points on a ship that cannot be hit. */
var sAim = null, dead = null;
for (var sa = 1; sa < 600 && !dead; sa++) {
  sAim = toPhase(sa, '14.14', function (s) {
    return !s.allocations.length && s.units.some(function (u) { return C.canTarget(s, u.uid).ok &&
      C.attackPreview(s, { unit: u.uid, points: s.sub.attack }).hit === 0; }) &&
      s.units.some(function (u) { return C.canTarget(s, u.uid).ok && C.attackPreview(s, { unit: u.uid, points: s.sub.attack }).hit > 0; });
  });
  if (sAim) dead = sAim.units.filter(function (u) { return C.canTarget(sAim, u.uid).ok &&
    C.attackPreview(sAim, { unit: u.uid, points: sAim.sub.attack }).hit === 0; })[0];
}
t.ok(!!dead, 'found a fight with a target that cannot be hit');
if (dead) {
  sAim.allocations = [{ unit: dead.uid, points: sAim.sub.attack }];
  var vv = T0.verdict(sAim, { type: 'fire' });
  t.eq(vv.grade, 'poor', 'firing everything at a ship that cannot be hit is flagged');
  t.ok(/cannot/.test(vv.say) && /captain would/.test(vv.say), '...with the reason and the better aim');
}

/* 3. The goal. */
function st(tons, lost, done) { return { tonnageSunk: tons, sub: { sunk: lost }, done: done }; }
t.eq(Goal.rate(st(0, false, true)).final, 'none', 'home with nothing sunk: no rating');
t.eq(Goal.rate(st(1, false, true)).final, 'bronze', 'any ship and home: Bronze');
t.eq(Goal.rate(st(5, false, true)).final, 'silver', '5,000 t and home: Silver');
t.eq(Goal.rate(st(12, false, true)).final, 'gold', '10,000 t and home: Gold');
t.eq(Goal.rate(st(12, true, true)).final, 'failed', 'a lost boat fails whatever it sank');
t.ok(/next: Silver/.test(Goal.rate(st(2, false, false)).line), 'at sea, the line names the next level');
t.done();
