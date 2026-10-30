'use strict';
/* build_lessons.js — find, in real seeded patrols, the clearest example of
 * each thing a new player needs to see, and write them as lesson data.
 *
 *   node tools/lessons/build_lessons.js            writes apps/game/data/sw_lessons.js
 *   node tools/lessons/build_lessons.js --check    exits 1 if the file is out of date
 *
 * Every lesson is a patrol the real engine plays from a seed, with the choices
 * of the teaching captain (tools/bot/teacher.js) and the captain's one-line
 * reason for each, computed from the engine's own odds. Nothing is scripted by
 * hand, so a lesson cannot teach a rule the engine does not play.
 *
 * A lesson is a list of steps. A step is one decision as a player would take
 * it: a single click, or a run of clicks of one kind (four reveals, the points
 * of one aim). Steps before `start` are fast-forwarded when the lesson opens.
 * Forced steps (one legal action) are never in the list: the page takes them
 * by itself, exactly as in a patrol.
 */
var fs = require('fs');
var path = require('path');
var soak = require('../bot/soak.js');                 // loads every module as a global
var Teacher = require('../bot/teacher.js');
var Dice = require('../../apps/game/rules/sw_dice.js').SWDice;
var P = global.SWPatrol;
/* Phase 6: careers play through the career engine; load it and its helpers. */
['data/sw_campaign.js:SWCampaignData', 'rules/sw_transit.js:SWTransit', 'rules/sw_war.js:SWWar',
 'rules/sw_base.js:SWBase', 'rules/sw_career.js:SWCareer'].forEach(function (x) {
  var q = x.split(':'); global[q[1]] = require('../../apps/game/' + q[0])[q[1]];
});
var C = global.SWCareer;
var OUT = path.join(__dirname, '..', '..', 'apps', 'game', 'data', 'sw_lessons.js');
var SEEDS = 4000;

/* Play one patrol (or, with careerId, one career) with the teacher; return
 * every decision with its context. */
function play(seed, careerId) {
  var P = careerId ? C : global.SWPatrol;
  var s = careerId ? C.create(careerId) : P.create(soak.setup()), d = Dice.seeded(seed), t = Teacher.create(global);
  var decisions = [];
  function settle() {
    for (var g = 0; g < 50 && !s.done; g++) {
      var l = P.legalActions(s);
      if (l.length !== 1) return;
      P.apply(s, l[0], d);
    }
  }
  for (var guard = 0; guard < (careerId ? 20000 : 2000) && !s.done; guard++) {
    settle();
    if (s.done) break;
    var legal = P.legalActions(s);
    var c = t.choose(s, legal);
    var before = { phase: s.phase, turn: s.turn, logAt: s.log.length, sunk: s.shipsSunk, damaged: s.sub.damaged, rtb: s.sub.rtb,
                   box: s.career ? s.career.box : null };
    /* At a fire: the best shot's odds (a lesson must not star a hopeless one)
     * and what the escorts' answer risks. */
    var fireInfo = null, ctx = {};
    if (s.phase === '12.0') {
      var odds = legal.filter(function (a) { return a.type === 'move'; }).map(function (m) {
        return global.SWSearch.preview({ area: m.area, warPeriod: s.warPeriod, spotted: s.sub.spotted }).contact; });
      odds.push(global.SWSearch.preview({ area: s.area, warPeriod: s.warPeriod, spotted: s.sub.spotted }).contact);
      ctx.spread = Math.max.apply(null, odds) - Math.min.apply(null, odds);
    }
    if (s.phase === '14.11') {
      var reach = ['A', 'B', 'C', 'D'].map(function (col) {
        var near = global.SWCombat.eligibleColumns({ sub: { column: col } });
        return s.units.filter(function (u) { return near.indexOf(u.column) > -1; }).length;
      });
      ctx.reachSpread = Math.max.apply(null, reach) - Math.min.apply(null, reach);
    }
    if (s.phase === '14.14' && !s.allocations.length) {
      var cands = s.units.filter(function (u) { return global.SWCombat.canTarget(s, u.uid).ok; });
      ctx.targets = cands.length;
      ctx.hopeless = cands.filter(function (u) { return global.SWCombat.attackPreview(s, { unit: u.uid, points: s.sub.attack }).hit === 0; }).length;
      var bestAim = t.aim(s);
      ctx.bestSink = bestAim ? bestAim.split.reduce(function (m, w) {
        var pv = global.SWCombat.attackPreview(s, w); return Math.max(m, pv.sinkChance || 0); }, 0) : 0;
    }
    if (s.phase === '14.3' && legal.some(function (a) { return a.type === 'reattack'; })) {
      ctx.reRisk = global.SWCombat.counterattackPreview(s, true).odds.sunk;
    }
    if (c.action.type === 'fire') {
      fireInfo = { bestHit: Math.max.apply(null, s.allocations.map(function (al) { return global.SWCombat.attackPreview(s, al).hit; })),
                   ca: global.SWCombat.counterattackPreview(s, false).odds };
    }
    P.apply(s, c.action, d);
    settle();
    decisions.push({ action: JSON.parse(JSON.stringify(c.action)), why: c.why, before: before, fire: fireInfo, ctx: ctx,
                     records: s.log.slice(before.logAt), after: { phase: s.phase, turn: s.turn, done: s.done,
                     outcome: s.outcome, sunk: s.shipsSunk, damaged: s.sub.damaged, rtb: s.sub.rtb, lost: s.sub.sunk,
                     box: s.career ? s.career.box : null, atSea: s.career ? s.career.atSea : null } });
  }
  return { seed: seed, decisions: decisions, final: s };
}

