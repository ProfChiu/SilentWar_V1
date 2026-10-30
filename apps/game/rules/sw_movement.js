/* sw_movement.js — patrol and transit movement, and the legality rules that
 * the whole product premise rests on. PURE MODULE. ZERO DOM. Dice injected.
 *
 * "Hard lock — only legal actions are clickable" was the Phase 1 decision, so
 * this module's real job is `legalMoves`: given a submarine and the board, say
 * exactly where it may go and, for everywhere it may not, why not. The UI shows
 * the reason; it never decides one.
 */
(function (root) {
  'use strict';

  var Map_ = root.SWMap ||
    (typeof require === 'function' ? require('../data/sw_map.js').SWMap : null);

  function neighbours(areaId) {
    return (Map_.adjacency[areaId] || []).slice();
  }

  /* [2.3A] Range is a hard leash: "max number of OpAreas the sub may be from
   * any friendly Base at any time". Breadth-first over the movement graph. */
  function distanceToNearestBase(areaId, activeBaseAreas) {
    if (activeBaseAreas.indexOf(areaId) > -1) return 0;
    var seen = {}, queue = [[areaId, 0]];
    seen[areaId] = true;
    while (queue.length) {
      var head = queue.shift(), at = head[0], d = head[1];
      var next = neighbours(at);
      for (var i = 0; i < next.length; i++) {
        var n = next[i];
        if (seen[n]) continue;
        if (activeBaseAreas.indexOf(n) > -1) return d + 1;
        seen[n] = true;
        queue.push([n, d + 1]);
      }
    }
    return Infinity;
  }

  function withinRange(areaId, range, activeBaseAreas) {
    return distanceToNearestBase(areaId, activeBaseAreas) <= range;
  }

  /* [12.0] Patrol Movement. A deployed submarine, Patrol side up, may move to
   * the Operating section of an ADJACENT OpArea — one area, not `speed` areas.
   * Speed governs transit [15.0], not patrol movement. */
  function legalPatrolMoves(sub, opts) {
    opts = opts || {};
    var bases = opts.activeBaseAreas || [];
    var out = [];
    if (sub.side !== 'patrol') {
      return { moves: [], blocked: [], reason: 'A submarine must be Patrol side up to patrol-move [12.0].' };
    }
    if (sub.rtb) {
      return { moves: [], blocked: [], reason: 'The submarine is RTB; it moves in the Transit phase [15.2].' };
    }
    var blocked = [];
    neighbours(sub.area).forEach(function (n) {
      if (!withinRange(n, sub.range, bases)) {
        blocked.push({ area: n, why: 'Out of range ' + sub.range + ' of a friendly base [2.3A].' });
      } else {
        out.push(n);
      }
    });
    return { moves: out, blocked: blocked, reason: null };
  }

  /* [15.0] Transit Movement: up to the submarine's Speed in OpAreas. Returns
   * every area reachable within that many steps, with the path length, and
   * every area rejected together with the rule that rejected it. */
  function legalTransitMoves(sub, opts) {
    opts = opts || {};
    var bases = opts.activeBaseAreas || [];
    var seen = {}, out = [], blocked = [];
    seen[sub.area] = 0;
    var queue = [[sub.area, 0]];
    while (queue.length) {
      var head = queue.shift(), at = head[0], d = head[1];
      if (d >= sub.speed) continue;
      neighbours(at).forEach(function (n) {
        if (seen[n] !== undefined) return;
        seen[n] = d + 1;
        if (!withinRange(n, sub.range, bases)) {
          blocked.push({ area: n, why: 'Out of range ' + sub.range + ' of a friendly base [2.3A].' });
          return;
        }
        out.push({ area: n, steps: d + 1 });
        queue.push([n, d + 1]);
      });
    }
    return { moves: out, blocked: blocked, reason: null };
  }

  /* The single question the UI asks before enabling a click. */
  function canMoveTo(sub, target, phase, opts) {
    var res = phase === 'patrol' ? legalPatrolMoves(sub, opts) : legalTransitMoves(sub, opts);
    if (res.reason) return { ok: false, why: res.reason };
    var ok = phase === 'patrol'
      ? res.moves.indexOf(target) > -1
      : res.moves.some(function (m) { return m.area === target; });
    if (ok) return { ok: true, why: null };
    var b = res.blocked.filter(function (x) { return x.area === target; })[0];
    if (b) return { ok: false, why: b.why };
    if (Map_.adjacency[target] === undefined) {
      return { ok: false, why: 'Not an OpArea.' };
    }
    return { ok: false, why: phase === 'patrol'
      ? 'Not adjacent to ' + sub.area + ' [12.0].'
      : 'Further than ' + sub.speed + ' OpAreas away [15.0].' };
  }

  root.SWMovement = {
    neighbours: neighbours,
    distanceToNearestBase: distanceToNearestBase,
    withinRange: withinRange,
    legalPatrolMoves: legalPatrolMoves,
    legalTransitMoves: legalTransitMoves,
    canMoveTo: canMoveTo
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
