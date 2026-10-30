/* sw_teacher.js — the "teaching captain", and the coach built on it. PURE MODULE.
 * ZERO DOM, ZERO Math.random: deterministic, so a lesson is fixed by its seed.
 *
 * Moved here from tools/bot/teacher.js (2026-09-21) so the page can use the
 * same judgement as a coach. The captain decides from the engine's own odds
 * (the hover-card preview functions) and returns a one-line reason:
 *   create(G).choose(state, legal) -> { action, why }
 *   create(G).verdict(state, action) -> null | { grade: 'poor'|'hint'|'good', say, better }
 * Only ever picks from legalActions.
 */
(function (root) {
  'use strict';

  /* opts.careful (Phase 8, the fleet's captains): reveal merchant-flagged
   * counters first and leave battle-flagged ones face down, since a revealed
   * escort's ASW counts in the counterattack [14.2A1]; pick patrol areas with
   * the chart's red boxes weighed against the contact chance; stay hidden when
   * damaged. */
  function create(G, opts) {
    opts = opts || {};
    /* Phase 9, measured on 80 Rising Sun campaigns (docs/19): place by the
     * merchant flags, weigh red boxes and transit time more, lie low while
     * Spotted. `opts.tune` overrides these for measurement only. */
    var T_ = { colOn: true, col: 2, red: 0.1, spot: true, week: 0.12 };
    Object.keys(opts.tune || {}).forEach(function (k) { T_[k] = opts.tune[k]; });
    var Combat = G.SWCombat, Search = G.SWSearch, Move = G.SWMovement, Map_ = G.SWMap, Ships = G.SWShips;
    var plan = null;   // the aim for this attack round: [{unit, points}]

    function pct(x) { return Math.round(x * 100) + '%'; }
    function areaName(id) {
      if (G.SWCampaignData && G.SWCampaignData.bases[id]) return G.SWCampaignData.bases[id].name;
      var a = Map_.byId(id); return a ? a.name : id;
    }
    function contactOdds(state, area) {
      return Search.preview({ area: area, warPeriod: state.warPeriod, spotted: state.sub.spotted,
                              ultra: area === state.area && state.ultra }).contact;
    }
    function shipName(state, uid) {
      var u = Combat.unit(state, uid), p = Combat.piece(u);
      return u.revealed ? (p.name || (p.type === 'M' ? 'maru' : p.type) + ' ' + p.tonnage + ',000 t') : 'a face-down ship';
    }
    function isEscort(state, uid) {
      var u = Combat.unit(state, uid), p = Combat.piece(u);
      return u.revealed && p && (p.type === 'DD' || p.type === 'DE' || p.type === 'CL' || p.type === 'CA');
    }

    /* [14.14] Where should the points go? Try every split of the attack over
     * the best two targets and keep the one with the most expected tonnage sunk
     * (unrevealed ships count as 1,000 t with hit chance only). */
    function aim(state) {
      var cands = state.units.filter(function (u) { return Combat.canTarget(state, u.uid).ok; }).map(function (u) { return u.uid; });
      var A = state.sub.attack;
      function value(uid, pts) {
        if (pts <= 0) return 0;
        var pv = Combat.attackPreview(state, { unit: uid, points: pts });
        var u = Combat.unit(state, uid), p = Combat.piece(u);
        return pv.art ? pv.sinkChance * p.tonnage : pv.hit * 0.5;
      }
      var best = null;
      cands.forEach(function (a) {
        var v1 = value(a, A);
        if (!best || v1 > best.v) best = { v: v1, split: [{ unit: a, points: A }] };
        cands.forEach(function (b) {
          if (b <= a) return;
          for (var k = 1; k < A; k++) {
            var v = value(a, k) + value(b, A - k);
            if (v > best.v + 1e-9) best = { v: v, split: [{ unit: a, points: k }, { unit: b, points: A - k }] };
          }
        });
      });
      return best;
    }

    function choose(state, legal) {
      function of(type) { return legal.filter(function (a) { return a.type === type; }); }
      var first = function (type) { return of(type)[0]; };

      /* Campaign layer (Phase 6): the career's own decisions. */
      if (state.career) {
        var cr = careerChoice(state, legal, of, first);
        if (cr) return cr;
      }
      switch (state.phase) {
        case '12.0': {
          var here = contactOdds(state, state.area), best = null, bestP = here;
          of('move').forEach(function (m) {
            var p = contactOdds(state, m.area);
            if (p > bestP + 0.05) { bestP = p; best = m; }
          });
          if (best) {
            return { action: best, why: 'Move to ' + areaName(best.area) + ': a search there finds ships ' + pct(bestP) +
                     ' of the time, against ' + pct(here) + ' in ' + areaName(state.area) + '.' };
          }
          return { action: first('stay'), why: 'Stay in ' + areaName(state.area) + ': nowhere in reach is busier (contact ' + pct(here) + ' here).' };
        }
        case '13.1':
          if (opts.careful && T_.spot && state.sub.spotted && !state.sub.damaged && of('bypass').length) {
            return { action: first('bypass'), why: 'Spotted: the escorts are alert (+1 on the counterattack [14.2C3]); stay hidden until it wears off [16.2].' };
          }
          if (opts.careful && state.sub.damaged && of('bypass').length) {
            return { action: first('bypass'), why: 'Damaged: stay hidden this week, and the Endurance roll is easier (−1) [13.1].' };
          }
          return { action: first('search'), why: 'Search: a sub earns its keep by finding convoys. Contact chance here ' +
                   pct(contactOdds(state, state.area)) + '.' };
        case '14.11': {
          var bestCol = null, bestN = -1, bestS = -Infinity;
          of('place').forEach(function (a) {
            var near = Combat.eligibleColumns({ sub: { column: a.column } });
            var inReach = state.units.filter(function (u) { return near.indexOf(u.column) > -1; });
            var n = inReach.length, sc = n;
            if (opts.careful && T_.colOn) {
              /* Phase 9: the boat must reveal up to its Tactical rating, and every
               * escort revealed adds its ASW [14.2A1]: place where the merchant
               * flags are, away from the battle flags. */
              var m = inReach.filter(function (u) { return Combat.backOf(u) === 'merchant'; }).length;
              sc = Math.min(m, state.sub.tactical) * 2 + m * 0.5 - (n - m) * T_.col;
            }
            if (sc > bestS + 1e-9) { bestS = sc; bestN = n; bestCol = a; }
          });
          return { action: bestCol, why: 'Column ' + bestCol.column + ': it reaches ' + bestN + ' of the ' + state.units.length +
                   ' counters (its own column and the ones beside it).' };
        }
        case '14.12': {
          /* [14.12] radar: an escort just revealed goes back face down, so its
           * ASW counts neither for the targets' defence nor the counterattack. */
          var uf = of('unflip')[0];
          if (uf) {
            var uu = Combat.unit(state, uf.unit), pp = Combat.piece(uu);
            if (pp && pp.asw > 0) {
              return { action: uf, why: 'Radar: turn the ' + shipName(state, uf.unit) + ' back face down. A face-down escort adds no ASW ' +
                       '(' + pp.asw + ') to your targets\' defence or to the counterattack; reveal another counter instead.' };
            }
          }
          if (of('withdraw').length) {
            return { action: first('withdraw'), why: 'A Diligent Escort has damaged the boat: withdraw now, before the fight gets worse [14.12].' };
          }
          var rv = of('reveal');
          if (opts.careful && rv.length) {
            var merch = rv.filter(function (a) { return Combat.backOf(Combat.unit(state, a.unit)) === 'merchant'; });
            var shown = state.units.filter(function (u) { return u.revealed && !u.sunk && !u.returned && Combat.isMerchant(u); }).length;
            if (merch.length) rv = merch;
            else if (shown && of('done_reveal').length) return { action: first('done_reveal'), why: 'Enough seen: the rest fly battle flags, and a revealed escort only adds to the counterattack [14.2A1].' };
          }
          if (!rv.length) return { action: first('done_reveal'), why: 'Nothing left to reveal.' };
          return { action: rv[0], why: 'Reveal: Tactical ' + state.sub.tactical + ' allows ' + state.sub.tactical +
                   ' this round. Seeing the ships shows what is worth a torpedo, though each escort revealed adds its ASW.' };
        }
        case '14.13': {
          var td = of('tdc');
          if (!td.length) return { action: first('done_tdc'), why: 'All markers placed.' };
          var pick = td.filter(function (a) { return !isEscort(state, a.unit); })[0] || td[0];
          return { action: pick, why: 'Firing solution on ' + shipName(state, pick.unit) +
                   (isEscort(state, pick.unit) ? ': only escorts left in reach.' : ': cargo, not an escort, is the prize.') };
        }
        case '14.14': {
          if (of('no_attack').length) return { action: first('no_attack'), why: 'No attack can succeed from here [14.16].' };
          if (of('endure').length) return { action: first('endure'), why: 'Held down by the escorts [19.2].' };
          if (of('lumber').length) {
            return { action: of('lumber')[0], why: 'Target lumbers into way: a face-down red-ball ship crosses the torpedoes, a free chance at a sinking [19.2].' };
          }
          if (of('gunnery').length) {
            var gs = of('gunnery').slice().sort(function (a, b) {
              return Combat.piece(Combat.unit(state, b.unit)).tonnage - Combat.piece(Combat.unit(state, a.unit)).tonnage; });
            return { action: gs[0], why: 'Surface gunnery: shell the biggest merchant in your column (' + shipName(state, gs[0].unit) + '). The boat will be Spotted [19.2].' };
          }
          if (!plan) {
            var b = aim(state);
            plan = b ? b.split : [];
          }
          for (var i = 0; i < plan.length; i++) {
            var want = plan[i];
            var have = state.allocations.filter(function (x) { return x.unit === want.unit; })[0];
            if (!have) {
              var t = of('target').filter(function (a) { return a.unit === want.unit; })[0];
              if (t) return { action: t, why: null };
            } else if (have.points < want.points) {
              var up = of('points').filter(function (a) { return a.unit === want.unit && a.delta > 0; })[0];
              if (up) return { action: up, why: null };
            }
          }
          var f = first('fire');
          var why = plan.map(function (w) {
            var pv = Combat.attackPreview(state, w);
            return w.points + ' on ' + shipName(state, w.unit) + ' (hit ' + pct(pv.hit) +
                   (pv.art ? ', sink ' + pct(pv.sinkChance) : '') + ')';
          }).join(' and ');
          plan = null;
          return { action: f || legal[0], why: 'Fire: ' + why + '.' };
        }
        case '14.3': {
          var ca = Combat.counterattackPreview(state, true);
          var left = state.units.filter(function (u) { return !u.sunk && !isEscort(state, u.uid); }).length;
          if (of('reattack').length && left && ca.odds.sunk <= 0.05 && !state.sub.damaged) {
            return { action: first('reattack'), why: 'Re-Attack: ' + left + ' ships still afloat and little chance of losing the boat (sunk ' +
                     pct(ca.odds.sunk) + '), though it may be damaged (' + pct(ca.odds.damaged + ca.odds.damaged_rtb) + '). The TDC markers improve by one.' };
          }
          return { action: first('withdraw'), why: of('reattack').length
            ? 'Withdraw: going again risks too much (sunk ' + pct(ca.odds.sunk) + ', damaged ' + pct(ca.odds.damaged + ca.odds.damaged_rtb) +
              (state.sub.damaged ? ', and the boat is already damaged' : '') + ').'
            : 'Withdraw: no further Re-Attack is allowed.' };
        }
        case '14.4': {
          /* [14.4] move to an adjacent column if it reaches more of the convoy. */
          var reachOf = function (col) {
            var near = Combat.eligibleColumns({ sub: { column: col } });
            return state.units.filter(function (u) { return !u.sunk && !u.returned && near.indexOf(u.column) > -1; }).length;
          };
          var here = reachOf(state.sub.column), bestR = null, bestV = here;
          of('reposition').forEach(function (a) { var r = reachOf(a.column); if (r > bestV) { bestV = r; bestR = a; } });
          if (bestR) return { action: bestR, why: 'Shift to column ' + bestR.column + ': it reaches ' + bestV + ' ships afloat, against ' + here + ' from here [14.4].' };
          return { action: first('stay_column'), why: 'Stay in column ' + state.sub.column + ': no neighbouring column reaches more ships [14.4].' };
        }
        case '15.0': {
          var moves = of('transit');
          if (!moves.length) return { action: first('hold'), why: 'Hold position.' };
          if (!state.sub.rtb) return { action: first('hold'), why: 'Not heading home yet: stay on the hunting ground.' };
          var bestM = null, bestD = Infinity;
          moves.forEach(function (m) {
            var d = Move.distanceToNearestBase(m.area, state.activeBaseAreas);
            if (d < bestD) { bestD = d; bestM = m; }
          });
          return { action: bestM, why: 'Heading home (RTB) at Speed ' + state.sub.speed + ': ' + areaName(bestM.area) +
                   (bestD === 0 ? ' is the base.' : ' is ' + bestD + ' from base.') };
        }
        case '16.0':
          return { action: first('end_turn'), why: 'End of the week.' };
        default:
          return { action: legal[0], why: null };
      }
    }

    /* The career's decisions: where to sail, which base to make for, the
     * mission orders. Deterministic, from the engine's own numbers. */
    function careerChoice(state, legal, of, first) {
      var c = state.career, war = state.war, T = G.SWTransit;
      if (state.phase === 'base') {
        var sails = of('sail');
        if (of('form_pack').length) return { action: first('form_pack'), why: 'Form a wolfpack: three boats find more, and share the escorts\' attention [24.0].' };
        if (!sails.length) return { action: first('wait'), why: 'In port: the boat is not ready for sea yet.' };
        var book = c.patrols.length === 0 ? sails.filter(function (a) { return a.area === c.def.destination; })[0] : null;
        if (book) return { action: book, why: 'Sail for ' + areaName(book.area) + ', where ' + c.def.skipper + ' went on the real patrol [' + c.def.rule + '].' };
        var bestS = null, bestV = -1;
        sails.forEach(function (a) {
          var steps = T.distance(c.base, a.area, G.SWWar.allBases(war)), weeks = Math.max(1, Math.ceil(steps / state.sub.speed));
          if (weeks > 3) return;
          var p = Search.preview({ area: a.area, warPeriod: state.warPeriod, spotted: false,
                                   ultra: war.ultra.indexOf(a.area) > -1 }).contact;
          var v = p - (opts.careful ? T_.week : 0.04) * weeks - (opts.careful ? T_.red * G.SWAac.redBoxes(a.area, state.warPeriod) : 0);
          if (v > bestV + 1e-9) { bestV = v; bestS = a; }
        });
        bestS = bestS || sails[0];
        return { action: bestS, why: 'Sail for ' + areaName(bestS.area) + ': busy water (a search there finds ships ' +
                 pct(contactOdds(state, bestS.area)) + ' of the time) within a short run from ' + areaName(c.base) + '.' };
      }
      if (state.phase === '12.0' && of('enter_smz').length) {
        var z = first('enter_smz');
        return { action: z, why: 'Orders: ' + c.orders.name + '. The boat goes where the War Event sends it [5.0].' };
      }
      if (state.phase === '12.0' && c.orders && c.orders.tasked && !of('enter_smz').length) {
        var t = first('stay') || first('move');
        return { action: t, why: 'Orders: ' + c.orders.name + '. The boat must be in ' + c.orders.areas.map(areaName).join(' or ') + ' this week [5.0].' };
      }
      if (state.phase === '13.1' && state.pack && of('search').length) {
        var pOdds = contactOdds(state, state.area);
        var barrier = legal.filter(function (a) { return a.type === 'search' && a.barrier; })[0];
        var group = legal.filter(function (a) { return a.type === 'search' && !a.barrier; })[0];
        if (barrier && pOdds < 0.7) return { action: barrier, why: 'Barrier: contact here is only ' + pct(pOdds) + ', and a barrier adds +2 to the search [24.32].' };
        return { action: group, why: 'Group: contact is likely anyway (' + pct(pOdds) + '), and a group pack attacks with every boat [24.31].' };
      }
      if (state.phase === '13.1' && state.noAttack) {
        return { action: first('bypass'), why: 'No attacks may be made on this mission: the boat stays hidden [5.0].' };
      }
      if (state.phase === '15.0') {
        var homes = of('rtb_to');
        if (homes.length) {
          var bestB = null, bestW = Infinity;
          homes.forEach(function (a) {
            var w = T.distance(state.area, a.base, G.SWWar.allBases(war));
            if (state.sub.damaged && a.base === 'pearl') w -= 0.5;       // the best repair yard
            if (w < bestW) { bestW = w; bestB = a; }
          });
          return { action: bestB, why: 'Head for ' + areaName(bestB.base) + ': the nearest base' +
                   (state.sub.damaged && bestB.base === 'pearl' ? ', and the best repair yard for a damaged boat' : '') + ' [15.2].' };
        }
        var go = legal.filter(function (a) { return a.type === 'transit_on' && !a.cautious; })[0];
        if (go) return { action: go, why: 'Keep going at full Speed: every week in transit is a week not hunting [15.0].' };
      }
      return null;
    }

    /* The coach: is this action a clear mistake next to the captain's choice?
     *  poor - worth stopping for (the page asks before committing)
     *  hint - a better option existed; said after, never blocks
     *  good - the captain would do the same, or close enough */
    function verdict(state, action) {
      var t = action.type;
      if (t === 'move' || t === 'stay') {
        var mine = contactOdds(state, t === 'move' ? action.area : state.area), best = mine, where = null;
        legalOf(state, 'move').forEach(function (m) {
          var p = contactOdds(state, m.area);
          if (p > best) { best = p; where = m.area; }
        });
        if (best - mine >= 0.2) {
          return { grade: 'hint', say: 'A search here finds ships ' + pct(mine) + ' of the time; ' + areaName(where) +
                   ' was ' + pct(best) + '. Busier water means more chances, though more red boxes too.' };
        }
        return { grade: 'good', say: null };
      }
      if (t === 'bypass') {
        return { grade: 'poor', say: 'Bypassing means no chance to score this week (it does make the Endurance roll easier, −1). ' +
                 'It is for a boat that must stay hidden (damaged or spotted).', better: 'Search' };
      }
      if (t === 'rtb' && !state.sub.damaged) {
        return { grade: 'poor', say: 'Heading home ends the patrol\'s chances to score. The Endurance roll will send the boat home when it must.',
                 better: 'Search' };
      }
      if (t === 'place') {
        var reach = function (col) {
          var near = Combat.eligibleColumns({ sub: { column: col } });
          return state.units.filter(function (u) { return near.indexOf(u.column) > -1; }).length;
        };
        var bestN = Math.max.apply(null, ['A', 'B', 'C', 'D'].map(reach)), n = reach(action.column);
        if (n === 0) return { grade: 'poor', say: 'From column ' + action.column + ' nothing is in reach: this fight is over before it starts.' };
        if (n * 2 <= bestN) return { grade: 'poor', say: 'Column ' + action.column + ' reaches only ' + n + ' of the counters; another column reaches ' + bestN +
                                     '. You can only reveal and attack your own column and the ones beside it.' };
        if (bestN - n >= 2) return { grade: 'hint', say: 'Column ' + action.column + ' reaches ' + n + ' counters; the best column reached ' + bestN + '.' };
        return { grade: 'good', say: null };
      }
      if (t === 'fire') {
        var mineV = 0, dead = [];
        state.allocations.forEach(function (al) {
          var pv = Combat.attackPreview(state, al);
          if (pv.hit === 0) dead.push(al.points + ' on ' + shipName(state, al.unit));
          var u = Combat.unit(state, al.unit), p = Combat.piece(u);
          mineV += pv.art ? pv.sinkChance * p.tonnage : pv.hit * 0.5;
        });
        var b = aim(state);
        var plan = b ? b.split.map(function (w) { return w.points + ' on ' + shipName(state, w.unit); }).join(' and ') : null;
        if (dead.length) {
          return { grade: 'poor', say: dead.join(', ') + (dead.length === 1 ? ' cannot' : ' cannot') + ' hit: the roll needed is below 0.' +
                   (plan ? ' The captain would put ' + plan + '.' : ''), better: plan };
        }
        if (b && b.v > 0 && mineV < 0.6 * b.v) {
          return { grade: 'poor', say: 'This aim is about ' + Math.round(100 * mineV / b.v) + '% as good as the captain\'s: ' + plan + '.', better: plan };
        }
        return { grade: 'good', say: 'A sound aim.' };
      }
      if (t === 'reattack') {
        var ca = Combat.counterattackPreview(state, true);
        if (ca.odds.sunk > 0.05 || state.sub.damaged) {
          return { grade: 'poor', say: 'Going again risks the boat: sunk ' + pct(ca.odds.sunk) + ', damaged ' + pct(ca.odds.damaged + ca.odds.damaged_rtb) +
                   (state.sub.damaged ? ', and it is already damaged' : '') + '. A lost boat fails the patrol.', better: 'Withdraw' };
        }
        return { grade: 'good', say: 'Low risk of losing the boat (' + pct(ca.odds.sunk) + '): a reasonable gamble.' };
      }
      if (t === 'withdraw') {
        var ca2 = Combat.counterattackPreview(state, true);
        var left = state.units.filter(function (u) { return !u.sunk && !isEscort(state, u.uid); }).length;
        if (legalOf(state, 'reattack').length && left && ca2.odds.sunk === 0 && !state.sub.damaged) {
          return { grade: 'hint', say: 'Going again was nearly free here (sunk 0%, ' + left + ' ships afloat). Safe choice, though.' };
        }
        return { grade: 'good', say: null };
      }
      return null;
    }
    function legalOf(state, type) {
      var E = state.career && G.SWCareer ? G.SWCareer : G.SWPatrol;
      return E.legalActions(state).filter(function (a) { return a.type === type; });
    }

    return { choose: choose, verdict: verdict, aim: aim };
  }

  root.SWTeacher = { create: create };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