/* Group decisions into steps a learner presses ▶ for. */
var GROUP = { reveal: 'reveal', tdc: 'tdc', target: 'aim', points: 'aim' };
function stepsOf(decisions) {
  var steps = [];
  decisions.forEach(function (dc, i) {
    var g = GROUP[dc.action.type];
    var last = steps[steps.length - 1];
    if (g && last && last.group === g && last.phase === dc.before.phase) {
      last.actions.push(dc.action);
      last.last = i;
      if (dc.why) last.why = dc.why;
      return;
    }
    steps.push({ group: g || dc.action.type, phase: dc.before.phase, turn: dc.before.turn, first: i, last: i,
                 actions: [dc.action], why: dc.why, fire: dc.fire });
  });
  /* An aim step is explained by the fire that follows it. */
  steps.forEach(function (st, k) {
    if (st.group === 'aim' && steps[k + 1] && steps[k + 1].group === 'fire') {
      st.why = 'Aim. ' + steps[k + 1].why.replace(/^Fire: /, 'The captain puts ');
      var ca = steps[k + 1].fire ? steps[k + 1].fire.ca : null;
      steps[k + 1].why = 'Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer' +
        (ca ? ': no damage ' + Math.round(ca.none * 100) + '%, damaged ' + Math.round((ca.damaged + ca.damaged_rtb) * 100) +
              '%, sunk ' + Math.round(ca.sunk * 100) + '%.' : '.');
    }
    if (st.group === 'reveal') st.why = 'Reveal ' + st.actions.length + ' counter' + (st.actions.length === 1 ? '' : 's') + '. ' + st.why.replace(/^Reveal: /, '');
    if (st.group === 'tdc') st.why = 'Place ' + st.actions.length + ' firing solution' + (st.actions.length === 1 ? '' : 's') + '. ' +
      'The captain prefers cargo to escorts. The markers are face down: good or bad shows when they turn over.';
  });
  return steps;
}

function stepIndexOfDecision(steps, i) {
  for (var k = 0; k < steps.length; k++) if (i >= steps[k].first && i <= steps[k].last) return k;
  return -1;
}

