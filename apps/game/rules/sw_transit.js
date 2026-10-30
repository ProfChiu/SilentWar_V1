/* sw_transit.js — Transit Events [19.1] and the routes they are rolled on.
 * PURE MODULE. ZERO DOM, ZERO Math.random; dice arrive through opts.rollDie.
 *
 * "A Transit Event check occurs during Transit and Patrol Movement any time a
 * submarine enters an OpArea or SMZ." The governing OpArea is the one moved
 * into (Patrol Movement), the one entered from (SMZ), or, for Transit Movement,
 * the OpArea with the lowest number on the current War Period's line that
 * contains a red box, not counting the one the boat started from.
 */
(function (root) {
  'use strict';

  var req = typeof require === 'function' ? require : null;
  var Tables = root.SWTables || (req ? req('../data/sw_tables.js').SWTables : null);
  var Aac    = root.SWAac    || (req ? req('../data/sw_aac.js').SWAac : null);
  var Map_   = root.SWMap    || (req ? req('../data/sw_map.js').SWMap : null);
  var Data   = root.SWCampaignData || (req ? req('../data/sw_campaign.js').SWCampaignData : null);
  var Res    = root.SWResolution || (req ? req('./sw_resolution.js').SWResolution : null);

  var ROW = { W1: 0, W2: 1, W3: 2, W4: 3 };

  /* [19.1] The die number at which red (High Density) boxes start on this
   * area's line, or null if the line has no red box. */
  function threshold(areaId, warPeriod) {
    var c = Aac.charts[areaId];
    if (!c) return null;
    var i = c.grid[ROW[warPeriod]].indexOf('high');
    return i === -1 ? null : i;
  }

  /* The governing OpArea among those moved through: lowest threshold wins;
   * on a tie the player chooses [19.11], and the engine takes the last one on
   * the route (the one nearest where the boat is going). */
  function governing(areas, warPeriod) {
    var best = null;
    areas.forEach(function (a) {
      var t = threshold(a, warPeriod);
      if (t === null) return;
      if (best === null || t <= best.threshold) best = { area: a, threshold: t };
    });
    return best;
  }

  /* ---- routes: OpAreas plus base nodes ----
   * A base is joined only to its linked OpAreas and is never passed through
   * [15.0]. The step out of or into a major base counts against Speed
   * [15.1 note]; a forward base sits in its SMZ, "in" the OpArea, so its
   * step costs nothing (Phase 7). */
  function isForward(id) { return !!(Data.forwardBases && Data.forwardBases[id]); }
  function isBase(id) { return !!Data.bases[id] || isForward(id); }
  function linksOf(id) { return Data.bases[id] ? Data.bases[id].links : (Data.smzLinks[id] || []); }
  function cost(a, b) { return isForward(a) || isForward(b) ? 0 : 1; }
  function neighbours(id, activeBases) {
    if (isBase(id)) return linksOf(id).slice();
    var out = (Map_.adjacency[id] || []).slice();
    activeBases.forEach(function (b) {
      if (linksOf(b).indexOf(id) > -1) out.push(b);
    });
    return out;
  }
  function baseAreas(activeBases) {
    var out = [];
    activeBases.forEach(function (b) {
      linksOf(b).forEach(function (a) { if (out.indexOf(a) === -1) out.push(a); });
    });
    return out;
  }
  /* [2.3A] the range leash, measured as the patrol engine does: an OpArea
   * joined to an active base is 0 away. */
  function distToBase(areaId, activeBases) {
    var goal = baseAreas(activeBases);
    if (goal.indexOf(areaId) > -1) return 0;
    var seen = {}, q = [[areaId, 0]];
    seen[areaId] = true;
    while (q.length) {
      var h = q.shift();
      var nx = Map_.adjacency[h[0]] || [];
      for (var i = 0; i < nx.length; i++) {
        if (seen[nx[i]]) continue;
        if (goal.indexOf(nx[i]) > -1) return h[1] + 1;
        seen[nx[i]] = true; q.push([nx[i], h[1] + 1]);
      }
    }
    return Infinity;
  }
  /* Speed spent from `from` to `to` over the route graph (bases only at the
   * ends). 0-1 breadth-first: a forward base's step is free. */
  function distance(from, to, activeBases) {
    if (from === to) return 0;
    var best = {}, dq = [[from, 0]];
    best[from] = 0;
    while (dq.length) {
      var h = dq.shift();
      if (h[1] > best[h[0]]) continue;
      if (h[0] === to) return h[1];
      if (isBase(h[0]) && h[0] !== from) continue;
      neighbours(h[0], activeBases).forEach(function (n) {
        if (isBase(n) && n !== to) return;
        var c = cost(h[0], n), d = h[1] + c;
        if (best[n] !== undefined && best[n] <= d) return;
        best[n] = d;
        if (c === 0) dq.unshift([n, d]); else dq.push([n, d]);
      });
    }
    return Infinity;
  }
  function pathCost(path) {
    var c = 0;
    for (var i = 1; i < path.length; i++) c += cost(path[i - 1], path[i]);
    return c;
  }

  /* The week's leg toward `dest`: every simple route of at most `steps` steps
   * from `from` that stays within Range [2.3A]; keep the ones that end
   * closest to `dest`, and of those the safest (highest governing threshold,
   * no red box at all being safest), then the shortest. Choosing the safest
   * of equally good routes is always the player's best choice, so the engine
   * makes it and the record says which way the boat went. */
  function leg(from, dest, steps, range, activeBases, warPeriod) {
    var best = null;
    function score(path) {
      var end = path[path.length - 1];
      var rem = distance(end, dest, activeBases);
      var gov = governing(path.slice(1).filter(function (a) { return !isBase(a); }), warPeriod);
      var safety = gov ? gov.threshold : 99;
      return { path: path, rem: rem, safety: safety, len: pathCost(path) };
    }
    function better(a, b) {
      if (!b) return true;
      if (a.rem !== b.rem) return a.rem < b.rem;
      if (a.safety !== b.safety) return a.safety > b.safety;
      return a.len < b.len;
    }
    function walk(path) {
      var s = score(path);
      if (path.length > 1 && better(s, best)) best = s;
      var at = path[path.length - 1];
      if (path.length > 12) return;
      if (isBase(at) && path.length > 1) return;            // arrived at a base
      neighbours(at, activeBases).forEach(function (n) {
        if (path.indexOf(n) > -1) return;
        if (isBase(n) && n !== dest) return;                 // never pass through a base
        if (!isBase(n) && distToBase(n, activeBases) > range) return;
        var next = path.concat([n]);
        if (pathCost(next) > steps) return;
        walk(next);
      });
    }
    walk([from]);
    return best;
  }

  /* [19.1] The check. ctx: { areas: OpAreas that may govern, warPeriod,
   * transitSide, cautious, spotted, smz, seaOfJapan, ultraSeaOfJapan, why } */
  function check(ctx, opts) {
    var gov = governing(ctx.areas, ctx.warPeriod);
    if (!gov) {
      return { event: null, governing: null, records: [Res.makeRecord({
        context: 'Transit Event check — ' + (ctx.why || 'movement'),
        table: 'Transit Event [19.1]', ruleRef: '19.1', inputs: [], drms: [],
        die: null, modifiedDie: null, target: null,
        result: 'no red box on the route: no check' })] };
    }
    var drms = [];
    if (ctx.transitSide) drms.push({ label: 'Transit side up', value: -1, rule: '19.1' });
    if (ctx.cautious) drms.push({ label: 'Cautious Transit', value: -1, rule: '15.24' });
    if (ctx.spotted && (ctx.warPeriod === 'W1' || ctx.warPeriod === 'W2')) {
      drms.push({ label: 'Spotted (War Period 1-2)', value: 1, rule: '23.0' });
    }
    if (ctx.smz) drms.push({ label: 'Entering a Special Mission Zone', value: 2, rule: '20.3' });
    if (ctx.wolfpack) drms.push({ label: 'Member of a wolfpack', value: -1, rule: '24.4' });
    /* Historical pace (house rule, off by default): docs/20 */
    if (ctx.pace) drms.push({ label: 'Historical pace (house rule)', value: ctx.pace, rule: 'HP' });
    if (ctx.congregating) drms.push({ label: 'Congregating Risk', value: ctx.congregating, rule: '22.1A' });
    if (ctx.seaOfJapan) {
      drms.push(ctx.ultraSeaOfJapan ? { label: 'Sea of Japan (ULTRA there)', value: 1, rule: '7.1' }
                                    : { label: 'Entering or leaving the Sea of Japan', value: 2, rule: '19.1' });
    }
    var die = Res.d10(opts), mod = die + Res.sum(drms);
    var records = [Res.makeRecord({
      context: 'Transit Event check — ' + (ctx.why || 'movement') + ' (' + gov.area + ')',
      table: 'Transit Event [19.1]', ruleRef: '19.1',
      inputs: [{ label: 'Red boxes start at', value: gov.threshold, rule: '19.1' }],
      drms: drms, die: die, modifiedDie: mod, target: gov.threshold,
      result: mod >= gov.threshold ? 'a Transit Event: roll twice on the Transit Event Table' : 'no Transit Event'
    })];
    if (mod < gov.threshold) return { event: null, governing: gov.area, records: records };
    var d1 = Res.d10(opts), d2 = Res.d10(opts);
    var row = Tables.transitRowFor(ctx.warPeriod, d1);
    var result = Tables.transitLookup(ctx.warPeriod, d1, d2) || 'none';
    records.push(Res.makeRecord({
      context: 'Transit Event Table — ' + ctx.warPeriod + ', row ' + (row === null ? '-' : row + 1),
      table: 'Transit Event Table [19.1]', ruleRef: '19.1',
      inputs: [{ label: 'First die (row)', value: d1, rule: '19.1' }], drms: [],
      die: d2, modifiedDie: d2, target: null, result: LABEL[result] || result
    }));
    return { event: result, governing: gov.area, records: records };
  }

  var LABEL = {
    none: 'No Event', spotted: 'Spotted',
    spotted_rtb: 'Spotted, Return to Base',
    spotted_dmg_rtb: 'Spotted, Engaged and damaged, Return to Base',
    lost: 'Lost at sea, cause unknown'
  };

  root.SWTransit = {
    threshold: threshold,
    governing: governing,
    isBase: isBase,
    isForward: isForward,
    linksOf: linksOf,
    pathCost: pathCost,
    neighbours: neighbours,
    baseAreas: baseAreas,
    distToBase: distToBase,
    distance: distance,
    leg: leg,
    check: check,
    label: LABEL
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
