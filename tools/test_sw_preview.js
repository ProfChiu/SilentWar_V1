'use strict';
/* The hover odds (sw_combat.attackPreview / counterattackPreview,
 * sw_search.preview) must be the odds that are then rolled. Over 200 seeded
 * patrols, every preview taken just before an action is compared with the
 * record that action produced. */
var t = require('./_harness.js');
var soak = require('./bot/soak.js');                  // loads every module as a global
var Dice = require('../apps/game/rules/sw_dice.js').SWDice;
var Policy = require('./bot/policy.js');
var P = global.SWPatrol, C = global.SWCombat, Srch = global.SWSearch;
t.suite('sw_preview');

function view(s) {
  return { warPeriod: s.warPeriod, area: s.area, torpedoValue: s.torpedoValue, round: s.round,
           revealedThisRound: s.revealedThisRound, tdcPlaced: s.tdcPlaced, sub: s.sub, units: s.units };
}

var attacks = 0, attackMismatch = 0, cas = 0, caMismatch = 0, searches = 0, searchBad = 0;
var fogLeak = 0, hitVsNeed = 0, hidden = 0;
for (var seed = 1000; seed < 1200; seed++) {
  var s = P.create(soak.setup()), d = Dice.seeded(seed), pol = Policy.create(seed, global.SWMovement);
  for (var guard = 0; !s.done && guard < 3000; guard++) {
    var legal = P.legalActions(s), a = pol.choose(s, legal), before = s.log.length;
    var pre = null, caPre = null, sp = null;
    /* Since Phase 5 the face-down targets are turned up at Fire [14.14], and a
     * Combat Event can reorder the round: the preview is only a promise about
     * what was visible, so compare the volleys where nothing was hidden. */
    var allVisible = a.type === 'fire' && s.allocations.every(function (al) { return C.unit(view(s), al.unit).revealed; }) && !s.roundEvent;
    if (a.type === 'fire' && !allVisible) { hidden++; }
    if (a.type === 'fire' && allVisible) {
      pre = {};
      s.allocations.forEach(function (al) {
        var pv = pre[al.unit] = C.attackPreview(view(s), al);
        var u = C.unit(view(s), al.unit);
        if (!u.revealed && pv.art !== null) fogLeak++;
        if (!u.revealed && pv.defender[0].value !== 1) fogLeak++;
      });
    }
    if ((a.type === 'fire' && allVisible) || (a.type === 'no_attack' && !s.roundEvent)) caPre = C.counterattackPreview(view(s), false);
    if (a.type === 'search') sp = Srch.preview({ area: s.area, warPeriod: s.warPeriod, ultra: s.ultra, spotted: s.sub.spotted });
    P.apply(s, a, d);
    var recs = s.log.slice(before);
    if (pre) {
      var atkRecs = recs.filter(function (r) { return r.table === 'To-hit [14.15C]'; });
      atkRecs.forEach(function (r) {
        var pv = pre[r.unit];
        attacks++;
        if (!pv || r.target !== pv.need) attackMismatch++;
        else if (!r.impossible && (r.result === 'HIT') !== (r.die <= pv.need)) hitVsNeed++;
      });
    }
    if (caPre) {
      var ca = recs.filter(function (r) { return r.table === 'Counterattack Table [14.2]' && r.context.indexOf('extra') === -1; })[0];
      /* A ship sunk or damaged by the volley leaves the counterattack's ASW
       * [14.2], which no preview before Fire can know: compare only when the
       * volley changed no escort. */
      var escortHurt = recs.some(function (r) { return r.table === 'Attack Results Table [14.15D]' && !/No effect/.test(r.result); });
      if (ca && !escortHurt) { cas++; if (ca.target !== caPre.row) { caMismatch++; if (caMismatch < 3) console.error('  ca mismatch seed ' + seed + ' want ' + caPre.row + ' got ' + ca.target); } }
    }
    if (sp) {
      searches++;
      var total = Object.keys(sp.levels).reduce(function (n, k) { return n + sp.levels[k]; }, 0);
      if (Math.abs(total - 1) > 1e-9) searchBad++;
      var act = recs[0];
      var lvl = global.SWAac.lookup(s.area, s.warPeriod, act.modifiedDie);
      if (!sp.levels[lvl]) searchBad++;      // the rolled level must have been possible
    }
  }
}
t.ok(attacks > 50, 'enough attacks were previewed (' + attacks + '; ' + hidden + ' volleys at face-down targets skipped)');
t.eq(attackMismatch, 0, 'every attack rolled against the need its preview showed');
t.eq(hitVsNeed, 0, 'HIT exactly when the die is = or < the previewed need');
t.ok(cas > 50, 'enough counterattacks were previewed (' + cas + ')');
t.eq(caMismatch, 0, 'every counterattack used the row its preview showed');
t.ok(searches > 200, 'enough searches were previewed (' + searches + ')');
t.eq(searchBad, 0, 'search odds sum to 1 and cover the level rolled');
t.eq(fogLeak, 0, 'a face-down target previews as defense 1 with no ART odds');

/* Worked example [14.15]: Spearfish 3 points + Whitaker +1 + Mk-XIV -1 = +3,
 * against a 2-0 maru, adjacent column, TDC -2, one revealed 7-1 escort:
 * 2 + 1 - 2 + 1 = +2, so roll = or < 1 to hit (20%). */
var ex = { warPeriod: 'W2', area: 'east_china_sea', torpedoValue: -1, round: 1,
  sub: { column: 'B', superSkipper: { value: 1 } },
  units: [{ uid: 'c1', piece: 'm2t20', column: 'A', revealed: true, damaged: false, sunk: false, tdc: -2 },
          { uid: 'dd', piece: 'dd2t71', column: 'B', revealed: true, damaged: false, sunk: false, tdc: null }] };
var pv = C.attackPreview(ex, { unit: 'c1', points: 3 });
t.eq([pv.attack, pv.defense, pv.need, pv.hit], [3, 2, 1, 0.2], '[14.15] worked example: +3 vs +2, need 1, 20%');
var cap = C.counterattackPreview(ex, false), capRe = C.counterattackPreview(ex, true);
t.ok(Math.abs(Object.keys(cap.odds).reduce(function (n, k) { return n + cap.odds[k]; }, 0) - 1) < 0.01,
  'counterattack odds sum to 1');
t.ok(capRe.odds.sunk >= cap.odds.sunk, 'a Re-Attack (+1) never makes the counterattack safer');
t.done();