/* The lessons: what each must show, and where it starts and ends. Each finder
 * returns { start, end, tryAt } as decision indices, or null. */
var LESSONS = [
  { id: 'search', title: 'Moving and searching',
    summary: 'A week at sea: where to go, what the search roll means, and why an empty week is easier on endurance.',
    learn: ['Move one area a week, within Range of base [12.0]', 'The search die on the printed Area Activity Chart [13.2A]',
            'No contact: −1 on the Endurance roll, which helps the boat stay out [14.7]', 'Contact: the Contact and Engagement tables [13.2B-C]'],
    find: function (r) {
      var D = r.decisions;
      var s1 = D.findIndex(function (d) { return d.action.type === 'search' && d.before.turn === 1; });
      if (s1 < 0 || D[s1].records.some(function (x) { return /^Engagement/.test(x.table); })) return null;
      var s2 = D.findIndex(function (d, i) { return i > s1 && d.action.type === 'search'; });
      if (s2 < 0 || !D[s2].records.some(function (x) { return /^Engagement/.test(x.table); })) return null;
      if (!D.slice(0, s2).some(function (d) { return d.action.type === 'move'; })) return null;
      return { start: 0, end: s2, tryAt: null, score: s2 };
    } },
  { id: 'attack', title: 'Setting up an attack',
    summary: 'From contact to torpedoes: pick a column, reveal, place firing solutions, aim, fire, and take the counterattack.',
    learn: ['Your column reaches its neighbours only [14.11]', 'Tactical rating: reveals and TDC markers [14.12-14.13]',
            'Aiming: points against defence + escorts + TDC [14.14-14.15]', 'The Attack Results Table and the counterattack [14.15D, 14.2]'],
    find: function (r) {
      var D = r.decisions;
      var p = D.findIndex(function (d) { return d.action.type === 'place'; });
      if (p < 0) return null;
      var f = D.findIndex(function (d, i) { return i > p && d.action.type === 'fire'; });
      if (f < 0 || !(D[f].after.sunk > D[f].before.sunk)) return null;
      var aim = D.findIndex(function (d, i) { return i > p && (d.action.type === 'target'); });
      var targets = D.slice(p, f).filter(function (d) { return d.action.type === 'target'; }).length;
      return { start: p, end: f, tryAt: aim, score: (f - p) + (targets > 1 ? 0 : 5) };
    } },
  { id: 'reattack', title: 'The counterattack and the Re-Attack gamble',
    summary: 'After the first round: break off, or go again for more tonnage at a +1 risk. Watch the captain weigh it, and the escorts answer.',
    learn: ['What the escorts add up to [14.2A]', 'Re-Attack: TDC markers improve, the counterattack is +1 [14.4, 14.2C2]',
            'Reading the odds before you commit'],
    find: function (r) {
      var D = r.decisions;
      var ra = D.findIndex(function (d) { return d.action.type === 'reattack'; });
      if (ra < 0) return null;
      var p = -1;
      for (var i = ra; i >= 0; i--) if (D[i].action.type === 'place') { p = i; break; }
      var w = D.findIndex(function (d, i) { return i > ra && (d.action.type === 'withdraw' || d.after.done); });
      if (p < 0 || w < 0) return null;
      var hurt = D.slice(ra, w + 1).some(function (d) { return d.after.damaged || d.after.lost ||
        d.records.some(function (x) { return /^Counterattack/.test(x.table) && x.result !== 'none' && /spotted|damaged/.test(String(x.result)); }); });
      /* a real volley in both rounds: since [14.16A], a round where nothing
       * can be hit has no Fire at all, and that is not this lesson */
      var fire1 = D.findIndex(function (d, i) { return i > p && i < ra && d.action.type === 'fire'; });
      var fire2 = D.findIndex(function (d, i) { return i > ra && i < w && d.action.type === 'fire'; });
      if (fire1 < 0 || fire2 < 0) return null;
      return { start: fire1, end: w, tryAt: ra, score: (w - p) + (hurt ? 0 : 20) };
    } },
  { id: 'home', title: 'Endurance and the trip home',
    summary: 'Fuel, food and torpedoes run out: a failed Endurance roll sends the boat home, and the long transit back to base.',
    learn: ['The Endurance roll [14.7]', 'Return To Base and Transit at Speed [15.0]', 'Ending a patrol at base [16.0]'],
    find: function (r) {
      var D = r.decisions;
      if (r.final.outcome !== 'returned') return null;
      var fail = D.findIndex(function (d) { return d.records.some(function (x) { return /^Endurance/.test(x.table) && /RTB/.test(String(x.result)); }); });
      if (fail < 0) return null;
      var weekStart = fail;
      while (weekStart > 0 && D[weekStart - 1].before.turn === D[fail].before.turn) weekStart--;
      var transits = D.filter(function (d) { return d.action.type === 'transit'; }).length;
      if (!transits) return null;
      return { start: weekStart, end: D.length - 1, tryAt: null, score: (D.length - weekStart) + (transits < 2 ? 3 : 0) };
    } },
  { id: 'radar', title: 'Radar: hiding an escort',
    summary: 'From 1943 the boat has radar: the captain turns a revealed destroyer back face down, so its ASW counts against neither your torpedoes nor you.',
    learn: ['Radar unflip: one unit per round, the one just revealed [14.12]', 'Why a face-down escort is safer than a revealed one [14.15B2, 14.2A1]',
            'Another counter must be revealed in its place [14.12]'],
    find: function (r) {
      var D = r.decisions;
      var u = D.findIndex(function (d) { return d.action.type === 'unflip'; });
      if (u < 0) return null;
      var p = -1;
      for (var i = u; i >= 0; i--) if (D[i].action.type === 'place') { p = i; break; }
      var f = D.findIndex(function (d, i) { return i > u && d.action.type === 'fire'; });
      if (p < 0 || f < 0) return null;
      return { start: p, end: f, tryAt: u, score: f - p };
    } },
  { id: 'events', title: 'Combat Events',
    summary: 'One counter in each cup is a Combat Event: when it turns up, one die decides what happens to this attack round. Watch one change a fight.',
    learn: ['Only one Event per attack round; a second goes back to the cup [14.12]', 'The ten Events and what each changes [19.2]',
            '"The results of the Event supersede the rules" [19.2]'],
    find: function (r) {
      var D = r.decisions, SHOWN = [0, 1, 5, 7, 9];
      var e = D.findIndex(function (d) { return d.records.some(function (x) { return x.context === 'Combat Event' && SHOWN.indexOf(x.die) > -1; }); });
      if (e < 0) return null;
      /* the boat must live to see the Event play out */
      if (D.slice(e).some(function (d) { return d.after.lost; })) return null;
      var p = -1;
      for (var i = e; i >= 0; i--) if (D[i].action.type === 'place') { p = i; break; }
      var w = D.findIndex(function (d, i) { return i > e && (d.before.phase === '14.3' || d.after.done); });
      if (p < 0 || w < 0 || w - e < 2) return null;
      /* ...and the Event must show: a volley, the lumbering ship, or the guns */
      if (!D.slice(e, w).some(function (d) { return ['fire', 'lumber', 'gunnery'].indexOf(d.action.type) > -1; })) return null;
      return { start: p, end: w, tryAt: null, score: w - p };
    } },
  { id: 'subvssub', title: 'Enemy submarine!',
    summary: 'Two zeros on the activity chart: an enemy submarine. Who sees whom first decides who fires; one round, no escorts, no second chance.',
    learn: ['When a search finds a submarine [13.2A]', 'Detection: −1 spotted or damaged, +1 radar [14.6B]',
            'One attack round, the 1-4 line of the ART [14.6E-F]'],
    find: function (r) {
      var D = r.decisions;
      var s = D.findIndex(function (d) { return d.records.some(function (x) { return x.table === 'Sub vs. Sub [14.6B]'; }); });
      if (s < 0) return null;
      var start = s;
      while (start > 0 && D[start - 1].before.turn === D[s].before.turn) start--;
      return { start: start, end: s, tryAt: null, score: s - start };
    } },
  { id: 'lost', title: 'When the escorts win',
    summary: 'Red boxes on the chart and revealed escorts add up. A fight that goes wrong, and why the odds allowed it.',
    learn: ['Red boxes: every busy area bites back [14.2A2]', 'How a boat is lost [14.2]', 'Why concentrating escorts in reach is dangerous'],
    find: function (r) {
      var D = r.decisions;
      if (r.final.outcome !== 'lost') return null;
      var p = -1;
      for (var i = D.length - 1; i >= 0; i--) if (D[i].action.type === 'place') { p = i; break; }
      if (p < 0) return null;
      return { start: p, end: D.length - 1, tryAt: null, score: D.length - p };
    } }
];

