/* sw_war.js — the war around the boat: the Strategic Segment [5.0]-[7.0],
 * War Progress [17.0], and the off-screen fleet whose sinkings move it.
 * PURE MODULE. ZERO DOM, ZERO Math.random; dice arrive through opts.rollDie.
 *
 * `war` is a plain object the career keeps:
 *   { warPeriod, torpedo, fleet: { ships, tons, lost }, mine: { ships, tons },
 *     occurred: { eventId: count }, ultra: [areas], event: def|null,
 *     torpedoTried: [numbers], transitionTried: { 'W3': [monthKeys] },
 *     bases: [active base ids], subic: bool, tenders: [smz ids] }
 */
(function (root) {
  'use strict';

  var req = typeof require === 'function' ? require : null;
  var Tables = root.SWTables || (req ? req('../data/sw_tables.js').SWTables : null);
  var Data   = root.SWCampaignData || (req ? req('../data/sw_campaign.js').SWCampaignData : null);
  var Res    = root.SWResolution || (req ? req('./sw_resolution.js').SWResolution : null);

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                'August', 'September', 'October', 'November', 'December'];

  /* ---- the calendar: four weeks to a month, as on the Turn Record Track ---- */
  function nextWeek(d) {
    if (d.w < 4) return { y: d.y, m: d.m, w: d.w + 1 };
    return d.m < 11 ? { y: d.y, m: d.m + 1, w: 1 } : { y: d.y + 1, m: 0, w: 1 };
  }
  function cmp(a, b) { return (a.y - b.y) * 12 + (a.m - b.m); }
  function monthKey(d) { return d.y + '-' + (d.m < 9 ? '0' : '') + (d.m + 1); }
  function label(d) { return MONTHS[d.m] + ' ' + d.y + (d.w ? ', week ' + d.w : ''); }
  function pastEnd(d) {
    var e = Data.warEnd;
    return d.y > e.y || (d.y === e.y && (d.m > e.m || (d.m === e.m && d.w > e.w)));
  }

  function rec(context, table, rule, die, target, result, drms, inputs) {
    return Res.makeRecord({ context: context, table: table, ruleRef: rule, inputs: inputs || [],
      drms: drms || [], die: die, modifiedDie: die === null ? null : die + Res.sum(drms || []),
      target: target, result: result });
  }

  /* ---- [5.0] War Event Phase ---- */
  function occurred(war, id) { return (war.occurred[id] || 0) > 0; }

  /* Follow the table's conditionals to the event actually conducted. */
  function resolveEvent(wp, die, war, date) {
    var def = Data.events[wp][die];
    for (var guard = 0; guard < 8; guard++) {
      if (def.insteadUnless && !occurred(war, def.insteadUnless)) { def = Data.eventById(def.insteadUnless); continue; }
      if (def.notBefore && cmp(date, def.notBefore) < 0) { def = Data.eventById(def.beforeUse); continue; }
      if (def.byYear && def.byYear[date.y]) { def = Data.eventById(def.byYear[date.y]); continue; }
      if (occurred(war, def.id)) {
        if (def.again) {
          var ag = def.again;
          if (ag.oneTime && occurred(war, ag.id)) return Data.eventById(ag.after || 'none');
          return ag;
        }
        if (def.oneTime) { def = Data.eventById(def.after || 'none'); continue; }
      }
      break;
    }
    return def;
  }

  function warEventPhase(war, date, opts) {
    var tb = war.eventTable || war.warPeriod;         // [31.6] East Wind Early has its own table
    var d = Res.d10(opts);
    var records = [rec('War Event check', 'War Event Phase [5.0]', '5.0', d, 3,
      d <= 3 ? 'an Event: roll on the ' + (tb === 'Y32' ? 'East Wind Early' : tb) + ' War Events Table' : 'no War Event this turn')];
    if (d > 3) return { event: null, records: records };
    var d2 = Res.d10(opts);
    var ev = resolveEvent(tb, d2, war, date);
    var printed = Data.events[tb][d2];
    records.push(rec('War Events Table — ' + (tb === 'Y32' ? 'East Wind Early' : tb), 'War Events Table [5.0]', '5.0', d2, null,
      ev.name + (printed.id !== ev.id ? ' (' + printed.name + ' already conducted or not yet due)' : '')));
    if (ev.type !== 'none') war.occurred[ev.id] = (war.occurred[ev.id] || 0) + 1;
    return { event: ev.type === 'none' ? null : ev, records: records };
  }

  /* ---- [6.0] Torpedo Improvement Phase ----
   * The turn after ships sunk reaches a listed number, roll = or > its die
   * roll; a failed roll waits for the next listed number. */
  var STEPS = { '-2': '-2->-1', '-1': '-1->0', '0': '0->+1', '1': '+1->+2' };
  function torpedoPhase(war, opts) {
    /* [31.61 C] East Wind Early: no Mark VI yet; the torpedo improves to 0 on
     * the −2 to −1 column, and no further. */
    if (war.torpedoCap !== undefined && war.torpedo >= war.torpedoCap) return { improved: false, records: [] };
    var key = war.torpedoColumn || STEPS[String(war.torpedo)];
    if (!key) return { improved: false, records: [] };
    var ships = war.fleet.ships + war.mine.ships;
    var list = Tables.torpedoImprovement[key];
    var due = null;
    list.forEach(function (p) {
      if (ships >= p[0] && war.torpedoTried.indexOf(key + '@' + p[0]) === -1) due = p;
    });
    if (!due) return { improved: false, records: [] };
    list.forEach(function (p) { if (p[0] <= due[0]) war.torpedoTried.push(key + '@' + p[0]); });
    var d = Res.d10(opts), ok = d >= due[1];
    if (ok) war.torpedo += 1;
    return { improved: ok, records: [rec('Torpedo Improvement at ' + due[0] + ' ships sunk', 'Torpedo Improvement Table [6.0]', '6.0',
      d, due[1], ok ? 'the Mk-XIV improves to ' + (war.torpedo > 0 ? '+' : '') + war.torpedo
                    : 'no change; the next try waits for the next listed number',
      [], [{ label: 'Ships sunk (fleet + yours)', value: ships, rule: '6.0' }])] };
  }

  /* ---- [7.0] ULTRA Phase ---- */
  function ultraPhase(war, event, opts) {
    var n = event && event.type === 'ultra2' ? 2 : event && event.type === 'noultra' ? 0 : 1;
    var line = war.warPeriod;
    /* [31.61 B] East Wind Early: ULTRA only when a War Event calls for it, on the line it names */
    if (war.ultraByEvent) { n = event && event.type === 'ultraline' ? 1 : 0; if (n) line = event.line; }
    var areas = [], records = [];
    if (!n) records.push(rec('ULTRA', 'ULTRA Table [7.0]', war.ultraByEvent ? '31.61' : '7.0', null, null,
      war.ultraByEvent ? 'no ULTRA roll: only when a War Event calls for one [31.61 B]' : 'no ULTRA roll this turn (War Event)'));
    for (var i = 0; i < n; i++) {
      var d = Res.d10(opts), got = Tables.ultraLookup(line, d);
      got.forEach(function (a) { if (areas.length < 3 && areas.indexOf(a) === -1) areas.push(a); });   // [7.3]
      records.push(rec('ULTRA — ' + line + (n > 1 ? ' (roll ' + (i + 1) + ' of 2)' : ''), 'ULTRA Table [7.0]', '7.0',
        d, null, got.join(', ')));
    }
    war.ultra = areas;
    return { areas: areas, records: records };
  }

  /* ---- [17.0] War Progress Phase ----
   * At the beginning of a numbered month, roll + the [17.1A] modifier = or >
   * the number to advance; [17.2] advance automatically once every number in
   * the block has been tried. */
  function blockFor(war) {
    return Data.transitions.filter(function (t) { return t.from === war.warPeriod; })[0] || null;
  }
  /* [IJN 7.0] Early advancement to War Period 4 (optional rule): once 860
   * ships and 3,800,000 tons are sunk in War Period 3, the current month
   * becomes the first month of the transition, counted as '9' like June 1944,
   * and the following months take the following numbers. */
  var EARLY = [9, 8, 7, 6, 5, 4, 3, 2];
  function earlyW4(war, date, opts) {
    var records = [];
    if (!war.earlyW4) {
      var ships = war.fleet.ships + war.mine.ships, tons = war.fleet.tons + war.mine.tons;
      if (ships < 860 || tons < 3800 || cmp(date, { y: 1944, m: 5 }) >= 0) return null;
      war.earlyW4 = { y: date.y, m: date.m };
      records.push(rec('Early advancement to War Period 4', 'War Period Transition [IJN 7.0]', 'IJN 7.0', null, null,
        ships + ' ships and ' + Math.round(tons * 1000).toLocaleString('en-US') + ' t sunk: the transition to W4 starts this month, at 9'));
    }
    var k = cmp(date, war.earlyW4);
    if (k >= EARLY.length) {
      war.warPeriod = 'W4';
      return { advanced: true, records: records.concat([rec('War Progress — automatic advance', 'War Period Transition [17.2]', '17.2',
        null, null, 'every early transition number tried: the war moves into W4 [IJN 7.0]')]) };
    }
    var need = EARLY[k], mod = Tables.warPeriodModifier('W4', war.fleet.tons + war.mine.tons, war.fleet.ships + war.mine.ships);
    var d = Res.d10(opts), ok = d + mod >= need;
    if (ok) war.warPeriod = 'W4';
    return { advanced: ok, records: records.concat([rec('War Progress — ' + label({ y: date.y, m: date.m }) + ' (early)', 'War Period Transition [IJN 7.0]', 'IJN 7.0',
      d, need, ok ? 'the war moves into W4' : 'no change this month', mod ? [{ label: 'Ships & tonnage sunk', value: mod, rule: '17.1A' }] : [])]) };
  }

  function warProgress(war, date, opts) {
    var b = blockFor(war);
    if (!b || date.w !== 1) return { advanced: false, records: [] };
    if (war.ijn && war.warPeriod === 'W3') {
      var early = earlyW4(war, date, opts);
      if (early) return early;
    }
    if (cmp(date, b.auto) >= 0) {
      war.warPeriod = b.to;
      return { advanced: true, records: [rec('War Progress — automatic advance', 'War Period Transition [17.2]', '17.2',
        null, null, 'every transition number tried: the war moves into ' + b.to)] };
    }
    if (cmp(date, b.first) < 0 || cmp(date, b.last) > 0) return { advanced: false, records: [] };
    var need = Tables.transitionTarget(date.y, date.m);
    if (need === null || need === undefined) return { advanced: false, records: [] };
    var tons = war.fleet.tons + war.mine.tons, ships = war.fleet.ships + war.mine.ships;
    var mod = Tables.warPeriodModifier(b.to, tons, ships);
    var d = Res.d10(opts), ok = d + mod >= need;
    if (ok) war.warPeriod = b.to;
    return { advanced: ok, records: [rec('War Progress — ' + label({ y: date.y, m: date.m }), 'War Period Transition [17.1]', '17.1',
      d, need, ok ? 'the war moves into ' + b.to : 'no change this month',
      mod ? [{ label: 'Ships & tonnage sunk', value: mod, rule: '17.1A' }] : [],
      [{ label: 'Tons sunk (thousands)', value: Math.round(tons), rule: '17.1A' }, { label: 'Ships sunk', value: ships, rule: '17.1A' }])] };
  }

  /* ---- the rest of ComSubPac ----
   * A week's share of the month's historical sinkings, times a die-driven
   * factor 0.55-1.45 (mean 1), and a loss when the die says so. */
  function fleetWeek(war, date, opts) {
    var row = Data.fleet[date.y];
    if (!row) return { records: [] };
    var d = Res.d10(opts), f = 0.55 + 0.1 * d;
    war.fleetAcc = war.fleetAcc || { ships: 0 };
    war.fleetAcc.ships += row.ships[date.m] / 4 * f;
    var whole = Math.floor(war.fleetAcc.ships);
    war.fleetAcc.ships -= whole;
    war.fleet.ships += whole;
    var tons = Math.round(row.tons[date.m] / 4 * f * 10) / 10;
    war.fleet.tons = Math.round((war.fleet.tons + tons) * 10) / 10;
    var dl = Res.d10(opts), lost = dl < Math.round(row.lost[date.m] / 4 * 10) ? 1 : 0;
    war.fleet.lost += lost;
    return { ships: whole, tons: tons, lost: lost, records: [rec('The rest of ComSubPac this week', 'Fleet (design) [Phase 6]', '6.0',
      d, null, whole + ' ships, ' + Math.round(tons * 1000).toLocaleString('en-US') + ' t' + (lost ? '; a boat is lost' : '') +
      ' (fleet total ' + war.fleet.ships + ' ships)')] };
  }

  /* The fleet's running totals when a career starts: every whole month of the
   * curve from December 1941 up to the start. */
  function fleetAt(date) {
    var out = { ships: 0, tons: 0, lost: 0 };
    for (var y = 1941; y <= date.y; y++) {
      var row = Data.fleet[y];
      if (!row) continue;
      for (var m = 0; m < 12; m++) {
        if (y === date.y && m >= date.m) break;
        out.ships += row.ships[m]; out.tons += row.tons[m]; out.lost += row.lost[m];
      }
    }
    return out;
  }

  /* A new career's war: the period, the torpedo and the bases as they stand,
   * and every torpedo threshold already passed counted as tried. */
  function create(career) {
    var war = {
      warPeriod: career.warPeriod, torpedo: career.torpedo,
      fleet: fleetAt(career.start), mine: { ships: 0, tons: 0 },
      occurred: {}, ultra: [], event: null, torpedoTried: [],
      bases: Data.basesAtPeriod[career.warPeriod].slice(), subic: false,
      tenders: [], tenderAt: {}, pendingTenders: []
    };
    /* Forward bases already open when the career starts: the period-start
     * notes up to its War Period, each given the earliest tender available
     * then (a drawn tender is [21.21]'s rule once the career is running). */
    /* [33.2] K-XIV sails from Surabaya, its Display a full base [33.14]. */
    if (career.base === 'surabaya') { war.surabayaBase = true; war.tenders.push('surabaya'); war.tenderAt.surabaya = ['zuiderkruis']; }
    ['W2', 'W3', 'W4'].forEach(function (wp) {
      if (wp > career.warPeriod) return;
      (Data.periodStart[wp].effects || []).forEach(function (e) {
        if (e.tender) placeTender(war, e.tender, career.start, null);
      });
    });
    Object.keys(STEPS).forEach(function (k) {
      Tables.torpedoImprovement[STEPS[k]].forEach(function (p) {
        if (Number(k) < career.torpedo || p[0] <= war.fleet.ships) war.torpedoTried.push(STEPS[k] + '@' + p[0]);
      });
    });
    ['W2', 'W3', 'W4'].forEach(function (wp) {
      if (wp <= career.warPeriod) (Data.periodStart[wp].marks || []).forEach(function (id) { war.occurred[id] = 1; });
    });
    return war;
  }

  /* [21.21] A tender for a forward base: drawn at random among those whose
   * deployment date has come and that are not already placed. With no opts
   * (a career's start) the earliest available is used. A second tender at
   * the same base adds its capacity [5.0, W4-9]. */
  function tendersAvailable(war, date) {
    var placed = [];
    Object.keys(war.tenderAt).forEach(function (fb) { placed = placed.concat(war.tenderAt[fb]); });
    return Data.tenders.filter(function (t) {
      return !t.dutch && placed.indexOf(t.id) === -1 && (!t.from || cmp(date, t.from) >= 0);
    });
  }
  function placeTender(war, fb, date, opts, id) {
    var pool = tendersAvailable(war, date);
    /* a named tender (East Wind Early: Holland at Wake, Canopus at Davao) */
    if (id) { pool = Data.tenders.filter(function (t) { return t.id === id; }); opts = null; }
    if (!pool.length) return { tender: null, records: [rec('Forward base — ' + Data.forwardBases[fb].name, 'Submarine Tenders [21.21]', '21.21',
      null, null, 'no tender available to place')] };
    var die = opts ? Res.d10(opts) : null, t = pool[die === null ? 0 : die % pool.length];
    war.tenderAt[fb] = (war.tenderAt[fb] || []).concat([t.id]);
    if (war.tenders.indexOf(fb) === -1) war.tenders.push(fb);
    return { tender: t, records: [rec('Forward base — ' + Data.forwardBases[fb].name, 'Submarine Tenders [21.21]', '21.21',
      die, null, 'tender ' + t.name + ' (up to ' + t.capacity + ' boats) arrives; the base is open' +
      (die === null ? '' : ' (drawn from ' + pool.length + ')'))] };
  }
  function tenderCapacity(war, fb) {
    return (war.tenderAt[fb] || []).reduce(function (n, id) {
      return n + Data.tenders.filter(function (t) { return t.id === id; })[0].capacity;
    }, 0);
  }
  function allBases(war) { return war.bases.concat(war.tenders); }

  root.SWWar = {
    placeTender: placeTender, tenderCapacity: tenderCapacity, tendersAvailable: tendersAvailable, allBases: allBases,
    months: MONTHS,
    nextWeek: nextWeek, cmp: cmp, monthKey: monthKey, label: label, pastEnd: pastEnd,
    resolveEvent: resolveEvent,
    warEventPhase: warEventPhase,
    torpedoPhase: torpedoPhase,
    ultraPhase: ultraPhase,
    warProgress: warProgress,
    fleetWeek: fleetWeek,
    fleetAt: fleetAt,
    create: create
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
