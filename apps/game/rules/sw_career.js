/* sw_career.js — one boat's career: the full weekly Sequence of Play [4.0]
 * around the patrol engine. PURE MODULE. ZERO DOM, ZERO Math.random; dice
 * arrive through opts.rollDie.
 *
 * The state IS a patrol state (sw_patrol.create) with two more fields,
 * `career` and `war`, so every board, log and card that draws a patrol draws a
 * career too. The career owns the phases a single patrol never had:
 *    'base'  in port: Triple-R [8.0]-[11.0], then sail [15.1] or wait
 *    '15.0'  transit at sea: outbound on the Transit side, or RTB [15.2]
 *    end of week: Spotted removal [16.2], date, War Progress [17.0], then the
 *    next week's Strategic Segment [5.0]-[7.0]
 * and it wraps the patrol engine's own phases (12.0-14.x) with Transit Events
 * [19.1], Special Missions [5.0]/[20.0] and the War Event contact limits.
 *
 * Contract, as everywhere: legalActions(state) / apply(state, action, opts).
 */
(function (root) {
  'use strict';

  var req = typeof require === 'function' ? require : null;
  var Patrol  = root.SWPatrol  || (req ? req('./sw_patrol.js').SWPatrol : null);
  var Combat  = root.SWCombat  || (req ? req('./sw_combat.js').SWCombat : null);
  var Transit = root.SWTransit || (req ? req('./sw_transit.js').SWTransit : null);
  var War     = root.SWWar     || (req ? req('./sw_war.js').SWWar : null);
  var Base    = root.SWBase    || (req ? req('./sw_base.js').SWBase : null);
  var Res     = root.SWResolution || (req ? req('./sw_resolution.js').SWResolution : null);
  var Data    = root.SWCampaignData || (req ? req('../data/sw_campaign.js').SWCampaignData : null);
  var Map_    = root.SWMap     || (req ? req('../data/sw_map.js').SWMap : null);
  var Units   = root.SWUnits   || (req ? req('../data/sw_units.js').SWUnits : null);
  var SubCls  = root.SWSubClasses || (req ? req('../data/sw_subclasses.js').SWSubClasses : null);
  var Aac     = root.SWAac     || (req ? req('../data/sw_aac.js').SWAac : null);
  var Cups    = root.SWCups    || (req ? req('./sw_cups.js').SWCups : null);

  function name(id) {
    if (id === 'west_coast') return 'the West Coast';
    if (Data.bases[id]) return Data.bases[id].name;
    var a = Map_.byId(id);
    return a ? a.name : id;
  }
  /* A base's name as it stands now (Manila reopens as Subic Bay). */
  function baseLabel(state, id) { return Data.bases[id] ? Base.baseName(id, state.war) : name(id); }
  function note(context, result, rule, table) {
    return Res.makeRecord({ context: context, table: table || 'Procedure [' + rule + ']', ruleRef: rule,
      inputs: [], drms: [], die: null, modifiedDie: null, target: null, result: result });
  }
  function push(state, records) {
    (records || []).forEach(function (r) {
      r.turn = state.turn;
      r.submarine = state.sub.name;
      r.sop = r.sop || state.phase;
      r.date = War.label(state.career.date);
      state.log.push(r);
    });
  }
  function copyDate(d) { return { y: d.y, m: d.m, w: d.w }; }
  function weeksBetween(a, b) { return ((b.y - a.y) * 12 + (b.m - a.m)) * 4 + (b.w - a.w); }

  /* ---------------- create ---------------- */
  /* opts: { ijn: true } switches on the IJN Expansion Kit rules [28.0]. */
  function create(careerId, opts) {
    opts = opts || {};
    var def = Data.career(careerId);
    if (!def) throw new Error('sw_career: unknown career ' + careerId);
    var unit = Units.boat(def.boat);
    var cls = SubCls.forBoat(unit);
    var war = War.create(def);
    var state = Patrol.create({
      warPeriod: war.warPeriod, torpedoValue: war.torpedo,
      activeBaseAreas: Transit.baseAreas(War.allBases(war)),
      area: def.base, ultra: false, start: { y: def.start.y, m: def.start.m },
      sub: { name: def.label, attack: cls.attack, defense: cls.defense, tactical: cls.tactical,
             endurance: cls.endurance, range: cls.range, speed: cls.speed }
    });
    state.sub.side = 'transit';
    state.sub.cls = unit.art;                // [IJN 5.2] Crash Dive rating by class
    state.sub.shipsSunk = 0; state.sub.tonsSunk = 0;
    state.ijn = !!opts.ijn; war.ijn = !!opts.ijn;
    /* Phase 8: a Patrol Game [32.0] is one patrol, departure to return. No War
     * Events, no War Period or Mk-XIV change, no Super Skippers; the Strategic
     * and Triple-R segments are skipped, as the SOP says for patrol
     * scenarios [4.0]. */
    state.patrolGame = !!opts.patrolGame;
    state.noSuperSkipper = state.patrolGame;
    state.war = war;
    state.career = {
      id: def.id, def: def, boat: def.boat, cls: unit.art, readiness: cls.readiness,
      date: { y: def.start.y, m: def.start.m, w: 1 },
      base: def.base, box: 'ready', atSea: false, heading: null,
      patrols: [], current: null, target: opts.patrolGame ? 1 : Data.careerPatrols, own: state.sub, packPlanned: null,
      orders: null, weekRule: null, endWhy: null
    };
    if (cls.nation !== 'US') { state.career.nation = cls.nation; state.sub.nation = cls.nation; }
    state.torpedoValue = torpedoFor(state);
    state.smz = null; state.contactsOnly = null; state.contactsWhy = null; state.noAttack = false;
    state.allowQuick = true;                 // [27.0] Quick Resolution is a career option
    state.phase = 'base';
    /* [32.19] The First Wolfpack sails with its own boats. */
    if (def.pack) state.career.packPlanned = def.pack.map(function (n) { return memberOf(Units.boat(n)); });
    /* [31.51] "On the first turn of the campaign, skip the Strategic
     * Segment": the boat starts Ready for Sea and the war as the book sets it. */
    push(state, [note('Career begins — ' + def.label + ', ' + def.skipper,
      'Ready for Sea at ' + name(def.base) + ', ' + War.label(state.career.date) + '. War Period ' + war.warPeriod +
      ', Mk-XIV ' + (war.torpedo > 0 ? '+' : '') + war.torpedo + '. The book\'s ' + def.patrol + ' went to ' + name(def.destination) +
      ' [' + def.rule + ']', def.rule, 'Career [' + def.rule + ']')]);
    return state;
  }

  /* A boat of a fleet (Phase 8): the same state as a career's boat, sharing
   * the fleet's war, calendar, cups and TDC pool. `at` is { base, box } in
   * port, or { area, side, rtb, smz, heading } at sea. */
  /* A counter the roster lacks (O-27 [33.14]): the campaign data lends one. */
  function unitOf(boatName) {
    return Units.boat(boatName) || ((Data.allied && Data.allied.extraUnits) || []).filter(function (u) { return u.name === boatName; })[0] || null;
  }
  function createBoat(boatName, fleet, at) {
    var unit = unitOf(boatName), cls = SubCls.forBoat(unit), war = fleet.war;
    var state = Patrol.create({
      warPeriod: war.warPeriod, torpedoValue: war.torpedo, activeBaseAreas: Transit.baseAreas(War.allBases(war)),
      area: at.base || at.area, ultra: false, start: { y: fleet.start.y, m: fleet.start.m },
      sub: { name: boatName, attack: cls.attack, defense: cls.defense, tactical: cls.tactical,
             endurance: cls.endurance, range: cls.range, speed: cls.speed }
    });
    state.turn = fleet.turn;
    state.sub.cls = unit.art; state.sub.shipsSunk = 0; state.sub.tonsSunk = 0;
    state.sub.side = at.side || 'transit'; state.sub.rtb = !!at.rtb;
    state.war = war; state.fleet = fleet; state.allowQuick = true;
    state.cups = fleet.cups; state.tdcPool = fleet.tdcPool;
    state.ijn = false; state.noSuperSkipper = false; state.patrolGame = false;
    state.smz = at.smz || null; state.contactsOnly = null; state.contactsWhy = null; state.noAttack = false;
    state.career = {
      id: boatName, def: { id: boatName, label: boatName, boat: boatName, skipper: 'the captain', rule: '31.13',
                           destination: at.area || at.base, record: { ships: 0, tons: 0, weeks: 0 } },
      boat: boatName, cls: unit.art, readiness: cls.readiness, date: fleet.date,
      base: at.base || at.home || 'pearl', box: at.base ? (at.box || 'ready') : null, atSea: !at.base,
      heading: at.heading || null, patrols: [], current: null, target: Infinity, own: state.sub,
      packPlanned: null, orders: null, weekRule: null, endWhy: null
    };
    /* [33.1] a Dutch or British boat (and the Free French Surcouf) */
    if (cls.nation !== 'US') { state.career.nation = cls.nation; state.sub.nation = cls.nation; }
    if (!at.base) {
      state.career.current = { n: 1, depart: fleet.date, from: at.home || 'pearl', ships0: 0, tons0: 0, own0: 0, ownT0: 0, pack: null };
    }
    state.phase = at.base ? 'base' : (state.sub.rtb || state.sub.side === 'transit' ? '15.0' : '12.0');
    return state;
  }

  /* ---------------- helpers ---------------- */
  function syncWar(state) {
    var war = state.war;
    state.warPeriod = war.warPeriod;
    state.torpedoValue = torpedoFor(state);
    state.radar = state.career.date.y >= 1943;
    if (war.generalAsw !== undefined) state.generalAsw = war.generalAsw;      // [31.61 A] East Wind Early: 0
    if (war.pace) state.pace = war.pace[war.warPeriod] || null;               // the Historical pace house rule: { end, ca }
    state.activeBaseAreas = Transit.baseAreas(War.allBases(war));
    state.ultra = war.ultra.indexOf(state.area) > -1;
    if (state.fleet) return;                  // a fleet sums every boat's sinkings itself
    war.mine.ships = state.shipsSunk;
    war.mine.tons = state.tonnageSunk;
  }
  /* The boat's torpedo value: the Mk-XIV, except [33.12] Dutch attacks in
   * 1941-42 at −1, and [33.42] U-2513's German torpedoes at +2 always. */
  function torpedoFor(state) {
    var c = state.career;
    if (c.torpedoFixed !== undefined) return c.torpedoFixed;
    if (c.torpedoSame) return state.war.torpedo;
    if (c.nation === 'NL' && c.date.y <= 1942 && !state.war.eventTable) return -1;   // East Wind: the American value [31.6, 9]
    return state.war.torpedo;
  }
  function paceTransit(state) { return state.pace && state.pace.transit ? state.pace.transit : 0; }
  function adjacent(a, b) { return (Map_.adjacency[a] || []).indexOf(b) > -1; }
  function bases(state) { return War.allBases(state.war); }
  function inRange(state, area) { return Transit.distToBase(area, bases(state)) <= state.sub.range; }
  /* [15.25] a boat left beyond Range by a fallen base moves at Speed −1 (never below 1). */
  function speedOf(state) { return state.career.limping ? Math.max(1, state.sub.speed - 1) : state.sub.speed; }

  function finish(state, outcome, why) {
    var c = state.career;
    if (c.current) closePatrol(state, outcome === 'lost' ? 'lost' : outcome);
    state.done = true;
    state.outcome = outcome;
    c.endWhy = why;
    push(state, [note('The career ends', why, outcome === 'withdrawn' ? '8.0' : outcome === 'relegated' ? '5.0' :
      outcome === 'ctl' ? '18.1' : outcome === 'war_over' ? '31.51' : outcome === 'lost' ? '14.2' : '32.1', 'Career [32.1]')]);
  }
  function openPatrol(state) {
    var c = state.career;
    c.current = { n: c.patrols.length + 1, depart: copyDate(c.date), from: c.base,
                  ships0: state.shipsSunk, tons0: state.tonnageSunk,
                  own0: c.own.shipsSunk || 0, ownT0: c.own.tonsSunk || 0, pack: state.pack ? state.pack.map(function (m) { return m.name; }) : null };
  }
  function closePatrol(state, outcome) {
    var c = state.career, p = c.current;
    if (!p) return;
    /* Your boat's sinkings; with a wolfpack, the pack's too [Phase 7]. */
    c.patrols.push({ n: p.n, depart: p.depart, from: p.from, back: copyDate(c.date), to: outcome === 'returned' ? c.base : null,
      weeks: weeksBetween(p.depart, c.date) + 1, ships: (c.own.shipsSunk || 0) - (p.own0 || 0),
      tons: Math.round(((c.own.tonsSunk || 0) - (p.ownT0 || 0)) * 10) / 10, outcome: outcome,
      pack: p.pack, packShips: state.shipsSunk - p.ships0, packTons: Math.round((state.tonnageSunk - p.tons0) * 10) / 10 });
    c.current = null;
  }

  /* ---------------- the week's orders ---------------- */
  function missionOrders(state) {
    var c = state.career, ev = state.war.event;
    if (!ev || ev.type !== 'mission' || !c.atSea || state.sub.rtb) return null;
    var why = null;
    if (ev.notClasses && ev.notClasses.indexOf(c.cls) > -1) why = 'this class is excused from the mission';
    var here = state.area;
    var areas = (ev.areas || []).filter(function (a) {
      return a === here || (adjacent(here, a) && inRange(state, a));
    });
    var smz = (ev.smz || []).filter(function (s) {
      return (Data.smzLinks[s] || []).some(function (v) { return v === here || (adjacent(here, v) && inRange(state, v)); });
    });
    if (!why && !areas.length && !smz.length) why = 'out of reach this week: the rest of the fleet fills the quota';
    return { id: ev.id, name: ev.name, text: ev.text, areas: why ? [] : areas, smz: why ? [] : smz,
             contacts: ev.contacts, tasked: !why, why: why, hold: !!ev.hold };
  }

  /* [22.0] Congregating Risk. The boats the engine knows of in an OpArea:
   * your boat (a wolfpack's members count one per two [22.3]) and, when a
   * Special Mission sends a quota to this OpArea, its share. SMZs are exempt
   * [20.2]; only an area whose line has red or blue boxes counts [22.1]. */
  function congregation(state, area) {
    if (!area || Transit.isBase(area) || !Map_.byId(area) || !Data.smzLinks || Data.smzLinks[area]) return 0;
    var row = Aac.charts[area];
    if (!row) return 0;
    var line = row.grid[{ W1: 0, W2: 1, W3: 2, W4: 3 }[state.war.warPeriod]];
    if (line.indexOf('high') === -1 && line.indexOf('moderate') === -1) return 0;
    var mine = state.pack ? Math.ceil(state.pack.length / 2) : 1, n = mine;
    /* A fleet knows every boat in the area [22.1]. */
    if (state.fleet) { n = state.fleet.boatsIn(area); return n > 4 ? Math.ceil((n - 4) / 4) : 0; }
    var ev = state.war.event;
    if (ev && ev.type === 'mission' && (ev.areas || []).indexOf(area) > -1) {
      var share = Math.ceil(ev.count / ((ev.areas || []).length + (ev.smz || []).length));
      var tasked = state.career.orders && state.career.orders.tasked && state.career.orders.areas.indexOf(area) > -1;
      n = tasked ? share + mine - 1 : share + mine;          // a tasked boat is one of the quota
    }
    return n > 4 ? Math.ceil((n - 4) / 4) : 0;
  }

  function setContactRules(state) {
    state.congregating = state.smz ? 0 : congregation(state, state.area);
    var c = state.career, o = c.orders;
    state.contactsOnly = null; state.contactsWhy = null; state.noAttack = false;
    if (c.startRule && c.startRule.tf) { state.contactsOnly = ['TF']; state.contactsWhy = 'the order of battle [31.13]'; return; }
    if (c.startRule && c.startRule.noAttack) { state.noAttack = true; state.contactsWhy = 'a neutral port: no attacks [31.63]'; return; }
    var inTarget = o && o.tasked && (state.smz ? o.smz.indexOf(state.smz) > -1 : o.areas.indexOf(state.area) > -1);
    if (inTarget) {
      if (o.contacts === 'none') state.noAttack = true;
      else if (o.contacts === 'TF') state.contactsOnly = ['TF'];
      else if (o.contacts === 'C2TF') state.contactsOnly = ['C2', 'TF'];
      state.contactsWhy = o.name;
      return;
    }
    if (c.weekRule === 'political') {
      var a = Map_.byId(state.area);
      if (a && a.group !== 'EMPIRE' && a.group !== 'CHINA') {
        state.contactsOnly = ['TF'];
        state.contactsWhy = 'Political Pressure';
      }
    }
  }

  /* ---------------- legal actions ---------------- */
  function sailActions(state) {
    var c = state.career, out = [];
    Map_.opAreas.forEach(function (a) {
      if (!inRange(state, a.id)) return;
      if (c.areaLimit && c.areaLimit.indexOf(a.id) === -1) return;        // the Aleutians group [5.0]
      var steps = Transit.distance(c.base, a.id, bases(state));
      if (!isFinite(steps)) return;
      var weeks = Math.max(1, Math.ceil(steps / state.sub.speed));
      out.push({ type: 'sail', area: a.id, rule: '15.1',
                 label: 'Sail for ' + a.name + (weeks > 1 ? ' (' + weeks + ' weeks out)' : ' (on station next week)') });
    });
    return out;
  }
  function transitActions(state) {
    var c = state.career, out = [];
    var h = c.heading;
    if (h && h.kind === 'base' && bases(state).indexOf(h.id) === -1) h = c.heading = null;
    if (state.sub.rtb && !h) {
      /* [21.23] after a failed minor repair only a major base will do. */
      (c.majorOnly ? state.war.bases : bases(state)).forEach(function (b) {
        if (c.homeBase && b !== c.homeBase && state.war.bases.indexOf(c.homeBase) > -1) return;   // the Aleutians group bases at Dutch Harbor
        if (c.basesOnly && c.basesOnly.some(function (x) { return bases(state).indexOf(x) > -1; }) && c.basesOnly.indexOf(b) === -1) return;   // [33.11]
        var steps = Transit.distance(state.area, b, bases(state));
        if (!isFinite(steps)) return;
        var weeks = Math.max(1, Math.ceil(steps / speedOf(state)));
        out.push({ type: 'rtb_to', base: b, rule: '15.2',
                   label: 'Return to ' + baseLabel(state, b) + (weeks <= 1 ? ' (in port this week)' : ' (' + weeks + ' weeks)') });
      });
      return out;
    }
    if (!h) return out;
    var arrive = Transit.distance(state.area, h.id, bases(state)) <= speedOf(state);
    out.push({ type: 'transit_on', rule: h.kind === 'base' ? '15.2' : '15.11',
               label: (h.kind === 'base' ? 'Continue home to ' + baseLabel(state, h.id) : 'Continue to ' + name(h.id)) + (arrive ? ' (arrives this week)' : '') });
    out.push({ type: 'transit_on', cautious: true, rule: '15.24',
               label: 'Cautious transit: one area only, −1 on the Transit Event check' });
    return out;
  }
  function smzActions(state) {
    var o = state.career.orders, out = [];
    if (!o || !o.tasked) return out;
    o.smz.forEach(function (s) {
      (Data.smzLinks[s] || []).forEach(function (v) {
        if (v === state.area || (adjacent(state.area, v) && inRange(state, v))) {
          out.push({ type: 'enter_smz', smz: s, via: v, rule: v === state.area ? '20.3' : '12.1',
                     label: 'Special Mission: enter ' + name(s) + (v === state.area ? '' : ' by way of ' + name(v)) });
        }
      });
    });
    return out;
  }

  function legalActions(state) {
    if (state.done) return [];
    var c = state.career;
    switch (state.phase) {
      case 'base': {
        if (c.box === 'overhaul') {
          return [{ type: 'wait', rule: '8.0', label: 'Overhaul on the West Coast: fast-forward to ' +
            War.label({ y: +c.returnKey.slice(0, 4), m: +c.returnKey.slice(5) - 1 }) }];
        }
        var out = c.box === 'ready' ? sailActions(state) : [];
        if (c.box === 'ready' && packAllowed(state) && !state.patrolGame) {
          out.push(c.packPlanned
            ? { type: 'break_pack', rule: '24.0', label: 'Sail alone after all (' + c.packPlanned.map(function (m) { return m.name; }).join(', ') + ' stay in port)' }
            : { type: 'form_pack', rule: '24.1', label: 'Form a wolfpack for this patrol: your boat and two more [24.1]' });
        }
        out.push({ type: 'wait', rule: c.box === 'ready' ? '15.1' : (/^repair/.test(c.box) ? '10.0' : '9.0'),
                   label: c.box === 'ready' ? 'Stay in port this week' : 'Next week (' + Base.boxLabel[c.box] + ')' });
        return out;
      }
      case '12.0': {
        var acts = Patrol.legalActions(state);
        if (c.areaLimit) acts = acts.filter(function (a) { return a.type !== 'move' || c.areaLimit.indexOf(a.area) > -1; });
        /* [31.13] "No Patrol Movement is allowed"; a boat held in a zone stays there. */
        if ((c.startRule && c.startRule.noMove) || (state.smz && state.smzWeeks > 0)) acts = acts.filter(function (a) { return a.type === 'stay'; });
        var o = c.orders;
        if (o && o.tasked) {
          acts = acts.filter(function (a) {
            return (a.type === 'stay' && o.areas.indexOf(state.area) > -1) || (a.type === 'move' && o.areas.indexOf(a.area) > -1);
          });
          return acts.concat(smzActions(state));
        }
        return acts;
      }
      case '13.1': {
        var a13 = Patrol.legalActions(state);
        if (state.noAttack) a13 = a13.filter(function (a) { return a.type !== 'search' && a.type !== 'quick'; });
        if (state.smz) a13 = a13.filter(function (a) { return a.type !== 'rtb'; });
        return a13;
      }
      case '15.0':
        return transitActions(state);
      default:
        return Patrol.legalActions(state);
    }
  }

  /* ---------------- [24.0] wolfpacks ---------------- */
  /* [24.1] from October 1943, at a major base, from the Ready for Sea box;
   * [24.11] one pack at a time, three boats. */
  function packAllowed(state) {
    var c = state.career;
    return War.cmp(c.date, { y: 1943, m: 9 }) >= 0 && !!Data.bases[c.base] && !c.atSea;
  }
  function entered(u, d) {
    if (!u.entry || u.entry === 'W/S') return true;
    var p = u.entry.split('/'), y = 1900 + parseInt(p[1], 10), m = parseInt(p[0], 10) - 1;
    return War.cmp(d, { y: y, m: m }) >= 0;
  }
  function inOverhaul(short, key) {
    var last = null;
    Object.keys(Data.withdraw).sort().forEach(function (k) { if (k <= key && Data.withdraw[k].indexOf(short) > -1) last = k; });
    if (!last) return false;
    var back = Data.returnAfter(short, last);
    return !back || back > key;
  }
  /* Two boats of the fleet for the pack: war-construction classes that have
   * entered service and are not in overhaul this month, drawn at random. */
  function memberOf(u) {
    var cl = SubCls.forBoat(u);
    return { name: u.name, attack: cl.attack, defense: cl.defense, tactical: cl.tactical, endurance: cl.endurance,
             range: cl.range, speed: cl.speed, cls: u.art, column: null, side: 'transit', damaged: false, spotted: false,
             rtb: false, sunk: false, superSkipper: null, shipsSunk: 0, tonsSunk: 0 };
  }
  function companions(state, opts) {
    var c = state.career, key = War.monthKey(c.date);
    var pool = Units.submarines.filter(function (u) {
      return ['gato', 'balao', 'tench'].indexOf(u.art) > -1 && u.name !== c.boat && entered(u, c.date) &&
             !inOverhaul(u.name.replace(/^USS /, ''), key);
    });
    var out = [];
    for (var k = 0; k < 2 && pool.length; k++) {
      out.push(memberOf(pool.splice(Cups.pickIndex(pool.length, opts), 1)[0]));
    }
    return out;
  }
  function memberLost(state, m, why) {
    m.sunk = true;
    state.war.fleet.lost += 1;
    state.pack = state.pack.filter(function (x) { return x !== m; });
    push(state, [note(m.name, why, '24.41')]);
  }
  /* [24.4] every boat of a pack rolls its own Transit Event check, each −1. */
  function packTransit(state, ctx, gov, opts) {
    if (!state.pack) return;
    state.pack.slice().forEach(function (m) {
      if (m === state.flag || m.sunk) return;
      var chk = Transit.check(Object.assign({}, ctx, { wolfpack: true, spotted: m.spotted, why: (ctx.why || 'movement') + ', ' + m.name }), opts);
      push(state, chk.records);
      var r = chk.event;
      if (!r || r === 'none') return;
      if (r === 'lost') { memberLost(state, m, 'lost at sea, cause unknown [19.1]'); return; }
      state.pack.forEach(function (x) { x.spotted = true; });              // [24.6]
      state.sub.spotted = true;
      if (r === 'spotted_rtb' || r === 'spotted_dmg_rtb') {
        state.pack = state.pack.filter(function (x) { return x !== m; });
        push(state, [note('Wolfpack', m.name + ' must go home and leaves the pack [24.41]', '24.41')]);
      }
    });
    if (state.pack && state.pack.length < 3) {
      push(state, [note('Wolfpack', 'below three boats: the pack disbands at once [24.14]', '24.14')]);
      state.pack = null;
    }
  }

  /* Why an action is not offered right now, in the engine's words. */
  function refusals(state) {
    var out = [], c = state.career, o = c.orders;
    if (state.phase === '12.0' && o && o.tasked) {
      out.push({ type: 'move', area: '*', why: 'Special Mission orders: ' + o.name + ' [5.0]', cite: '5.0' });
    }
    if (state.phase === '13.1' && state.noAttack) {
      out.push({ type: 'search', why: 'No attacks may be made on this mission (' + o.name + ') [5.0]', cite: '5.0' });
    }
    if (state.phase === 'base' && c.box !== 'ready') {
      out.push({ type: 'sail', area: '*', why: 'Only a boat in the Ready for Sea box may sail [15.1]', cite: '15.1' });
    }
    return out;
  }

  var KEYS = ['type', 'area', 'unit', 'column', 'delta', 'smz', 'via', 'base', 'cautious', 'barrier'];
  function same(a, b) {
    return KEYS.every(function (k) { return a[k] === undefined || a[k] === b[k] || ((k === 'cautious' || k === 'barrier') && !a[k] && !b[k]); }) &&
           (!!a.cautious === !!b.cautious) && (!!a.barrier === !!b.barrier);
  }
  function isLegal(state, action) {
    return legalActions(state).some(function (a) { return same(a, action); });
  }

  /* ---------------- movement with Transit Events ---------------- */
  /* Apply a Transit Event result [19.1]. Returns true if the boat stops where
   * the event put it. */
  function transitResult(state, result, gov, opts) {
    var sub = state.sub;
    if (!result || result === 'none') return false;
    if (result === 'lost') {
      sub.sunk = true;
      finish(state, 'lost', 'Lost at sea, cause unknown: a Transit Event [19.1].');
      return true;
    }
    sub.spotted = true;
    if (result === 'spotted') return false;
    if (result === 'spotted_dmg_rtb') {
      Combat.damage(state);
      push(state, Combat.resolveDamage(state, opts));
      if (sub.sunk) { finish(state, 'lost', 'Sunk: a second Damage marker in transit [18.1].'); return true; }
    }
    sub.rtb = true;
    sub.side = 'transit';
    if (state.pack) {
      push(state, [note('Wolfpack', 'your boat must go home: the pack breaks up and the others rejoin the fleet [24.41]', '24.41')]);
      state.pack = null;
    }
    if (state.career.heading && state.career.heading.kind === 'area') state.career.heading = null;
    state.area = gov;
    push(state, [note('Transit Event', 'RTB: placed in the DONE section of ' + name(gov) + ' [19.11]', '19.11')]);
    return true;
  }

  /* Move along `path` (from where the boat is) with one check [19.1]. */
  function moveAlong(state, path, ctx, opts) {
    var war = state.war;
    var areas = path.slice(1).filter(function (a) { return !Transit.isBase(a); });
    push(state, [note('Route', path.map(name).join(' → '), ctx.rule || '15.0', 'Transit Movement [15.0]')]);
    var soj = path.indexOf('sea_of_japan') > -1;
    var crowd = Math.max.apply(null, [0].concat(path.map(function (a) { return congregation(state, a); })));
    var tctx = { areas: areas, warPeriod: war.warPeriod, transitSide: true, cautious: !!ctx.cautious,
      spotted: state.sub.spotted, seaOfJapan: soj, ultraSeaOfJapan: war.ultra.indexOf('sea_of_japan') > -1,
      congregating: crowd, wolfpack: !!state.pack, why: ctx.why };
    tctx.pace = paceTransit(state);
    var chk = Transit.check(tctx, opts);
    push(state, chk.records);
    var stop = transitResult(state, chk.event, chk.governing, opts);
    if (state.done) return;
    packTransit(state, tctx, chk.governing, opts);
    if (stop) return;
    var end = path[path.length - 1];
    if (Transit.isBase(end)) { dock(state, end, opts); return; }
    state.area = end;
    var h = state.career.heading;
    if (h && h.kind === 'area' && h.id === end) {
      state.sub.side = 'patrol';
      state.career.heading = null;
      push(state, [note('On station', name(end) + ': Patrol side up, patrolling next week [15.1]', '15.1')]);
    }
  }

  function sail(state, dest, opts) {
    var c = state.career;
    var leg = Transit.leg(c.base, dest, state.sub.speed, state.sub.range, bases(state), state.war.warPeriod);
    if (c.packPlanned) {
      state.pack = [c.own].concat(c.packPlanned);
      state.flag = c.own;
      state.packXpThisPatrol = false;
      push(state, [note('Wolfpack', c.own.name + ' leads ' + c.packPlanned.map(function (m) { return m.name; }).join(' and ') +
        ' out; they move as one [24.2]', '24.2')]);
      c.packPlanned = null;
    }
    openPatrol(state);
    c.atSea = true; c.box = null;
    c.heading = { kind: 'area', id: dest };
    state.sub.rtb = false; state.sub.side = 'transit';
    push(state, [note('Patrol ' + c.current.n + ' of ' + c.target, 'departs ' + name(c.base) + ' for ' + name(dest), '15.1', 'Deployment [15.1]')]);
    moveAlong(state, leg.path, { why: 'deployment', rule: '15.1' }, opts);
  }

  function continueTransit(state, cautious, opts) {
    var c = state.career, h = c.heading;
    var leg = Transit.leg(state.area, h.id, cautious ? 1 : speedOf(state), state.sub.range, bases(state), state.war.warPeriod);
    moveAlong(state, leg.path, { why: h.kind === 'base' ? 'return to base' : 'transit', cautious: cautious,
                                 rule: cautious ? '15.24' : (h.kind === 'base' ? '15.2' : '15.11') }, opts);
  }

  function dock(state, baseId, opts) {
    var c = state.career;
    /* A fleet's wolfpack comes home together (Phase 8). */
    var homeMembers = state.fleet && state.pack ? state.pack.filter(function (m) { return m !== c.own && !m.sunk; }) : null;
    if (homeMembers && homeMembers.length) {
      var from = state.area;
      state.fleet.packHome(state, baseId, homeMembers, from, opts);
    }
    if (Transit.isForward(baseId) && !Base.isMajor(baseId, state.war)) {
      var at = Base.arriveTender(state.sub, baseId, state.war, opts);
      push(state, at.records);
      if (at.onward) {
        /* [21.23] placed in the DONE section of the OpArea it came from; it
         * may now only RTB to a major base. */
        c.majorOnly = true; c.heading = null;
        push(state, [note('Onward to a major base', 'placed in the DONE section of ' + name(state.area) + ' [21.23]', '21.23')]);
        return;
      }
      arrivedIn(state, baseId, at.box);
      return;
    }
    var arr = Base.arrive(state.sub, baseId, state.war, opts);
    push(state, arr.records);
    if (arr.ctl) {
      c.atSea = false; c.base = baseId; state.area = baseId; closePatrol(state, 'returned');
      finish(state, 'ctl', 'A constructive total loss: too badly damaged to repair [18.1].'); return;
    }
    var box = arr.box;
    /* [10.1]-[10.2] a fleet's base has room for so many under repair; the
     * rest wait in the Hold Box. */
    if (state.fleet && /^repair/.test(box) && !state.fleet.hasRoom(baseId)) {
      push(state, [note('Repair', Base.baseName(baseId, state.war) + ' is at Max Repair Capacity: to the Hold Box [10.2]', '10.2')]);
      box = 'hold';
    }
    arrivedIn(state, baseId, box);
  }
  function arrivedIn(state, baseId, box) {
    var c = state.career;
    if (state.pack) {
      push(state, [note('Wolfpack', 'home: ' + state.pack.filter(function (m) { return m !== c.own; }).map(function (m) { return m.name; }).join(' and ') +
        ' rejoin the fleet [24.0]', '24.0')]);
      state.pack = null;
    }
    c.atSea = false; c.base = baseId; c.heading = null; c.majorOnly = false; c.limping = false;
    state.area = baseId;
    closePatrol(state, 'returned');
    c.box = box;
    var sub = state.sub;
    sub.spotted = false; sub.damaged = false; sub.damageMarkers = 0; sub.damagePending = false;
    sub.rtb = false; sub.side = 'transit';
    state.smz = null; state.contactsOnly = null; state.noAttack = false;
    if (c.patrols.length >= c.target) {
      if (state.patrolGame) {
        var v = patrolVerdict(c.def, c.patrols[0]);
        finish(state, 'complete', 'Patrol complete, home at ' + baseLabel(state, baseId) + ': by the book\'s standard, ' + v.label + ' [32.1].');
      } else finish(state, 'complete', 'Career complete: ' + c.patrols.length + ' patrols, home at ' + baseLabel(state, baseId) + '.');
    }
  }

  function enterSmz(state, smz, via, opts) {
    var moved = via !== state.area;
    state.area = via;
    push(state, [note('Special Mission', (moved ? 'patrol move to ' + name(via) + ', then ' : '') + 'into ' + name(smz) +
      ' at no extra cost [12.1]', '12.1', 'Special Mission Zone [20.3]')]);
    var zctx = { areas: [via], warPeriod: state.war.warPeriod, transitSide: false, spotted: state.sub.spotted,
      smz: true, seaOfJapan: via === 'sea_of_japan', ultraSeaOfJapan: state.war.ultra.indexOf('sea_of_japan') > -1,
      wolfpack: !!state.pack, why: 'entering ' + name(smz) };
    zctx.pace = paceTransit(state);
    var chk = Transit.check(zctx, opts);
    push(state, chk.records);
    var zstop = transitResult(state, chk.event, chk.governing, opts);
    if (!state.done) packTransit(state, zctx, chk.governing, opts);
    if (zstop) { if (!state.done) state.phase = '16.0'; return; }
    state.smz = smz;
    /* [31.6] event 2: the boat stays until Spotted, Damaged or sent home */
    if (state.career.orders && state.career.orders.hold) { state.smzWeeks = 99; state.career.holdSmz = true; }
    state.phase = '13.1';
    syncWar(state);
    setContactRules(state);
  }

  /* [12.0] a patrol move: the check uses the OpArea moved into. */
  function patrolMoveCheck(state, opts) {
    var pctx = { areas: [state.area], warPeriod: state.war.warPeriod, transitSide: false,
      spotted: state.sub.spotted, seaOfJapan: state.area === 'sea_of_japan' || state.lastArea === 'sea_of_japan',
      ultraSeaOfJapan: state.war.ultra.indexOf('sea_of_japan') > -1, wolfpack: !!state.pack,
      congregating: Math.max(congregation(state, state.area), congregation(state, state.lastArea)), why: 'patrol move' };
    pctx.pace = paceTransit(state);
    var chk = Transit.check(pctx, opts);
    push(state, chk.records);
    var stop = transitResult(state, chk.event, chk.governing, opts);
    if (!state.done) packTransit(state, pctx, chk.governing, opts);
    if (stop && !state.done) state.phase = '16.0';
  }

  /* ---------------- the war's events, applied to the boat ---------------- */
  /* `part`: undefined = everything (a career), 'war' = only what changes the
   * war (a fleet runs this once), 'boat' = only what happens to this boat (a
   * fleet runs this for every boat, after the war part). */
  function applyEffects(state, effects, opts, part) {
    var c = state.career, war = state.war, W = part !== 'boat', B = part !== 'war';
    (effects || []).forEach(function (e) {
      if (state.done) return;
      if (W && e.activate && war.bases.indexOf(e.activate) === -1) {
        war.bases.push(e.activate);
        push(state, [note('Bases', name(e.activate) + ' becomes operational [21.0]', '21.0')]);
      }
      if (W && e.subic) {
        war.subic = true;
        if (war.bases.indexOf('manila') === -1) war.bases.push('manila');
        push(state, [note('Bases', 'Subic Bay becomes operational [21.0]', '21.0')]);
      }
      if (e.deactivate && !e.moveTo) {
        var wasOpen = war.bases.indexOf(e.deactivate) > -1;
        if (W && wasOpen) {
          war.bases.splice(war.bases.indexOf(e.deactivate), 1);
          push(state, [note('Bases', name(e.deactivate) + ' is no longer operational [21.0]', '21.0')]);
        }
        if (B && (wasOpen || part === 'boat') && !c.atSea && c.base === e.deactivate) {
          if (e.scuttleRepair && (c.box === 'repair2' || c.box === 'repair3' || c.box === 'hold')) {
            finish(state, 'scuttled', 'Scuttled under repair as ' + name(e.deactivate) + ' fell [18.3].');
            return;
          }
          if (state.fleet && e.evacuateTo) {
            /* [5.0] Base-to-Base movement on the map [15.1]; a boat in Repair
             * Box 1 limps out damaged [18.3]. */
            if (c.box === 'repair1') Combat.damage(state);
            openPatrol(state);
            c.atSea = true; c.box = null; state.sub.rtb = true; state.sub.side = 'transit';
            c.heading = { kind: 'base', id: e.evacuateTo };
            push(state, [note('Bases', name(e.deactivate) + ' falls: the boat sails for ' + name(e.evacuateTo) + ' [5.0]', '5.0')]);
          } else if (!/^repair/.test(c.box || '')) {
            var to = e.evacuateTo || 'pearl';
            c.base = to; state.area = to;
            push(state, [note('Bases', 'the boat moves base to ' + name(to) + ', ' + Base.boxLabel[c.box] + ' [21.0]', '21.0')]);
          }
        }
      }
      if (W && e.tenderNow) {
        push(state, War.placeTender(war, e.tenderNow, c.date, null, e.tenderId).records);
      }
      if (e.moveTo && (W || B)) {
        /* [31.6] event 8: Manila closes; undamaged boats in port go to Davao
         * with the tender, damaged ones are scuttled, damaged ones at sea
         * make for Pearl Harbor. */
        if (W && war.bases.indexOf(e.deactivate) > -1) {
          war.bases.splice(war.bases.indexOf(e.deactivate), 1);
          push(state, [note('Bases', name(e.deactivate) + ' is abandoned [31.6]', '31.6')]);
        }
        if (B && !c.atSea && c.base === e.deactivate && c.box !== 'overhaul') {
          if (e.scuttleDamaged && /^repair|hold/.test(c.box || '')) { finish(state, 'scuttled', 'Scuttled as Manila was abandoned (not counted as lost) [31.6].'); return; }
          c.base = e.moveTo; state.area = e.moveTo;
          push(state, [note('Bases', 'the boat moves with the tender to ' + name(e.moveTo) + ' [31.6]', '31.6')]);
        }
        if (B && c.atSea && state.sub.damaged && e.damagedRtb) {
          state.sub.rtb = true; c.heading = { kind: 'base', id: war.surabayaBase ? 'surabaya' : e.damagedRtb };
          push(state, [note('Bases', 'damaged at sea: the boat makes for ' + name(c.heading.id) + ' [31.6]', '31.6')]);
        }
        return;
      }
      if (W && e.dutchIntervention) {
        war.surabayaBase = true;
        if (war.tenders.indexOf('surabaya') === -1) war.tenders.push('surabaya');
        war.tenderAt.surabaya = ['pelikaan'];
        push(state, [note('Dutch Intervention', 'tender Pelikaan at Surabaya: the base is active [31.6]', '31.6')]);
      }
      if (W && e.tender) {
        war.pendingTenders.push(e.tenderId ? e.tender + ':' + e.tenderId : e.tender);
        push(state, [note('Forward base', 'a Submarine Tender will be placed at ' + name(e.tender) + ' in the War Progress Phase [21.21]', '21.21')]);
      }
      if (e.tenderRemoved) {
        var hadTender = war.tenders.indexOf(e.tenderRemoved) > -1;
        if (W && hadTender) {
          /* [21.24] the tender leaves play but may serve at a new base. */
          war.tenders = war.tenders.filter(function (t) { return t !== e.tenderRemoved; });
          delete war.tenderAt[e.tenderRemoved];
        }
        if (W && e.tenderRemoved === 'surabaya') war.surabayaBase = false;       // Surabaya falls [33.13]
        if (B && (hadTender || part === 'boat') && !c.atSea && c.base === e.tenderRemoved) {
          /* [33.11] Dutch and British boats go to Fremantle when it is open */
          var to = c.nation && war.bases.indexOf('fremantle') > -1 ? 'fremantle' : 'pearl';
          c.base = to; state.area = to;
          push(state, [note('Bases', 'the tender leaves ' + name(e.tenderRemoved) + ': the boat moves to ' + name(to) + ' [21.24]', '21.24')]);
        }
      }
      if (B && e.relegateSBoats && (c.cls === 's1' || c.cls === 's3') && c.box !== 'overhaul') {
        finish(state, 'relegated', 'The remaining S-boats are relegated to training duty [5.0].');
      }
      if (B && e.relegateNamed && e.relegateNamed.indexOf(c.boat) > -1 && c.box !== 'overhaul') {
        finish(state, 'relegated', 'Relegated to training duty [5.0].');
      }
      if (B && e.piersideTo && !c.atSea && c.box === 'pierside' && e.piersideTo[c.base]) {
        openPatrol(state);
        c.atSea = true; c.box = null;
        state.area = e.piersideTo[c.base]; state.sub.side = 'patrol';
        push(state, [note('War Event', 'pierside boats sail at once: ' + name(state.area) + ', patrol side up [5.0]', '5.0')]);
      }
    });
  }

  function applyEvent(state, ev, opts) {
    var c = state.career;
    if (ev.type === 'relegate') {
      if (ev.first.indexOf(c.boat) > -1 && c.box !== 'overhaul') { finish(state, 'relegated', 'Relegated to training duty: ' + ev.name + ' [5.0].'); return; }
      push(state, [note(ev.name, 'the fleet gives up ' + ev.count + ' older boats; yours stays in service [5.0]', '5.0')]);
    }
    if (ev.type === 'political') {
      c.weekRule = 'political';
      push(state, [note(ev.name, ev.text + ' [5.0]', '5.0')]);
    }
    applyEffects(state, ev.effects, opts);
  }

  function periodStart(state, wp, opts) {
    var ps = Data.periodStart[wp];
    if (!ps) return;
    push(state, [note('War Period ' + wp + ' begins', ps.text + ' [17.0]', '17.0')]);
    (ps.marks || []).forEach(function (id) { state.war.occurred[id] = state.war.occurred[id] || 1; });
    applyEffects(state, ps.effects, opts);
  }

  /* ---------------- the week turns over ---------------- */
  function startWeek(state, opts) {
    var c = state.career, war = state.war;
    syncWar(state);
    if (!state.patrolGame) {
    state.phase = '5.0';
    /* I. Strategic Segment */
    var ev = War.warEventPhase(war, c.date, opts);
    push(state, ev.records);
    war.event = ev.event;
    state.phase = '6.0';
    push(state, War.torpedoPhase(war, opts).records);
    state.phase = '7.0';
    push(state, War.ultraPhase(war, ev.event, opts).records);
    if (ev.event) { state.phase = '5.0'; applyEvent(state, ev.event, opts); }
    if (state.done) return;
    }
    boatWeek(state, opts);
  }

  /* The boat's own part of a week: Triple-R [8.0]-[11.0], then the start of
   * Operations. A fleet (Phase 8) runs this for every boat after one
   * Strategic Segment for the whole war. */
  function boatWeek(state, opts) {
    var c = state.career, war = state.war;
    /* II. Triple-R Segment */
    state.phase = '8.0';
    /* [34.0] staggered: the list's boats come and go in a rolled week */
    var due = state.fleet && state.fleet.staggerWeek ? (state.fleet.staggerWeek[c.boat] || 1) : 1;
    if (c.date.w === due && !state.patrolGame) {
      var short = c.boat.replace(/^USS /, ''), key = War.monthKey(c.date);
      if (c.box === 'overhaul' && c.returnKey === key) {
        /* [8.0D] back from overhaul: Pearl Harbor's Broom Box (S-boats to
         * Dutch Harbor if it is open). */
        var home = (c.cls === 's1' || c.cls === 's3') && war.bases.indexOf('dutch_harbor') > -1 ? 'dutch_harbor' : 'pearl';
        c.box = 'broom'; c.base = home; state.area = home; c.returnKey = null;
        push(state, [note('Return from overhaul', 'back in the Broom Box at ' + name(home) + ' [8.0D]', '8.0', 'Reinforcements [8.0D]')]);
      } else if (((state.fleet ? state.fleet.withdrawList : Data.withdraw)[key] || []).indexOf(short) > -1) {
        /* [8.0C] withdrawn at once, even at sea or damaged; the Super Skipper
         * stays with the boat, Damage and Spotted markers are removed. */
        if (c.current) closePatrol(state, 'overhaul');
        c.atSea = false; c.box = 'overhaul'; c.base = 'west_coast'; c.heading = null;
        c.returnKey = state.fleet ? state.fleet.returnAfter(short, key) : Data.returnAfter(short, key);
        var sub = state.sub;
        sub.spotted = false; sub.damaged = false; sub.damageMarkers = 0; sub.damagePending = false; sub.rtb = false; sub.side = 'transit';
        state.smz = null; state.area = 'pearl';
        push(state, [note('Withdrawn for overhaul', 'to the West Coast box, as the Master Reinforcement list orders [8.0C]' +
          (c.returnKey ? '; back in ' + War.label({ y: +c.returnKey.slice(0, 4), m: +c.returnKey.slice(5) - 1 }) + ' [8.0D]' : '; not listed to return'),
          '8.0', 'Reinforcements [8.0C]')]);
        if (!c.returnKey) { finish(state, 'withdrawn', 'Withdrawn for overhaul and not listed to return [8.0C].'); return; }
      }
    }
    if (c.box === 'overhaul') { state.phase = 'base'; syncWar(state); return; }
    if (!c.atSea) {
      state.phase = /^repair/.test(c.box) ? '10.0' : '9.0';
      var t = Base.tripleR(c.box, c.base, c.readiness, war, opts);
      push(state, t.records);
      c.box = t.box;
      if (bases(state).indexOf(c.base) === -1 && !/^repair/.test(c.box)) {
        push(state, [note('Bases', name(c.base) + ' is closed: the boat moves to Pearl Harbor [21.0]', '21.0')]);
        c.base = 'pearl'; state.area = 'pearl';
      }
    }
    /* III. Operations */
    syncWar(state);
    if (!c.atSea) { state.phase = 'base'; return; }
    /* [15.25] beyond the range of any base (a base fell): damaged, RTB. */
    if (!state.sub.rtb && Transit.distToBase(state.area, bases(state)) > state.sub.range) {
      Combat.damage(state);
      push(state, Combat.resolveDamage(state, opts));
      state.sub.rtb = true; state.sub.side = 'transit'; c.heading = null; c.limping = true;
      push(state, [note('Beyond Range of a base', 'the boat is damaged and must RTB at Speed ' + speedOf(state) + ' [15.25]', '15.25')]);
      if (state.sub.sunk) { finish(state, 'lost', 'Sunk: a second Damage marker [18.1].'); return; }
    }
    c.orders = state.fleet ? state.fleet.ordersFor(state) : missionOrders(state);
    if (c.orders) {
      push(state, [note('Special Mission — ' + c.orders.name, c.orders.tasked
        ? 'your boat is ordered in: ' + c.orders.smz.concat(c.orders.areas).map(name).join(' or ') + '. ' + c.orders.text
        : 'not your boat: ' + c.orders.why, '5.2', 'War Event [5.2]')]);
      if (c.orders.tasked && state.sub.side === 'transit' && !state.sub.rtb) {
        state.sub.side = 'patrol'; c.heading = null;
        push(state, [note('Special Mission', 'flipped to the Patrol side to reach the zone [5.2]', '5.2')]);
      }
    }
    state.phase = (state.sub.rtb || state.sub.side === 'transit') ? '15.0' : '12.0';
  }

  function endWeek(state, opts, turned) {
    var c = state.career, war = state.war;
    boatWeekEnd(state, opts, turned);
    if (!state.patrolGame) push(state, War.fleetWeek(war, c.date, opts).records);
    war.ultra = []; war.event = null;                                        // [16.4]
    c.date = War.nextWeek(c.date);                                            // [16.5]
    if (War.pastEnd(c.date)) {
      finish(state, 'war_over', 'The war is over: Japan surrenders, August 1945.');
      return;
    }
    state.phase = '17.0';
    if (state.patrolGame) { startWeek(state, opts); return; }
    /* [21.21] tenders ordered by this week's events arrive now. */
    while (war.pendingTenders.length) push(state, War.placeTender(war, war.pendingTenders.shift(), c.date, opts).records);
    var wp = War.warProgress(war, c.date, opts);
    push(state, wp.records);
    if (wp.advanced) periodStart(state, war.warPeriod, opts);
    if (state.done) return;
    startWeek(state, opts);
  }

  /* The boat's own end of the week [16.0]: the turn, the Spotted roll, and
   * this week's orders cleared. */
  function boatWeekEnd(state, opts, turned) {
    var c = state.career;
    if (!turned) state.turn += 1;
    state.phase = '16.0';
    /* [16.2] Spotted marker removal, at sea. */
    if (c.atSea && state.sub.spotted) {
      var ss = state.sub.superSkipper ? state.sub.superSkipper.value : 0;
      var d = Res.d10(opts), m = d - ss, gone = m <= 6;
      if (gone) state.sub.spotted = false;
      if (state.pack) state.pack.forEach(function (x) { x.spotted = state.sub.spotted; });   // [24.6] one roll for the pack
      push(state, [Res.makeRecord({ context: 'Spotted marker', table: 'Conclude Turn [16.2]', ruleRef: '16.2', inputs: [],
        drms: ss ? [{ label: 'Super Skipper', value: -ss, rule: '16.2' }] : [], die: d, modifiedDie: m, target: 6,
        result: gone ? 'removed' : 'still spotted' })]);
    }
    c.orders = null; c.weekRule = null;
    if (c.startRule && !c.startRule.smzWeeks) c.startRule = null;
    if (!(state.smz && state.smzWeeks > 0 && !state.sub.rtb)) {
      state.smz = null;
      if (c.startRule && c.startRule.smzWeeks) c.startRule = null;
    }
    state.contactsOnly = null; state.contactsWhy = null; state.noAttack = false; state.congregating = 0;
  }

  /* ---------------- apply ---------------- */
  function apply(state, action, opts) {
    if (!isLegal(state, action)) {
      throw new Error('sw_career: illegal action "' + action.type + '" in phase ' + state.phase);
    }
    var c = state.career;
    switch (action.type) {
      case 'sail':
        state.history.push({ phase: state.phase, action: 'sail' });
        state.phase = '15.0';
        sail(state, action.area, opts);
        if (!state.done && c.atSea) state.phase = '16.0';
        break;
      case 'form_pack':
        state.history.push({ phase: state.phase, action: 'form_pack' });
        c.packPlanned = companions(state, opts);
        push(state, [note('Wolfpack formed', c.own.name + ' with ' + c.packPlanned.map(function (m) {
          return m.name + ' (' + m.attack + '-' + m.defense + '-' + m.tactical + ')'; }).join(' and ') + ', Ready for Sea together [24.1]', '24.1')]);
        break;
      case 'break_pack':
        state.history.push({ phase: state.phase, action: 'break_pack' });
        c.packPlanned = null;
        break;
      case 'wait':
        state.history.push({ phase: state.phase, action: 'wait' });
        if (c.packPlanned) { push(state, [note('Wolfpack', 'the pack does not sail together this week: it is stood down [24.0]', '24.0')]); c.packPlanned = null; }
        var inOverhaul = c.box === 'overhaul';
        endWeek(state, opts, false);
        /* In overhaul the weeks run on by themselves until the boat is back. */
        while (inOverhaul && !state.done && c.box === 'overhaul') endWeek(state, opts, false);
        break;
      case 'rtb_to':
        state.history.push({ phase: state.phase, action: 'rtb_to' });
        c.heading = { kind: 'base', id: action.base };
        continueTransit(state, false, opts);
        if (!state.done) state.phase = c.atSea ? '16.0' : '16.0';
        break;
      case 'transit_on':
        state.history.push({ phase: state.phase, action: 'transit_on' });
        continueTransit(state, !!action.cautious, opts);
        if (!state.done) state.phase = '16.0';
        break;
      case 'enter_smz':
        state.history.push({ phase: state.phase, action: 'enter_smz' });
        enterSmz(state, action.smz, action.via, opts);
        break;
      case 'end_turn': {
        if (!c.atSea) { endWeek(state, opts, false); break; }
        var saved = state.activeBaseAreas;
        state.activeBaseAreas = [];            // the career docks boats itself
        Patrol.apply(state, { type: 'end_turn' }, opts);
        state.activeBaseAreas = saved;
        state.done = false; state.outcome = null;
        endWeek(state, opts, true);
        break;
      }
      default: {
        var before = state.area;
        state.lastArea = before;
        Patrol.apply(state, action, opts);
        if (state.done) {                      // the patrol engine lost the boat
          state.done = false;
          syncWar(state);
          finish(state, 'lost', 'Lost with all hands.');
          break;
        }
        if (action.type === 'move') patrolMoveCheck(state, opts);
        if (state.sub.rtb) state.sub.side = 'transit';
        /* [31.13] "must RTB in the Transit Movement Phase of the first turn". */
        if (c.startRule && c.startRule.rtbFirst && state.phase === '16.0' && c.atSea && !state.done) {
          state.sub.rtb = true; state.sub.side = 'transit'; c.heading = null; c.startRule = null;
          state.phase = '15.0';
        }
        if (!state.done && state.phase === '13.1') { syncWar(state); setContactRules(state); }
      }
    }
    if (!state.done) syncWar(state);
    else if (!state.fleet) { state.war.mine.ships = state.shipsSunk; state.war.mine.tons = state.tonnageSunk; }
    return state;
  }

  /* ---------------- ratings ---------------- */
  /* [32.1] The book's standard for the historical patrol (the career's first):
   * beat ships OR tons = good, both = great, both in fewer weeks = legendary;
   * losing the boat takes one level off. */
  function patrolVerdict(def, p) {
    if (!p) return null;
    var r = def.record, lvl = 0;
    /* The First Wolfpack's record is the pack's [32.19]. */
    var myShips = def.pack && p.pack ? p.packShips : p.ships, myTons = def.pack && p.pack ? p.packTons : p.tons;
    var ships = myShips > r.ships, tons = myTons > r.tons;
    if (ships || tons) lvl = 1;
    if (ships && tons) lvl = 2;
    if (ships && tons && p.weeks < r.weeks) lvl = 3;
    if (p.outcome === 'lost') lvl = Math.max(0, lvl - 1);
    return { level: lvl, label: ['below the record', 'a good captain', 'a great captain', 'a legendary captain'][lvl],
             ships: ships, tons: tons, rule: '32.1' };
  }

  root.SWCareer = {
    create: create,
    legalActions: legalActions,
    refusals: refusals,
    isLegal: isLegal,
    apply: apply,
    patrolVerdict: patrolVerdict,
    congregation: congregation,
    /* Phase 8: the pieces a fleet runs boat by boat. */
    boatWeek: boatWeek,
    boatWeekEnd: boatWeekEnd,
    applyEffects: applyEffects,
    missionOrders: missionOrders,
    finish: finish,
    createBoat: createBoat,
    dock: dock,
    openPatrol: openPatrol,
    note: note,
    push: push,
    name: name
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