/* Phase 6: career lessons, found in careers the captain plays. Each finder
 * returns { start, end, tryAt, score } as decision indices, or null. */
function recs(D, i, re) { return D[i].records.some(function (x) { return re.test(x.table) || re.test(String(x.result)); }); }
var CAREER_LESSONS = [
  { id: 'port', title: 'Home, repair and ready',
    summary: 'A damaged boat makes for base, works through the Repair Boxes a week at a time, is readied and sails again.',
    learn: ['Choosing a base to return to [15.2]', 'Damage is fixed on arrival: the Damage Table [18.3]',
            'Repair Boxes 3, 2, 1: one die a week against the printed number [10.0]', 'Readiness from the Broom Box [9.0]'],
    find: function (r) {
      var D = r.decisions;
      for (var i = 0; i < D.length; i++) {
        if (D[i].action.type !== 'rtb_to' || !D[i].before.damaged) continue;
        var sail = D.findIndex(function (d, k) { return k > i && d.action.type === 'sail'; });
        if (sail < 0) continue;
        var repaired = D.slice(i, sail + 1).some(function (d) { return d.records.some(function (x) { return x.table === 'Repair [10.0]'; }); });
        if (!repaired) continue;
        return { start: i, end: sail, tryAt: null, score: sail - i };
      }
      return null;
    } },
  { id: 'transit', title: 'Out and home: Transit Events',
    summary: 'Every trip across open water rolls once for a Transit Event on the most dangerous chart on the route. Watch one happen.',
    learn: ['Sailing: up to Speed areas a week on the Transit side [15.1]', 'The governing chart: where the red boxes start lowest [19.1]',
            'Rolling at or above that number: two dice on the Transit Event Table [19.1]'],
    find: function (r) {
      var D = r.decisions;
      for (var i = 0; i < D.length; i++) {
        if (['sail', 'transit_on', 'rtb_to'].indexOf(D[i].action.type) < 0) continue;
        if (!D[i].records.some(function (x) { return x.table === 'Transit Event Table [19.1]'; })) continue;
        if (D.slice(i).some(function (d) { return d.after.lost; }) && i > D.length - 3) continue;
        var start = i;
        while (start > 0 && ['sail', 'transit_on', 'rtb_to'].indexOf(D[start - 1].action.type) > -1) start--;
        return { start: start, end: Math.min(D.length - 1, i + 1), tryAt: null, score: i - start + (D[i].action.type === 'sail' ? 0 : 2) };
      }
      return null;
    } },
  { id: 'mission', title: 'Special Mission orders',
    summary: 'A War Event sends boats to an operation. Yours is in reach, so it goes: into the zone, with only the contacts the orders allow.',
    learn: ['War Events and Special Missions [5.0]', 'Entering a Special Mission Zone: +2 on the Transit Event check [20.3]',
            'One Activity Level higher in the zone; only TF (or C2 and TF) contacts count [20.4]', 'No Endurance roll; then home [20.5]'],
    find: function (r) {
      var D = r.decisions;
      var z = D.findIndex(function (d) { return d.action.type === 'enter_smz'; });
      if (z < 0) return null;
      var end = D.findIndex(function (d, k) { return k > z && (d.action.type === 'rtb_to' || d.after.done); });
      if (end < 0) return null;
      if (D.slice(z, end + 1).some(function (d) { return d.after.lost; })) return null;
      return { start: z, end: end, tryAt: null, score: end - z };
    } },
  { id: 'war', title: 'The war moves on',
    summary: 'The Master Reinforcement list sends the boat to California for overhaul. The war does not wait: months pass, then the boat is back at Pearl Harbor.',
    learn: ['Withdrawal for overhaul, even from sea [8.0C]', 'Return months later to Pearl Harbor [8.0D]',
            'Meanwhile: War Events, ULTRA, torpedo fixes and War Progress [5.0-7.0, 17.0]'],
    find: function (r) {
      var D = r.decisions;
      var w = D.findIndex(function (d) { return d.records.some(function (x) { return x.table === 'Reinforcements [8.0C]'; }); });
      if (w < 0) return null;
      var sail = D.findIndex(function (d, k) { return k > w && d.action.type === 'sail'; });
      if (sail < 0) return null;
      var start = w;
      return { start: start, end: sail, tryAt: sail, score: sail - start };
    } }
];

