/* sw_fleet.js — fleet command: a Campaign Game [31.x] (Phase 8). PURE MODULE.
 * ZERO DOM, ZERO Math.random; dice arrive through opts.rollDie.
 *
 * Every US boat in the theatre is a boat state from sw_career.createBoat,
 * sharing one war, one calendar, one War Mix and one TDC pool. The week:
 *   I.   Strategic Segment once for the war [5.0]-[7.0]; the War Event's
 *        effects on the war once, then on every boat; mission quotas filled
 *        [5.2]; relegation [5.0]
 *   II.  reinforcements [8.0], then each boat's Triple-R [9.0]-[10.0], the Hold
 *        Box [10.2]
 *   ---  ORDERS: you send boats Ready for Sea out, and mark which boats on
 *        station fight on the Combat Display; the rest use Quick Resolution
 *   III. Operations, boat by boat, on standing orders (the teaching captain);
 *        a fight you marked stops the week until you have played it
 *   IV.  End Turn: each boat's end of week, the calendar, career longevity
 *        [31.12], War Progress [17.0] on your own sinkings; the end [31.24]
 * Contract, as everywhere: legalActions(fleet) / apply(fleet, action, opts).
 */
(function (root) {
  'use strict';

  var req = typeof require === 'function' ? require : null;
  var Career  = root.SWCareer  || (req ? req('./sw_career.js').SWCareer : null);
  var Patrol  = root.SWPatrol  || (req ? req('./sw_patrol.js').SWPatrol : null);
  var War     = root.SWWar     || (req ? req('./sw_war.js').SWWar : null);
  var Base    = root.SWBase    || (req ? req('./sw_base.js').SWBase : null);
  var Transit = root.SWTransit || (req ? req('./sw_transit.js').SWTransit : null);
  var Cups    = root.SWCups    || (req ? req('./sw_cups.js').SWCups : null);
  var Res     = root.SWResolution || (req ? req('./sw_resolution.js').SWResolution : null);
  var Data    = root.SWCampaignData || (req ? req('../data/sw_campaign.js').SWCampaignData : null);
  var Teacher = root.SWTeacher || (req ? req('./sw_teacher.js').SWTeacher : null);
  var Ships   = root.SWShips   || (req ? req('../data/sw_ships.js').SWShips : null);

  function note(fleet, context, result, rule) {
    var r = Res.makeRecord({ context: context, table: 'Fleet [' + rule + ']', ruleRef: rule, inputs: [], drms: [],
      die: null, modifiedDie: null, target: null, result: result });
    r.date = War.label(fleet.date); r.turn = fleet.turn; r.submarine = 'ComSubPac';
    fleet.log.push(r);
    return r;
  }
  function log(fleet, records) {
    (records || []).forEach(function (r) { r.date = War.label(fleet.date); r.turn = fleet.turn; r.submarine = r.submarine || 'ComSubPac'; fleet.log.push(r); });
  }
  function live(fleet) { return fleet.boats.filter(function (b) { return !b.done; }); }
  function byName(fleet, n) {
    var all = fleet.boats.filter(function (b) { return b.career.boat === n; });
    return all.filter(function (b) { return !b.done; })[0] || all[0] || null;     // a boat back in the war after a withdrawal [33.14]
  }
  function G() {                                   // the globals the captain reads
    return root.SWCombat ? root : (typeof global !== 'undefined' ? global : root);
  }

  /* ---------------- create ---------------- */
  /* settings.auto: how the fights you do not play are resolved:
   *   'captain' - the teaching captain plays them on the full rules (default)
   *   'quick'   - Quick Resolution [27.0], which the book says is "not
   *               recommended for extensive campaign use" */
  function create(id, opts, settings) {
    settings = settings || {};
    var def = Data.campaign(id);
    if (!def) throw new Error('sw_fleet: unknown campaign ' + id);
    var war = {
      warPeriod: def.warPeriod, torpedo: def.torpedo,
      fleet: { ships: 0, tons: 0, lost: 0 }, mine: { ships: 0, tons: 0 },   // every boat is yours: no off-screen fleet
      occurred: {}, ultra: [], event: null, torpedoTried: [],
      bases: def.bases.slice(), subic: false, tenders: [], tenderAt: {}, pendingTenders: [], campaign: true
    };
    var fleet = {
      id: id, def: def, war: war, date: { y: def.start.y, m: def.start.m, w: def.start.w },
      start: { y: def.start.y, m: def.start.m }, turn: 1,
      cups: null, tdcPool: Cups.tdcPool(), gone: (def.sunkRows || []).slice(),
      offset: def.counters || { ships: 0, tons: 0, lost: 0 },
      withdrawList: def.withdraw || Data.withdraw,
      returnAfter: def.noReturns ? function () { return null; } : Data.returnAfter,
      boats: [], log: [], phase: 'orders', sail: {}, fight: {}, queue: [], active: null,
      assign: {}, lost: 0, relegated: 0, done: false, outcome: null, verdict: null, longevity: 0,
      auto: settings.auto === 'quick' ? 'quick' : 'captain',
      noLongevity: !!settings.noLongevity,                    // a test setting: measure a whole year
      careful: settings.careful !== false, tune: settings.tune || null,
      opt: settings.optional || {}
    };
    var A = Data.allied, opt = fleet.opt;
    /* [31.61] East Wind Early's rule changes, carried by the war */
    ['eventTable', 'ultraByEvent', 'generalAsw', 'torpedoCap', 'torpedoColumn'].forEach(function (k) { if (def[k] !== undefined) war[k] = def[k]; });
    /* The Historical pace house rule (off by default; not in the book): an
     * Endurance modifier by War Period. `settings.paceTable` is for tuning. */
    if (opt.pace) war.pace = settings.paceTable || Data.pace;
    /* [33.1] Allied submarines: their own tally [33.1]; Surabaya active at
     * the start with Zuiderkruis in its zone [33.14], in a campaign that
     * begins in 1941 and may use it. */
    fleet.allied = opt.allied ? { ships: 0, tons: 0, lost: 0 } : null;
    if (opt.allied && def.warPeriod === 'W1' && (!def.allowedForward || def.allowedForward.indexOf('surabaya') > -1)) {
      war.surabayaBase = true; war.tenders.push('surabaya'); war.tenderAt.surabaya = ['zuiderkruis'];
    }
    fleet.withdrawList = mergeLists(fleet.withdrawList, opt.allied ? A.withdraw : null);
    if (opt.surcouf) fleet.withdrawList = mergeLists(fleet.withdrawList, (function (o) { var x = {}; x[o.leaves] = [o.boat]; return x; }(Data.optionalBoats.surcouf)));
    if (opt.staggered) { fleet.staggerWeek = {}; fleet.pending = []; }
    buildCups(fleet, opts);
    /* The war as the campaign finds it: the period notes up to its start
     * period count as done, and the tenders already at their bases. */
    ['W2', 'W3', 'W4'].forEach(function (wp) {
      if (wp <= def.warPeriod) (Data.periodStart[wp].marks || []).forEach(function (m) { war.occurred[m] = 1; });
    });
    Object.keys(def.tenders || {}).forEach(function (fb) { war.tenders.push(fb); war.tenderAt[fb] = [def.tenders[fb]]; });
    fleet.ordersFor = function (state) { return fleet.assign[state.career.boat] || null; };
    fleet.packs = {}; fleet.packXp = def.packXp || 0;
    fleet.packHome = function (leader, base, subs, from, o) { packHome(fleet, leader, base, subs, from, o); };
    fleet.boatsIn = function (area) {
      /* [22.3] every two boats of a wolfpack count as one */
      return live(fleet).filter(function (b) { return b.career.atSea && !b.career.inPack && b.area === area && !b.smz; })
        .reduce(function (n, b) { return n + (b.pack ? Math.ceil(b.pack.length / 2) : 1); }, 0);
    };
    fleet.hasRoom = function (baseId) {
      var cap = (baseId === 'manila' && war.subic) ? Data.bases.manila.subic.capacity
              : (baseId === 'surabaya' && war.surabayaBase) ? Data.allied.surabaya.capacity : (Data.bases[baseId] || {}).capacity || 99;
      return live(fleet).filter(function (b) { return !b.career.atSea && b.career.base === baseId && /^repair/.test(b.career.box || ''); }).length < cap;
    };
    fleet.carrier = { career: { date: fleet.date }, war: war, log: fleet.log, sub: { name: 'ComSubPac' }, turn: 1, phase: '5.0' };
    var oob = def.oob.slice();
    if (opt.allied && war.surabayaBase) oob = oob.concat(A.oob.map(function (g) { return Object.assign({ allied: true }, g); }));
    if (opt.allied && A.startOob[def.id]) oob = oob.concat(A.startOob[def.id].map(function (g) { return Object.assign({ allied: true }, g); }));
    oob.forEach(function (g) {
      g.boats.forEach(function (n) {
        var at = g.overhaul ? { base: 'pearl', box: 'ready' }
               : g.base ? { base: g.base, box: g.box }
               : { area: g.area || g.via, smz: g.smz || null, side: g.rtb ? 'transit' : 'patrol', rtb: !!g.rtb, home: g.home,
                   heading: typeof g.rtb === 'string' ? { kind: 'base', id: g.rtb } : null };
        var b = Career.createBoat(g.allied ? n : Data.rosterName(n), fleet, at);
        setupBoat(fleet, b, n);
        if (g.rule && g.rule.holdSmz) b.smzWeeks = 99;                 // [33.14] until spotted, damaged or sent home
        if (g.overhaul) {
          /* [8.0C] in the West Coast box; back when the list says [8.0D]. */
          var key = War.monthKey(fleet.date), short = b.career.boat.replace(/^USS /, '');
          b.career.box = 'overhaul'; b.career.base = 'west_coast';
          b.career.returnKey = fleet.returnAfter(short, key) || fleet.returnAfter(short, '1941-12');
          if (b.career.returnKey && b.career.returnKey <= key) b.career.returnKey = null;
        }
        if (g.aleutians) { b.career.homeBase = 'dutch_harbor'; b.career.areaLimit = ['aleutians', 'kurile']; }
        if (g.rule) {
          b.career.startRule = JSON.parse(JSON.stringify(g.rule));
          if (g.rule.smzWeeks) b.smzWeeks = g.rule.smzWeeks;
        }
        fleet.boats.push(b);
      });
      /* [31.42] wolfpacks already at sea: the first boat leads. */
      (g.packs || []).forEach(function (names) {
        var bs = names.map(function (n) { return byName(fleet, Data.rosterName(n)); }).filter(Boolean);
        if (bs.length < 3) return;
        var L = bs[0];
        L.pack = bs.map(function (x) { return x.sub; }); L.flag = L.sub; L.packXp = fleet.packXp; L.packXpThisPatrol = false;
        bs.slice(1).forEach(function (m) { m.career.inPack = L.career.boat; m.phase = 'inpack'; });
      });
    });
    tally(fleet);
    note(fleet, def.title + ' begins', 'ComSubPac, ' + War.label(fleet.date) + ': ' + fleet.boats.length + ' boats, War Period ' +
      war.warPeriod + ', Mk-XIV ' + war.torpedo + (def.counters ? '; already sunk: ' + def.counters.ships + ' ships, ' +
      (def.counters.tons * 1000).toLocaleString('en-US') + ' t; ' + def.counters.lost + ' boats lost' : '') +
      '. The first turn skips the Strategic Segment [' + def.rule + ']', def.rule);
    /* [31.11] the first turn: no Strategic Segment. */
    fleet.boats.forEach(function (b) { Career.boatWeek(b, opts); });
    holdBox(fleet);
    fleet.phase = 'orders';
    fleet.series = [point(fleet)]; fleet.weeks = [];
    weekMark(fleet);
    return fleet;
  }

  /* ---------------- the record of the war (Phase 9) ----------------
   * Not rules: what the page draws. `series` is the war's running totals, one
   * point a week, for the history tracker; `weeks` is each week's summary for
   * the Fleet board: who sank what, who was lost, what the war did. */
  function point(fleet) {
    return { y: fleet.date.y, m: fleet.date.m, w: fleet.date.w, tons: fleet.war.mine.tons, ships: fleet.war.mine.ships, lost: subsLost(fleet) };
  }
  function weekMark(fleet) {
    fleet.mark = { log: fleet.log.length, boats: {} };
    fleet.boats.forEach(function (b) { fleet.mark.boats[b.career.boat] = { s: b.sub.shipsSunk || 0, t: b.sub.tonsSunk || 0 }; });
  }
  function weekSummary(fleet) {
    var m = fleet.mark || { log: 0, boats: {} }, sank = [], lost = [], news = [];
    fleet.boats.forEach(function (b) {
      var o = m.boats[b.career.boat] || { s: 0, t: 0 }, ds = (b.sub.shipsSunk || 0) - o.s, dt = (b.sub.tonsSunk || 0) - o.t;
      if (ds > 0 || dt > 0.05) sank.push({ boat: b.career.boat, ships: ds, tons: Math.round(dt * 10) / 10 });
      if (b.done && b.counted && b.countedTurn === fleet.turn) lost.push({ boat: b.career.boat, how: b.outcome });
    });
    fleet.log.slice(m.log).forEach(function (r) {
      if (/War Event|Special Mission|Reinforcement|War Period|The Mk-XIV|Torpedo|Relegat|Wolfpack|Career longevity|Aleutians|Tender|Allied|Dutch/.test(r.context + ' ' + r.table)) {
        news.push({ context: r.context, result: typeof r.result === 'string' ? r.result : JSON.stringify(r.result), rule: r.ruleRef });
      }
    });
    sank.sort(function (a, b) { return b.tons - a.tons; });
    return { turn: fleet.turn, date: { y: fleet.date.y, m: fleet.date.m, w: fleet.date.w }, sank: sank, lost: lost, news: news,
             ships: sank.reduce(function (s, x) { return s + x.ships; }, 0), tons: Math.round(sank.reduce(function (s, x) { return s + x.tons; }, 0) * 10) / 10 };
  }

  /* A boat as the campaign places it: a named Super Skipper ("Wahoo*Morton"),
   * and the campaign's operating areas [31.5 A]. */
  function setupBoat(fleet, b, listed) {
    var sk = Data.skipperOf(listed);
    if (sk) b.sub.superSkipper = { name: sk, value: 1 };
    if (fleet.def.areas) b.career.areaLimit = fleet.def.areas.slice();
    b.careful = true;
    var c = b.career, d = fleet.def;
    /* [31.61 D] East Wind Early's War Mix exceptions, read by the patrol engine */
    if (d.diligentPieces) b.diligentPieces = d.diligentPieces;
    if (d.bbAreas) b.bbAreas = d.bbAreas;
    if (d.uniqueRows) b.extraUnique = d.uniqueRows;
    if (d.aircraft) b.aircraftName = d.aircraft;
    if (d.victory.kind === 'eastWind') b.damagedCapitalCounts = true;
    if (c.boat === 'USS Leviathon') { b.sub.gunnery = '31.65'; b.sub.gunLine = 7; }       // the 5-9 line [31.65]
    if (fleet.opt.allied && (c.nation === 'NL' || c.nation === 'GB')) {
      c.allied = true;
      if (c.nation === 'NL' && fleet.date.y <= 1942) c.dutch1942 = true;
      alliedBases(fleet, b);
    }
    /* [33.3]-[33.5] the optional boats */
    Object.keys(Data.optionalBoats).forEach(function (k) {
      var o = Data.optionalBoats[k];
      if (o.boat !== c.boat) return;
      if (o.torpedo !== undefined) c.torpedoFixed = o.torpedo;
      if (o.oneDamage) c.oneDamage = true;
      if (o.gunnery) { b.sub.gunnery = o.rule === '33.3' ? '33.31' : o.rule; b.sub.gunLine = 13; }   // the 10-17 line [33.31]
    });
  }
  /* [33.11] Dutch boats use Surabaya until it falls; then Dutch and British
   * use only Fremantle, Subic Bay and Mios Woendi. */
  function alliedBases(fleet, b) {
    var c = b.career;
    c.basesOnly = c.nation === 'NL' && fleet.war.surabayaBase ? ['surabaya'] : Data.allied.basesAfterFall.slice();
  }
  function mergeLists(a, b) {
    if (!b) return a;
    var out = {};
    [a || {}, b].forEach(function (L) { Object.keys(L).forEach(function (k) { out[k] = (out[k] || []).concat(L[k]); }); });
    return out;
  }
  /* [3.1] the War Mix for the period, without the dated ships not yet in the
   * war [3.12] and the unique ships already sunk. */
  function buildCups(fleet, opts) {
    var dated = {};
    Ships.dated().forEach(function (p) {
      var row = Ships.datedMixRow[p.id], e = p.entry.split('/');
      if (row) dated[row] = { y: 1900 + Number(e[1]), m: Number(e[0]) - 1 };
    });
    fleet.dated = dated;
    var dd = fleet.def.ddDefense;
    fleet.cups = Cups.build(fleet.def.mix || fleet.war.warPeriod, opts, function (row) {
      if (fleet.gone.indexOf(row) > -1) return false;
      return !dated[row] || War.cmp(fleet.date, dated[row]) >= 0;
    }, dd ? function (id) { var p = Ships.piece(id); return !(p.type === 'DD' && p.tonnage === 2) || p.defense === dd; } : null);
    fleet.boats.forEach(function (b) { b.cups = fleet.cups; });
  }

  /* ---------------- the war's totals ---------------- */
  function tally(fleet) {
    var s = 0, t = 0, cap = 0, capT = 0, capD = 0, bbcv = 0, o = fleet.offset;
    if (fleet.allied) { fleet.allied.ships = 0; fleet.allied.tons = 0; }
    fleet.boats.forEach(function (b) {
      if (b.career.allied) {
        /* [33.1] Allied sinkings are kept apart: no effect on longevity, the
         * torpedo or the War Period; they count for the war's end and, from
         * the date [33.15] names, for victory. */
        fleet.allied.ships += b.shipsSunk; fleet.allied.tons = Math.round((fleet.allied.tons + b.tonnageSunk) * 10) / 10;
        (b.goneRows || []).forEach(function (r) { if (fleet.gone.indexOf(r) === -1) fleet.gone.push(r); });
        return;
      }
      s += b.shipsSunk; t += b.tonnageSunk; cap += b.capitalSunk || 0;
      capT += b.capitalTons || 0; capD += b.capitalDamagedTons || 0; bbcv += b.bbcvSunk || 0;
      (b.goneRows || []).forEach(function (r) { if (fleet.gone.indexOf(r) === -1) fleet.gone.push(r); });
    });
    fleet.war.mine.ships = s + o.ships; fleet.war.mine.tons = Math.round((t + o.tons) * 10) / 10;
    fleet.capital = cap; fleet.capitalTons = capT; fleet.capitalDamagedTons = capD; fleet.bbcv = bbcv;
    fleet.war.fleet.lost = fleet.lost + o.lost;          // the Relegation table reads Subs Lost
  }
  function subsLost(fleet) { return fleet.lost + fleet.offset.lost; }
  /* [33.15] the Tonnage and Subs Lost boxes as victory reads them: from the
   * campaign's date, less its adjustment and plus the Allied totals. */
  function adjustment(fleet) {
    if (!fleet.allied) return null;
    var a = Data.allied.adjust[fleet.def.id];
    if (!a) return null;
    return (a.atEnd ? fleet.done || fleet.ending : War.cmp(fleet.date, a.at) >= 0) ? a : null;
  }
  function vTons(fleet) {
    var t = fleet.war.mine.tons, a = adjustment(fleet);
    /* Allied sinkings always count toward the end of the war [33.1] */
    if (fleet.allied && fleet.def.victory.kind === 'byDate' && !a) t += fleet.allied.tons;
    return a ? Math.round((t - a.tons + fleet.allied.tons) * 10) / 10 : t;
  }
  function vLost(fleet) {
    var a = adjustment(fleet);
    return a ? Math.max(0, subsLost(fleet) - a.lost + fleet.allied.lost) : subsLost(fleet);
  }

  /* ---------------- I. Strategic Segment ---------------- */
  function strategic(fleet, opts) {
    var war = fleet.war;
    tally(fleet);
    fleet.carrier.career.date = fleet.date; fleet.carrier.turn = fleet.turn;
    var ev = War.warEventPhase(war, fleet.date, opts);
    log(fleet, ev.records);
    war.event = ev.event;
    if (ev.event && fleet.def.areas && !fleet.def.allSmz && outside(fleet, ev.event)) {
      note(fleet, ev.event.name, 'outside the campaign\'s waters: No Event [31.5 B]', '31.5');
      war.event = ev.event = null;
    }
    if (!fleet.def.schedule) log(fleet, War.torpedoPhase(war, opts).records);
    log(fleet, War.ultraPhase(war, ev.event, opts).records);
    fleet.assign = {};
    if (!ev.event) return;
    var e = ev.event;
    if (e.type === 'relegate') relegate(fleet, e, opts);
    if (e.type === 'political') live(fleet).forEach(function (b) { b.career.weekRule = 'political'; });
    if (e.id === 'w1_aleutians') designateAleutians(fleet, opts);
    var eff = allowedEffects(fleet, e.effects);
    if (eff.length) {
      Career.applyEffects(fleet.carrier, eff, opts, 'war');
      live(fleet).forEach(function (b) { Career.applyEffects(b, eff, opts, 'boat'); });
    }
    if (e.type === 'mission') quota(fleet, e);
    /* [31.6] event 9: the Dutch division, in Surabaya's Broom Box */
    (e.effects || []).forEach(function (x) {
      (x.dutchIntervention || []).forEach(function (n) {
        if (live(fleet).some(function (b) { return b.career.boat === n; })) return;
        var b = Career.createBoat(n, fleet, { base: 'surabaya', box: 'broom' });
        setupBoat(fleet, b, n); b.career.torpedoSame = true; b.turn = fleet.turn;
        fleet.boats.push(b);
        note(fleet, 'Dutch Intervention', n + ' arrives in the Broom Box at Surabaya [31.6]', '31.6');
      });
    });
  }

  /* [31.5 B] a campaign limited to some waters: a mission entirely elsewhere
   * is No Event, and bases and tenders it does not use stay out. */
  function outside(fleet, e) {
    if (e.type !== 'mission') return false;
    var A = fleet.def.areas;
    var inAreas = (e.areas || []).some(function (a) { return A.indexOf(a) > -1; });
    var inSmz = (e.smz || []).some(function (z) { return z !== 'guam' && (Data.smzLinks[z] || []).some(function (a) { return A.indexOf(a) > -1; }); });
    return !inAreas && !inSmz;
  }
  function allowedEffects(fleet, effects) {
    var d = fleet.def;
    return (effects || []).filter(function (x) {
      if (d.allowedBases && (x.activate || x.deactivate) && d.allowedBases.indexOf(x.activate || x.deactivate) === -1) return false;
      if (d.allowedForward && x.tender && d.allowedForward.indexOf(x.tender) === -1) return false;
      return true;
    });
  }

  /* [5.2] as many boats as the event asks, those that can reach it, nearest first. */
  function quota(fleet, e) {
    var cands = [];
    live(fleet).forEach(function (b) {
      if (!b.career.atSea || b.sub.rtb) return;
      var o = Career.missionOrders(b);
      if (!o || !o.tasked) return;
      var inPlace = o.areas.indexOf(b.area) > -1 || o.smz.some(function (z) { return (Data.smzLinks[z] || []).indexOf(b.area) > -1; });
      cands.push({ b: b, o: o, d: inPlace ? 0 : 1 });
    });
    /* [31.6] event 3: the big-gun boats first, if available */
    var pref = function (b) { return e.prefer && e.prefer.indexOf(b.career.boat) > -1 ? 0 : 1; };
    cands.sort(function (x, y) { return (pref(x.b) - pref(y.b)) || (x.d - y.d); });
    var sent = cands.slice(0, e.count);
    sent.forEach(function (c) { fleet.assign[c.b.career.boat] = c.o; });
    note(fleet, 'Special Mission — ' + e.name, sent.length
      ? sent.length + ' of the ' + e.count + ' boats asked: ' + sent.map(function (c) { return c.b.career.boat.replace('USS ', ''); }).join(', ') +
        (sent.length < e.count ? '; no more can reach it this week (no penalty) [5.2]' : ' [5.2]')
      : 'no boat can reach it this week; no penalty [5.2]', '5.2');
  }

  /* [5.0] Relegation: the boats the table names first, then the weakest
   * eligible boats, those in port first. Not a boat in overhaul [8.0C]. */
  function relegate(fleet, e, opts) {
    var n = fleet.def.relegateCount || (subsLost(fleet) >= e.fewerAtLost ? 2 : e.count), out = [];
    var pool = live(fleet).filter(function (b) { return b.career.box !== 'overhaul' && !b.career.allied; });   // [33.11]
    e.first.forEach(function (name) { var b = pool.filter(function (x) { return x.career.boat === name; })[0]; if (b && out.length < n) out.push(b); });
    pool.filter(function (b) { return out.indexOf(b) === -1 && b.sub.attack < e.exemptAttack; })
      .sort(function (a, b) { return (a.sub.attack - b.sub.attack) || ((a.career.atSea ? 1 : 0) - (b.career.atSea ? 1 : 0)); })
      .forEach(function (b) { if (out.length < n) out.push(b); });
    out.forEach(function (b) { Career.finish(b, 'relegated', 'Relegated to training duty [5.0].'); fleet.relegated += 1; });
    note(fleet, e.name, out.length ? out.map(function (b) { return b.career.boat.replace('USS ', ''); }).join(', ') + ' relegated to training duty (not counted as lost) [5.0]'
                                   : 'no eligible boat: No Event [5.0]', '5.0');
  }

  /* [5.0] W1-6: eight boats must base at Dutch Harbor and operate only in the
   * Aleutians and Kuriles. The weakest are chosen, S-boats first; boats in
   * another port sail there. A lost boat of the group is replaced. */
  function designateAleutians(fleet, opts, count) {
    var pool = live(fleet).filter(function (b) { return !b.career.homeBase && b.career.box !== 'overhaul' && !b.career.nation; })
      .sort(function (a, b) {
        var sa = /^s[13]$/.test(a.career.cls) ? 0 : 1, sb = /^s[13]$/.test(b.career.cls) ? 0 : 1;
        return (sa - sb) || (a.sub.attack - b.sub.attack);
      });
    var picked = pool.slice(0, count || 8);
    picked.forEach(function (b) {
      var c = b.career;
      c.homeBase = 'dutch_harbor'; c.areaLimit = ['aleutians', 'kurile'];
      if (!c.atSea && c.base !== 'dutch_harbor' && !/^repair|hold/.test(c.box || '')) {
        c.atSea = true; c.box = null; b.sub.rtb = true; b.sub.side = 'transit'; c.heading = { kind: 'base', id: 'dutch_harbor' };
        c.current = { n: c.patrols.length + 1, depart: fleet.date, from: c.base, ships0: b.shipsSunk, tons0: b.tonnageSunk, own0: b.sub.shipsSunk || 0, ownT0: b.sub.tonsSunk || 0, pack: null };
      }
    });
    if (picked.length) note(fleet, 'The Aleutians group', picked.map(function (b) { return b.career.boat.replace('USS ', ''); }).join(', ') +
      ' now base at Dutch Harbor and patrol only the Aleutians and Kuriles [5.0]', '5.0');
  }

  /* ---------------- [24.0] wolfpacks ---------------- */
  /* [24.11]-[24.13] how many packs, and how big, with Wolfpack Experience. */
  function packLimits(fleet) {
    var x = fleet.packXp;
    return x >= 15 ? { packs: 5, size: 6 } : x >= 9 ? { packs: 3, size: 4 } : { packs: 1, size: 3 };
  }
  function packsOut(fleet) {
    return live(fleet).filter(function (b) { return b.pack && b.career.atSea; }).length + Object.keys(fleet.packs).length;
  }
  function planned(fleet, name) {
    if (fleet.packs[name]) return true;
    return Object.keys(fleet.packs).some(function (L) { return fleet.packs[L].indexOf(name) > -1; });
  }
  /* The boats that would join `leader`: others Ready for Sea at the same base,
   * not already in a plan, those without an order first. */
  function packMates(fleet, leader) {
    var c = leader.career, lim = packLimits(fleet);
    var pool = live(fleet).filter(function (b) {
      return b !== leader && b.phase === 'base' && b.career.box === 'ready' && b.career.base === c.base && !planned(fleet, b.career.boat) && !b.career.allied;
    }).sort(function (a, b) { return (fleet.sail[a.career.boat] ? 1 : 0) - (fleet.sail[b.career.boat] ? 1 : 0); });
    return pool.slice(0, lim.size - 1);
  }
  function canLead(fleet, b) {
    var c = b.career;
    return !!fleet.sail[c.boat] && !c.allied && !!Data.bases[c.base] && War.cmp(fleet.date, { y: 1943, m: 9 }) >= 0 &&
           !planned(fleet, c.boat) && packsOut(fleet) < packLimits(fleet).packs && packMates(fleet, b).length >= 2;
  }
  /* The pack leaves: members ride in the leader's state [24.2]. */
  function packSail(fleet, leader) {
    var names = fleet.packs[leader.career.boat];
    delete fleet.packs[leader.career.boat];
    if (!names) return;
    var ms = names.map(function (n) { return byName(fleet, n); }).filter(function (m) { return m && !m.done && m.phase === 'base'; });
    if (ms.length < 2) return;
    leader.career.packPlanned = ms.map(function (m) { return m.sub; });
    leader.packXp = fleet.packXp;
    ms.forEach(function (m) {
      Career.openPatrol(m);
      m.career.inPack = leader.career.boat; m.career.atSea = true; m.career.box = null; m.phase = 'inpack';
      delete fleet.sail[m.career.boat];
    });
  }
  /* [24.14] boats no longer in their leader's pack go their own way. */
  function packRelease(fleet) {
    live(fleet).forEach(function (m) {
      var L = m.career.inPack && byName(fleet, m.career.inPack);
      if (!m.career.inPack) return;
      if (L && !L.done && L.pack && L.pack.indexOf(m.sub) > -1) return;
      m.career.inPack = null;
      if (m.sub.sunk) { Career.finish(m, 'lost', 'Lost with all hands, in a wolfpack.'); return; }
      if (!m.career.atSea) return;                                   // it came home with the pack
      m.area = L ? L.area : m.area;
      m.sub.side = m.sub.rtb ? 'transit' : 'patrol';
      m.career.heading = null;
      m.phase = '16.0';
      note(fleet, m.career.boat, 'leaves the wolfpack and carries on alone from ' + m.area + ' [24.14]', '24.14');
    });
    live(fleet).forEach(function (b) { if (b.packXp > fleet.packXp) fleet.packXp = b.packXp; });
  }
  /* The leader docks: the others arrive with it, each rolling its own damage. */
  function packHome(fleet, leader, base, subs, from, opts) {
    live(fleet).forEach(function (m) {
      if (m.career.inPack !== leader.career.boat || subs.indexOf(m.sub) === -1) return;
      m.career.inPack = null;
      m.area = from;
      Career.dock(m, base, opts);
    });
  }

  /* ---------------- II. Reinforcements and Triple-R ---------------- */
  /* The month's arrivals: the list [8.0B], and with the options the Allied
   * list [33.14], the single boats [33.3]-[33.5] and Zeeleeuw. With [34.0]
   * each is rolled a week; otherwise all come in week 1. */
  function monthArrivals(fleet, key) {
    var out = [], d = fleet.def, opt = fleet.opt, A = Data.allied;
    var list = (d.arrive || Data.arrive)[key];
    var inRange = key <= d.reinforcementsUntil && !(d.reinforcementsFrom && key < d.reinforcementsFrom);
    var zee = opt.allied && opt.zeeleeuw ? A.zeeleeuw : null;
    if (list && inRange) Object.keys(list).forEach(function (base) {
      list[base].forEach(function (n) {
        var name = Data.rosterName(n);
        if (zee && zee.removes.indexOf(name) > -1) return;
        out.push({ name: name, listed: n, base: base, rule: '8.0' });
      });
    });
    if (opt.allied && inRange) {
      Object.keys(A.arrive[key] || {}).forEach(function (base) {
        A.arrive[key][base].forEach(function (n) {
          if (zee && zee.removes.indexOf(n) > -1) return;
          /* [33.14 *] a sunk K-XIV / K-XV comes back as K-XVI / K-XVIII if that boat survived */
          var sunk = function (x) { return fleet.boats.some(function (b) { return b.career.boat === x && b.outcome === 'lost'; }); };
          if (A.replace[n] && sunk(n)) { if (sunk(A.replace[n])) return; n = A.replace[n]; }
          out.push({ name: n, listed: n, base: base, rule: '33.14', allied: true, again: key === '1945-05' });
        });
      });
      if (zee && key === zee.key) out.push({ name: 'Zeeleeuw', listed: 'Zeeleeuw', base: zee.base, rule: '33.14', allied: true });
    }
    Object.keys(Data.optionalBoats).forEach(function (k) {
      var o = Data.optionalBoats[k];
      if (opt[k] && o.key === key && War.cmp(fleet.date, d.end) <= 0) out.push({ name: o.boat, listed: o.boat, base: o.base, rule: o.rule });
    });
    return out;
  }
  function arrivals(fleet, opts) {
    var key = War.monthKey(fleet.date);
    if (fleet.date.w === 1) {
      var due = monthArrivals(fleet, key);
      if (!fleet.pending) { due.forEach(function (x) { arriveOne(fleet, x); }); return; }
      due.forEach(function (x) { x.week = staggerRoll(fleet, x.name, opts); fleet.pending.push(x); });
    }
    if (!fleet.pending) return;
    var now = fleet.pending.filter(function (x) { return x.week === fleet.date.w; });
    fleet.pending = fleet.pending.filter(function (x) { return x.week !== fleet.date.w; });
    now.forEach(function (x) { arriveOne(fleet, x); });
  }
  /* [34.0] the week a boat comes or goes */
  function staggerRoll(fleet, name, opts) {
    var d = Res.d10(opts), w = 1;
    for (var i = 0; i < Data.stagger.length; i++) if (d <= Data.stagger[i][0]) { w = Data.stagger[i][1]; break; }
    note(fleet, 'Staggered arrivals and withdrawals — ' + name.replace('USS ', ''), 'rolled ' + d + ': week ' + w + ' [34.0]', '34.0');
    return w;
  }
  function arriveOne(fleet, x) {
    var name = x.name;
    if (!x.again && live(fleet).some(function (b) { return b.career.boat === name; })) return;     // still in the war
    var to = x.base, war = fleet.war;
    var open = function (id) { return id === 'surabaya' ? !!war.surabayaBase : war.bases.indexOf(id) > -1; };
    if (!open(to)) {
      to = x.allied && open('fremantle') ? 'fremantle'
         : fleet.def.arriveFallback && open(fleet.def.arriveFallback) ? fleet.def.arriveFallback
         : (to === 'brisbane' && open('fremantle')) ? 'fremantle'
         : open('pearl') ? 'pearl' : war.bases[0];
    }
    var b = Career.createBoat(name, fleet, { base: to, box: 'broom' });
    setupBoat(fleet, b, x.listed);
    b.turn = fleet.turn;
    fleet.boats.push(b);
    note(fleet, 'Reinforcement', b.career.boat + ' arrives in the Broom Box at ' + Base.baseName(to, war) + ' [' + (x.rule === '8.0' ? '8.0B' : x.rule) + ']', x.rule);
  }
  /* [10.21] when a repair box frees up, a boat in the Hold Box moves to Box 3
   * (whatever its damage) and rolls next week. */
  function holdBox(fleet) {
    live(fleet).forEach(function (b) {
      var c = b.career;
      if (!c.atSea && c.box === 'hold' && fleet.hasRoom(c.base)) {
        c.box = 'repair3';
        note(fleet, 'Repair — ' + c.boat, 'out of the Hold Box into Repair Box 3 [10.21]', '10.21');
      }
    });
  }

  function startWeek(fleet, opts) {
    weekMark(fleet);
    if (fleet.date.w === 1) {
      /* [3.12] a dated ship enters the War Mix this month. */
      var enters = Object.keys(fleet.dated || {}).filter(function (r) { return War.cmp(fleet.date, fleet.dated[r]) === 0 && fleet.gone.indexOf(r) === -1; });
      if (enters.length) { buildCups(fleet, opts); note(fleet, 'The War Mix', enters.join(', ') + ' enter the cups [3.12]', '3.12'); }
      /* [31.54 D] the list, not the tables, moves the torpedo and the war. */
      var sch = fleet.def.schedule && fleet.def.schedule[War.monthKey(fleet.date)];
      if (sch) {
        if (sch.torpedo !== undefined) { fleet.war.torpedo = sch.torpedo; note(fleet, 'The Mk-XIV', 'the torpedo value is now ' + (sch.torpedo > 0 ? '+' : '') + sch.torpedo + ' [31.54]', '31.54'); }
        if (sch.warPeriod) newPeriod(fleet, sch.warPeriod, opts, '31.54');
      }
    }
    strategic(fleet, opts);
    arrivals(fleet, opts);
    if (fleet.staggerWeek && fleet.date.w === 1) staggerList(fleet, opts);
    live(fleet).forEach(function (b) {
      if (b.done) return;
      b.career.date = fleet.date;
      if (b.career.inPack) { b.phase = 'inpack'; return; }
      Career.boatWeek(b, opts);
    });
    optionalPass(fleet);
    packRelease(fleet);
    holdBox(fleet);
    settleLosses(fleet);
    fleet.sail = {}; fleet.fight = {}; fleet.packs = {};
    fleet.phase = 'orders';
  }

  /* [34.0] each boat the list withdraws or returns this month: its week. */
  function staggerList(fleet, opts) {
    var key = War.monthKey(fleet.date);
    fleet.staggerWeek = {};
    live(fleet).forEach(function (b) {
      var c = b.career, short = c.boat.replace(/^USS /, '');
      if ((c.box === 'overhaul' && c.returnKey === key) || (fleet.withdrawList[key] || []).indexOf(short) > -1) {
        fleet.staggerWeek[c.boat] = staggerRoll(fleet, c.boat, opts);
      }
    });
  }

  /* The optional rules' weekly checks [33.1]-[33.5]. No dice. */
  function optionalPass(fleet) {
    var war = fleet.war, A = Data.allied, gone = false;
    if (fleet.allied && !war.surabayaBase && fleet.fallTurn === undefined) fleet.fallTurn = fleet.turn;
    live(fleet).forEach(function (b) {
      var c = b.career, s = b.sub;
      /* [33.14] K-XV and K-XVI hold the Makassar Strait until spotted, damaged or sent home */
      if (((c.startRule && c.startRule.holdSmz) || c.holdSmz) && b.smzWeeks > 1 && (s.spotted || s.damaged || s.rtb)) { b.smzWeeks = 0; c.holdSmz = false; }
      if (c.holdSmz && !b.smz) c.holdSmz = false;
      /* [33.41] / [33.51] withdrawn after the first patrol on which it is damaged */
      if (c.oneDamage) {
        if (c.atSea && s.damaged) { c.hurt = true; if (!s.rtb) s.rtb = true; }
        if (!c.atSea && c.hurt) {
          Career.finish(b, 'withdrawn', 'Damaged on patrol: withdrawn from the war [' + (c.boat === 'U-2513' ? '33.41' : '33.51') + '].');
          note(fleet, c.boat, 'withdrawn after a patrol on which it was damaged [' + (c.boat === 'U-2513' ? '33.41' : '33.51') + ']', c.boat === 'U-2513' ? '33.41' : '33.51');
          gone = true; return;
        }
      }
      if (!c.allied) return;
      alliedBases(fleet, b);
      /* [33.11] a Dutch or British boat in port where it may not base moves to Fremantle */
      if (!c.atSea && c.box !== 'overhaul' && c.basesOnly.indexOf(c.base) === -1 && war.bases.indexOf('fremantle') > -1) {
        note(fleet, c.boat, 'moves to Fremantle, where Allied boats base once Surabaya has fallen [33.11]', '33.11');
        c.base = 'fremantle'; b.area = 'fremantle';
      }
      /* [33.13] the Dutch withdrawal, from the second week of March 1942,
       * once Surabaya has fallen or War Period 2 has begun: a Dutch boat of
       * 1942 that heads home or needs a full repair leaves (not lost). */
      var from = A.withdrawFrom, started = War.cmp(fleet.date, from) > 0 || (War.cmp(fleet.date, from) === 0 && fleet.date.w >= from.w);
      if (c.dutch1942 && started && ((fleet.fallTurn !== undefined && fleet.turn > fleet.fallTurn) || war.warPeriod !== 'W1') &&
          ((c.atSea && s.rtb) || (!c.atSea && /^repair|hold/.test(c.box || '')))) {
        Career.finish(b, 'withdrawn', 'The Dutch withdrawal: to Ceylon or the United States for refit [33.13].');
        note(fleet, c.boat, 'withdrawn to Ceylon or the United States (not counted as lost) [33.13]', '33.13');
        gone = true;
      }
    });
    if (gone) packRelease(fleet);
  }

  /* Boats whose story ended this week: lost, relegated, scuttled. */
  function settleLosses(fleet) {
    fleet.boats.forEach(function (b) {
      if (!b.done || b.counted) return;
      b.counted = true;
      b.countedTurn = fleet.turn;
      if (b.outcome === 'lost' && b.career.allied) {
        fleet.allied.lost += 1;
        note(fleet, b.career.boat, 'lost with all hands (Allied; counted apart [33.1])', '33.1');
      } else if (b.outcome === 'lost') {
        fleet.lost += 1;
        note(fleet, b.career.boat, 'lost with all hands', '14.2');
        if (b.career.homeBase === 'dutch_harbor') designateAleutians(fleet, null, 1);   // "must be replaced if lost"
      }
    });
    tally(fleet);
  }

  /* ---------------- orders ---------------- */
  function onStation(b) { return b.career.atSea && b.phase === '12.0'; }
  function legalActions(fleet) {
    if (fleet.done) return [];
    if (fleet.phase === 'fight') return Career.legalActions(fleet.active);
    if (fleet.phase !== 'orders') return [];
    var out = [];
    live(fleet).forEach(function (b) {
      var n = b.career.boat;
      if (b.phase === 'base' && b.career.box === 'ready' && planned(fleet, n) && !fleet.packs[n]) return;   // sails with its pack
      if (b.phase === 'base' && b.career.box === 'ready') {
        if (fleet.sail[n]) out.push({ type: 'unsail', boat: n, rule: '15.1', label: n + ': stay in port after all' });
        else Career.legalActions(b).forEach(function (a) {
          if (a.type === 'sail') out.push({ type: 'sail', boat: n, area: a.area, rule: a.rule, label: n + ': ' + a.label });
        });
      }
      if (onStation(b)) {
        out.push(fleet.fight[n] ? { type: 'quick', boat: n, rule: fleet.auto === 'quick' ? '27.0' : '14.0',
                                    label: n + ': leave it to ' + (fleet.auto === 'quick' ? 'Quick Resolution' : 'the captain') }
                                : { type: 'fight', boat: n, rule: '14.0', label: n + ': fight on the Combat Display this week' });
      }
    });
    live(fleet).forEach(function (b) {
      var n = b.career.boat;
      if (fleet.packs[n]) out.push({ type: 'unpack', boat: n, rule: '24.0', label: n + ': sail alone after all' });
      else if (canLead(fleet, b)) {
        var mates = packMates(fleet, b).map(function (m) { return m.career.boat.replace('USS ', ''); });
        out.push({ type: 'form_pack', boat: n, rule: '24.1', label: n + ' leads a wolfpack with ' + mates.join(', ') + ' [24.1]' });
      }
    });
    out.push({ type: 'fight_all', rule: '14.0', label: 'Every boat on station fights on the Combat Display' });
    out.push({ type: 'quick_all', rule: fleet.auto === 'quick' ? '27.0' : '14.0',
               label: 'Every boat on station is left to ' + (fleet.auto === 'quick' ? 'Quick Resolution' : 'its captain') });
    out.push({ type: 'run_week', rule: '4.0', label: 'Carry out the week' });
    return out;
  }
  var KEYS = ['type', 'boat', 'area', 'unit', 'column', 'delta', 'smz', 'via', 'base', 'cautious', 'barrier'];
  function isLegal(fleet, action) {
    return legalActions(fleet).some(function (a) {
      return KEYS.every(function (k) { return a[k] === undefined || a[k] === action[k] || ((k === 'cautious' || k === 'barrier') && !a[k] && !action[k]); }) &&
             !!a.cautious === !!action.cautious && !!a.barrier === !!action.barrier;
    });
  }

  /* ---------------- III. Operations ---------------- */
  var teachers = {};                 // one captain per setting: the careful and the plain differ
  function standing(fleet, b, acts) {
    var n = b.career.boat;
    if (b.phase === '13.1' && !fleet.fight[n] && fleet.auto === 'quick') {
      var q = acts.filter(function (a) { return a.type === 'quick'; })[0];
      if (q) return q;
    }
    var key = String(fleet.careful !== false) + JSON.stringify(fleet.tune || null);
    var teacher = teachers[key] || (teachers[key] = Teacher.create(G(), { careful: fleet.careful !== false, tune: fleet.tune }));
    var t = teacher.choose(b, acts);
    return (t && t.action) || acts[0];
  }
  function inCombat(b) { return /^14\./.test(b.phase); }
  /* Run boats until the week is done or a marked fight needs you. */
  function runOps(fleet, opts) {
    while (fleet.queue.length) {
      var b = fleet.queue[0], n = b.career.boat, guard = 0;
      while (!b.done && guard++ < 400) {
        if (b.phase === '15.0' && b.units.length) Patrol.cleanUp(b);      // a fight that ended in RTB
        if (b.phase === 'inpack') break;
        if (b.phase === 'base') {
          if (fleet.sail[n]) {
            var area = fleet.sail[n]; delete fleet.sail[n];
            if (fleet.packs[n]) packSail(fleet, b);
            Career.apply(b, { type: 'sail', area: area }, opts); continue;
          }
          break;
        }
        if (b.phase === '16.0') { if (b.units.length) Patrol.cleanUp(b); break; }
        if (inCombat(b) && fleet.fight[n] && b.phase !== '14.7') { fleet.phase = 'fight'; fleet.active = b; return; }
        var acts = Career.legalActions(b);
        if (!acts.length) break;
        Career.apply(b, acts.length === 1 ? acts[0] : standing(fleet, b, acts), opts);
      }
      if (b.units && b.units.length && !inCombat(b)) Patrol.cleanUp(b);    // a lost boat's fight, too
      fleet.queue.shift();
      packRelease(fleet);
    }
    endWeek(fleet, opts);
  }

  /* ---------------- IV. End Turn ---------------- */
  function endWeek(fleet, opts) {
    var war = fleet.war;
    optionalPass(fleet);
    settleLosses(fleet);
    fleet.weeks.push(weekSummary(fleet));
    fleet.turn += 1;
    live(fleet).forEach(function (b) {
      if (b.career.inPack) { b.turn = fleet.turn; return; }        // the pack's week is its leader's [24.6]
      if (b.career.atSea && b.phase === '16.0') {
        var saved = b.activeBaseAreas;
        b.activeBaseAreas = [];
        Patrol.apply(b, { type: 'end_turn' }, opts);
        b.activeBaseAreas = saved;
        b.done = false; b.outcome = null;
        Career.boatWeekEnd(b, opts, true);
      } else {
        Career.boatWeekEnd(b, opts, false);
      }
      b.turn = fleet.turn;
    });
    war.ultra = []; war.event = null;
    var was = fleet.date;
    fleet.date = War.nextWeek(fleet.date);
    fleet.boats.forEach(function (b) { b.career.date = fleet.date; });
    tally(fleet);
    fleet.series.push(point(fleet));
    /* [31.12] career longevity, after the last week of the listed months. */
    if (fleet.date.w === 1) {
      (fleet.def.longevity || []).forEach(function (L) {
        if (L.y === was.y && L.m === was.m) {
          var ok = war.mine.tons >= L.tons;
          note(fleet, 'Career longevity — ' + War.label({ y: L.y, m: L.m }), Math.round(war.mine.tons * 1000).toLocaleString('en-US') + ' t sunk against ' +
            (L.tons * 1000).toLocaleString('en-US') + ' t: ' + (ok ? 'you keep your command' : 'you are relieved of command') + ' [31.12]', '31.12');
          if (!ok && !fleet.noLongevity) finish(fleet, 'relieved');
        }
      });
    }
    if (fleet.done) return;
    /* [31.14] / [31.41] / [31.55] the war ends when tonnage passes the mark. */
    var v = fleet.def.victory;
    if (v.kind === 'byDate') {
      var mark = v.tons1945 && fleet.date.y >= 1945 ? v.tons1945 : v.tons;
      if (vTons(fleet) > mark) { finish(fleet, 'won'); return; }
    }
    if (War.cmp(fleet.date, fleet.def.end) > 0 || (War.cmp(fleet.date, fleet.def.end) === 0 && fleet.date.w > fleet.def.end.w)) {
      finish(fleet, 'ended');
      return;
    }
    while (war.pendingTenders.length) {
      var fbk = war.pendingTenders.shift(), tid = null;
      if (fbk.indexOf(':') > -1) { tid = fbk.split(':')[1]; fbk = fbk.split(':')[0]; }
      if (fleet.def.allowedForward && fleet.def.allowedForward.indexOf(fbk) === -1) continue;
      log(fleet, War.placeTender(war, fbk, fleet.date, opts, tid).records);
    }
    if (!fleet.def.schedule && !fleet.def.noWarProgress) {        // [31.61 C] none in East Wind Early
      var before = war.warPeriod, wp = War.warProgress(war, fleet.date, opts);
      log(fleet, wp.records);
      if (wp.advanced) { war.warPeriod = before; newPeriod(fleet, wp.advancedTo || nextPeriod(before), opts, '17.0'); }
      if (fleet.done) return;
    }
    startWeek(fleet, opts);
  }
  function nextPeriod(wp) { return { W1: 'W2', W2: 'W3', W3: 'W4' }[wp] || wp; }
  /* A new War Period: its notes, the War Mix made up again; Campaign 3 ends here. */
  function newPeriod(fleet, wp, opts, rule) {
    var war = fleet.war;
    if (war.warPeriod === wp) return;
    war.warPeriod = wp;
    var ps = Data.periodStart[wp];
    note(fleet, 'War Period ' + wp + ' begins', ps.text + ' [' + rule + ']', rule);
    (ps.marks || []).forEach(function (id) { war.occurred[id] = war.occurred[id] || 1; });
    var eff = allowedEffects(fleet, ps.effects);
    if (wp === 'W2' && war.surabayaBase) eff = eff.concat([{ tenderRemoved: 'surabaya' }]);     // [33.13] Surabaya has fallen by now
    Career.applyEffects(fleet.carrier, eff, opts, 'war');
    live(fleet).forEach(function (b) { Career.applyEffects(b, eff, opts, 'boat'); });
    buildCups(fleet, opts);
    note(fleet, 'The War Mix', 'the cups are made up again for ' + wp + ' [3.11]', '3.11');
    settleLosses(fleet);
    if (fleet.def.victory.kind === 'atW4' && wp === 'W4') finish(fleet, 'won');
  }

  function lostMod(table, n) {
    for (var i = 0; i < table.length; i++) if (n <= table[i][0]) return table[i][1];
    return 0;
  }
  /* The level by date: [31.14], [31.34], [31.55]. `bump` moves it up. */
  function byDate(fleet, v, bump) {
    var t = v.table, i = 0;
    for (; i < t.length - 1; i++) if (War.cmp(fleet.date, t[i].before) < 0) break;
    var base = i, mods = [];
    if (bump) mods.push(bump);
    var lost = vLost(fleet), lm = lostMod(v.lost, lost);
    mods.push({ label: lost + ' US submarines lost (historical ' + v.historicalLost + ')', value: lm });
    var up = mods.reduce(function (s, m) { return s + m.value; }, 0);
    var fin = Math.max(0, Math.min(t.length - 1, base - up));
    return { base: t[base].label, level: t[fin].label, mods: mods, tons: vTons(fleet), capital: fleet.capital || 0,
             lost: lost, rule: fleet.def.rule, date: War.label(fleet.date), allied: alliedLine(fleet) };
  }
  /* [31.24] the victory level. */
  function alliedLine(fleet) {
    if (!fleet.allied) return null;
    var a = adjustment(fleet);
    return 'Allied boats: ' + fleet.allied.ships + ' ships, ' + Math.round(fleet.allied.tons * 1000).toLocaleString('en-US') + ' t, ' + fleet.allied.lost + ' lost' +
      (a ? '; the boxes adjusted by −' + (a.tons * 1000).toLocaleString('en-US') + ' t and −' + a.lost + ' lost, plus the Allied totals [33.15]' : ' (not yet counted for victory [33.15])');
  }
  function verdict(fleet) {
    fleet.ending = true;
    var v = fleet.def.victory, tons = vTons(fleet), lv = 0;
    if (v.kind === 'byDate') return byDate(fleet, v);
    if (v.kind === 'eastWind') return eastWind(fleet, v);
    if (v.kind === 'atW4') return byDate(fleet, v, tons > v.bonusTons ? { label: 'more than ' + (v.bonusTons * 1000).toLocaleString('en-US') + ' t sunk', value: 1 } : null);
    for (var i = 0; i < v.levels.length; i++) if (tons >= v.levels[i].tons) { lv = v.levels.length - 1 - i; break; }
    var mods = [];
    if (v.capital) {
      var cap = fleet.capital || 0, m = 0;
      for (var k = 0; k < v.capital.mods.length; k++) if (cap >= v.capital.mods[k][0]) { m = v.capital.mods[k][1]; break; }
      mods.push({ label: cap + ' capital ship' + (cap === 1 ? '' : 's') + ' sunk (CA, BB, CV)', value: m });
    }
    if (v.lost && vLost(fleet) >= v.lost.atLeast) mods.push({ label: vLost(fleet) + ' boats lost', value: v.lost.mod });
    var total = Math.max(0, Math.min(v.levels.length - 1, lv + mods.reduce(function (t, x) { return t + x.value; }, 0)));
    return { base: v.levels[v.levels.length - 1 - lv].label, level: v.levels[v.levels.length - 1 - total].label, mods: mods,
             tons: tons, capital: fleet.capital || 0, lost: vLost(fleet), rule: fleet.def.rule, allied: alliedLine(fleet) };
  }
  /* [31.66] tonnage by the end of December 1932, capital ships sunk counted
   * twice and damaged ones once; then Subs Lost and each BB or CV sunk. */
  function eastWind(fleet, v) {
    var tons = Math.round((fleet.war.mine.tons + (fleet.capitalTons || 0) + (fleet.capitalDamagedTons || 0)) * 10) / 10, lv = 0;
    for (var i = 0; i < v.levels.length; i++) if (tons >= v.levels[i].tons) { lv = v.levels.length - 1 - i; break; }
    var lost = subsLost(fleet), mods = [];
    if (lost < 6) mods.push({ label: lost + ' submarines lost (fewer than 6)', value: 1 });
    else if (lost > 20) mods.push({ label: lost + ' submarines lost (more than 20)', value: -2 });
    else if (lost > 15) mods.push({ label: lost + ' submarines lost (more than 15)', value: -1 });
    if (fleet.bbcv) mods.push({ label: fleet.bbcv + ' Japanese battleship' + (fleet.bbcv === 1 ? '' : 's') + ' or carrier' + (fleet.bbcv === 1 ? '' : 's') + ' sunk', value: fleet.bbcv * v.bbcv });
    var total = Math.max(0, Math.min(v.levels.length - 1, lv + mods.reduce(function (t, x) { return t + x.value; }, 0)));
    return { base: v.levels[v.levels.length - 1 - lv].label, level: v.levels[v.levels.length - 1 - total].label, mods: mods,
             tons: tons, capital: fleet.capital || 0, lost: lost, rule: '31.66',
             note: Math.round(fleet.war.mine.tons * 1000).toLocaleString('en-US') + ' t sunk, capital ships counted twice (+' +
               Math.round((fleet.capitalTons || 0) * 1000).toLocaleString('en-US') + ' t) and damaged ones once (+' +
               Math.round((fleet.capitalDamagedTons || 0) * 1000).toLocaleString('en-US') + ' t) [31.66]' };
  }
  function finish(fleet, how) {
    tally(fleet);
    fleet.done = true; fleet.phase = 'done'; fleet.outcome = how;
    if (how === 'relieved') {
      fleet.verdict = { base: 'Relieved of command', level: 'Relieved of command', mods: [], tons: fleet.war.mine.tons,
                        capital: fleet.capital || 0, lost: subsLost(fleet), rule: fleet.def.rule === '31.5' ? '31.52' : '31.12' };
    } else fleet.verdict = verdict(fleet);
    note(fleet, 'The campaign ends', fleet.verdict.level + (fleet.verdict.base !== fleet.verdict.level ? ' (' + fleet.verdict.base + ' before modifiers)' : '') +
      ' [' + fleet.verdict.rule + ']', fleet.verdict.rule);
  }

  /* ---------------- apply ---------------- */
  function apply(fleet, action, opts) {
    if (!isLegal(fleet, action)) throw new Error('sw_fleet: illegal action "' + action.type + '" in phase ' + fleet.phase);
    if (fleet.phase === 'fight') {
      var b = fleet.active;
      Career.apply(b, action, opts);
      if (b.done || !inCombat(b) || b.phase === '14.7') {
        if (b.done && b.units.length) Patrol.cleanUp(b);
        fleet.active = null; fleet.phase = 'ops';
        runOps(fleet, opts);
      }
      return fleet;
    }
    switch (action.type) {
      case 'sail': fleet.sail[action.boat] = action.area; break;
      case 'unsail': delete fleet.sail[action.boat]; delete fleet.packs[action.boat]; break;
      case 'fight': fleet.fight[action.boat] = true; break;
      case 'quick': delete fleet.fight[action.boat]; break;
      case 'fight_all': live(fleet).forEach(function (b) { if (onStation(b)) fleet.fight[b.career.boat] = true; }); break;
      case 'quick_all': fleet.fight = {}; break;
      case 'form_pack': {
        var Lb = byName(fleet, action.boat), mates = packMates(fleet, Lb);
        fleet.packs[action.boat] = mates.map(function (m) { return m.career.boat; });
        mates.forEach(function (m) { delete fleet.sail[m.career.boat]; });
        note(fleet, 'Wolfpack', action.boat + ' will lead ' + fleet.packs[action.boat].join(', ') + ' to ' + fleet.sail[action.boat] + ' [24.1]', '24.1');
        break;
      }
      case 'unpack': delete fleet.packs[action.boat]; break;
      case 'run_week':
        fleet.phase = 'ops';
        fleet.queue = live(fleet).slice();
        runOps(fleet, opts);
        break;
      default: throw new Error('sw_fleet: unhandled ' + action.type);
    }
    return fleet;
  }

  /* What the page shows: the boat fighting, else a boat to look at. */
  function focus(fleet) { return fleet.active || null; }

  root.SWFleet = {
    create: create, legalActions: legalActions, isLegal: isLegal, apply: apply, focus: focus,
    verdict: verdict, live: live, byName: byName, tally: tally, subsLost: subsLost, packLimits: packLimits, vTons: vTons, vLost: vLost
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