/* Phase 7 */
CAREER_LESSONS.push(
  { id: 'wolfpack', title: 'A wolfpack fight',
    summary: 'Three boats find a convoy together. Each takes its turn to reveal, aim and fire, and each takes its own counterattack; then the pack may go round once more.',
    learn: ['Group or Barrier: how a pack searches [24.3]', 'Placing the boats, no more than two to a column [24.5]',
            'One boat at a time, with its own escort level [24.53-24.54]', 'The pack\'s Re-Attack: every boat rolls to join in [24.55]'],
    find: function (r) {
      var D = r.decisions;
      for (var i = 0; i < D.length; i++) {
        if (D[i].action.type !== 'search' || !D[i].records.some(function (x) { return /^Engagement/.test(x.table); })) continue;
        if (!D[i + 1] || D[i + 1].before.phase !== '14.11') continue;
        var places = 0, k = i + 1, fires = 0;
        for (; k < D.length && D[k].before.turn === D[i].before.turn; k++) {
          if (D[k].action.type === 'place') places++;
          if (D[k].action.type === 'fire') fires++;
        }
        if (places < 3 || fires < 2) continue;
        if (D.slice(i, k).some(function (d) { return d.after.lost; })) continue;
        return { start: i, end: k - 1, tryAt: null, score: k - i };
      }
      return null;
    } },
  { id: 'tender', title: 'The forward base',
    summary: 'A submarine tender in a mission zone is a base close to the hunting grounds: the boat puts in there, is readied, and sails again without the long run from Pearl Harbor.',
    learn: ['Forward bases: tenders in Special Mission Zones [21.1-21.2]', 'Leaving and entering one costs no Speed [15.1 note]',
            'Only Superficial damage is fixed there [21.23]', 'Readied from the Broom Box, or a week at Ship Side [9.0]'],
    find: function (r) {
      var D = r.decisions, FB = global.SWCampaignData.forwardBases;
      for (var i = 0; i < D.length; i++) {
        if (D[i].action.type !== 'rtb_to' || !FB[D[i].action.base]) continue;
        if (!D.slice(i).some(function (d) { return d.records.some(function (x) { return /At the tender|Minor repairs/.test(x.context); }); })) continue;
        var sail = D.findIndex(function (d, k) { return k > i && d.action.type === 'sail'; });
        if (sail < 0) continue;
        return { start: i, end: sail, tryAt: sail, score: sail - i };
      }
      return null;
    } }
);

function buildCareerLessons() {
  var found = {};
  var ids = global.SWCampaignData.careers.filter(function (c) { return !c.patrolOnly; }).map(function (c) { return c.id; });
  for (var seed = 1; seed <= 120; seed++) {
    ids.forEach(function (cid) {
      var r = play(seed, cid);
      CAREER_LESSONS.forEach(function (L) {
        var f = L.find(r);
        if (!f) return;
        if (!found[L.id] || f.score < found[L.id].f.score) found[L.id] = { r: r, f: f, career: cid };
      });
    });
  }
  return CAREER_LESSONS.map(function (L) {
    var hit = found[L.id];
    if (!hit) throw new Error('no career shows lesson ' + L.id);
    var steps = stepsOf(hit.r.decisions.slice(0, hit.f.end + 1));
    return {
      id: L.id, title: L.title, summary: L.summary, learn: L.learn, seed: hit.r.seed, career: hit.career,
      start: stepIndexOfDecision(steps, hit.f.start),
      tryAt: hit.f.tryAt === null ? null : stepIndexOfDecision(steps, hit.f.tryAt),
      steps: steps.map(function (st) { return { turn: st.turn, phase: st.phase, why: st.why, actions: st.actions }; })
    };
  });
}

/* Drills: the learner makes one decision the lesson just showed, in a fresh
 * situation where the right call is clear. Each finder returns the decision
 * index (the prefix before it is replayed) or -1. */
var DRILLS = [
  { id: 'column', lesson: 'attack', title: 'Drill: pick your column',
    task: 'A convoy is on the Combat Display, face down in four columns. Click the submarine box you attack from. ' +
          'You can only reach your own column and the ones beside it: count what each column reaches.',
    types: ['place'],
    find: function (r) {
      return r.decisions.findIndex(function (d) { return d.before.phase === '14.11' && d.ctx.reachSpread >= 3; });
    } },
  { id: 'aim', lesson: 'attack', title: 'Drill: aim the torpedoes',
    task: 'Share your attack points among the TDC-marked ships and Fire. Hover each ship for its odds; one of them cannot be hit at all.',
    types: ['fire'],
    find: function (r) {
      return r.decisions.findIndex(function (d) {
        return d.before.phase === '14.14' && d.ctx.targets >= 2 && d.ctx.hopeless >= 1 && d.ctx.bestSink >= 0.25;
      });
    } },
  { id: 'reattack', lesson: 'reattack', title: 'Drill: go again, or break off?',
    task: 'The first round is over. Hover your submarine or the Re-Attack button to see what going again risks, then decide.',
    types: ['reattack', 'withdraw'],
    find: function (r) {
      return r.decisions.findIndex(function (d) { return d.before.phase === '14.3' && d.ctx.reRisk >= 0.1; });
    } }
];

function buildDrills() {
  var out = [], got = {};
  for (var seed = 5001; seed <= 5000 + SEEDS && out.length < DRILLS.length; seed++) {
    var r = play(seed);
    DRILLS.forEach(function (D) {
      if (got[D.id]) return;
      var i = D.find(r);
      if (i < 0) return;
      got[D.id] = true;
      out.push({ id: D.id, lesson: D.lesson, title: D.title, task: D.task, types: D.types, seed: seed,
                 prefix: r.decisions.slice(0, i).map(function (d) { return d.action; }),
                 captain: { action: r.decisions[i].action, why: r.decisions[i].why ||
                   /* an aim's first click is a bare target; the fire that ends it carries the plan */
                   (r.decisions.slice(i).filter(function (d) { return d.action.type === 'fire'; })[0] || {}).why } });
    });
  }
  DRILLS.forEach(function (D) { if (!got[D.id]) throw new Error('no seed gives drill ' + D.id); });
  return DRILLS.map(function (D) { return out.filter(function (x) { return x.id === D.id; })[0]; });
}

function build() {
  /* A lesson whose captain fires a shot with no chance of hitting would teach
   * the wrong thing (that is [14.16A]'s case, not yet in the engine). */
  function hopeless(r, f) {
    return r.decisions.slice(f.start, f.end + 1).some(function (d) { return d.fire && d.fire.bestHit === 0; });
  }
  var found = {};
  for (var seed = 1; seed <= SEEDS; seed++) {
    var r = play(seed);
    LESSONS.forEach(function (L) {
      var f = L.find(r);
      if (!f || hopeless(r, f)) return;
      if (!found[L.id] || f.score < found[L.id].f.score) found[L.id] = { r: r, f: f };
    });
  }
  var out = [{ id: 'rulebook', title: 'The rulebook example', tape: true,
               summary: 'USS Spearfish in the East China Sea, exactly as the rulebook plays it, with the book\'s own numbers.',
               learn: ['The whole combat procedure, step by step', 'The rulebook\'s worked examples [14.14], [14.15], [14.2]'] }];
  LESSONS.forEach(function (L) {
    var hit = found[L.id];
    if (!hit) throw new Error('no seed shows lesson ' + L.id + ' in ' + SEEDS + ' patrols');
    var steps = stepsOf(hit.r.decisions.slice(0, hit.f.end + 1));
    var startStep = stepIndexOfDecision(steps, hit.f.start);
    out.push({
      id: L.id, title: L.title, summary: L.summary, learn: L.learn, seed: hit.r.seed,
      start: startStep, tryAt: hit.f.tryAt === null ? null : stepIndexOfDecision(steps, hit.f.tryAt),
      steps: steps.map(function (st) {
        return { turn: st.turn, phase: st.phase, why: st.why, actions: st.actions };
      })
    });
  });
  return out;
}

function source(lessons, drills) {
  return '/* sw_lessons.js — the lesson library. PURE DATA (generated).\n' +
    ' *\n' +
    ' * Written by tools/lessons/build_lessons.js: each lesson is a real seeded\n' +
    ' * patrol played by the teaching captain (tools/bot/teacher.js), with the\n' +
    ' * captain\'s reason for every step computed from the engine\'s own odds.\n' +
    ' * Do not edit by hand; change the builder and regenerate.\n' +
    ' * tools/test_sw_lessons.js replays every lesson through the engine.\n' +
    ' */\n' +
    '(function (root) {\n  \'use strict\';\n  root.SWLessons = ' + JSON.stringify(lessons, null, 1) + ';\n' +
    '  root.SWDrills = ' + JSON.stringify(drills, null, 1) + ';\n' +
    '}(typeof module !== \'undefined\' && module.exports ? module.exports : (this.window || this)));\n';
}

if (require.main === module) {
  var lessons = build().concat(buildCareerLessons());
  var drills = buildDrills();
  var src = source(lessons, drills);
  if (process.argv.indexOf('--check') > -1) {
    var same = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === src;
    console.log('sw_lessons.js ' + (same ? 'is up to date' : 'is OUT OF DATE: run node tools/lessons/build_lessons.js'));
    process.exit(same ? 0 : 1);
  }
  fs.writeFileSync(OUT, src);
  lessons.forEach(function (L) {
    console.log((L.tape ? '  (tape)   ' : '  seed ' + String(L.seed).padEnd(5)) + ' ' + L.id.padEnd(9) +
      (L.steps ? L.steps.length + ' steps, starts at ' + L.start + (L.tryAt !== null ? ', helm at ' + L.tryAt : '') : ''));
  });
  drills.forEach(function (D) {
    console.log('  seed ' + String(D.seed).padEnd(5) + ' drill:' + D.id.padEnd(9) + D.prefix.length + ' decisions replayed first; captain: ' + D.captain.action.type);
  });
  console.log('wrote ' + path.relative(path.join(__dirname, '..', '..'), OUT));
}

module.exports = { play: play, build: build, buildCareerLessons: buildCareerLessons, buildDrills: buildDrills, stepsOf: stepsOf };
