/* swui.js — the ONLY file allowed to touch the DOM, roll real dice, or show a
 * dialog (playbook invariant 9). It renders state and records; it never
 * computes a rule. Every number it shows either comes from a pure module or is
 * read straight off the tape.
 *
 * Phase 2: no rules engine. Legality and table logic arrive in Phase 4.
 */
(function () {
  'use strict';

  var Map_ = window.SWMap, Layout = window.SWLayout, Tables = window.SWTables,
      Units = window.SWUnits, Sop = window.SWSop, Glossary = window.SWGlossary,
      Charts = window.SWCharts, Res = window.SWResolution, Fog = window.SWFog,
      Player = window.SWTapePlayer, Tape = window.SWTapeSpearfish,
      Aac = window.SWAac, Ships = window.SWShips, SubClasses = window.SWSubClasses,
      Patrol = window.SWPatrol, Combat = window.SWCombat, Units_ = window.SWUnits,
      Search = window.SWSearch, Move = window.SWMovement, Guide = window.SWGuide,
      Lessons = window.SWLessons || [], Drills = window.SWDrills || [], Goal = window.SWGoal,
      Career = window.SWCareer, War = window.SWWar, CData = window.SWCampaignData, BaseR = window.SWBase,
      TransitR = window.SWTransit, Fleet = window.SWFleet;

  /* Phase 6: a career is a patrol state with a war around it. Every engine
   * call goes through here, so the board, the palette and the hard lock serve
   * both without a second code path. */
  function Eng() { return S.fleet ? FleetFacade : S.engine && S.engine.career ? Career : Patrol; }
  /* Phase 8: a campaign. Orders and fights go to the fleet engine; the page
   * shows the boat fighting, or the boat in focus on the Fleet board. */
  var FleetFacade = {
    legalActions: function () { return Fleet.legalActions(S.fleet); },
    isLegal: function (e, a) { return Fleet.isLegal(S.fleet, a); },
    apply: function (e, a, d) { Fleet.apply(S.fleet, a, d); S.engine = fleetFocus(); return S.engine; }
  };
  function fleetFocus() {
    var f = S.fleet;
    if (!f) return S.engine;
    if (f.active) return f.active;
    var live = Fleet.live(f);
    return (S.focusBoat && live.filter(function (b) { return b.career.boat === S.focusBoat; })[0]) ||
           live.filter(function (b) { return b.career.atSea; })[0] || live[0] || f.boats[0];
  }
  function inFleetOrders() { return !!(S.fleet && S.fleet.phase !== 'fight'); }
  function isCareer() { return !!(S.engine && S.engine.career); }

  /* ---------------- preferences ----------------
   * Beginner view, the coach and the first-run briefing are remembered per
   * browser; the URL can override them (the test suites open with
   * ?brief=0&detail=full&coach=0 so they see the page they were written for). */
  function store(k, v) {
    try {
      if (v === undefined) return window.localStorage.getItem(k);
      if (v === null) window.localStorage.removeItem(k); else window.localStorage.setItem(k, v);
    } catch (e) { /* private window: preferences simply do not persist */ }
    return null;
  }
  function param(name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }
  function jsonStore(k, dflt) { try { return JSON.parse(store(k) || 'null') || dflt; } catch (e) { return dflt; } }

  /* ---------------- helpers ---------------- */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function $(sel) { return document.querySelector(sel); }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function pct(v) { return (v * 100).toFixed(4) + '%'; }

  /* The scripted demo tape's dice. Its outcomes are fixed by the tape, so this
   * stream never decides anything. */
  var DICE = { rollDie: function (sides) { return Math.floor(Math.random() * (sides || 10)); } };

  /* A patrol's dice are seeded (rules/sw_dice.js): same seed, same choices,
   * same patrol. `?seed=N` in the URL picks one; otherwise a fresh one is drawn
   * and shown in the status strip, so any patrol can be replayed or reported. */
  function freshSeed() {
    var u = new Uint32Array(1);
    window.crypto.getRandomValues(u);
    return u[0] % 1000000;
  }
  function urlSeed() {
    var m = /[?&]seed=(\d+)/.exec(window.location.search);
    return m ? parseInt(m[1], 10) : null;
  }

  /* The tumbling faces of the die animation are decoration. They come from
   * crypto, never from a game stream: if the animation drew from the seeded
   * dice, changing its speed would change every outcome after it (Ambush v2
   * hit exactly this). */
  function tumbleFace() {
    var u = new Uint8Array(1);
    window.crypto.getRandomValues(u);
    return u[0] % 10;
  }

  var SPEEDS = { animate: { die: 750, step: 900 }, fast: { die: 250, step: 320 }, instant: { die: 0, step: 0 } };

  /* ---------------- app state ---------------- */
  var S = {
    view: 'theater',
    history: [],
    autoView: true,
    speed: 'animate',
    selectedArea: 'east_china_sea',
    selectedBase: 'pearl',
    selectedCups: 'w2',
    tape: null,
    lastStep: null,
    lastRecord: null,
    playing: false,
    logFilter: { phase: 'all', sub: 'all' },
    rulesText: null,
    rulesError: null,
    mode: 'tape',        // 'tape' = the Phase 2 scripted demo, 'patrol' = the live engine
    engine: null,
    dice: null,          // the patrol's seeded dice (SWDice.seeded)
    visited: {},         // turn -> { '12.0': true, ... } phases the boat went through
    played: [],          // every decision taken this patrol, in order (replay = seed + this)
    replaying: false,    // true while a replay rebuilds a state: no drawing, no animation
    lesson: null,        // { def, next, busy } while a lesson plays the patrol
    tries: {},           // What-if memory: seed:index -> what the earlier choice led to
    notice: null,        // one-line message for the palette (e.g. "Rewound ...")
    detail: 'beginner',  // 'beginner' (plain words, less on screen) or 'full' (every rule number)
    coach: true,         // the coach checks a decision before it is committed
    showMaths: false,    // beginner view: the dice arithmetic is folded to one line
    firstNow: null,      // a "first time you see this" explanation waiting in the palette
    coachHold: null,     // { action, v } a decision the coach asked about
    coachNote: null,     // what the coach said about the last decision
    drill: null,         // { def, done, result } while a boot-camp drill runs
    bcItem: null,        // the boot-camp item being worked on
    moments: [],         // decisions and events the debrief looks back on
    debriefShown: false,
    prevStats: {}, flash: {}, flashTimer: null,   // status-strip change flashes
    viewTimer: null, pendingView: null,           // a view switch waiting its beat
    autoTimer: null,     // pending forced step (see scheduleForced)
    pacing: { presses: 0, decisions: 0, auto: 0 },
    results: {},         // unit id -> result badge from the last volley
    subResult: null,     // badge on the submarine's box from the last counterattack
    radioOpen: {}        // radio-log lines expanded to their ledger
  };

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                'August', 'September', 'October', 'November', 'December'];

  /* [4.0] A game turn is one week. The patrol starts in week 1 of March 1943. */
  function calendar(turn) {
    var weeks = (turn - 1) + 2 * 4;          // offset so turn 1 = March, week 1
    return { y: 1943 + Math.floor(weeks / 48), m: Math.floor(weeks / 4) % 12, w: (weeks % 4) + 1 };
  }

  /* The engine's date: a career keeps its own calendar. */
  function engineDate() {
    var e = S.engine;
    if (e && e.career) return e.career.date;
    return calendar(e.turn);
  }

  /* Real dice for the engine. The pure modules never roll their own. */
  function engineDice() { return S.dice; }

  /* ---------------- engine -> view adapter ----------------
   * The Phase 2 renderers already know how to draw a board, a fog-safe summary
   * and a ledger. Rather than duplicate them for the engine, the engine's state
   * is projected into the same shape. Nothing here decides a rule. */
  function engineView() {
    var e = S.engine;
    var byCol = { A: 0, B: 0, C: 0, D: 0 };
    e.units.forEach(function (u) { if (!u.returned) byCol[u.column] += 1; });
    var anyDrawn = e.units.length > 0;
    return {
      status: {
        month: MONTHS[engineDate().m], year: engineDate().y, week: engineDate().w,
        warPeriod: e.warPeriod, generalAsw: Tables.generalAsw[e.warPeriod],
        torpedoValue: e.torpedoValue, shipsSunk: e.shipsSunk,
        tonnageSunk: e.tonnageSunk, subsLost: e.career ? e.war.fleet.lost + (e.sub.sunk ? 1 : 0) : (e.sub.sunk ? 1 : 0),
        opArea: e.area
      },
      /* Sunk ships stay on the display as wrecks until clean-up, so a kill is
       * something you see happen rather than a counter that just vanishes. */
      units: e.units.filter(function (u) { return !u.returned; }).map(function (u) {
        /* A piece the roster does not know would otherwise take the whole view
         * down; surface it on the counter instead so it is obvious in play. */
        var p = Ships.piece(u.piece) ||
          { type: '?', name: 'UNKNOWN: ' + u.piece, tonnage: null, defense: null, asw: 0 };
        return {
          id: u.uid, column: u.column, revealed: u.revealed, damaged: u.damaged, sunk: !!u.sunk,
          kind: p.type, label: p.name || (p.type + ' ' + (p.tonnage || '') + 't'),
          defense: p.defense, asw: p.asw, tonnage: p.tonnage,
          art: '../../Source/images/' + u.piece + '.gif',
          back: Combat.backOf(u) === 'battle'
            ? '../../Source/images/flag_battle.gif'
            : '../../Source/images/flag_merchant.gif'
        };
      }),
      board: {
        subSlot: e.pc ? null : (e.sub.column ? 'Sub_' + e.sub.column + '1' : null),
        /* Phase 7: every boat of a wolfpack in its own box, two to a column [24.5]. */
        packSlots: e.pc ? e.pc.order.reduce(function (m, b, k) {
          if (!b.column || b.sunk || (e.pc.stage === 'place' && k >= e.pc.placing)) return m;
          var n = Object.keys(m).filter(function (id) { return id.indexOf('Sub_' + b.column) === 0; }).length;
          m['Sub_' + b.column + (n + 1)] = b;
          return m;
        }, {}) : null,
        opArea: { id: e.area, section: 'operating' },
        activity: null, contact: null,
        cupDraw: anyDrawn ? byCol : null,
        /* Keyed by unit id; the board derives the slot from column order. */
        tdc: e.units.reduce(function (m, u) {
          if (u.tdc !== null && u.tdc !== undefined) {
            m[u.uid] = { value: u.tdcRevealed ? u.tdc : null };
          }
          return m;
        }, {}),
        allocations: e.allocations, sunk: [], withdrawn: false, cleanedUp: false
      },
      log: e.log,
      index: 0, done: e.done
    };
  }

  function syncEngineView() { if (S.mode === 'patrol') S.tape = engineView(); }

  /* ---------------- status strip ---------------- */
  /* A value that changed flashes for a moment and shows by how much, so a
   * sinking or a new week is noticed, not just updated. The flash survives the
   * re-renders that follow by resuming its animation where it was. */
  function numberIn(t) {
    var m = /^[^0-9-]*(-?[0-9][0-9,]*)(?:[^0-9]|$)/.exec(t);
    return m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
  }
  function stat(k, v, warn) {
    var shown = S.detail === 'beginner' && Guide.plain[k] ? Guide.plain[k] : k;
    var node = el('div', { class: 'stat' + (k === 'Seed' ? ' seed-stat' : '') }, [
      el('div', { class: 'k', text: shown }),
      el('div', { class: 'v' + (warn ? ' warn' : ''), html: v })
    ]);
    var txt = String(v).replace(/<[^>]+>/g, ''), key = S.mode + ':' + k, prev = S.prevStats[key];
    if (prev !== undefined && prev !== txt) {
      var a = numberIn(prev), b = numberIn(txt), delta = null;
      if (a !== null && b !== null && a !== b && k !== 'Date' && k !== 'Seed') {
        var d = b - a;
        delta = (d > 0 ? '+' : '−') + (k === 'Tonnage' ? Math.abs(d).toLocaleString('en-US') : Math.abs(d));
      }
      S.flash[key] = { at: Date.now(), delta: delta };
    }
    S.prevStats[key] = txt;
    var f = S.flash[key], age = f ? Date.now() - f.at : Infinity;
    if (age < 2600) {
      node.classList.add('changed');
      node.style.animationDelay = (-age) + 'ms';
      if (f.delta) node.appendChild(el('span', { class: 'delta', text: f.delta, style: 'animation-delay:' + (-age) + 'ms;' }));
      clearTimeout(S.flashTimer);
      S.flashTimer = setTimeout(function () { if (S.tape) renderStatus(); }, 2700 - age);
    }
    return node;
  }

  function renderStatus() {
    var st = S.tape.status;
    var strip = $('#status-strip');
    clear(strip);
    strip.appendChild(el('div', { class: 'brand' }, [
      el('div', { text: 'SILENT WAR' }),
      el('div', { class: 'build', text: 'v' + (window.SW_VERSION || '?') +
        (S.fleet ? ' · campaign' : S.engine && S.engine.patrolGame ? ' · patrol game' : isCareer() ? ' · career' : S.mode === 'patrol' ? ' · patrol' : ' · demo tape') })
    ]));
    if (S.fleet) return renderFleetStatus(strip);
    strip.appendChild(stat('Date', st.month + ' ' + st.year + ' · wk ' + st.week));
    strip.appendChild(stat('War Period', term('war_period', st.warPeriod), true));
    strip.appendChild(stat('Gen. ASW', term('general_asw', String(st.generalAsw))));
    strip.appendChild(stat('Mk-XIV', term('torpedo_value', (st.torpedoValue > 0 ? '+' : '') + st.torpedoValue),
      st.torpedoValue < 0));
    strip.appendChild(stat('Ships sunk', String(st.shipsSunk)));
    strip.appendChild(stat('Tonnage', st.tonnageSunk + ',000'));
    strip.appendChild(stat('Subs lost', String(st.subsLost)));
    if (S.mode === 'patrol' && S.engine) {
      var es = S.engine.sub, ec = S.engine.career;
      var boat = es.sunk ? 'Sunk' : [es.damaged ? 'Damaged' : null, es.spotted ? 'Spotted' : null, es.rtb ? 'RTB' : null]
        .filter(Boolean).join(' · ') || (ec && !ec.atSea ? (ec.box === 'overhaul' ? 'Overhaul' : 'In port: ' + BaseR.boxLabel[ec.box])
                                         : ec && es.side === 'transit' ? 'In transit' : 'On patrol');
      if (S.engine.pack) boat += ' · wolfpack of ' + S.engine.pack.length;
      strip.appendChild(stat('Boat', boat, boat !== 'On patrol' && boat !== 'In transit' && boat !== 'In port: Ready for Sea'));
      if (ec) {
        strip.appendChild(stat('Patrol', (ec.current ? ec.current.n : ec.patrols.length) + ' of ' + ec.target));
        strip.appendChild(stat('Fleet', S.engine.war.fleet.ships + ' ships'));
      }
    }
    if (S.mode === 'patrol' && S.dice) {
      var seedStat = stat('Seed', String(S.dice.seed));
      seedStat.title = 'Open with ?seed=' + S.dice.seed + ' and make the same choices to replay this patrol';
      strip.appendChild(seedStat);
    }
    strip.appendChild(el('div', { class: 'spacer' }));
    speedControl(strip);
  }
  function speedControl(strip) {
    var speed = el('div', { id: 'speed' }, [el('span', { class: 'lbl', text: 'Speed' })]);
    var seg = el('div', { class: 'seg' });
    ['animate', 'fast', 'instant'].forEach(function (k) {
      seg.appendChild(el('button', {
        type: 'button', 'aria-pressed': String(S.speed === k), text: k,
        onclick: function () { S.speed = k; renderStatus(); }
      }));
    });
    speed.appendChild(seg);
    strip.appendChild(speed);
  }

  /* Wrap a value in a tooltip-bearing span. */
  function term(id, textValue) {
    return '<span class="term" data-term="' + id + '">' + textValue + '</span>';
  }
  function termNode(id, textValue) {
    return el('span', { class: 'term', 'data-term': id, text: textValue });
  }

  /* ---------------- breadcrumb ---------------- */
  function renderBreadcrumb() {
    var bc = $('#breadcrumb');
    clear(bc);
    var sopId = S.lastStep ? S.lastStep.sop : '12.0';
    var found = Sop.find(sopId);
    if (!found) { bc.appendChild(el('span', { text: 'Sequence of Play [4.0]' })); return; }

    bc.appendChild(el('span', { class: 'seg-name', text: found.segmentLabel }));
    bc.appendChild(el('span', { class: 'sep', text: '›' }));

    Sop.patrol().forEach(function (p, i) {
      if (i) bc.appendChild(el('span', { class: 'sep', text: '·' }));
      bc.appendChild(el('span', {
        class: 'crumb' + (p.id === found.id ? ' now' : ''),
        text: '[' + p.id + '] ' + p.label
      }));
    });
    if (found.step) {
      bc.appendChild(el('span', { class: 'sep', text: '›' }));
      bc.appendChild(el('span', { class: 'crumb now', text: '[' + found.step.id + '] ' + found.step.label }));
    }
  }

  /* ---------------- view switching + history ---------------- */
  function renderNav() {
    var nav = $('#viewnav');
    clear(nav);
    /* Phase 9: one way back to everything, always at the left edge: the main
     * menu (Resume, lessons, patrol, career, scenarios, saves, history). */
    nav.appendChild(el('button', { type: 'button', id: 'nav-menu', class: 'menu-btn', title: 'Main menu: start or resume a game, lessons, saves, history',
      onclick: function () { openWelcome('start'); } }, [el('span', { class: 'burger', text: '☰' }), el('span', { text: 'Menu' })]));
    nav.appendChild(el('span', { class: 'nav-mode', id: 'nav-mode', text: modeName() }));
    /* In a narrow window the side panel is a drawer (css); this opens it. A
     * dot marks rolls you have not looked at yet. */
    var sideOpen = document.body.classList.contains('side-open');
    nav.appendChild(el('button', { type: 'button', id: 'nav-details', class: 'narrow-only', 'aria-pressed': String(sideOpen),
      title: 'The dice, the radio and the contact summary (the side panel)',
      onclick: function () { document.body.classList.toggle('side-open'); S.sideUnseen = false; renderNav(); } },
      [el('span', { text: sideOpen ? 'Rolls ▸' : '◂ Rolls' })].concat(S.sideUnseen && !sideOpen ? [el('span', { class: 'dot', title: 'New rolls' })] : [])));
    Layout.views.filter(function (v) { return v.mode === 'destination' && (v.id !== 'fleet' || S.fleet); }).forEach(function (v) {
      nav.appendChild(el('button', {
        type: 'button', 'aria-current': S.view === v.id ? 'page' : null, 'data-view': v.id, title: v.label + ' (key ' + v.key + ')',
        onclick: function () { go(v.id, true); }
      }, [el('span', { text: v.label }), el('kbd', { text: v.key })]));
    });
    nav.appendChild(el('div', { class: 'nav-spacer' }));
    nav.appendChild(el('button', {
      type: 'button', class: 'back', title: 'Back (Backspace)',
      onclick: back
    }, [el('span', { text: '←' })]));
    nav.appendChild(el('button', {
      type: 'button', onclick: function () { openCharts(); }
    }, [el('span', { text: 'Charts' }), el('kbd', { text: 'c' })]));
    nav.appendChild(el('button', {
      type: 'button', onclick: function () { openRules(null); }
    }, [el('span', { text: 'Rules' }), el('kbd', { text: 'r' })]));
    /* Explicit two-way choices, each button naming what it selects (the Ambush
     * lesson: a toggle that shows the current state reads as the action). */
    var view = el('div', { class: 'seg', style: 'margin:6px 4px;', title: 'How much detail the screen shows' }, [
      el('button', { type: 'button', id: 'view-simple', 'aria-pressed': String(S.detail === 'beginner'), text: 'Simple',
        title: 'Plain words, fewer panels, the dice maths folded away', onclick: function () { setDetail('beginner'); } }),
      el('button', { type: 'button', id: 'view-full', 'aria-pressed': String(S.detail === 'full'), text: 'Full',
        title: 'Every panel and rule number', onclick: function () { setDetail('full'); } })
    ]);
    nav.appendChild(view);
    nav.appendChild(el('button', { type: 'button', id: 'coach-toggle', class: 'coach-toggle', 'aria-pressed': String(S.coach),
      title: 'The coach checks a decision before you commit it (always on in drills)',
      onclick: function () { S.coach = !S.coach; store('sw.coach', S.coach ? '1' : '0'); render(); } },
      [el('span', { text: S.coach ? '● coach' : '○ coach' })]));
    nav.appendChild(el('button', {
      type: 'button', class: 'auto-toggle', 'aria-pressed': String(S.autoView),
      title: 'Follow the sequence of play automatically',
      onclick: function () { S.autoView = !S.autoView; renderNav(); }
    }, [el('span', { text: S.autoView ? '● auto-follow' : '○ auto-follow' })]));
  }

  /* What you are playing now, beside the Menu button. */
  function modeName() {
    if (S.lesson) return 'Lesson';
    if (S.drill) return 'Drill';
    if (S.mode === 'tape') return 'Demo';
    if (S.fleet) return 'Campaign';
    if (S.engine && S.engine.patrolGame) return 'Patrol Game';
    if (isCareer()) return 'Career';
    return 'Patrol';
  }
  function setDetail(d) {
    S.detail = d;
    store('sw.detail', d);
    document.body.classList.toggle('beginner', d === 'beginner');
    S.prevStats = {};
    render();
  }

  function go(viewId, manual) {
    if (viewId === S.view) return;
    if (manual) S.autoView = false;
    S.history.push(S.view);
    S.view = viewId;
    render();
  }

  function back() {
    if (!$('#overlay').classList.contains('open')) {
      if (!S.history.length) return;
      S.view = S.history.pop();
      render();
    } else {
      closeOverlay();
    }
  }

  /* ---------------- Theater ---------------- */
  var theater = { x: 0, y: 0, k: 0.28, drag: null, built: false };

  function buildTheater() {
    var v = $('#view-theater');
    clear(v);
    var canvas = el('div', { id: 'theater-canvas' });
    var world = el('div', { id: 'theater-world' });
    var img = el('img', { src: Map_.image, alt: 'Silent War Pacific map',
                          width: Map_.imageSize.w, height: Map_.imageSize.h });
    world.appendChild(img);

    Map_.opAreas.forEach(function (a) { world.appendChild(areaHotspot(a, 'oparea')); });
    Map_.smzs.forEach(function (a) { world.appendChild(areaHotspot(a, 'smz')); });
    Map_.bases.forEach(function (b) { world.appendChild(areaHotspot(b, 'base')); });
    Map_.panels.forEach(function (p) { world.appendChild(panelHotspot(p)); });

    canvas.appendChild(world);
    v.appendChild(canvas);

    v.appendChild(el('div', { class: 'temp-flag',
      text: 'Area hotspots are approximate (status: temp). Phase 3 traces real polygons and the adjacency graph.' }));

    var ctrls = el('div', { class: 'map-controls' }, [
      el('button', { type: 'button', text: '−', title: 'Zoom out', onclick: function () { zoom(1 / 1.25); } }),
      el('button', { type: 'button', text: '+', title: 'Zoom in', onclick: function () { zoom(1.25); } }),
      el('button', { type: 'button', class: 'wide', text: 'Fit', onclick: fitMap }),
      el('button', { type: 'button', class: 'wide', text: 'Centre on sub', onclick: centreOnSub })
    ]);
    v.appendChild(ctrls);

    canvas.addEventListener('mousedown', function (e) {
      if (e.target.closest('.hotspot')) return;
      theater.drag = { x: e.clientX, y: e.clientY, ox: theater.x, oy: theater.y };
      canvas.classList.add('dragging');
    });
    window.addEventListener('mousemove', function (e) {
      if (!theater.drag) return;
      theater.x = theater.drag.ox + (e.clientX - theater.drag.x);
      theater.y = theater.drag.oy + (e.clientY - theater.drag.y);
      applyTransform();
    });
    window.addEventListener('mouseup', function () {
      theater.drag = null;
      canvas.classList.remove('dragging');
    });
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = canvas.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    theater.built = true;
    setTimeout(function () { fitMap(); renderMapLayer(); }, 0);
  }

  function areaHotspot(a, kind) {
    var moveAct = kind === 'oparea'
      ? (engineAction('move', a.id) || engineAction('transit', a.id)) : null;
    var cls = 'hotspot ' + kind + (a.id === S.selectedArea ? ' selected' : '') +
              (moveAct ? ' legal-move' : '');
    var label = a.name + (kind === 'oparea' ? ' [' + a.group + ']' :
                          kind === 'smz' ? ' — SMZ [20.0]' : ' — Base [21.0]');
    if (moveAct) label = moveAct.label + ' [' + moveAct.rule + ']';
    var node = el('button', {
      type: 'button', class: cls, title: label, 'data-area': a.id,
      style: 'left:' + pct(a.x) + ';top:' + pct(a.y) + ';'
    }, [subTokenIfHere(a.id)]);
    /* A property, not a listener: refreshTheaterTokens replaces it every phase.
     * As a listener it stayed attached alongside the replacement, so clicking a
     * legal destination moved the boat AND opened the OpArea view (switching
     * auto-follow off). Found by map_verify.py, 2026-09-20. */
    node.onclick = moveAct ? function () { doAction(moveAct); }
                           : function () { selectArea(a, kind); };
    return node;
  }

  function subTokenIfHere(areaId) {
    /* Superseded by the map layer's sub marker (renderMapLayer), which is
     * large, labelled and follows the camera. Kept as a no-op for callers. */
    if (areaId !== null) return null;
    var b = S.tape.board;
    if (b.opArea && b.opArea.id === areaId && b.opArea.section) {
      var sc = S.mode === 'patrol' ? engineSub() : Tape.submarine;
      return el('img', { class: 'tok', src: sc.art, alt: sc.name,
                         title: sc.name + ' — ' + b.opArea.section });
    }
    return null;
  }

  function panelHotspot(p) {
    var r = p.rect;
    return el('button', {
      type: 'button', class: 'hotspot panel', title: p.name + ' [' + p.ruleRef + ']',
      style: 'left:' + pct(r[0]) + ';top:' + pct(r[1]) +
             ';width:' + pct(r[2] - r[0]) + ';height:' + pct(r[3] - r[1]) + ';',
      onclick: function () { openRules(p.ruleRef); }
    });
  }

  function selectArea(a, kind) {
    if (kind === 'base') { S.selectedBase = a.id; go('base', true); return; }
    S.selectedArea = a.id;
    go('oparea', true);
  }

  function applyTransform() {
    var w = $('#theater-world');
    if (!w) return;
    w.style.transform = 'translate(' + theater.x + 'px,' + theater.y + 'px) scale(' + theater.k + ')';
    /* Markers on the map keep a constant on-screen size whatever the zoom. */
    w.style.setProperty('--inv', String(1 / theater.k));
  }
  /* Glide the camera so world point (px, py) sits in the middle of the free
   * part of the map (right of the palette), at zoom k. */
  function focusWorld(px, py, k, glide) {
    var c = $('#theater-canvas'), w = $('#theater-world');
    if (!c || !w || !c.clientWidth) return false;
    var pal = $('#palette'), left = 0;
    if (pal && !pal.classList.contains('collapsed')) {
      var pr = pal.getBoundingClientRect(), cr = c.getBoundingClientRect();
      if (pr.right > cr.left && pr.left < cr.left + cr.width / 2) left = Math.min(cr.width / 2, pr.right - cr.left);
    }
    theater.k = k;
    theater.x = left + (c.clientWidth - left) / 2 - px * k;
    theater.y = c.clientHeight / 2 - py * k;
    if (glide && SPEEDS[S.speed].step) {
      w.classList.add('glide');
      clearTimeout(theater.glideTimer);
      theater.glideTimer = setTimeout(function () { w.classList.remove('glide'); }, 950);
    }
    applyTransform();
    return true;
  }
  function zoom(f) {
    var c = $('#theater-canvas');
    if (!c) return;
    zoomAt(f, c.clientWidth / 2, c.clientHeight / 2);
  }
  function zoomAt(f, cx, cy) {
    var k2 = Math.min(2, Math.max(0.08, theater.k * f));
    var ratio = k2 / theater.k;
    theater.x = cx - (cx - theater.x) * ratio;
    theater.y = cy - (cy - theater.y) * ratio;
    theater.k = k2;
    applyTransform();
  }
  function fitMap() {
    var c = $('#theater-canvas');
    if (!c) return;
    theater.k = Math.min(c.clientWidth / Map_.imageSize.w, c.clientHeight / Map_.imageSize.h);
    theater.x = (c.clientWidth - Map_.imageSize.w * theater.k) / 2;
    theater.y = (c.clientHeight - Map_.imageSize.h * theater.k) / 2;
    applyTransform();
  }
  function centreOnSub() {
    var at = theater.subAt;
    var area = Map_.byId((S.tape.board.opArea && S.tape.board.opArea.id) || S.selectedArea);
    if (at) focusWorld(at.x, at.y - 80, Math.max(theater.k, 0.5), true);
    else if (area) focusWorld(area.x * Map_.imageSize.w, area.y * Map_.imageSize.h, Math.max(theater.k, 0.5), true);
  }

  /* ---------------- the map layer ----------------
   * What happened this week, drawn where it happened: the boat (large,
   * labelled, sliding when it moves, with a trail), the Area Activity roll lit
   * on the area's own printed chart, the contact as a convoy marker, the fight's
   * outcome as a burst. Read from the log and the board; nothing recomputed. */
  var WP_ROW = { W1: 0, W2: 1, W3: 2, W4: 3 };
  function lastRec(log, prefix) {
    for (var i = log.length - 1; i >= 0; i--) if (String(log[i].table).indexOf(prefix) === 0) return log[i];
    return null;
  }
  function mapCues() {
    var b = S.tape.board, cues = { area: b.opArea && b.opArea.id, chips: [], activity: null, contact: null, combat: null, endurance: null };
    var log, wp = S.tape.status.warPeriod, sub;
    if (S.mode === 'patrol' && S.engine) {
      var e = S.engine;
      log = e.log.filter(function (r) { return r.turn === e.turn; });
      sub = engineSub();
      if (e.sub.sunk) cues.chips.push({ t: 'SUNK', k: 'bad' });
      else {
        if (e.sub.damaged) cues.chips.push({ t: 'DAMAGED', k: 'bad' });
        if (e.sub.spotted) cues.chips.push({ t: 'SPOTTED', k: 'warn' });
        if (e.sub.rtb) cues.chips.push({ t: 'RTB', k: 'warn' });
      }
    } else {
      log = S.tape.log;
      sub = Tape.submarine;
    }
    cues.sub = sub;
    var aac = lastRec(log, 'Area Activity');
    if (aac && cues.area && Aac.charts[cues.area]) {
      var die = Math.max(0, Math.min(9, aac.modifiedDie === null ? aac.die : aac.modifiedDie));
      var lvl = Aac.lookup(cues.area, wp, die);
      cues.activity = { die: die, rolled: aac.die, row: WP_ROW[wp], level: lvl,
                        label: Tables.activityById(lvl).label, key: cues.area + ':' + log.indexOf(aac) + ':' + aac.die };
    }
    var con = lastRec(log, 'Contact');
    if (con) {
      var code = String(con.result).split(' ')[0];
      cues.contact = { code: code, label: String(con.result).replace(/^\S+\s*[—-]\s*/, '') };
    }
    var hits = log.filter(function (r) { return String(r.table).indexOf('To-hit') === 0 || /^Attack/.test(r.context || ''); });
    var sunk = log.filter(function (r) { return /SUNK/.test(String(r.result)) && String(r.table).indexOf('Counterattack') !== 0; }).length;
    if (hits.length || sunk) cues.combat = { attacks: hits.length, sunk: sunk };
    var evr = log.filter(function (r) { return r.context === 'Combat Event'; });
    if (evr.length) cues.event = evr[evr.length - 1].result;
    var svs = lastRec(log, 'Enemy Submarines');
    if (svs) {
      var shot = log.filter(function (r) { return /^(You fire at|The enemy fires at)/.test(r.context || ''); })[0];
      var art = log.filter(function (r) { return /14\.6F/.test(r.table); })[0];
      cues.enemySub = { name: svs.result, how: shot ? (shot.context.indexOf('You') === 0 ? 'you fired first' : 'it fired first') : '',
                        res: art ? art.result : shot ? (shot.result === 'HIT' ? 'hit' : 'missed') : '' };
    }
    var end = lastRec(log, 'Endurance');
    if (end) cues.endurance = /RTB/.test(String(end.result)) ? { t: 'Endurance failed: RTB', k: 'warn' } : { t: 'Endurance held', k: 'ok' };
    return cues;
  }

  function worldChip(x, y, cls, kids, title) {
    return el('div', { class: 'map-chip ' + cls, style: 'left:' + x + 'px;top:' + y + 'px;', title: title || null }, kids);
  }

  function renderMapLayer() {
    var world = $('#theater-world');
    if (!world) return;
    var layer = $('#map-layer');
    if (!layer) { layer = el('div', { id: 'map-layer' }); world.appendChild(layer); }
    clear(layer);
    var W = Map_.imageSize.w, H = Map_.imageSize.h;
    var cues = mapCues();
    var area = cues.area ? Map_.byId(cues.area) : null;
    if (!area) return;

    /* The Area Activity roll, on the printed chart: the War Period row, and
     * the exact cell the die landed on. */
    if (cues.activity) {
      var cell = Map_.aacCell, c0 = Map_.aacCellCentre(area.id, cues.activity.row, 0),
          c = Map_.aacCellCentre(area.id, cues.activity.row, cues.activity.die);
      layer.appendChild(el('div', { class: 'aac-row', style: 'left:' + (c0.x - cell.w / 2) + 'px;top:' + (c0.y - cell.h / 2) +
        'px;width:' + (cell.w * 10) + 'px;height:' + cell.h + 'px;' }));
      layer.appendChild(el('div', { class: 'aac-hit', style: 'left:' + (c.x - cell.w / 2 - 3) + 'px;top:' + (c.y - cell.h / 2 - 3) +
        'px;width:' + (cell.w + 6) + 'px;height:' + (cell.h + 6) + 'px;' }));
      layer.appendChild(worldChip(c0.x + cell.w * 10 + 8, c.y, 'roll lvl-' + cues.activity.level + ' right', [
        el('b', { text: 'Rolled ' + cues.activity.rolled + (cues.activity.die !== cues.activity.rolled ? ' → ' + cues.activity.die : '') }),
        el('span', { text: cues.activity.label })
      ], 'Area Activity Chart [13.2A], War Period row ' + (cues.activity.row + 1)));
    }

    /* The boat. */
    /* On the side of the disc away from its printed chart, so it never hides the roll. */
    var chartBelow = area.aac && area.aac[1] > area.y;
    var sx = area.x * W, sy = area.y * H + (chartBelow ? -95 : 95);
    var marker = el('div', { id: 'sub-marker', class: 'map-chip sub', style: 'left:' + sx + 'px;top:' + sy + 'px;',
                             title: cues.sub.name + ' — ' + area.name }, [
      el('img', { src: cues.sub.art, alt: cues.sub.name }),
      el('div', { class: 'nm', text: cues.sub.name.replace('USS ', '') }),
      el('div', { class: 'chips' }, cues.chips.map(function (ch) { return el('span', { class: ch.k, text: ch.t }); }))
    ]);
    var prev = theater.subAt;
    if (prev && (prev.x !== sx || prev.y !== sy)) {
      /* Slide from where it was, and leave a wake. */
      marker.style.left = prev.x + 'px';
      marker.style.top = prev.y + 'px';
      var trail = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      trail.setAttribute('class', 'wake');
      trail.setAttribute('width', W); trail.setAttribute('height', H);
      var ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('x1', prev.x); ln.setAttribute('y1', prev.y); ln.setAttribute('x2', sx); ln.setAttribute('y2', sy);
      trail.appendChild(ln);
      world.appendChild(trail);
      setTimeout(function () { if (trail.parentNode) trail.parentNode.removeChild(trail); }, 3200);
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        marker.style.left = sx + 'px'; marker.style.top = sy + 'px';
      }); });
    }
    theater.subAt = { x: sx, y: sy };
    layer.appendChild(marker);

    /* Phase 8: where the fleet is. */
    if (S.fleet) {
      var counts = {};
      Fleet.live(S.fleet).forEach(function (b) {
        var k = b.career.atSea ? (b.smz || b.area) : b.career.base;
        (counts[k] = counts[k] || []).push(b.career.boat.replace('USS ', ''));
      });
      Object.keys(counts).forEach(function (k) {
        var ma = Map_.byId(k);
        if (ma) layer.appendChild(worldChip(ma.x * W - 40, ma.y * H + 60, 'note fleetcount', [el('b', { text: counts[k].length + (counts[k].length === 1 ? ' boat' : ' boats') })],
          counts[k].join(', ')));
      });
    }
    /* Phase 6: this week's ULTRA Areas, the mission zone and the destination. */
    if (isCareer()) {
      var war_ = S.engine.war, c_ = S.engine.career;
      war_.ultra.forEach(function (id) {
        var ua = Map_.byId(id);
        if (ua) layer.appendChild(worldChip(ua.x * W - 60, ua.y * H - 150, 'note ultra', [el('b', { text: 'ULTRA' })], 'ULTRA Area this week: +1 to searches here [7.0]'));
      });
      if (c_.orders && c_.orders.tasked) c_.orders.smz.concat(c_.orders.areas).forEach(function (id) {
        var ma = Map_.byId(id);
        if (ma) layer.appendChild(worldChip(ma.x * W - 60, ma.y * H + 40, 'note warn mission', [el('b', { text: 'MISSION' })], c_.orders.name + ' [5.0]'));
      });
      if (S.engine.pack) {
        var here_ = Map_.byId(S.engine.area);
        if (here_) layer.appendChild(worldChip(here_.x * W - 70, here_.y * H + 110, 'note pack', [el('b', { text: 'WOLFPACK ×' + S.engine.pack.length })],
          S.engine.pack.map(function (m) { return m.name; }).join(', ') + ' [24.0]'));
      }
      if (c_.heading) {
        var ha = Map_.byId(c_.heading.id);
        if (ha) layer.appendChild(worldChip(ha.x * W + 40, ha.y * H - 40, 'note dest', [el('b', { text: c_.heading.kind === 'base' ? 'HOME' : 'DESTINATION' })],
          'Where the boat is heading [15.0]'));
      }
    }

    /* What was found, and how the fight went, beside the boat. */
    var side = [];
    if (cues.activity && cues.activity.level === 'none') side.push(el('div', { class: 'map-chip note', text: 'Nothing found' }));
    if (cues.contact) {
      side.push(el('div', { class: 'map-chip contact' }, [
        el('b', { text: cues.contact.code }), el('span', { text: cues.contact.label || 'Contact' })
      ]));
    }
    if (cues.combat) {
      side.push(el('div', { class: 'map-chip burst' + (cues.combat.sunk ? ' sunk' : '') }, [
        el('b', { text: cues.combat.sunk ? cues.combat.sunk + ' sunk' : 'No sinkings' }),
        el('span', { text: cues.combat.attacks + ' attack' + (cues.combat.attacks === 1 ? '' : 's') })
      ]));
    }
    if (cues.event) side.push(el('div', { class: 'map-chip note warn', text: 'Event: ' + cues.event }));
    if (cues.enemySub) side.push(el('div', { class: 'map-chip contact' }, [
      el('b', { text: 'ENEMY SUB' }), el('span', { text: cues.enemySub.name + (cues.enemySub.how ? ' · ' + cues.enemySub.how : '') +
        (cues.enemySub.res ? ' · ' + cues.enemySub.res : '') })]));
    if (cues.endurance) side.push(el('div', { class: 'map-chip note ' + cues.endurance.k, text: cues.endurance.t }));
    if (side.length) {
      layer.appendChild(el('div', { class: 'map-chip stack', style: 'left:' + (sx + 16) + 'px;top:' + sy + 'px;' }, side));
    }

    /* The camera follows: to the boat when it moves or a week begins, to the
     * chart when the Area Activity die is rolled. Never while the player is
     * dragging, and only with auto-follow on. */
    if (S.view === 'theater' && S.autoView && !theater.drag) {
      var key = cues.activity ? 'aac:' + cues.activity.key : 'sub:' + area.id + ':' + S.mode;
      if (theater.camKey !== key) {
        var moved = cues.activity
          ? focusWorld(area.aac[0] * W, area.aac[1] * H + 40, 0.9, !!theater.camKey)
          : focusWorld(sx, sy - 80, 0.5, !!theater.camKey);
        if (moved) theater.camKey = key;
      }
    }
  }

  function refreshTheaterTokens() {
    if (!theater.built) return;
    renderMapLayer();
    document.querySelectorAll('#theater-world .hotspot[data-area]').forEach(function (h) {
      var id = h.getAttribute('data-area');
      clear(h);
      var t = subTokenIfHere(id);
      if (t) h.appendChild(t);
      h.classList.toggle('selected', id === S.selectedArea);
      /* Legal destinations change every phase, so the highlight is recomputed
       * rather than baked in when the map was first built. */
      var mv = engineAction('move', id) || engineAction('transit', id) || engineAction('sail', id) ||
               engineAction('rtb_to', id) || engineAction('enter_smz', id);
      h.classList.toggle('legal-move', !!mv);
      h.onclick = mv ? function () { doAction(mv); }
                     : function () { var ar = Map_.byId(id); selectArea(ar, h.classList.contains('base') ? 'base' : 'oparea'); };
      if (mv) h.title = mv.label + ' [' + mv.rule + ']';
      if (S.mode === 'patrol' && h.classList.contains('oparea')) hoverCard(h, function () { return areaCard(id); });
      var nxa = lessonNextAction();
      h.classList.toggle('lesson-next', !!(nxa && nxa.area === id));
    });
  }

  /* ---------------- Combat ---------------- */
  function renderCombat() {
    var v = $('#view-combat');
    clear(v);
    var cd = Layout.combatDisplay;
    var wrap = el('div', { class: 'board-wrap' });
    var board = el('div', { class: 'board', style: 'max-width:1100px;' });
    board.appendChild(el('img', { src: cd.image, alt: 'Combat Display' }));

    var b = S.tape.board;
    var place = combatPlacement();

    cd.targetSlots.forEach(function (slot) {
      board.appendChild(targetSlotNode(slot, place.targets[slot.id]));
    });

    cd.tdcSlots.forEach(function (slot) {
      board.appendChild(tdcSlotNode(slot, place.tdcs[slot.id], b));
    });

    /* Submarine boxes. In the placement step they are the click target. */
    cd.subSlots.forEach(function (slot) {
      var col = slot.id.charAt(4);
      var member = b.packSlots ? b.packSlots[slot.id] : null;
      var here = b.subSlot === slot.id || !!member;
      var placeAct = engineAction('place', col) || (slot.id.slice(-1) === '1' ? engineAction('reposition', col) : null);
      var node = el('button', {
        type: 'button',
        class: 'slot ' + (here ? 'filled' : 'empty') + (placeAct ? ' actionable' : ''),
        title: placeAct ? (placeAct.type === 'reposition' ? 'Move to column ' + col + ' for the Re-Attack [14.4]'
                                                         : 'Take a submarine box in column ' + col + ' [14.11]')
                        : 'Submarine box ' + slot.id.replace('Sub_', '') + ' [14.11]',
        style: slotStyle(slot, 12.1, 6.2, cd), 'data-action': placeAct ? placeAct.type : null,
        onclick: placeAct ? function () { doAction(placeAct); } : null
      });
      var nxp = lessonNextAction();
      if (nxp && nxp.type === 'place' && nxp.column === col && slot.id.slice(-1) === '1') node.classList.add('lesson-next');
      if (here) {
        var sc = member ? boatCard(member) : S.mode === 'patrol' ? engineSub() : Tape.submarine;
        node.appendChild(el('img', { class: 'counter-drop', src: sc.art,
                                     alt: sc.name, title: member ? member.name + (member === S.engine.sub ? ' (acting now)' : '') : subTitle() }));
        if (member && member === S.engine.sub) node.classList.add('acting');
        if (member && member !== S.engine.sub) { board.appendChild(node); return; }
        if (S.mode === 'patrol' && S.subResult) {
          node.classList.add('hit-' + S.subResult.kind);
          node.appendChild(resultBadge(S.subResult));
          node.classList.add('has-result');
        }
        if (S.mode === 'patrol') hoverCard(node, subCard);
      }
      board.appendChild(node);
    });

    wrap.appendChild(board);
    v.appendChild(wrap);
  }

  function engineSub() {
    var e = S.engine;
    return { name: e.sub.name, attack: e.sub.attack, defense: e.sub.defense,
             tactical: e.sub.tactical, endurance: e.sub.endurance,
             superSkipper: e.sub.superSkipper,
             art: e.sub.cls ? Units_.art({ art: e.sub.cls }) : e.career ? Units_.art(Units_.boat(e.career.boat)) : '../../Source/images/new_s2.gif' };
  }
  function boatCard(m) {
    return { name: m.name, attack: m.attack, defense: m.defense, tactical: m.tactical, endurance: m.endurance,
             superSkipper: m.superSkipper, art: Units_.art({ art: m.cls || 'gato' }) };
  }

  function subTitle() {
    var s = S.mode === 'patrol' ? engineSub() : Tape.submarine;
    return s.name + ' (' + s.attack + '-' + s.defense + '-' + s.tactical + ')' +
           (s.superSkipper ? ' · ' + s.superSkipper.name + ' +' + s.superSkipper.value : '');
  }

  /* Board-relative slot box, sized as a share of the board image. */
  function slotStyle(slot, wPct, hPct, cd) {
    return 'left:' + pct(slot.x) + ';top:' + pct(slot.y) +
           ';width:' + wPct + '%;height:' + hPct + '%;';
  }

  /* Is there a legal engine action of this type for this counter/column/area?
   * Returns the action so the caller can fire it, or null. This is what makes
   * the board itself the hard lock: a counter is only clickable when the rules
   * allow that click. */
  function engineAction(type, key) {
    if (S.mode !== 'patrol' || !S.engine || S.lesson) return null;   // a lesson drives the board
    return Eng().legalActions(S.engine).filter(function (a) {
      return a.type === type &&
        (a.unit === key || a.column === key || a.area === key || a.base === key || a.smz === key);
    })[0] || null;
  }

  /* Which Combat Display slot each counter occupies. Derived from column order
   * rather than stored, so the target slot and its TDC slot always share an
   * index and the pairing is visible on the board. */
  function combatPlacement() {
    var byCol = countsByColumn(true), targets = {}, tdcs = {};
    ['A', 'B', 'C', 'D'].forEach(function (c) {
      var ts = Layout.slotsInColumn('target', c).slice().sort(function (a, b) { return a.index - b.index; });
      var ds = Layout.slotsInColumn('tdc', c).slice().sort(function (a, b) { return a.index - b.index; });
      byCol[c].forEach(function (u, i) {
        if (ts[i]) targets[ts[i].id] = u;
        if (ds[i]) tdcs[ds[i].id] = u;
      });
    });
    return { targets: targets, tdcs: tdcs };
  }

  function allocationFor(unitId) {
    var list = (S.tape.board.allocations || []);
    return list.filter(function (a) { return a.unit === unitId; })[0] || null;
  }

  function countsByColumn(withWrecks) {
    /* Every counter the tape has drawn, per column: known units first (they
     * carry identity), then anonymous face-down placeholders to make up the
     * cup draw. Anonymous ones are counted, never valued. */
    var b = S.tape.board, out = { A: [], B: [], C: [], D: [] };
    if (!b.cupDraw) return out;
    S.tape.units.forEach(function (u) { if (out[u.column]) out[u.column].push(u); });
    Object.keys(out).forEach(function (c) {
      var want = b.cupDraw[c] || 0;
      var sunkHere = S.tape.board.sunk.length && c ? 0 : 0;
      while (out[c].length < want) out[c].push({ anonymous: true, column: c, revealed: false });
      /* Summaries count what is afloat; only the board draws the wrecks. */
      if (!withWrecks) out[c] = out[c].filter(function (u) { return !u.sunk; });
    });
    return out;
  }

  function targetSlotNode(slot, occupant) {
    var cd = Layout.combatDisplay;
    if (!occupant) {
      return el('button', { type: 'button', class: 'slot empty',
        title: 'Target slot ' + slot.id.replace('TS_', '') + ', column ' + slot.column,
        style: slotStyle(slot, 6.2, 8.2, cd) });
    }
    var id = occupant.id;
    if (occupant.sunk) {
      var wreck = el('button', { type: 'button', class: 'slot filled wreck', style: slotStyle(slot, 6.2, 8.2, cd),
        title: occupant.label + ' — sunk, ' + occupant.tonnage + ',000 tons [14.15D]',
        onclick: function () { openRules('14.15'); } });
      wreck.appendChild(el('img', { src: occupant.art, alt: occupant.label + ' (sunk)' }));
      wreck.appendChild(el('span', { class: 'stamp', text: 'SUNK' }));
      if (S.results[id]) { wreck.appendChild(resultBadge(S.results[id])); wreck.classList.add('has-result'); }
      return wreck;
    }
    var act = id ? (engineAction('lumber', id) || engineAction('gunnery', id) || engineAction('unflip', id) ||
                    engineAction('reveal', id) || engineAction('tdc', id) ||
                    engineAction('target', id) || engineAction('untarget', id)) : null;
    var alloc = id ? allocationFor(id) : null;

    var cls = 'slot filled';
    if (act) cls += ' actionable';
    if (alloc) cls += ' targeted';

    var node = el('button', {
      type: 'button', class: cls, style: slotStyle(slot, 6.2, 8.2, cd), 'data-action': act ? act.type : null,
      onclick: act ? function () { doAction(act); }
                   : function () { if (id) openRules('14.15'); }
    });

    if (occupant.revealed) {
      node.title = occupant.label + ' — defense ' + occupant.defense +
                   ', ASW ' + occupant.asw + ', ' + occupant.tonnage + ',000 tons [2.3B]';
      node.appendChild(el('img', { class: 'counter-flip', src: occupant.art, alt: occupant.label }));
    } else {
      node.title = 'Face down. Counted, never valued — unrevealed units are defense 1 [14.16].';
      node.appendChild(el('img', { class: 'facedown',
        src: occupant.back || '../../Source/images/flag_merchant.gif', alt: 'Face-down Japanese unit' }));
    }
    if (act) node.title = act.label + ' [' + act.rule + ']';
    if (occupant.damaged) node.appendChild(el('span', { class: 'dmg', text: 'DMG' }));
    if (alloc) node.appendChild(el('span', { class: 'pts', text: String(alloc.points) }));
    if (id && S.results[id]) { node.appendChild(resultBadge(S.results[id])); node.classList.add('has-result'); }
    var nx = lessonNextAction();
    if (nx && id && nx.unit === id) node.classList.add('lesson-next');
    if (id && S.mode === 'patrol') hoverCard(node, function () { return shipCard(id, occupant); });
    return node;
  }

  function resultBadge(b) {
    /* Badges are wider than a counter; lift the slot above its neighbours. */
    return el('span', { class: 'result ' + b.kind, title: b.note }, [
      el('b', { text: b.text }), el('i', { text: plain(b.note) })
    ]);
  }

  function tdcSlotNode(slot, occupant, board) {
    var cd = Layout.combatDisplay;
    var tdc = occupant ? (board.tdc[occupant.id] || null) : null;
    var act = occupant && occupant.id ? engineAction('tdc', occupant.id) : null;
    var node = el('button', {
      type: 'button',
      class: 'slot ' + (tdc ? 'filled' : 'empty') + (act ? ' actionable' : ''),
      style: slotStyle(slot, 6.2, 8.2, cd),
      onclick: act ? function () { doAction(act); }
                   : function () { if (tdc) openRules('14.13'); }
    });
    if (act && !tdc) {
      node.title = 'Place a TDC marker on this ship [14.13]';
      return node;
    }
    if (!tdc) { node.title = 'TDC slot ' + slot.id.replace('TDC_', ''); return node; }
    if (tdc.value === null || tdc.value === undefined) {
      node.title = 'TDC marker, face down — placed without examining it [14.13].';
      node.appendChild(el('img', { class: 'counter-drop', src: Units.tdcBackArt, alt: 'Face-down TDC' }));
    } else {
      var key = Units.tdcLabel(tdc.value);
      node.title = 'TDC ' + key + ' [14.13]';
      node.appendChild(el('img', { class: 'counter-flip',
        src: Units.tdcArt(tdc.value), alt: 'TDC ' + key }));
    }
    return node;
  }

  /* ---------------- OpArea ---------------- */
  function renderOpArea() {
    var v = $('#view-oparea');
    clear(v);
    var a = Map_.byId(S.selectedArea) || Map_.opAreas[0];
    var b = S.tape.board;
    var wrap = el('div', { class: 'board-wrap' });

    wrap.appendChild(el('h1', { text: a.name, style: 'margin:0 0 2px;font-size:22px;' }));
    wrap.appendChild(el('div', { class: 'hint',
      text: (a.group ? 'Area Activity Chart column: ' + a.group + ' · ' : '') +
            'Enlarged OpArea view — Operating and Done sections, its AAC, congregating count.' }));

    var grid = el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px;max-width:860px;' });
    ['operating', 'done'].forEach(function (section) {
      var box = el('div', { style: 'border:1px solid var(--line);border-radius:4px;background:var(--ink-2);min-height:170px;padding:10px;' });
      box.appendChild(el('div', { class: 'panel-h', text: section === 'operating' ? 'Operating' : 'Done' }));
      if (b.opArea.id === a.id && b.opArea.section === section) {
        var sc2 = S.mode === 'patrol' ? engineSub() : Tape.submarine;
        box.appendChild(el('img', { src: sc2.art, alt: sc2.name,
          title: subTitle(), style: 'width:130px;image-rendering:auto;' }));
        box.appendChild(el('div', { class: 'hint', style: 'margin-top:6px;', text: subTitle() }));
      } else {
        box.appendChild(el('div', { class: 'hint', text: 'No submarines.' }));
      }
      grid.appendChild(box);
    });
    wrap.appendChild(grid);

    var act = el('div', { style: 'margin-top:18px;max-width:860px;' });
    act.appendChild(el('div', { class: 'panel-h', text: 'This turn' }));
    act.appendChild(kvNode('Activity level', b.activity
      ? Tables.activityById(b.activity).label : 'not yet rolled', 'activity_level'));
    act.appendChild(kvNode('Contact', b.contact || 'not yet rolled',
      b.contact === 'C2' ? 'contact_c2' : b.contact === 'C1' ? 'contact_c1' : 'contact_tf'));
    act.appendChild(kvNode('Cup draw', b.cupDraw
      ? ['A', 'B', 'C', 'D'].map(function (c) { return c + b.cupDraw[c]; }).join(' · ')
      : 'no draw yet', 'cups'));
    act.appendChild(kvNode('Congregating risk', '1 submarine in area — no risk [22.0]'));
    wrap.appendChild(act);

    /* The area's real Area Activity Chart [13.2A], pixel-read from the map. */
    if (Aac && Aac.charts[a.id]) {
      wrap.appendChild(aacTable(a));
    }
    v.appendChild(wrap);
  }

  /* Render an OpArea's printed Area Activity Chart, with the current War
   * Period highlighted. Colours come from the table data, never hardcoded. */
  function aacTable(area) {
    var chart = Aac.charts[area.id];
    var wp = S.tape.status.warPeriod;
    var box = el('div', { style: 'margin-top:18px;max-width:860px;' });
    box.appendChild(el('div', { class: 'panel-h', text: 'Area Activity Chart [13.2]' }));
    var tbl = el('table', { class: 'aac' });
    var head = el('tr', {}, [el('th', { text: '' })]);
    for (var d = 0; d <= 9; d++) head.appendChild(el('th', { text: String(d) }));
    head.appendChild(el('th', { class: 'reds', text: 'red' }));
    tbl.appendChild(head);
    ['W1', 'W2', 'W3', 'W4'].forEach(function (p, r) {
      var tr = el('tr', { class: p === wp ? 'now' : null }, [el('th', { text: p })]);
      chart.grid[r].forEach(function (lvl, d) {
        var meta = Tables.activityById(lvl);
        tr.appendChild(el('td', {
          class: 'cell', title: meta.label + ' — die ' + d,
          style: 'background:' + meta.color + ';'
        }));
      });
      tr.appendChild(el('td', { class: 'reds', text: String(chart.redBoxes[r]),
        title: 'Red boxes added to every counterattack here [14.2A2]' }));
      tbl.appendChild(tr);
    });
    box.appendChild(tbl);
    box.appendChild(el('div', { class: 'hint', style: 'margin-top:6px;',
      text: 'Pixel-read from the printed map. The red column is what [14.2A2] adds ' +
            'to the Japanese counterattack total in this area.' }));
    return box;
  }

  function kvNode(k, v, termId) {
    return el('div', { class: 'kv' }, [
      el('span', { class: 'k', text: k }),
      termId ? termNode(termId, v) : el('span', { class: 'v', text: v })
    ]);
  }

  /* ---------------- Base ---------------- */
  /* Where each box sits on a Base Display panel, as a share of the panel
   * (read off the five panels on the map; they share one layout). */
  var BOX_AT = { repair3: [0.37, 0.47], repair2: [0.60, 0.47], repair1: [0.83, 0.47],
                 ready: [0.17, 0.855], pierside: [0.50, 0.855], broom: [0.83, 0.855] };
  function renderBase() {
    var v = $('#view-base');
    clear(v);
    if (isCareer() && S.engine.career.box && S.engine.career.box !== 'overhaul' && S.selectedBase === S.engine.career.base) return renderCareerBase(v);
    var base = Map_.bases.filter(function (b) { return b.id === S.selectedBase; })[0] || Map_.bases[0];
    var wrap = el('div', { class: 'board-wrap' });

    var picker = el('div', { style: 'display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;' });
    Map_.bases.forEach(function (b) {
      picker.appendChild(el('button', {
        type: 'button', class: 'seg',
        style: 'padding:4px 10px;border:1px solid var(--line);border-radius:4px;background:' +
               (b.id === base.id ? 'var(--accent)' : 'var(--ink-2)') + ';color:' +
               (b.id === base.id ? '#1a1206' : 'var(--text-dim)') + ';',
        text: b.name, onclick: function () { S.selectedBase = b.id; render(); }
      }));
    });
    wrap.appendChild(picker);

    wrap.appendChild(el('h1', { text: base.name, style: 'margin:0 0 2px;font-size:22px;' }));
    wrap.appendChild(el('div', { class: 'hint',
      text: base.major ? 'Major base [21.0]' : 'Submarine tender base [21.2]' }));

    if (base.display) {
      var img = el('img', { src: Map_.image, alt: base.name + ' Base Display',
        style: 'position:absolute;' });
      var r = base.display;
      var vpW = (r[2] - r[0]), vpH = (r[3] - r[1]);
      var frame = el('div', {
        style: 'position:relative;overflow:hidden;margin-top:14px;border:1px solid var(--line);' +
               'border-radius:4px;width:min(900px,100%);aspect-ratio:' + (vpW * Map_.imageSize.w) +
               '/' + (vpH * Map_.imageSize.h) + ';'
      });
      img.style.width = (100 / vpW) + '%';
      img.style.left = (-r[0] / vpW * 100) + '%';
      img.style.top = (-r[1] / vpH * 100) + '%';
      frame.appendChild(img);
      wrap.appendChild(frame);
    }

    var boxes = el('div', { style: 'display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:16px;max-width:900px;' });
    [['Broom Box', '9.0'], ['Pier Side', '9.0'], ['Ready for Sea', '9.0'], ['Repair 3-2-1', '10.0']]
      .forEach(function (p) {
        var box = el('div', { style: 'border:1px solid var(--line);border-radius:4px;background:var(--ink-2);padding:10px;min-height:110px;' });
        box.appendChild(el('div', { class: 'panel-h', text: p[0] }));
        box.appendChild(el('div', { class: 'hint', text: 'Empty — campaign layer is Phase 6 [' + p[1] + '].' }));
        boxes.appendChild(box);
      });
    wrap.appendChild(boxes);
    v.appendChild(wrap);
  }

  function renderCareerBase(v) {
    var e = S.engine, c = e.career, war = e.war;
    var mb = Map_.bases.filter(function (b) { return b.id === c.base; })[0];
    var wrap = el('div', { class: 'board-wrap' });
    wrap.appendChild(el('h1', { text: BaseR.baseName(c.base, war), style: 'margin:0 0 2px;font-size:22px;' }));
    wrap.appendChild(el('div', { class: 'hint', text: c.def.label + ' is in ' + (/^repair/.test(c.box) ? '' : 'the ') + BaseR.boxLabel[c.box] + ' [9.0, 10.0]' }));
    if (mb && mb.display) {
      var r = mb.display, vpW = r[2] - r[0], vpH = r[3] - r[1];
      var frame = el('div', { class: 'base-frame', style: 'position:relative;overflow:hidden;margin-top:14px;border:1px solid var(--line);' +
        'border-radius:4px;width:min(900px,100%);aspect-ratio:' + (vpW * Map_.imageSize.w) + '/' + (vpH * Map_.imageSize.h) + ';' });
      var img = el('img', { src: Map_.image, alt: mb.name + ' Base Display', style: 'position:absolute;width:' + (100 / vpW) + '%;left:' +
        (-r[0] / vpW * 100) + '%;top:' + (-r[1] / vpH * 100) + '%;' });
      frame.appendChild(img);
      var at = BOX_AT[c.box];
      if (at) frame.appendChild(el('img', { id: 'base-boat', class: 'base-boat', src: engineSub().art, alt: c.def.label,
        title: c.def.label + ' — ' + BaseR.boxLabel[c.box], style: 'position:absolute;left:' + (at[0] * 100) + '%;top:' + (at[1] * 100) +
        '%;width:' + (/^repair/.test(c.box) ? 15 : 19) + '%;transform:translate(-50%,-50%);border:3px solid var(--accent);border-radius:4px;box-shadow:0 0 18px var(--accent);' }));
      wrap.appendChild(frame);
    }
    if (!CData.bases[c.base]) {
      /* [21.2] a tender: Broom Box, Ship Side, Ready for Sea; no repair boxes. */
      var tb = el('div', { class: 'tender-boxes' }, ['broom', 'shipside', 'ready'].map(function (k) {
        return el('div', { class: 'tbox' + (c.box === k ? ' here' : '') }, [el('b', { text: BaseR.boxLabel[k] }),
          c.box === k ? el('img', { id: 'base-boat', class: 'base-boat', src: engineSub().art, alt: c.def.label }) : null]);
      }));
      wrap.appendChild(tb);
      wrap.appendChild(el('div', { class: 'hint', text: 'Support capacity ' + War.tenderCapacity(war, c.base) + ' boats [21.22]. A tender fixes only ' +
        'Superficial damage; anything worse must go on to a major base [21.23].' }));
      v.appendChild(wrap);
      return;
    }
    var nums = BaseR.repairNumbers(c.base, war);
    var odds = { broom: 'Readiness ' + c.readiness + ': ' + ((c.readiness + 1) * 10) + '% to be Ready for Sea next week, else Pier Side [9.0]',
                 pierside: 'Ready for Sea next week, no roll [9.0]', ready: 'May sail this week [15.1]',
                 repair3: 'Roll ' + nums[3] + ' or less (' + ((nums[3] + 1) * 10) + '%) to move to Box 2 [10.0]',
                 repair2: 'Roll ' + nums[2] + ' or less (' + ((nums[2] + 1) * 10) + '%) to move to Box 1 [10.0]',
                 repair1: 'Roll ' + nums[1] + ' or less (' + ((nums[1] + 1) * 10) + '%) to reach the Broom Box [10.0]' };
    wrap.appendChild(el('div', { class: 'panel', style: 'max-width:900px;margin-top:12px;' }, [
      el('div', { class: 'panel-h', text: 'This week in port' }), el('div', { class: 'pal-line', text: odds[c.box] || '' }),
      el('div', { class: 'hint', text: 'Repair numbers here: Box 3 = ' + nums[3] + ', Box 2 = ' + nums[2] + ', Box 1 = ' + nums[1] +
        '. The Hold Box and the base\'s capacity only bind with a fleet in port; the rest of ComSubPac is off-screen in this build.' })
    ]));
    v.appendChild(wrap);
  }

  /* ---------------- Cups / Tenders / Graveyard ---------------- */
  function renderCups() {
    var v = $('#view-cups');
    clear(v);
    var wrap = el('div', { class: 'board-wrap' });
    var picker = el('div', { style: 'display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;' });
    Layout.cupBoards.forEach(function (c) {
      picker.appendChild(el('button', {
        type: 'button',
        style: 'padding:4px 10px;border:1px solid var(--line);border-radius:4px;background:' +
               (c.id === S.selectedCups ? 'var(--accent)' : 'var(--ink-2)') + ';color:' +
               (c.id === S.selectedCups ? '#1a1206' : 'var(--text-dim)') + ';',
        text: c.label, onclick: function () { S.selectedCups = c.id; render(); }
      }));
    });
    wrap.appendChild(picker);
    var cb = Layout.cupBoards.filter(function (c) { return c.id === S.selectedCups; })[0];
    wrap.appendChild(el('img', { src: cb.image, alt: cb.label,
      style: 'max-width:100%;border:1px solid var(--line);border-radius:4px;' }));
    wrap.appendChild(el('div', { class: 'hint', style: 'margin-top:10px;',
      text: 'War Mix cups A–D plus the TDC and Super Skipper pools [3.1]. Draws are automated but stay visible: ' +
            'the Engagement Table result appears here and as face-down counters on the Combat Display.' }));
    v.appendChild(wrap);
  }

  function renderSimpleBoard(viewId, cfg, note) {
    var v = $(viewId);
    clear(v);
    var wrap = el('div', { class: 'board-wrap' });
    wrap.appendChild(el('img', { src: cfg.image, alt: viewId,
      style: 'max-width:1100px;width:100%;border:1px solid var(--line);border-radius:4px;' }));
    wrap.appendChild(el('div', { class: 'hint', style: 'margin-top:10px;', text: note }));
    v.appendChild(wrap);
  }

  /* ---------------- Roll log ---------------- */
  function renderLog() {
    var v = $('#view-log');
    clear(v);
    var wrap = el('div', { class: 'log-wrap' });

    var filters = el('div', { class: 'log-filters' });
    filters.appendChild(el('span', { class: 'hint', text: 'Filter:' }));

    var phases = ['all'].concat(S.tape.log.map(function (r) { return r.sop; })
      .filter(function (p, i, a) { return a.indexOf(p) === i; }));
    var sel = el('select', { onchange: function (e) { S.logFilter.phase = e.target.value; renderLog(); } });
    phases.forEach(function (p) {
      sel.appendChild(el('option', { value: p, text: p === 'all' ? 'All phases' : 'Phase [' + p + ']',
        selected: S.logFilter.phase === p ? 'selected' : null }));
    });
    filters.appendChild(sel);

    var subs = ['all'].concat(S.tape.log.map(function (r) { return r.submarine; })
      .filter(function (p, i, a) { return a.indexOf(p) === i; }));
    var sel2 = el('select', { onchange: function (e) { S.logFilter.sub = e.target.value; renderLog(); } });
    subs.forEach(function (p) {
      sel2.appendChild(el('option', { value: p, text: p === 'all' ? 'All submarines' : p,
        selected: S.logFilter.sub === p ? 'selected' : null }));
    });
    filters.appendChild(sel2);

    var rows = S.tape.log.filter(function (r) {
      return (S.logFilter.phase === 'all' || r.sop === S.logFilter.phase) &&
             (S.logFilter.sub === 'all' || r.submarine === S.logFilter.sub);
    });
    var filtered = rows.length !== S.tape.log.length;
    filters.appendChild(el('span', { class: 'hint',
      text: filtered ? 'showing ' + rows.length + ' of ' + S.tape.log.length + ' records'
                     : S.tape.log.length + ' record' + (S.tape.log.length === 1 ? '' : 's') }));
    wrap.appendChild(filters);

    var list = el('div', { class: 'log-list' });
    if (!rows.length) {
      list.appendChild(el('div', { class: 'log-empty',
        text: 'Nothing logged yet. Advance the tape and every table lookup lands here.' }));
    }
    rows.slice().reverse().forEach(function (r) {
      var e = el('div', { class: 'log-entry' });
      e.appendChild(el('div', { class: 'head' }, [
        el('span', { class: 'phase', text: '[' + r.sop + ']' }),
        el('span', { class: 'ctx', text: r.context }),
        el('span', { text: r.table }),
        el('span', { style: 'margin-left:auto;', text: r.submarine })
      ]));
      e.appendChild(ledgerNode(r));
      list.appendChild(e);
    });
    wrap.appendChild(list);
    v.appendChild(wrap);
  }

  /* ---------------- ledger + dice ---------------- */
  function ledgerNode(rec) {
    var box = el('div', { class: 'ledger' });
    Res.ledgerLines(rec).forEach(function (line) {
      var row = el('div', { class: 'row ' + line.kind + (line.kind === 'result' &&
        /HIT|SUNK/i.test(line.text) ? ' hit' : '') });
      row.appendChild(el('span', { class: 'lbl', text: line.label }));
      row.appendChild(el('span', { class: 'txt', text: line.text }));
      if (line.rule) {
        row.appendChild(el('span', { class: 'rule', text: '[' + line.rule + ']',
          onclick: function () { openRules(line.rule); } }));
      }
      box.appendChild(row);
    });
    return box;
  }

  /* The only place a die is animated. Resolves when the number settles. */
  function animateDie(node, finalValue, done) {
    var ms = SPEEDS[S.speed].die;
    if (!ms) { node.textContent = finalValue; node.className = 'die settled'; done(); return; }
    node.className = 'die rolling';
    var t0 = Date.now();
    var iv = setInterval(function () {
      node.textContent = tumbleFace();
      if (Date.now() - t0 >= ms) {
        clearInterval(iv);
        node.textContent = finalValue;
        node.className = 'die settled';
        done();
      }
    }, 60);
  }

  /* The guide entry for a phase; a career's Transit phase has its own. */
  function stepFor(sop) {
    if (isCareer() && sop === '15.0') return Guide.steps['15.0c'];
    return Guide.step(sop);
  }

  /* The career's own phases, and the patrol phases a War Event changes. */
  function careerPrompt(e) {
    var c = e.career, acts = Career.legalActions(e);
    function has(t) { return acts.some(function (a) { return a.type === t; }); }
    if (e.pc) {
      var who = e.sub.name;
      if (e.phase === '14.11') return { title: 'Wolfpack: place ' + who + ' [24.5]', detail: 'Click a submarine box for ' + who +
        '. The boats go in one by one; no more than two in a column. Each boat reaches its own column and the ones beside it.' };
      if (e.pc.stage === 'turns' && /^14\.1[2-4]$/.test(e.phase)) {
        var base_ = phasePromptPlain(e);
        return { title: who + '\'s turn [24.53]', detail: 'The boats attack one at a time, each taking its own counterattack. ' +
          'An escort in a neighbouring column counts against this boat only if no other boat is in that column [24.54]. ' + (base_ ? base_.detail : '') };
      }
      if (e.pc.stage === 'decide') return { title: 'Wolfpack: break off or go again? [24.55]', detail: 'The pack may Re-Attack once. ' +
        'Each boat then rolls its Tactical rating (plus any Super Skipper) or less, +2 if damaged, to join in; the others withdraw.' };
    }
    if (e.phase === '13.1' && e.pack) return { title: 'Wolfpack search [24.3]', detail: 'Group: one roll, every boat attacks a contact. ' +
      'Barrier: +2 on the roll, but only the boat that finds the convoy is sure to reach it; each other boat intercepts on 0-5.' };
    if (e.phase === 'base') {
      if (c.box === 'overhaul') return { title: 'Overhaul [8.0C]', detail: 'The boat is refitting on the West Coast. The war goes on; press the button to carry on until it is back at Pearl Harbor [8.0D].' };
      if (c.box === 'ready') {
        return { title: 'Ready for Sea [15.1]', detail: 'Click an OpArea on the map to sail for it: every glowing area is within Range ' + e.sub.range +
          ' of an open base. The boat covers ' + e.sub.speed + ' areas a week on the Transit side. ' +
          (c.patrols.length === 0 ? c.def.skipper + '\'s real patrol went to ' + Career.name(c.def.destination) + '.' : 'Busy water (blue and red on the charts) finds more ships, and bites back.') };
      }
      if (!CData.bases[c.base]) {
        return { title: 'At the tender, ' + BaseR.baseName(c.base, e.war) + ' [21.2]', detail: c.box === 'broom'
          ? 'Broom Box: next week roll Readiness (' + c.readiness + ') or less to be Ready for Sea, else Ship Side [9.0].'
          : 'Ship Side: Ready for Sea next week [9.0].' };
      }
      var nums = BaseR.repairNumbers(c.base, e.war), m = /^repair(\d)$/.exec(c.box);
      return { title: 'In port at ' + Career.name(c.base) + ' [9.0]',
               detail: m ? 'Repair Box ' + m[1] + ': each week roll ' + nums[m[1]] + ' or less to move one box on [10.0].'
                         : c.box === 'broom' ? 'Broom Box: next week roll the boat\'s Readiness (' + c.readiness + ') or less to be Ready for Sea [9.0].'
                         : 'Pier Side: Ready for Sea next week, no roll [9.0].' };
    }
    if (e.phase === '15.0') {
      if (has('rtb_to')) return { title: 'Return to base [15.2]', detail: 'The boat is heading home. Choose the base: the nearest is quickest; Pearl Harbor repairs best (Box numbers 4/6/8).' };
      if (c.heading) return { title: 'Transit [15.0]', detail: 'On the way to ' + Career.name(c.heading.id) + '. Full Speed (' + e.sub.speed +
        ' areas), or Cautious Transit: one area, −1 on the Transit Event check [15.24].' };
    }
    if (e.phase === '12.0' && c.orders && c.orders.tasked) {
      return { title: 'Special Mission orders [5.0]', detail: c.orders.name + ': ' + (c.orders.smz.length ? 'enter ' + c.orders.smz.map(Career.name).join(' or ') +
        ' (the arrowhead shows which area it is entered from; +2 on the Transit Event check [20.3])' : 'be in ' + c.orders.areas.map(Career.name).join(' or ')) + '.' };
    }
    if (e.phase === '13.1' && e.noAttack) return { title: 'No attacks on this mission [5.0]', detail: c.orders.name + ': the boat stays hidden this week.' };
    if (e.phase === '13.1' && e.smz) return { title: 'In the ' + Career.name(e.smz) + ' zone [20.4]', detail: 'Search here reads the ' + Career.name(e.area) +
      ' chart one Activity Level higher' + (e.contactsOnly ? '; only ' + e.contactsOnly.join(' and ') + ' contacts count' : '') + '. No Endurance roll after: the boat is marked RTB [20.5].' };
    return null;
  }

  /* What the game is waiting for, in one line. Without this the player has to
   * infer the current step from which buttons happen to be lit. */
  function phasePrompt() {
    if (S.mode !== 'patrol' || !S.engine) return null;
    var e = S.engine;
    if (e.career) {
      var cp = careerPrompt(e);
      if (cp) return cp;
    }
    return phasePromptPlain(e);
  }
  function phasePromptPlain(e) {
    var v = { sub: e.sub };
    switch (e.phase) {
      case '12.0':
        return { title: 'Patrol Movement [12.0]',
                 detail: 'Click an adjacent OpArea on the Theater map to move there, or remain on station.' };
      case '13.1':
        return { title: 'Activity Determination [13.1]',
                 detail: 'Pick one of the buttons below. Most weeks the answer is Search: it is the only way to find ships. ' +
                         'Bypass is for a damaged or spotted boat that must stay hidden; going home ends your chances to score.' };
      case '14.11':
        return { title: 'First Attack Round [14.11]',
                 detail: 'Click a submarine box to choose the column you attack from.' };
      case '14.12': {
        var left = e.sub.tactical - e.revealedThisRound;
        var canUnflip = Eng().legalActions(e).some(function (a) { return a.type === 'unflip'; });
        if (canUnflip) {
          return { title: 'Reveal: radar [14.12]',
                   detail: 'Radar: you may click the counter you just turned over to put it back face down (once a round). ' +
                           'A face-down escort adds no ASW to your targets\' defence or to the counterattack; you then reveal another counter instead. ' +
                           left + ' reveal' + (left === 1 ? '' : 's') + ' left.' };
        }
        return { title: 'Reveal [14.12]',
                 detail: 'Tactical ' + e.sub.tactical + ' — ' + left + ' reveal' +
                         (left === 1 ? '' : 's') + ' left. Click a face-down counter in column ' +
                         Combat.eligibleColumns({ sub: e.sub }).join(', ') + '.' };
      }
      case '14.13': {
        var tleft = e.sub.tactical - e.tdcPlaced;
        return { title: 'TDC Placement [14.13]',
                 detail: tleft + ' TDC marker' + (tleft === 1 ? '' : 's') +
                         ' left. Click a ship to put one on it — you do not see the value until they are turned over.' };
      }
      case '14.14': {
        var la = Eng().legalActions(e).map(function (a) { return a.type; });
        var evn = e.roundEvent ? e.roundEvent.name : null;
        if (la.indexOf('lumber') > -1) return { title: 'Combat Event: target lumbers into way [19.2]',
          detail: 'Before you fire, one face-down red-ball ship crosses your torpedoes. Click the one you choose: it is revealed and rolled on the Attack Results Table.' };
        if (la.indexOf('gunnery') > -1) return { title: 'Combat Event: surface gunnery [19.2]',
          detail: 'Instead of torpedoes, the boat surfaces and shells a revealed merchant in its own column. Click the ship. The boat will be Spotted, and the escorts counterattack after.' };
        if (la.indexOf('endure') > -1) return { title: 'Combat Event: counterattack [19.2]',
          detail: 'The escorts found you on the approach and hold you down: no attack this round, only their counterattack.' };
        if (la.indexOf('no_attack') > -1) return { title: 'No attack can succeed [14.16]',
          detail: e.round === 1 ? 'No target in reach can be hit even with all your points. The rules spare you: no counterattack this round; then withdraw or try a Re-Attack.'
                                : 'No target in reach can be hit. In a Re-Attack the escorts still counterattack [14.16B].' };
        var used = Patrol.allocatedPoints(e);
        return { title: 'Target Selection [14.14]',
                 detail: 'Attack ' + e.sub.attack + ' — ' + (e.sub.attack - used) +
                         ' point' + (e.sub.attack - used === 1 ? '' : 's') +
                         ' unassigned. Click a TDC-marked ship to target it, then set its points.' };
      }
      case '14.3':
        if (e.round === 2 && e.sub.superSkipper && Eng().legalActions(e).some(function (a) { return a.type === 'reattack'; })) {
          return { title: 'Withdrawal [14.3]', detail: 'Break off, or try a second Re-Attack: it needs your Super Skipper to roll ' +
                   e.sub.superSkipper.value + ' or less [14.41].' };
        }
        return { title: 'Withdrawal [14.3]', detail: e.round >= 2 ? 'Combat ends here [14.42].' : 'Break off, or go round again for a Re-Attack.' };
      case '14.4':
        return { title: 'Re-Attack: reposition [14.4]',
                 detail: 'Before going again the boat may move to an adjacent column: click that column\'s submarine box, or stay. Your old TDC markers went back into the pool; new ones count one better (except a −3).' };
      case '15.0':
        return { title: 'Transit Movement [15.0]',
                 detail: 'Move up to ' + e.sub.speed + ' OpAreas toward base.' };
      case '16.0':
        return { title: 'Conclude Turn [16.0]', detail: 'End the week and start the next.' };
      default:
        return { title: 'Phase [' + e.phase + ']', detail: null };
    }
  }

  /* ---------------- floating palette ----------------
   * Controls on top (#transport: the demo's play buttons, or the patrol's
   * choices), then the week as a checklist with the current phase lit, then
   * what just happened, what is going on, what to do and what comes next.
   * Draggable by its header; position and collapse are remembered. */
  var palette = { drag: null, wired: false };
  function paletteStore(v) {
    try {
      if (v === undefined) return JSON.parse(window.localStorage.getItem('sw.palette') || 'null');
      window.localStorage.setItem('sw.palette', JSON.stringify(v));
    } catch (e) { return null; }
    return null;
  }
  function wirePalette() {
    if (palette.wired) return;
    palette.wired = true;
    var pal = $('#palette'), saved = paletteStore();
    if (saved && typeof saved.x === 'number') { pal.style.left = saved.x + 'px'; pal.style.top = saved.y + 'px'; }
    if (saved && saved.collapsed) pal.classList.add('collapsed');
    $('#pal-head').addEventListener('mousedown', function (e) {
      if (e.target.closest('button')) return;
      var r = pal.getBoundingClientRect(), st = $('#stage').getBoundingClientRect();
      palette.drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, st: st };
      pal.classList.add('dragging');
      e.preventDefault();
    });
    window.addEventListener('mousemove', function (e) {
      if (!palette.drag) return;
      var d = palette.drag, st = d.st;
      var x = Math.max(0, Math.min(st.width - pal.offsetWidth, e.clientX - st.left - d.dx));
      var y = Math.max(0, Math.min(st.height - 40, e.clientY - st.top - d.dy));
      pal.style.left = x + 'px'; pal.style.top = y + 'px';
    });
    window.addEventListener('mouseup', function () {
      if (!palette.drag) return;
      palette.drag = null;
      publishPaletteEdge();
      pal.classList.remove('dragging');
      paletteStore({ x: parseFloat(pal.style.left) || 12, y: parseFloat(pal.style.top) || 12,
                     collapsed: pal.classList.contains('collapsed') });
    });
  }

  /* Boards (Combat Display etc.) make room for the palette when it sits on
   * the left, instead of hiding column A under it. */
  function publishPaletteEdge() {
    var pal = $('#palette'), stage = $('#stage');
    if (!pal || !stage) return;
    var left = pal.offsetLeft, right = left + pal.offsetWidth;
    stage.style.setProperty('--pal-left', (left < stage.clientWidth / 3 ? right + 12 : 0) + 'px');
  }
  function renderPalette() {
    renderPaletteInner();
    if (S.detail === 'beginner') {
      document.querySelectorAll('#pal-guide .pal-line, #pal-guide .sub, #pal-guide .pal-hint, #pal-guide .pal-recap li, #transport .title, #transport button.act span')
        .forEach(function (n) { if (n.children.length === 0) n.textContent = plain(n.textContent); });
    }
  }
  function renderPaletteInner() {
    wirePalette();
    var pal = $('#palette'), head = $('#pal-head'), g = $('#pal-guide');
    setTimeout(publishPaletteEdge, 0);
    clear(head); clear(g);
    if (inFleetOrders()) return fleetPalette(head, g);
    var patrol = S.mode === 'patrol' && S.engine;
    var sop = patrol ? S.engine.phase : (S.lastStep ? S.lastStep.sop : null);
    var week = patrol ? S.engine.turn : S.tape.status.week;

    head.appendChild(el('span', { class: 'grip', text: '⠿', title: 'Drag to move' }));
    var career = patrol && S.engine.career;
    head.appendChild(el('span', { class: 'ttl', text: career ? War.label(S.engine.career.date) + ' · ' + (S.lesson ? 'Lesson' : S.fleet ? S.engine.career.boat.replace('USS ', '') + '\'s fight' : S.engine.patrolGame ? 'Patrol Game' : 'Career')
      : 'Week ' + week + ' · ' + (S.lesson ? 'Lesson' : patrol ? 'Patrol' : 'Demo') }));
    head.appendChild(el('span', { class: 'grow' }));
    head.appendChild(el('button', { type: 'button', class: 'fold',
      text: pal.classList.contains('collapsed') ? 'Guide ▸' : 'Guide ▾',
      title: 'Show or hide the phase guide',
      onclick: function () {
        pal.classList.toggle('collapsed');
        var cur = paletteStore() || {};
        cur.collapsed = pal.classList.contains('collapsed');
        if (typeof cur.x !== 'number') { cur.x = pal.offsetLeft; cur.y = pal.offsetTop; }
        paletteStore(cur);
        renderPalette();
      } }));

    /* The week, as a checklist. */
    var cur = sop ? (career ? Guide.careerWeekIndex(sop) : Guide.weekIndex(sop)) : -1;
    var WEEKLIST = career ? Guide.careerWeek : Guide.week;
    var over = patrol && S.engine.done;
    var weekLog = patrol ? S.engine.log.filter(function (r) { return r.turn === S.engine.turn; }) : S.tape.log;
    var fought = weekLog.some(function (r) { return String(r.table).indexOf('Engagement') === 0; });
    var seen = patrol ? (S.visited[S.engine.turn] || {}) : Tape.steps.slice(0, S.tape.index + 1)
      .reduce(function (m, st) { m[st.sop.split('.')[0] + '.0'] = true; return m; }, {});
    var list = el('ol', { class: 'pal-week' });
    WEEKLIST.forEach(function (ph, i) {
      var state = over ? 'done' : i < cur ? 'done' : i === cur ? 'now' : 'todo';
      if (state === 'done' && ((ph.id === '14.0' && !fought) || (ph.id !== '14.0' && !seen[ph.id] && !(career && (ph.id === '5.0' || ph.id === '9.0'))))) state = 'skip';
      if (career && ph.id === '9.0' && S.engine.career.atSea && state !== 'now') state = 'skip';
      if (career && !S.engine.career.atSea && i > 1 && !over) state = S.engine.phase === '16.0' && i === 6 ? 'now' : 'skip';
      var st = sop ? stepFor(sop) : null;
      list.appendChild(el('li', { class: state }, [
        el('span', { class: 'mk', text: state === 'done' ? '✓' : state === 'now' ? '▶' : state === 'skip' ? '–' : '' }),
        el('span', { class: 'lb', text: ph.label }),
        el('span', { class: 'rl', text: '[' + ph.rule + ']', onclick: function () { openRules(ph.rule); } }),
        state === 'now' && st && st.title !== ph.label
          ? el('div', { class: 'sub', text: st.title + '  [' + sop + ']' }) : null
      ]));
    });
    g.appendChild(list);

    /* Just now / what is happening / you / next. */
    var step = sop ? stepFor(sop) : null;
    var just = [];
    if (patrol) {
      if (S.lastActionLabel) just.push(S.lastActionLabel);
      (S.lastBatch || []).slice(-3).forEach(function (r) { just.push(radioLine(r)); });
      if (!S.lastActionLabel) just.push(career ? 'Career begins: ' + S.engine.career.def.label + ', ' + S.engine.career.def.skipper + ', Ready for Sea at ' +
        Career.name(S.engine.career.base) + '.' : 'New patrol: ' + S.engine.sub.name + ' on station in ' + Map_.byId(S.engine.area).name + '.');
    } else if (S.lastStep && S.lastStep.narrative) {
      just.push(S.lastStep.narrative);
      if (S.lastRecord && S.tape.index >= 0 && Tape.steps[S.tape.index] && Tape.steps[S.tape.index].record) {
        just.push(radioLine(S.lastRecord));
      }
    } else {
      just.push(Tape.subtitle + '. Press ▶ to play it one step at a time.');
    }
    if (over) {
      just.push(career ? S.engine.career.endWhy : S.engine.outcome === 'lost' ? 'The boat was lost.' : 'Patrol complete: back at base.');
      if (!S.lesson && !S.drill) {
        if (S.bcItem === 'patrol') bootcampDone('patrol');
        var rep_ = career ? openCareerReport : openDebrief;
        if (!S.debriefShown && !S.replaying) setTimeout(function () { if (S.engine && S.engine.done && !S.debriefShown) rep_(); }, SPEEDS[S.speed].step || 0);
        g.appendChild(el('div', { class: 'pal-buttons' }, [el('button', { type: 'button', class: 'helm suggest', id: 'open-debrief',
          text: career ? 'Career report' : 'Patrol report', onclick: rep_ })]));
      }
    }
    function section(label, kids, cls) {
      g.appendChild(el('div', { class: 'pal-sec ' + (cls || '') }, [el('div', { class: 'pal-k', text: label })].concat(kids)));
    }
    if (patrol && !S.lesson && !S.drill && Goal) {
      var rec_ = career && S.engine.patrolGame ? S.engine.career.def.record : null, pgLine = null;
      if (rec_) {
        var packGame = !!S.engine.career.def.pack, own_ = S.engine.career.own;
        var sk = packGame ? S.engine.shipsSunk : (own_.shipsSunk || 0), tk = packGame ? S.engine.tonnageSunk : (own_.tonsSunk || 0);
        pgLine = 'Beat ' + S.engine.career.def.skipper + ': ' + rec_.ships + ' ships or ' + Math.round(rec_.tons * 1000).toLocaleString('en-US') +
          ' t (good), both (great), both in under ' + rec_.weeks + ' weeks (legendary) [32.1]. So far: ' + sk + ' ships, ' +
          Math.round(tk * 1000).toLocaleString('en-US') + ' t.';
      }
      if (S.fleet) pgLine = 'You chose to fight this one yourself. When it is over, the week carries on for the rest of the fleet.';
      section('Goal', [el('div', { class: 'pal-line', text: pgLine || (career ? Goal.rateCareer(S.engine).line : Goal.rate(S.engine).line) })], 'goal');
      if (career) {
        var ord = S.engine.career.orders;
        if (ord && ord.tasked && S.engine.career.atSea) section('Orders: ' + ord.name, [el('div', { class: 'pal-line', text: ord.text })], 'orders');
      }
    }
    if (S.firstNow && S.detail === 'beginner') {
      var fd = Guide.firsts.filter(function (f) { return f.id === S.firstNow; })[0];
      if (fd) section('New: ' + fd.t, [el('div', { class: 'pal-line', text: fd.d }),
        el('div', { class: 'pal-buttons' }, [el('button', { type: 'button', class: 'got-it', text: 'Got it', onclick: dismissFirst })])], 'first');
    }
    if (S.drill && !S.drill.done) section(S.drill.def.title, [el('div', { class: 'pal-line', text: S.drill.def.task })], 'drill-task');
    if (S.coachHold) {
      var H = S.coachHold;
      section('Coach: are you sure?', [
        el('div', { class: 'pal-line', text: H.v.say }),
        el('div', { class: 'pal-buttons' }, [
          el('button', { type: 'button', class: 'coach-change', text: 'Let me change it',
            onclick: function () { S.coachHold = null; render(); } }),
          el('button', { type: 'button', class: 'coach-anyway', text: 'Do it anyway',
            onclick: function () { var a = H.action; S.coachHold = null; S.coachBypass = true;
                                   try { doAction(a); } finally { S.coachBypass = false; } } })
        ])], 'coach');
    } else if (S.coachNote && S.coachNote.say && coachOn()) {
      section(S.coachNote.grade === 'good' ? 'Coach: good call' : S.coachNote.grade === 'poor' ? 'Coach' : 'Coach: a thought',
        [el('div', { class: 'pal-line', text: S.coachNote.say })], 'coach-note ' + S.coachNote.grade);
    }
    if (S.drill && S.drill.done) {
      var R = S.drill.result || {}, cap = S.drill.def.captain;
      section('Drill result', [
        el('div', { class: 'pal-line', text: 'You: ' + (R.mine || '—') + (R.v && R.v.grade === 'poor' ? '  (the coach warned against it)' : '') }),
        el('div', { class: 'pal-line', text: 'The captain: ' + plain(cap.why || placeNames(cap.action.label)) }),
        el('div', { class: 'pal-buttons' }, [
          el('button', { type: 'button', text: '↶ Try again', onclick: function () { startDrill(S.drill.def.id); } }),
          el('button', { type: 'button', class: 'helm', text: 'Keep playing this patrol',
            onclick: function () { S.drill = null; if (S.bcItem && S.bcItem.indexOf('drill:') === 0) S.bcItem = null; render(); } })
        ])], 'drill-result');
    }
    if (S.bcItem) {
      var bi = Guide.bootcamp.map(function (b) { return b.id; }).indexOf(S.bcItem);
      var ok = bootcampItemDone();
      if (ok && S.bcItem.indexOf('lesson:') === 0) bootcampDone(S.bcItem);
      var nextItem = ok ? bootcampNextItem() : null;
      section('Boot camp ' + (bi + 1) + ' of ' + Guide.bootcamp.length, [
        el('div', { class: 'pal-line', text: (Guide.bootcamp[bi] || {}).label + (ok ? ': done ✓' : '') }),
        ok ? el('div', { class: 'pal-buttons' }, [el('button', { type: 'button', class: 'helm suggest', id: 'bootcamp-continue',
          text: nextItem ? 'Next: ' + nextItem.label : 'Finish boot camp',
          onclick: function () { bootcampNext(); } })]) : null
      ], 'bootcamp');
    }
    if (S.notice) section('Note', [el('div', { class: 'pal-line', text: S.notice })], 'notice');
    if (S.lesson) {
      var L = S.lesson, st = L.def.steps[L.next];
      if (st) {
        section(L.busy ? 'The captain is acting…' : 'The captain\'s next move', [
          el('div', { class: 'pal-line', text: st.why || placeNames(st.actions[0].label) }),
          el('div', { class: 'pal-hint', text: L.busy ? '' : 'Press ▶ to watch it. It is marked on the board.' })
        ], 'captain');
      } else {
        section('Lesson complete', [el('div', { class: 'pal-line', text: L.def.title + '. You saw:' }),
          el('ul', { class: 'pal-recap' }, (L.def.learn || []).map(function (x) { return el('li', { text: x }); }))], 'captain');
      }
      var row = el('div', { class: 'pal-buttons' }, [
        el('button', { type: 'button', class: 'helm' + (L.next === L.def.tryAt ? ' suggest' : ''), text: 'Take the helm',
          title: 'Play on from exactly this moment yourself', disabled: L.busy || S.engine.done ? 'disabled' : null, onclick: takeHelm }),
        el('button', { type: 'button', text: 'All lessons', onclick: openLessons })
      ]);
      if (L.next === L.def.tryAt && !L.busy) {
        section('Your turn?', [el('div', { class: 'pal-line', text: 'This is the decision the lesson is about. Take the helm and make it yourself, or press ▶ to see what the captain does.' }), row], 'you');
      } else {
        g.appendChild(row);
      }
    }
    section('Just now', just.map(function (t) { return el('div', { class: 'pal-line', text: t }); }), 'just');
    if (patrol && !S.lesson) {
      var tried = S.tries[S.dice.seed + ':' + S.played.length];
      if (tried) {
        section('Last time', [el('div', { class: 'pal-line', text: 'You chose "' + tried.choice + '": ' + tried.outcome + '.' })], 'tried');
      }
      var pts = whatIfPoints();
      if (pts.length && !S.autoTimer && S.engine.phase !== '14.11') {
        section('What if?', [
          el('div', { class: 'pal-hint', text: 'Rewind the fight and choose differently. Your current result is remembered for comparison.' }),
          el('div', { class: 'pal-buttons' }, pts.map(function (pt) {
            return el('button', { type: 'button', class: 'whatif', text: '↶ ' + pt.label,
                                  onclick: function () { rewindTo(pt.n, 'whatif'); } });
          }))
        ], 'whatif');
      }
    }
    if (S.pendingView === 'combat') {
      section('Contact!', [el('div', { class: 'pal-line', text: 'Ships found. Opening the Combat Display…' })], 'alert');
    }
    if (step && !over) {
      section(step.title, [el('div', { class: 'pal-line', text: step.what })], 'what');

      var prompt = patrol ? phasePrompt() : null;
      var you = patrol ? ((prompt && prompt.detail) || step.you) : null;
      if (patrol && Eng().legalActions(S.engine).length === 1) you = 'Nothing to decide here: the game carries on by itself.';
      var choices = patrol && !S.lesson ? choiceButtons() : null;
      if ((you || choices) && !S.lesson) section('Your move', [you ? el('div', { class: 'pal-line', text: you }) : null, choices], 'you');
      var next = step.next;
      if (!patrol) {
        var ni = S.tape.index + 1, ns = Tape.steps[ni];
        next = ns ? 'Step ' + (ni + 1) + ': ' + ns.title + '.' : 'End of the example.';
      }
      if (next) section('Next', [el('div', { class: 'pal-line', text: next })], 'next');
    }
  }

  /* ---------------- side panel ---------------- */
  function renderSide() {
    var side = $('#side');
    clear(side);
    var b = S.tape.board;

    /* What the game wants and why now lives in the floating palette
     * (renderPalette); the side panel keeps the working detail. */
    var allocPanel = renderAllocation();
    if (allocPanel) side.appendChild(allocPanel);
    if (isCareer()) side.appendChild(warPanel());

    /* Current step (demo tape): only its rulebook badges; the narrative is in the palette. */
    if (S.mode !== 'patrol' && S.lastStep && (S.lastStep.constructed || S.lastStep.errata)) {
      var p = el('div', { class: 'panel' });
      p.appendChild(el('div', { class: 'panel-h', text: 'Step [' + S.lastStep.sop + '] ' + S.lastStep.title }));
      var narr = el('div', { class: 'narrative' });
      if (S.lastStep.constructed) {
        narr.appendChild(el('div', { style: 'margin-top:6px;' },
          [el('span', { class: 'badge constructed', text: 'constructed step' })]));
      }
      if (S.lastStep.errata) {
        narr.appendChild(el('div', { class: 'errata', text: 'Rulebook note: ' + S.lastStep.errata }));
      }
      p.appendChild(narr);
      side.appendChild(p);
    }

    /* Die + ledger. In patrol mode every record the last action produced is
     * shown, oldest first, so a fire step reads attack -> ART -> counterattack. */
    var batch = (S.mode === 'patrol' && S.lastBatch && S.lastBatch.length)
      ? S.lastBatch : (S.lastRecord ? [S.lastRecord] : []);
    if (batch.length) {
      var d = el('div', { class: 'panel' });
      d.appendChild(el('div', { class: 'panel-h',
        text: batch.length > 1 ? 'Resolution — ' + batch.length + ' rolls' : 'Resolution' }));
      batch.forEach(function (rec, i) {
        var box = el('div', { id: i === batch.length - 1 ? 'dicebox' : null,
                              class: 'dicebox' + (i ? ' stacked' : '') });
        box.appendChild(el('div', {
          class: 'die', id: i === batch.length - 1 ? 'the-die' : null,
          text: rec.die === null ? '–' : String(rec.die) }));
        var col = el('div', { style: 'flex:1;min-width:0;' });
        /* Beginner view: one plain line per roll; the full sum on request. */
        if (S.detail === 'beginner' && !S.showMaths && S.mode === 'patrol') {
          col.appendChild(el('div', { class: 'rec-plain', text: radioLine(rec) }));
        } else {
          if (batch.length > 1) col.appendChild(el('div', { class: 'rec-ctx', text: rec.context }));
          col.appendChild(ledgerNode(rec));
        }
        box.appendChild(col);
        d.appendChild(box);
      });
      if (S.detail === 'beginner' && S.mode === 'patrol') {
        d.appendChild(el('button', { type: 'button', class: 'maths-toggle', text: S.showMaths ? 'Hide the maths' : 'Show the maths',
          onclick: function () { S.showMaths = !S.showMaths; renderSide(); } }));
      }
      side.appendChild(d);
    }

    if (S.mode === 'patrol' && S.engine && S.engine.log.length) side.appendChild(radioPanel());

    /* Fog-safe numeric summary — every view carries one. */
    var f = el('div', { class: 'panel' });
    f.appendChild(el('div', { class: 'panel-h', text: 'Contact summary' }));
    if (!b.cupDraw) {
      f.appendChild(el('div', { class: 'hint', text: 'No contact drawn yet.' }));
    } else {
      var placeholders = [];
      var cols = countsByColumn();
      Object.keys(cols).forEach(function (c) { placeholders = placeholders.concat(cols[c]); });
      var sum = Fog.summarize(placeholders);
      f.appendChild(kvNode('Counters on display', String(sum.total)));
      f.appendChild(kvNode('Revealed', String(sum.revealedCount)));
      f.appendChild(kvNode('Face down', String(sum.unrevealedCount)));
      f.appendChild(el('div', { class: 'kv' }, [
        el('span', { class: 'k', text: 'Escort ASW' }),
        el('span', { class: 'v', html: String(sum.revealedAsw) +
          (sum.unrevealedCount ? ' <span class="unrev">(+' + sum.unrevealedCount + ' unrevealed)</span>' : '') })
      ]));
      f.appendChild(kvNode('Tonnage revealed', sum.revealedTonnage + ',000'));
      f.appendChild(el('div', { class: 'hint', style: 'margin-top:6px;',
        text: 'Face-down counters are counted, never valued. Unrevealed units are defense 1 [14.16].' }));

      var grid = el('div', { class: 'col-grid' });
      ['A', 'B', 'C', 'D'].forEach(function (c) {
        var cs = Fog.summarize(cols[c]);
        var here = b.subSlot && b.subSlot.indexOf('_' + c) > -1;
        grid.appendChild(el('div', { class: 'col-cell' + (here ? ' subhere' : '') }, [
          el('div', { class: 'cn', text: c }),
          el('div', { class: 'cv', text: 'ASW ' + cs.revealedAsw }),
          el('div', { class: 'cu', text: cs.revealedCount + '↑ ' + cs.unrevealedCount + '↓' })
        ]));
      });
      f.appendChild(grid);
    }
    side.appendChild(f);

    /* Submarine card. */
    var s = S.mode === 'patrol' ? engineSub() : Tape.submarine;
    var sp = el('div', { class: 'panel' });
    sp.appendChild(el('div', { class: 'panel-h', text: s.name }));
    sp.appendChild(el('img', { src: s.art, alt: s.name, style: 'width:150px;display:block;margin-bottom:8px;' }));
    sp.appendChild(el('div', { class: 'kv' }, [termNode('attack', 'Attack'), el('span', { class: 'v', text: String(s.attack) })]));
    sp.appendChild(el('div', { class: 'kv' }, [termNode('defense', 'Defense'), el('span', { class: 'v', text: String(s.defense) })]));
    sp.appendChild(el('div', { class: 'kv' }, [termNode('tactical', 'Tactical'), el('span', { class: 'v', text: String(s.tactical) })]));
    sp.appendChild(el('div', { class: 'kv' }, [termNode('endurance', 'Endurance'), el('span', { class: 'v', text: s.endurance })]));
    if (s.superSkipper) {
      sp.appendChild(el('div', { class: 'kv' }, [termNode('super_skipper', 'Super skipper'),
        el('span', { class: 'v', text: s.superSkipper.name + ' +' + s.superSkipper.value })]));
    }
    side.appendChild(sp);
  }

  /* Phase 6: the war around the boat, in one panel. */
  function warPanel() {
    var e = S.engine, c = e.career, war = e.war;
    var p = el('div', { class: 'panel war-panel', id: 'war-panel' });
    p.appendChild(el('div', { class: 'panel-h', text: 'The war · ' + War.label(c.date) }));
    p.appendChild(kvNode('War Period', war.warPeriod, 'war_period'));
    p.appendChild(kvNode('Mk-XIV', (war.torpedo > 0 ? '+' : '') + war.torpedo, 'torpedo_value'));
    p.appendChild(kvNode('ULTRA this week', war.ultra.length ? war.ultra.map(Career.name).join(', ') : 'none'));
    if (war.event) p.appendChild(kvNode('War Event', war.event.name));
    if (c.orders) p.appendChild(kvNode('Orders', c.orders.tasked ? c.orders.name : 'none for your boat'));
    p.appendChild(kvNode('Bases open', war.bases.map(function (b) { return BaseR.baseName(b, war); }).join(', ')));
    if (war.tenders.length) p.appendChild(kvNode('Forward bases', war.tenders.map(function (f) { return BaseR.baseName(f, war); }).join(', ')));
    if (e.ijn) p.appendChild(kvNode('Optional rules', 'IJN Expansion Kit [28.0]'));
    var pk = e.pack || c.packPlanned && [c.own].concat(c.packPlanned);
    if (pk) p.appendChild(kvNode(e.pack ? 'Wolfpack at sea' : 'Wolfpack in port', pk.map(function (m) {
      return m.name.replace('USS ', '') + (m.damaged ? ' (dmg)' : '') + ((m.shipsSunk || 0) ? ' ' + m.shipsSunk + '✓' : ''); }).join(', ')));
    if (e.packXp) p.appendChild(kvNode('Wolfpack experience', String(e.packXp) + ' [24.7]'));
    var fleet = war.fleet.ships + war.mine.ships, share = fleet ? Math.round(1000 * war.mine.ships / fleet) / 10 : 0;
    p.appendChild(kvNode('Ships sunk, all boats', fleet + ' (yours ' + war.mine.ships + ', ' + share + '%)'));
    p.appendChild(kvNode('Tons sunk, all boats', Math.round((war.fleet.tons + war.mine.tons) * 1000).toLocaleString('en-US')));
    p.appendChild(kvNode('US subs lost', String(war.fleet.lost + (e.sub.sunk ? 1 : 0))));
    if (c.patrols.length) {
      p.appendChild(el('div', { class: 'panel-h', text: 'Patrols', style: 'margin-top:8px;' }));
      c.patrols.forEach(function (pt) {
        p.appendChild(kvNode('#' + pt.n + ' ' + MONTHS[pt.depart.m].slice(0, 3) + ' ' + pt.depart.y,
          pt.ships + ' ships, ' + Math.round(pt.tons * 1000).toLocaleString('en-US') + ' t, ' + pt.weeks + ' wk' + (pt.outcome === 'overhaul' ? ' (overhaul)' : '')));
      });
    }
    return p;
  }

  /* ---------------- hover cards ----------------
   * The odds before you commit (Ambush v2's "map as an information surface").
   * Every number comes from the engine's own preview functions, which share
   * their terms with the real roll (tools/test_sw_preview.js holds them to it),
   * and every one is fog-safe: face-down ships are defense 1, TDC values only
   * count once turned over, counterattacks only see revealed ASW. */
  function pctOf(x) { return Math.round(x * 100) + '%'; }
  /* Beginner view: rule numbers like [14.15B2] are for rules readers; hide them. */
  function plain(text) {
    if (S.detail !== 'beginner' || text === null || text === undefined) return text;
    return String(text).replace(/\s*\[\d[^\]]*\]/g, '');
  }
  function signed(n) { return (n >= 0 ? '+' : '') + n; }
  function termsText(terms) {
    return terms.map(function (t) { return t.label.toLowerCase() + ' ' + signed(t.value); }).join(', ');
  }
  function hoverCard(node, build) {
    node.removeAttribute('title');
    node.onmouseenter = function () {
      var card = build();
      if (!card) return;
      var hc = $('#hovercard');
      clear(hc);
      hc.appendChild(el('div', { class: 'hc-title', text: plain(card.title) }));
      (card.rows || []).forEach(function (r) {
        hc.appendChild(el('div', { class: 'hc-row' + (r[2] ? ' ' + r[2] : '') }, [
          el('span', { class: 'k', text: r[0] }), el('span', { class: 'v', text: plain(r[1]) })
        ]));
      });
      if (card.note) hc.appendChild(el('div', { class: 'hc-note', text: plain(card.note) }));
      hc.style.display = 'block';
      var rc = node.getBoundingClientRect();
      var left = rc.right + 10, top = rc.top;
      if (left + hc.offsetWidth > window.innerWidth - 8) left = rc.left - hc.offsetWidth - 10;
      if (top + hc.offsetHeight > window.innerHeight - 8) top = window.innerHeight - hc.offsetHeight - 8;
      hc.style.left = Math.max(8, left) + 'px';
      hc.style.top = Math.max(8, top) + 'px';
    };
    node.onmouseleave = function () { $('#hovercard').style.display = 'none'; };
  }
  function hideHoverCard() { var hc = $('#hovercard'); if (hc) hc.style.display = 'none'; }

  function oddsRows(odds) {
    return [['No damage', pctOf(odds.none), 'ok'], ['Spotted', pctOf(odds.spotted)],
            ['Damaged', pctOf(odds.damaged), 'warn'], ['Damaged · RTB', pctOf(odds.damaged_rtb), 'warn'],
            ['Sunk', pctOf(odds.sunk), odds.sunk ? 'bad' : '']];
  }
  function counterRows(pv) {
    var jp = Math.floor(pv.japanese.reduce(function (n, t) { return n + t.value; }, 0) + 0.5);
    var sb = pv.submarine.reduce(function (n, t) { return n + t.value; }, 0);
    var rows = [['Escorts', signed(jp) + ' = ' + termsText(pv.japanese)],
                ['Your boat', signed(sb) + ' = ' + termsText(pv.submarine)],
                ['Table row', signed(pv.row) + (pv.drms.length ? ', die ' + termsText(pv.drms) : '')]];
    return rows.concat(oddsRows(pv.odds));
  }

  function shipCard(id, occupant) {
    var e = S.engine;
    if (!e || ['14.12', '14.13', '14.14'].indexOf(e.phase) === -1) return null;
    var u = Combat.unit(e, id);
    if (!u || u.sunk) return null;
    var title = occupant.revealed ? occupant.label : 'Face-down ship';
    if (e.phase !== '14.14') {
      return { title: title, note: 'Hit odds appear once the TDC markers are turned over [14.14].' };
    }
    var ok = Combat.canTarget(e, id);
    if (!ok.ok) return { title: title, rows: [['Cannot target', ok.why, 'bad']] };
    var alloc = allocationFor(id) || { unit: id, points: 1 };
    var pv = Combat.attackPreview(e, alloc);
    var rows = [
      ['Attack', signed(pv.attack) + ' = ' + termsText(pv.attacker)],
      ['Target', signed(pv.defense) + ' = ' + termsText(pv.defender)],
      ['To hit', pv.need < 0 ? 'impossible (need below 0) [14.16]' : 'roll ≤ ' + pv.need + ' · ' + pctOf(pv.hit),
       pv.hit >= 0.5 ? 'ok' : pv.hit ? '' : 'bad']
    ];
    var spare = e.sub.attack - Patrol.allocatedPoints(e);
    if (pv.need < 0) {
      rows.push(['To have a chance', (-pv.need) + ' more point' + (pv.need === -1 ? '' : 's') +
                 (spare >= -pv.need ? ' (you have ' + spare + ' spare)' : ' — more than you have (' + spare + ' spare)'),
                 spare >= -pv.need ? 'warn' : 'bad']);
    } else if (pv.hit < 1 && spare > 0) {
      rows.push(['Each extra point', '+10% to hit (' + spare + ' spare)']);
    }
    if (pv.art) {
      rows.push(['If hit (ART)', 'sunk ' + pctOf(pv.art.sunk) + ' · damaged ' + pctOf(pv.art.damaged) +
                 ' · dud ' + pctOf(1 - pv.art.sunk - pv.art.damaged)]);
      rows.push(['Chance to sink', pctOf(pv.sinkChance), pv.sinkChance ? 'ok' : 'bad']);
    }
    return { title: title + ' — with ' + alloc.points + ' point' + (alloc.points === 1 ? '' : 's'), rows: rows,
             note: occupant.revealed ? null : 'Face down: defense 1 until revealed, tonnage unknown [14.16].' };
  }

  function subCard() {
    var e = S.engine;
    if (!e || ['14.12', '14.13', '14.14', '14.3'].indexOf(e.phase) === -1) return subCardPlain();
    var re = e.phase === '14.3';
    if (re && !engineAction('reattack')) return subCardPlain();
    var pv = Combat.counterattackPreview(e, re);
    return { title: re ? 'If you Re-Attack, the counterattack' : 'The counterattack after this round, as things stand',
             rows: counterRows(pv),
             note: 'Only revealed escorts count [14.2A]. ' + (re ? 'A Re-Attack adds +1 to the die [14.2C2].'
                                                                : 'More reveals can raise the escorts\' total.') };
  }
  function subCardPlain() {
    return { title: subTitle(), note: S.subResult ? 'Last counterattack: ' + S.subResult.text + ' (' + S.subResult.note + ')' : null };
  }

  function actionCard(a) {
    var e = S.engine;
    if (a.type === 'reattack') return subCard();
    if (a.type === 'withdraw') {
      return { title: 'Withdraw [14.3]', note: 'Break off: no further counterattack. The Endurance check follows [14.7].' };
    }
    if (a.type === 'bypass') {
      return { title: 'Bypass the search [13.1]', note: 'No contact, no combat, nothing sunk this week. It does make this week\'s Endurance roll easier (−1): the boat saves fuel and torpedoes.' };
    }
    if (a.type === 'search') return areaCard(e.area);
    if (a.type === 'fire') {
      var rows = e.allocations.map(function (al) {
        var pv = Combat.attackPreview(e, al), u = Combat.unit(e, al.unit), p = Combat.piece(u);
        var nm = u.revealed ? (p.name || p.type + ' ' + p.tonnage + 't') : 'face-down ship';
        return [nm + ' (' + al.points + ')', pctOf(pv.hit) + ' hit' + (pv.art ? ', ' + pctOf(pv.sinkChance) + ' sink' : '')];
      });
      var ca = Combat.counterattackPreview(e, false);
      rows.push(['Then counterattack', 'sunk ' + pctOf(ca.odds.sunk) + ' · damaged ' +
                 pctOf(ca.odds.damaged + ca.odds.damaged_rtb), ca.odds.sunk ? 'bad' : '']);
      return { title: 'Fire [14.15]', rows: rows };
    }
    return null;
  }

  function areaCard(id) {
    var e = S.engine, a = Map_.byId(id);
    if (!e || !a || !Aac.charts[id]) return null;
    var pv = Search.preview({ area: id, warPeriod: e.warPeriod, spotted: e.sub.spotted,
                              ultra: id === e.area && e.ultra });
    var rows = [['Contact if you search', pctOf(pv.contact), pv.contact >= 0.6 ? 'ok' : '']];
    Tables.activity.forEach(function (lv) {
      if (lv.id !== 'none' && pv.levels[lv.id]) rows.push(['  ' + lv.label, pctOf(pv.levels[lv.id])]);
    });
    rows.push(['Red boxes', pv.redBoxes + ' (added to every counterattack here) [14.2A2]', pv.redBoxes >= 3 ? 'warn' : '']);
    var dist = Move.distanceToNearestBase(id, e.activeBaseAreas);
    rows.push(['From base', dist + ' of range ' + e.sub.range, dist > e.sub.range ? 'bad' : '']);
    var mv = engineAction('move', id) || engineAction('transit', id);
    var note = null;
    if (mv) note = 'Click to ' + placeNames(mv.label.charAt(0).toLowerCase() + mv.label.slice(1)) + ' [' + mv.rule + '].';
    else if (id === e.area) note = 'You are here.';
    else if (e.phase === '12.0' || e.phase === '15.0') {
      note = 'Not now: ' + Move.canMoveTo({ area: e.area, side: e.sub.side, range: e.sub.range, speed: e.sub.speed, rtb: e.sub.rtb },
        id, e.phase === '12.0' ? 'patrol' : 'transit', { activeBaseAreas: e.activeBaseAreas }).why;
    }
    return { title: a.name + ' — ' + e.warPeriod, rows: rows, note: note };
  }

  /* ---------------- radio log ----------------
   * Every roll of the patrol as one line, newest first. Click a line for its
   * full ledger: for a counterattack that is the escorts' reasoning (revealed
   * ASW, red boxes, general ASW against your defense). */
  /* Records name areas by id; the radio speaks in the map's names. */
  function placeNames(text) {
    return String(text).replace(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b|\b[a-z]+\d\b/g, function (id) {
      var a = Map_.byId(id);
      return a ? a.name : id;
    });
  }
  function radioLine(r) {
    var t = placeNames(radioText(r));
    return plain(t);
  }
  function radioText(r) {
    var rolled = r.die === null ? '' : ' — rolled ' + r.die +
      (r.modifiedDie !== null && r.modifiedDie !== r.die ? ' (' + r.modifiedDie + ')' : '');
    if (r.table === 'To-hit [14.15C]') {
      return 'Torpedoes at ' + r.context + ': ' + (r.result === 'HIT' ? 'HIT' : r.result === 'miss' ? 'miss' : r.result) +
             rolled + (r.target !== null && r.target >= 0 ? ', needed ≤' + r.target : '');
    }
    if (r.table === 'Counterattack Table [14.2]' && r.context.indexOf('extra') === -1) {
      var res = typeof r.result === 'string' && SUB_RESULT[r.result] ? SUB_RESULT[r.result].text.toLowerCase() : r.result;
      return 'Escorts counterattack, row ' + (r.target >= 0 ? '+' : '') + r.target + ': ' + res + rolled;
    }
    return r.context + ': ' + (typeof r.result === 'string' ? r.result : JSON.stringify(r.result)) + rolled;
  }
  function radioPanel() {
    var log = S.engine.log, box = el('div', { class: 'panel radio' });
    box.appendChild(el('div', { class: 'panel-h', text: 'Radio — ' + log.length + ' reports' }));
    var list = el('div', { class: 'radio-list' });
    for (var i = log.length - 1; i >= Math.max(0, log.length - 12); i--) {
      (function (idx, r) {
        var tone = /SUNK|sunk/.test(String(r.result)) ? ' bad' : r.result === 'HIT' ? ' good' : '';
        var line = el('div', { class: 'radio-line' + tone + (S.radioOpen[idx] ? ' open' : ''),
          title: 'Click for the full ledger [' + r.ruleRef + ']',
          onclick: function () { S.radioOpen[idx] = !S.radioOpen[idx]; renderSide(); } }, [
          el('span', { class: 'wk', text: 'wk ' + r.turn }),
          el('span', { class: 'tx', text: radioLine(r) })
        ]);
        list.appendChild(line);
        if (S.radioOpen[idx]) list.appendChild(el('div', { class: 'radio-why' }, [ledgerNode(r)]));
      }(i, log[i]));
    }
    box.appendChild(list);
    return box;
  }

  /* ---------------- tooltips ---------------- */
  /* Per-target attack allocation [14.14]. Only rendered while the engine is in
   * target selection and something is targeted. */
  function renderAllocation() {
    if (S.mode !== 'patrol' || !S.engine || S.engine.phase !== '14.14') return null;
    var e = S.engine;
    if (!e.allocations.length) return null;
    var box = el('div', { class: 'panel' });
    var used = Patrol.allocatedPoints(e);
    box.appendChild(el('div', { class: 'panel-h',
      text: 'Attack points — ' + used + ' of ' + e.sub.attack }));
    e.allocations.forEach(function (a) {
      var u = S.tape.units.filter(function (x) { return x.id === a.unit; })[0];
      var row = el('div', { class: 'alloc-row' });
      row.appendChild(el('span', { class: 'nm', text: u ? u.label : a.unit }));
      row.appendChild(el('button', { type: 'button', class: 'step', text: '−',
        disabled: a.points <= 1 ? 'disabled' : null,
        onclick: function () { fire('points', a.unit, -1); } }));
      row.appendChild(el('span', { class: 'pt', text: String(a.points) }));
      row.appendChild(el('button', { type: 'button', class: 'step', text: '+',
        disabled: used >= e.sub.attack ? 'disabled' : null,
        onclick: function () { fire('points', a.unit, 1); } }));
      row.appendChild(el('button', { type: 'button', class: 'drop', text: '×',
        title: 'Drop this target',
        onclick: function () { fire('untarget', a.unit); } }));
      box.appendChild(row);
    });
    return box;
  }

  function fire(type, unitId, delta) {
    var a = Eng().legalActions(S.engine).filter(function (x) {
      return x.type === type && x.unit === unitId &&
             (delta === undefined || x.delta === delta);
    })[0];
    if (a) doAction(a);
  }

  function initTooltip() {
    var tip = $('#tooltip'), hideTimer = null;
    function show(target) {
      var g = Glossary.get(target.getAttribute('data-term'));
      if (!g) return;
      clear(tip);
      tip.appendChild(el('div', { class: 't-term', text: g.term }));
      tip.appendChild(el('div', { text: g.short }));
      tip.appendChild(el('span', { class: 't-rule', text: 'Rule [' + g.ruleRef + '] →',
        onclick: function () { openRules(g.ruleRef); } }));
      var r = target.getBoundingClientRect();
      tip.style.display = 'block';
      var top = r.bottom + 8, left = Math.min(r.left, window.innerWidth - tip.offsetWidth - 12);
      if (top + tip.offsetHeight > window.innerHeight) top = r.top - tip.offsetHeight - 8;
      tip.style.top = top + 'px';
      tip.style.left = Math.max(8, left) + 'px';
    }
    function hide() { tip.style.display = 'none'; }
    document.addEventListener('mouseover', function (e) {
      var t = e.target.closest ? e.target.closest('.term') : null;
      if (t) { clearTimeout(hideTimer); show(t); }
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest && (e.target.closest('.term') || e.target.closest('#tooltip'))) {
        hideTimer = setTimeout(hide, 220);
      }
    });
    tip.addEventListener('mouseover', function () { clearTimeout(hideTimer); });
  }

  /* ---------------- overlays ---------------- */
  function openSheet(title, cite, bodyNode) {
    var ov = $('#overlay');
    clear(ov);
    var sheet = el('div', { class: 'sheet' });
    var head = el('header', {}, [
      el('h2', { text: title }),
      cite ? el('span', { class: 'cite', text: cite }) : null,
      el('span', { class: 'grow' }),
      el('button', { type: 'button', text: 'Close  (Esc)', onclick: closeOverlay })
    ]);
    sheet.appendChild(head);
    var body = el('div', { class: 'body' });
    body.appendChild(bodyNode);
    sheet.appendChild(body);
    ov.appendChild(sheet);
    ov.classList.add('open');
    ov.onclick = function (e) { if (e.target === ov) closeOverlay(); };
  }
  function closeOverlay() { $('#overlay').classList.remove('open'); }

  function openCharts() {
    var g = el('div', { class: 'chart-gallery' });
    Charts.all.forEach(function (c) {
      g.appendChild(el('button', { type: 'button', class: 'chart-card',
        onclick: function () { openChart(c); } }, [
        el('div', { class: 'n', text: c.name }),
        el('div', { class: 'r', text: '[' + c.ruleRef + ']' }),
        el('div', { class: 'h', text: c.holds.join(' · ') })
      ]));
    });
    openSheet('Charts', 'Overlays — glance and dismiss', g);
  }

  function openChart(c) {
    var body = el('div', {}, [
      el('img', { src: c.file, alt: c.name }),
      el('div', { style: 'margin-top:10px;text-align:center;' }, [
        el('button', { type: 'button', class: 'chart-card', style: 'display:inline-block;',
          text: '← All charts', onclick: openCharts })
      ])
    ]);
    openSheet(c.name, 'Rule [' + c.ruleRef + ']', body);
  }

  /* Rules viewer, deep-linked by rule number. RULES.md is already sectioned by
   * rule number, so the anchor is the heading itself. */
  /* [HP] the Historical pace house rule: not in the rulebook, so it explains
   * itself here, with its whole table. */
  function openHouseRule() {
    var P = CData.pace, body = el('div', { class: 'brief house-rule' });
    body.appendChild(el('p', { class: 'lede', text: 'Historical pace is a house rule written for this edition. It is not in the Silent War rulebook, and it is off unless you tick it in the Scenarios menu.' }));
    body.appendChild(el('p', { text: 'Played exactly as printed, the campaigns run harder than the real war early on: boats go home after a week on station, and most losses come from Transit Events. ' +
      'Historical pace adds one modifier by War Period to three rolls, so a campaign played well follows the real war\'s sinkings (JANAC). Negative is better for the submarine.' }));
    body.appendChild(el('table', { class: 'wl-evidence' }, [el('tr', {}, ['War Period', 'Endurance [14.7]', 'Counterattack [14.2]', 'Transit Event check [19.1]'].map(function (h) { return el('th', { text: h }); }))]
      .concat(['W1', 'W2', 'W3', 'W4'].map(function (w) {
        var f = function (v) { return (v > 0 ? '+' : '') + v; };
        return el('tr', {}, [el('td', { text: w }), el('td', { text: f(P[w].end) }), el('td', { text: f(P[w].ca) }), el('td', { text: f(P[w].transit) })]);
      }))));
    body.appendChild(el('p', { class: 'hint', text: 'Every roll it changes shows the modifier as "Historical pace (house rule)", so you always see its effect. ' +
      'Measured on the built-in captain: the full war ends in a Historical Victory in most games; The Rising Sun sinks about as much as 1942 really did. Losses stay higher than history.' }));
    openSheet('Historical pace [HP]', 'a house rule, not in the book', body);
  }
  function openRules(ruleRef) {
    if (ruleRef === 'HP') { openHouseRule(); return; }
    var body = el('div', { class: 'rules-body' });
    openSheet('Rules' + (ruleRef ? ' — [' + ruleRef + ']' : ''), 'RULES.md (rulebook v1.1)', body);

    function paint() {
      clear(body);
      if (S.rulesError) {
        body.appendChild(el('div', { class: 'rules-note', html:
          '<b>Could not load RULES.md.</b><br>' + S.rulesError +
          '<br><br>Opening this page straight off disk blocks the fetch. Serve the project first:<br>' +
          '<code>python3 -m http.server 8000</code> from the project root, then open ' +
          '<code>http://localhost:8000/apps/game/</code>.' }));
        return;
      }
      var section = extractRule(S.rulesText, ruleRef);
      body.appendChild(el('div', { html: mdToHtml(section) }));
    }

    if (S.rulesText || S.rulesError) { paint(); return; }
    body.appendChild(el('div', { class: 'hint', text: 'Loading RULES.md…' }));
    fetch('../../RULES.md')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (txt) { S.rulesText = txt; paint(); })
      .catch(function (e) { S.rulesError = e.message; paint(); });
  }

  /* Pull one rule's section out of RULES.md. Headings look like
   * "## [14.2] Counterattack Round" or "### [13.1] ...". A sub-rule such as
   * 14.15 lives inside its parent's section, so fall back to the parent. */
  function extractRule(md, ref) {
    if (!ref) return md.slice(0, 4000);
    var lines = md.split('\n');
    function findFrom(target) {
      var start = -1, level = 0;
      for (var i = 0; i < lines.length; i++) {
        var m = lines[i].match(/^(#{1,6})\s*\[([^\]]+)\]/);
        if (m && m[2] === target) { start = i; level = m[1].length; break; }
      }
      if (start < 0) return null;
      var out = [lines[start]];
      for (var j = start + 1; j < lines.length; j++) {
        var h = lines[j].match(/^(#{1,6})\s/);
        if (h && h[1].length <= level) break;
        out.push(lines[j]);
      }
      return out.join('\n');
    }
    var direct = findFrom(ref);
    if (direct) return direct;
    /* 14.15 -> 14.1 -> 14.0 */
    var parts = ref.split('.');
    if (parts[1] && parts[1].length > 1) {
      var up = findFrom(parts[0] + '.' + parts[1].slice(0, -1));
      if (up) return up;
    }
    var top = findFrom(parts[0] + '.0');
    return top || ('Rule [' + ref + '] not found in RULES.md.');
  }

  /* Enough Markdown for the rulebook's own subset. */
  function mdToHtml(md) {
    var esc = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var lines = esc.split('\n'), out = [], inTable = false;
    lines.forEach(function (raw) {
      var line = raw;
      var h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) { flushTable(); out.push('<h' + Math.min(6, h[1].length) + '>' + inline(h[2]) + '</h' + Math.min(6, h[1].length) + '>'); return; }
      if (/^\s*\|/.test(line)) {
        if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) return;
        var cells = line.trim().replace(/^\||\|$/g, '').split('|');
        if (!inTable) { out.push('<table>'); inTable = true; }
        out.push('<tr>' + cells.map(function (c) { return '<td>' + inline(c.trim()) + '</td>'; }).join('') + '</tr>');
        return;
      }
      flushTable();
      if (/^&gt;\s?/.test(line)) { out.push('<blockquote>' + inline(line.replace(/^&gt;\s?/, '')) + '</blockquote>'); return; }
      if (/^\s*[-*]\s+/.test(line)) { out.push('<div style="margin-left:14px;">• ' + inline(line.replace(/^\s*[-*]\s+/, '')) + '</div>'); return; }
      if (/^\s*$/.test(line)) { out.push('<div style="height:6px;"></div>'); return; }
      out.push('<p style="margin:4px 0;">' + inline(line) + '</p>');
    });
    flushTable();
    function flushTable() { if (inTable) { out.push('</table>'); inTable = false; } }
    return out.join('\n');
  }
  function inline(s) {
    return s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
            .replace(/\*([^*]+)\*/g, '<i>$1</i>')
            .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  /* ---------------- transport ---------------- */
  /* The hard lock, made visible. Only what sw_patrol.legalActions returns is
   * rendered — there is no disabled-but-present state for an illegal action,
   * because the engine never offers one. */
  function renderLessonControls(t) {
    var L = S.lesson, n = L.def.steps.length, atEnd = L.next >= n;
    t.classList.remove('actions');
    t.appendChild(el('button', { type: 'button', title: 'Back to the start of the lesson', text: '⟲',
      disabled: L.busy || L.next === L.def.start ? 'disabled' : null, onclick: function () { lessonGoto(L.def.start); } }));
    t.appendChild(el('button', { type: 'button', title: 'Step back (replays the patrol to the step before)', text: '◀',
      disabled: L.busy || L.next <= L.def.start ? 'disabled' : null, onclick: function () { lessonGoto(L.next - 1); } }));
    t.appendChild(el('button', { type: 'button', class: 'primary', title: atEnd ? 'Lesson complete' : 'The captain\'s next move',
      text: atEnd ? '■' : '▶', disabled: L.busy || atEnd ? 'disabled' : null, onclick: function () { lessonNext(); } }));
    t.appendChild(el('button', { type: 'button', title: 'Play the rest of the lesson', text: '▶▶',
      disabled: L.busy || atEnd ? 'disabled' : null, onclick: lessonPlayAll }));
    t.appendChild(el('div', { class: 'pos', text: (Math.min(L.next, n) - L.def.start) + ' / ' + (n - L.def.start) }));
    t.appendChild(el('div', { class: 'title', text: L.def.title }));
  }

  function renderActions() {
    var t = $('#transport');
    clear(t);
    if (S.lesson) return renderLessonControls(t);
    if (inFleetOrders()) {
      t.classList.add('actions');
      t.appendChild(el('div', { class: 'title', text: S.fleet.done ? 'The campaign is over.' : 'Orders for the week: see the Fleet board.' }));
      if (S.fleet.done) t.appendChild(el('button', { type: 'button', text: 'Campaign report', onclick: openCampaignReport }));
      return;
    }
    t.classList.add('actions');
    var e = S.engine;
    var acts = Eng().legalActions(e);
    if (S.played.length && !S.autoTimer) {
      t.appendChild(el('button', { type: 'button', class: 'act undo', text: '↶ Undo',
        title: 'Undo your last decision: the patrol is replayed from its seed to just before it',
        onclick: function () { rewindTo(S.played.length - 1, 'undo'); } }));
    }

    t.appendChild(el('div', { class: 'phase-chip',
      text: '[' + e.phase + ']', title: 'Current phase in the Sequence of Play' }));

    if (e.done || !acts.length) {
      t.appendChild(el('div', { class: 'title',
        text: e.career ? 'Career over: ' + e.career.endWhy
            : e.outcome === 'lost' ? 'Submarine lost.'
            : e.outcome === 'returned' ? 'Patrol complete — returned to base.'
            : 'Patrol over.' }));
      t.appendChild(el('button', { type: 'button', text: e.career ? 'New career' : 'New patrol',
        onclick: e.career ? openCareers : startPatrol }));
      return;
    }
    /* Per-counter and per-area actions are taken on the board itself, so the
     * bar carries only the choices that have no natural home there. Otherwise
     * it fills with a dozen identical "Reveal a counter in B" buttons. */
    var ON_BOARD = ['reveal', 'tdc', 'target', 'untarget', 'points', 'place', 'move', 'unflip', 'lumber', 'gunnery', 'reposition', 'sail'];
    var bar = acts.filter(function (a) { return ON_BOARD.indexOf(a.type) === -1; });

    /* One legal action is not a decision: it is taken automatically after a
     * beat (scheduleForced). Say what is happening instead of asking. */
    if (acts.length === 1) {
      t.appendChild(el('div', { class: 'title forced', text: 'Proceeding: ' + placeNames(acts[0].label) + '  [' + acts[0].rule + ']' }));
      return;
    }

    /* The choices themselves sit under "Your move" in the palette, right
     * below the words that explain them (a playtest: the buttons up here and
     * the instructions down there read as two unrelated things). */
    t.appendChild(el('div', { class: 'title',
      text: bar.length ? 'Your move: choose below.' : 'Your move is on the board: see below.' }));
  }

  /* The patrol's choice buttons, for the "Your move" section. The usual
   * choice (what the teaching captain would do) is marked while the coach is
   * on, so a newcomer is never left guessing between equal-looking buttons. */
  var BAR_USUAL = ['search', 'bypass', 'rtb', 'withdraw', 'reattack', 'stay', 'hold', 'end_turn',
                   'rtb_to', 'transit_on', 'enter_smz', 'wait'];
  function choiceButtons() {
    var e = S.engine;
    if (!e || e.done || S.lesson) return null;
    var acts = Eng().legalActions(e);
    if (acts.length < 2) return null;
    var ON_BOARD = ['reveal', 'tdc', 'target', 'untarget', 'points', 'place', 'move', 'unflip', 'lumber', 'gunnery', 'reposition', 'sail'];
    var bar = acts.filter(function (a) { return ON_BOARD.indexOf(a.type) === -1; });
    /* In port the destinations are on the map; one suggested destination
     * is also offered as a button, so a newcomer is never stuck. */
    if (e.career && e.phase === 'base' && acts.some(function (a) { return a.type === 'sail'; })) {
      var sug = null;
      try { sug = teacher().choose(e, acts); } catch (err) { sug = null; }
      if (sug && sug.action && sug.action.type === 'sail') bar.unshift(sug.action);
    }
    if (!bar.length) return null;
    var usual = null;
    if ((coachOn() || (e.career && e.phase === 'base')) && bar.some(function (a) { return BAR_USUAL.indexOf(a.type) > -1 || a.type === 'sail'; })) {
      try { usual = window.SWTeacher.create(window).choose(e, acts).action; } catch (err) { usual = null; }
    }
    return el('div', { class: 'choices' }, bar.map(function (a) {
      var isUsual = usual && usual.type === a.type && usual.area === a.area && usual.base === a.base && !!usual.cautious === !!a.cautious;
      var btn = el('button', {
        type: 'button', class: 'act' + (a.type === 'fire' ? ' primary-act' : '') + (isUsual ? ' usual' : ''),
        title: 'Rule [' + a.rule + ']',
        onclick: function () { doAction(a); }
      }, [el('span', { text: placeNames(a.label) }), isUsual ? el('em', { text: 'usual choice' }) : null]);
      if (a.type === 'reattack' || a.type === 'withdraw' || a.type === 'fire' ||
          a.type === 'search' || a.type === 'bypass') {
        hoverCard(btn, function () { return actionCard(a); });
      }
      return btn;
    }));
  }

  /* A press is asked for a decision, never for an acknowledgement (Ambush v2).
   * When the rules leave exactly one legal action, it is not a decision: the
   * game takes it after a beat long enough to see what just happened. The
   * engine is untouched: the same action is applied, only nobody clicks it. */
  function forcedDelay() {
    var sp = SPEEDS[S.speed];
    if (!sp.step) return 0;
    var rolled = (S.lastBatch || []).some(function (r) { return r.die !== null; });
    var fought = (S.lastBatch || []).some(function (r) { return r.table === 'To-hit [14.15C]'; });
    return sp.step + (rolled ? sp.die : 0) + (fought ? sp.step * 2 : 0);
  }
  function forcedAction() {
    if (S.mode !== 'patrol' || !S.engine || S.engine.done) return null;
    var acts = Eng().legalActions(S.engine);
    return acts.length === 1 ? acts[0] : null;
  }
  function scheduleForced() {
    clearTimeout(S.autoTimer);
    S.autoTimer = null;
    var a = forcedAction();
    if (!a) return;
    var ms = forcedDelay();
    if (!ms) { doAction(a, true); return; }
    S.autoTimer = setTimeout(function () { S.autoTimer = null; doAction(a, true); }, ms);
  }

  /* The lesson's next move, so the board shows what the captain is about to touch. */
  function lessonNextAction() {
    var L = S.lesson;
    if (!L || L.busy || !L.def.steps[L.next]) return null;
    return L.def.steps[L.next].actions[0];
  }

  /* Result badges for the board [14.15]/[14.2], read from the records the
   * action produced and the engine state after it. Nothing is recomputed. */
  var SUB_RESULT = {
    none: { text: 'NO DAMAGE', kind: 'ok' }, spotted: { text: 'SPOTTED', kind: 'warn' },
    damaged: { text: 'DAMAGED', kind: 'bad' }, damaged_rtb: { text: 'DAMAGED · RTB', kind: 'bad' },
    sunk: { text: 'SUNK', kind: 'bad' }
  };
  function markResults(a, batch) {
    if (a.type === 'reattack' || a.type === 'end_turn') { S.results = {}; S.subResult = null; }
    /* Phase 5: a Diligent Escort, Betty bomber or circular runner hurts the boat
     * outside the counterattack; the lumbering / shelled ship gets a badge. */
    batch.forEach(function (r) {
      if (/Diligent Escort row|Event Aircraft row/.test(r.table) || r.context === 'Circular running torpedo') {
        var key = S.engine.sub.sunk ? 'sunk' : (typeof r.result === 'string' && SUB_RESULT[r.result.replace('+', '')] ? r.result.replace('+', '') : null);
        if (r.context === 'Circular running torpedo') key = /SUNK/.test(r.result) ? 'sunk' : 'none';
        if (key) S.subResult = { text: SUB_RESULT[key].text, kind: SUB_RESULT[key].kind, note: r.context + ', rolled ' + r.die };
      }
      if (r.unit && r.table === 'Attack Results Table [14.15D]' && (a.type === 'lumber' || a.type === 'gunnery')) {
        var su = /SUNK/.test(r.result), dm = /damaged/.test(r.result);
        S.results[r.unit] = { kind: su ? 'sunk' : dm ? 'damaged' : 'dud', text: su ? 'SUNK' : dm ? 'DAMAGED' : 'NO EFFECT',
                              note: (a.type === 'lumber' ? 'lumbered into the torpedoes' : 'surface gunnery') + ', ART ' + r.modifiedDie };
      }
    });
    if (a.type !== 'fire' && a.type !== 'no_attack' && a.type !== 'endure' && a.type !== 'gunnery') return;
    if (a.type === 'gunnery' || a.type === 'endure') {
      batch.forEach(function (r) {
        if (r.table === 'Counterattack Table [14.2]' && r.context.indexOf('extra') === -1) {
          var k2 = S.engine.sub.sunk ? 'sunk' : (typeof r.result === 'string' && SUB_RESULT[r.result] ? r.result : null);
          var sr2 = k2 ? SUB_RESULT[k2] : { text: 'NOT ENGAGED', kind: 'ok' };
          S.subResult = { text: sr2.text, kind: sr2.kind, note: 'row ' + (r.target >= 0 ? '+' : '') + r.target + ', rolled ' + r.die };
        }
      });
      return;
    }
    S.results = {};
    S.subResult = null;
    batch.forEach(function (r, i) {
      if (r.table === 'To-hit [14.15C]') {
        var u = S.engine.units.filter(function (x) { return x.uid === r.unit; })[0];
        var art = batch[i + 1] && batch[i + 1].table.indexOf('Attack Results') === 0 ? batch[i + 1] : null;
        var b;
        if (r.result !== 'HIT') {
          b = { kind: 'miss', text: 'MISS', note: r.impossible ? 'could not hit [14.16]'
                : 'rolled ' + r.die + ', needed ' + (r.target < 0 ? '—' : '≤' + r.target) };
        } else if (u && u.sunk) {
          b = { kind: 'sunk', text: 'SUNK', note: 'rolled ' + r.die + ' ≤ ' + r.target + (art ? ' · ART ' + art.modifiedDie : '') };
        } else if (art && /damaged/.test(art.result)) {
          b = { kind: 'damaged', text: 'DAMAGED', note: 'hit, ART ' + art.modifiedDie };
        } else {
          b = { kind: 'dud', text: 'HIT · DUD', note: 'hit, but the Mk-XIV failed (ART ' + (art ? art.modifiedDie : '?') + ')' };
        }
        S.results[r.unit] = b;
      }
      if (r.table === 'Counterattack Table [14.2]' && r.context.indexOf('extra') === -1) {
        var key = S.engine.sub.sunk ? 'sunk' : (typeof r.result === 'string' && SUB_RESULT[r.result] ? r.result : null);
        var sr = key ? SUB_RESULT[key] : { text: 'NOT ENGAGED', kind: 'ok' };
        S.subResult = { text: sr.text, kind: sr.kind,
                        note: 'row ' + (r.target >= 0 ? '+' : '') + r.target + ', rolled ' + r.die +
                              (r.modifiedDie !== r.die ? ' (' + r.modifiedDie + ')' : '') };
      }
    });
  }

  /* Which phases of the week the boat actually went through, so the palette's
   * checklist can show a skipped phase (no contact, no transit) as skipped. */
  function markVisited() {
    if (!S.engine) return;
    var t = S.engine.turn, m = S.engine.phase.split('.')[0] + '.0';
    (S.visited[t] = S.visited[t] || {})[m] = true;
  }

  /* First time a concept shows up, queue its one-line explanation
   * (beginner view only; each is shown once per browser). */
  function firstsSeen() { return jsonStore('sw.firsts', []); }
  function checkFirsts(a, batch, before) {
    if (S.detail !== 'beginner' || S.replaying) return;
    var e = S.engine, hit = [];
    if (batch.some(function (r) { return r.die !== null; })) hit.push('roll');
    if (batch.some(function (r) { return /^Area Activity/.test(r.table); })) hit.push('chart');
    if (e.phase === '14.11') hit.push('facedown');
    if (a.type === 'reveal') hit.push('counter');
    if (e.phase === '14.14') hit.push('tdc');
    if (batch.some(function (r) { return /^Counterattack/.test(r.table); })) hit.push('counterattack');
    if (e.shipsSunk > before.sunk) hit.push('sunk');
    if (batch.some(function (r) { return /^Endurance/.test(r.table); })) hit.push('endurance');
    if (e.sub.rtb && !before.rtb) hit.push('rtb');
    if (batch.some(function (r) { return r.context === 'Combat Event'; })) hit.push('event');
    if (Eng().legalActions(e).some(function (x) { return x.type === 'unflip'; })) hit.push('radar');
    if (batch.some(function (r) { return /Diligent Escort row/.test(r.table); })) hit.push('diligent');
    if (batch.some(function (r) { return r.table === 'Sub vs. Sub [14.6B]'; })) hit.push('subvssub');
    if (e.career) {
      if (batch.some(function (r) { return r.table === 'War Events Table [5.0]'; })) hit.push('warevent');
      if (batch.some(function (r) { return r.table === 'ULTRA Table [7.0]' && r.die !== null; })) hit.push('ultra');
      if (batch.some(function (r) { return r.table === 'Transit Event Table [19.1]'; })) hit.push('transitevent');
      if (e.career.orders && e.career.orders.tasked) hit.push('mission');
      if (batch.some(function (r) { return /Torpedo Improvement/.test(r.table) && /improves/.test(r.result); })) hit.push('torpedo');
      if (batch.some(function (r) { return /War Period Transition/.test(r.table) && /moves into/.test(r.result); })) hit.push('warperiod');
      if (batch.some(function (r) { return /Reinforcements \[8.0C\]/.test(r.table); })) hit.push('overhaul');
      if (!e.career.atSea && e.career.patrols.length) hit.push('port');
      if (e.pack) hit.push('wolfpack');
      if (!e.career.atSea && !CData.bases[e.career.base] && e.career.box !== 'overhaul') hit.push('tender');
      if (batch.some(function (r) { return /Quick Resolution/.test(r.table); })) hit.push('quick');
      if (batch.some(function (r) { return /Loners/.test(r.table) || /LONER/.test(String(r.result)); })) hit.push('loner');
      if (batch.some(function (r) { return /Crash Dive/.test(r.table); })) hit.push('crashdive');
    }
    var seen = firstsSeen();
    var fresh = Guide.firsts.filter(function (f) { return hit.indexOf(f.id) > -1 && seen.indexOf(f.id) === -1; });
    if (fresh.length && !S.firstNow) S.firstNow = fresh[0].id;
  }
  function dismissFirst() {
    var seen = firstsSeen();
    if (S.firstNow && seen.indexOf(S.firstNow) === -1) seen.push(S.firstNow);
    store('sw.firsts', JSON.stringify(seen));
    S.firstNow = null;
    render();
  }

  function teacher() { return S._teacher || (S._teacher = window.SWTeacher.create(window)); }
  function coachOn() { return (S.coach || !!S.drill) && S.mode === 'patrol' && !S.lesson; }

  /* The view the current phase belongs on. A career in port shows its base;
   * a career's own phases (strategic, triple-R, end of week) stay on the map. */
  function wantedView() {
    if (inFleetOrders()) return 'fleet';
    var e = S.engine, ph = e.phase;
    if (e.career) {
      if (ph === 'base') {
        if (e.career.box && e.career.box !== 'overhaul' && Map_.byId(e.career.base)) { S.selectedBase = e.career.base; return 'base'; }
        return 'theater';
      }
      if (ph === '15.0' || ph === '16.0' || /^(5|6|7|8|9|10|11|17)\.0$/.test(ph)) return 'theater';
    }
    return Layout.phaseView[ph.split('.')[0] + '.0'];
  }

  function doAction(a, auto) {
    /* The coach looks at a real decision before it is committed. A clear
     * mistake is held for a second thought; anything else goes through, with
     * a word afterwards. Never during replays, lessons or forced steps. */
    var verdict = null;
    if (!auto && !S.replaying && S.engine && !S.engine.done && coachOn()) {
      verdict = teacher().verdict(S.engine, a);
      if (verdict && verdict.grade === 'poor' && !S.coachBypass) {
        S.coachHold = { action: a, v: verdict };
        render();
        return;
      }
    }
    if (!auto && !S.replaying) { S.coachHold = null; S.coachNote = verdict && verdict.say ? verdict : null; }
    var moment = (!auto && !S.replaying && S.engine) ? momentBefore(a, verdict) : null;
    clearTimeout(S.autoTimer);
    S.autoTimer = null;
    if (S.engine && !S.engine.done) {
      if (auto) S.pacing.auto += 1;
      else {
        S.pacing.presses += 1;
        if (Eng().legalActions(S.engine).length > 1) S.pacing.decisions += 1;
      }
    }
    if (!auto && S.engine && !S.engine.done) S.played.push(JSON.parse(JSON.stringify(a)));
    if (!auto && !S.replaying) S.notice = null;
    var before = S.engine ? S.engine.log.length : 0, fleetBefore = S.fleet ? S.fleet.log.length : 0, engBefore = S.engine, turnBefore = S.fleet ? S.fleet.turn : null;
    var was = S.engine ? { sunk: S.engine.shipsSunk, rtb: S.engine.sub.rtb, damaged: S.engine.sub.damaged } : null;
    markVisited();
    try {
      Eng().apply(S.engine, a, engineDice());
    } catch (err) {
      /* Should be unreachable: the button came from legalActions. Surfacing it
       * rather than swallowing it means a rules bug is visible immediately. */
      S.actionError = err.message;
    }
    syncEngineView();
    markVisited();
    /* One click can resolve several table lookups — firing produces an attack,
     * maybe an ART roll, then the counterattack. Showing only the last one hides
     * whether your own shot hit, which is the thing you most want to see. */
    S.lastBatch = S.fleet && (S.engine !== engBefore || inFleetOrders()) ? S.fleet.log.slice(fleetBefore) : S.engine.log.slice(before);
    markResults(a, S.lastBatch);
    if (!S.replaying && S.lastBatch.some(function (r) { return r.die !== null; }) && !document.body.classList.contains('side-open')) S.sideUnseen = true;
    if (was) checkFirsts(a, S.lastBatch, was);
    if (moment) momentAfter(moment, was);
    if (S.drill && !S.drill.done && !auto && !S.replaying && S.drill.def.types.indexOf(a.type) > -1) {
      S.drill.done = true;
      S.drill.result = { mine: moment ? moment.choice : placeNames(a.label), v: verdict };
      bootcampDone('drill:' + S.drill.def.id);
    }
    S.lastRecord = S.engine.log.length ? S.engine.log[S.engine.log.length - 1] : null;
    S.lastStep = { sop: S.engine.phase, title: a.label, narrative: null };
    S.lastActionLabel = (auto ? '' : S.lesson ? 'Captain: ' : 'You: ') + placeNames(a.label);
    clearTimeout(S.viewTimer);
    S.pendingView = null;
    if (S.autoView) {
      var want = wantedView();
      if (want && want !== S.view) {
        /* Contact is found on the map: let the roll and the convoy marker be
         * seen there before the Combat Display takes over. */
        var beat = SPEEDS[S.speed].step ? SPEEDS[S.speed].step * 2 + SPEEDS[S.speed].die : 0;
        if (want === 'combat' && S.view === 'theater' && beat) {
          S.pendingView = want;
          S.viewTimer = setTimeout(function () {
            S.pendingView = null;
            if (S.view === 'theater') { S.history.push(S.view); S.view = want; render(); }
          }, beat);
        } else { S.history.push(S.view); S.view = want; }
      }
    }
    if (!auto) autosave();
    render();
    if (S.lastRecord && S.lastRecord.die !== null && S.engine.log.length !== before) {
      var die = $('#the-die');
      if (die) animateDie(die, S.lastRecord.die, function () {});
    }
    /* a new week's orders: the standing orders go out first [Phase 9] */
    if (S.fleet && S.fleet.turn !== turnBefore && S.fleet.phase === 'orders' && !S.replaying) applyStanding();
    scheduleForced();
  }

  /* ---------------- replay: the same seed and the same decisions ----------------
   * Rebuilds any earlier moment exactly, because the dice are seeded and the
   * die animation draws nothing from them. Used to step a lesson back, to jump
   * a lesson to where it starts, and for Undo / What if? in a patrol. */
  function replay(seed, decisions) {
    var speed = S.speed, pacing = S.pacing;
    S.keepLesson = true;
    if (S.campaignId) startCampaign(S.campaignId, seed, S.campaignSettings);
    else if (S.careerId) startCareer(S.careerId, seed, S.careerOpts); else startPatrol(seed);
    S.keepLesson = false;
    S.replaying = true;
    S.speed = 'instant';
    try {
      decisions.forEach(function (a) {
        if (S.engine.done) return;
        if (Eng().isLegal(S.engine, a)) doAction(a);
        else throw new Error('replay: decision no longer legal: ' + JSON.stringify(a));
      });
    } finally {
      S.replaying = false;
      S.speed = speed;
    }
    clearTimeout(S.viewTimer); S.pendingView = null;
    S.pacing = pacing;
    S.prevStats = {}; S.flash = {};          // no flashes for values rebuilt, only for new ones
    var want = wantedView();
    if (S.autoView && want) S.view = want;
    theater.camKey = null;
    render();
  }

  /* ---------------- save & resume (Phase 9) ----------------
   * A game is its seed, its settings and the decisions you took: the engine is
   * deterministic, so replaying them rebuilds the game exactly. One autosave
   * per kind (patrol, career or Patrol Game, campaign), kept in this browser;
   * a save can be exported to a file and imported on another machine. */
  var SAVE_KINDS = ['campaign', 'career', 'patrol'];
  var SAVE_NAMES = { campaign: 'Campaign', career: 'Career or Patrol Game', patrol: 'Patrol' };
  function saveKind() { return S.fleet ? 'campaign' : isCareer() ? 'career' : 'patrol'; }
  function saveRecord() {
    if (S.mode !== 'patrol' || !S.engine || S.lesson || S.drill || !S.dice) return null;
    var k = saveKind(), e = S.engine;
    var rec = { app: 'silent-war', v: 1, version: window.SW_VERSION || '', kind: k, seed: S.dice.seed,
                played: S.played.slice(), when: new Date().toISOString() };
    if (k === 'campaign') {
      rec.id = S.campaignId; rec.settings = S.campaignSettings; rec.done = S.fleet.done;
      rec.label = S.fleet.def.title + ' · ' + War.label(S.fleet.date) + ' · ' + Math.round(S.fleet.war.mine.tons * 1000).toLocaleString('en-US') + ' t';
    } else if (k === 'career') {
      rec.id = S.careerId; rec.opts = S.careerOpts; rec.done = e.done;
      rec.label = (e.patrolGame ? 'Patrol Game: ' : '') + e.career.def.label + ' · ' + War.label(e.career.date);
    } else {
      rec.done = e.done; rec.label = e.sub.name + ' · week ' + e.turn + ' · ' + e.shipsSunk + ' ships sunk';
    }
    return rec;
  }
  function autosave() {
    if (S.replaying || !S.played.length) return;
    var r = saveRecord();
    if (r) store('sw.save.' + r.kind, JSON.stringify(r));
  }
  function readSave(kind) { return jsonStore('sw.save.' + kind, null); }
  function validSave(r) {
    return !!(r && r.app === 'silent-war' && SAVE_KINDS.indexOf(r.kind) > -1 && typeof r.seed === 'number' && Array.isArray(r.played) &&
              (r.kind === 'patrol' || (r.kind === 'campaign' ? CData.campaign(r.id) : CData.career(r.id))));
  }
  /* Rebuild a saved game: start it on its seed, then apply each decision,
   * taking the forced steps between them exactly as the page would. Straight
   * to the engine, one render at the end, so a year-long campaign loads fast. */
  function resumeSave(r) {
    if (!validSave(r)) { S.notice = 'That file is not a Silent War save.'; render(); return false; }
    closeOverlay();
    var speed = S.speed;
    S.replaying = true; S.speed = 'instant';
    try {
      if (r.kind === 'campaign') startCampaign(r.id, r.seed, r.settings);
      else if (r.kind === 'career') startCareer(r.id, r.seed, r.opts);
      else startPatrol(r.seed);
      r.played.forEach(function (a, i) {
        var E = Eng(), g = 0;
        while (!E.isLegal(S.engine, a) && g++ < 2000) {
          var acts = E.legalActions(S.engine);
          if (acts.length !== 1 || S.engine.done) throw new Error('decision ' + (i + 1) + ' of ' + r.played.length + ' (' + a.type + ') is no longer legal');
          E.apply(S.engine, acts[0], engineDice());
          E = Eng();
        }
        E.apply(S.engine, a, engineDice());
        S.played.push(a);
      });
      S.notice = 'Resumed: ' + r.label + (r.version && r.version !== window.SW_VERSION ? ' (saved by version ' + r.version + ')' : '') + '.';
    } catch (err) {
      S.notice = 'This save could not be replayed on version ' + window.SW_VERSION + ': ' + err.message + '. It was made by version ' + (r.version || '?') + '.';
      S.replaying = false; S.speed = speed;
      render();
      return false;
    } finally {
      S.replaying = false; S.speed = speed;
    }
    S.lastBatch = null; S.prevStats = {}; S.flash = {};
    S.view = S.fleet && !S.fleet.active ? 'fleet' : (wantedView() || S.view);
    render();
    scheduleForced();
    return true;
  }
  function exportSave(r) {
    var blob = new Blob([JSON.stringify(r, null, 1)], { type: 'application/json' });
    var a = el('a', { href: URL.createObjectURL(blob), download: 'silent-war-' + r.kind + '-' + r.when.slice(0, 10) + '.json' });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function importSave(file) {
    var fr = new FileReader();
    fr.onload = function () {
      var r = null;
      try { r = JSON.parse(fr.result); } catch (e) { r = null; }
      if (validSave(r)) { store('sw.save.' + r.kind, JSON.stringify(r)); resumeSave(r); }
      else { S.notice = 'That file is not a Silent War save.'; closeOverlay(); render(); }
    };
    fr.readAsText(file);
  }
  function openSaves() {
    var body = el('div', { class: 'lesson-list saves' });
    body.appendChild(el('p', { class: 'hint', text: 'Every game saves itself after each decision you take, in this browser. ' +
      'A save is the seed and your decisions, so resuming rebuilds the game exactly, dice and all. Export a save to keep it or move it to another computer.' }));
    var any = false;
    SAVE_KINDS.forEach(function (k) {
      var r = readSave(k);
      if (!validSave(r)) return;
      any = true;
      body.appendChild(el('div', { class: 'lesson-card save-card', 'data-save': k }, [
        el('div', { class: 'lc-body' }, [
          el('div', { class: 'lc-t', text: SAVE_NAMES[k] + (r.done ? ' · finished' : '') }),
          el('div', { class: 'lc-s', text: r.label }),
          el('div', { class: 'lc-s', text: r.played.length + ' decisions · seed ' + r.seed + ' · saved ' + r.when.slice(0, 16).replace('T', ' ') + ' UTC · version ' + (r.version || '?') })
        ]),
        el('div', { class: 'save-btns' }, [
          el('button', { type: 'button', class: 'lc-go', 'data-resume': k, text: r.done ? 'Open' : 'Resume', onclick: function () { resumeSave(r); } }),
          el('button', { type: 'button', class: 'lc-go ghost', 'data-export': k, text: 'Export', onclick: function () { exportSave(r); } }),
          el('button', { type: 'button', class: 'lc-go ghost', 'data-forget': k, text: 'Delete',
            onclick: function () { store('sw.save.' + k, null); openSaves(); } })
        ])
      ]));
    });
    if (!any) body.appendChild(el('p', { class: 'hint', text: 'No saved games yet. Start a patrol, a career or a campaign; it saves itself as you play.' }));
    body.appendChild(el('label', { class: 'import-save' }, [
      el('span', { text: 'Import a save file: ' }),
      el('input', { type: 'file', id: 'import-save', accept: '.json,application/json',
        onchange: function (ev) { if (ev.target.files && ev.target.files[0]) importSave(ev.target.files[0]); } })
    ]));
    openSheet('Saved games', 'Phase 9 · save & resume', body);
  }
  /* ---------------- The Silent War: the history behind the game (Phase 9) ---------------- */
  function openPrimer(id) {
    var P = window.SWPrimer, ch = P.chapter(id);
    var body = el('div', { class: 'primer' });
    body.appendChild(el('nav', { class: 'pr-toc' }, P.chapters.map(function (c, i) {
      return el('button', { type: 'button', 'data-chapter': c.id, 'aria-pressed': String(c.id === ch.id), text: (i + 1) + '. ' + c.title,
        onclick: function () { openPrimer(c.id); } });
    })));
    var art = el('article', { class: 'pr-body' }, [el('h2', { text: ch.title })]);
    ch.paras.forEach(function (t) { art.appendChild(el('p', { text: t })); });
    art.appendChild(el('div', { class: 'pr-game' }, [el('b', { text: 'In the game. ' }), el('span', { text: ch.game })]));
    art.appendChild(el('div', { class: 'pr-src' }, [el('b', { text: 'Sources: ' }), el('span', { text: ch.sources.map(function (k) { return P.sources[k]; }).join('; ') + '.' })]));
    var i = P.chapters.indexOf(ch);
    art.appendChild(el('div', { class: 'pal-buttons' }, [
      i > 0 ? el('button', { type: 'button', class: 'helm', text: '← ' + P.chapters[i - 1].title, onclick: function () { openPrimer(P.chapters[i - 1].id); } }) : null,
      i < P.chapters.length - 1 ? el('button', { type: 'button', class: 'helm suggest', text: P.chapters[i + 1].title + ' →', onclick: function () { openPrimer(P.chapters[i + 1].id); } }) : null
    ].filter(Boolean)));
    body.appendChild(art);
    openSheet('The Silent War', 'the history behind the game · written for this app, after Blair and JANAC', body);
  }

  /* The newest unfinished save, offered on launch. */
  function newestSave() {
    return SAVE_KINDS.map(readSave).filter(function (r) { return validSave(r) && !r.done; })
      .sort(function (a, b) { return a.when < b.when ? 1 : -1; })[0] || null;
  }

  /* ---------------- lessons ---------------- */
  function lessonDef(id) { return Lessons.filter(function (l) { return l.id === id; })[0] || null; }
  function lessonActions(def, upTo) {
    return def.steps.slice(0, upTo).reduce(function (all, st) { return all.concat(st.actions); }, []);
  }
  function startLesson(id) {
    var def = lessonDef(id);
    if (!def) return;
    if (def.tape) { closeOverlay(); useTape(); return; }
    closeOverlay();
    S.drill = null;
    S.lesson = { def: def, next: def.start, busy: false };
    S.careerId = def.career || null;           // Phase 6: a lesson may be a career
    replay(def.seed, lessonActions(def, def.start));
    S.notice = def.start ? 'Fast-forwarded to where this lesson begins (' +
      (def.career ? War.label(S.engine.career.date) : 'week ' + def.steps[def.start].turn) + ').' : null;
    render();
  }
  function lessonGoto(k) {
    var L = S.lesson;
    if (!L || L.busy) return;
    k = Math.max(L.def.start, Math.min(L.def.steps.length, k));
    replay(L.def.seed, lessonActions(L.def, k));
    L.next = k;
    render();
  }
  /* ▶: the captain takes the next step, click by click, with the same beats a
   * player sees; forced steps and view changes happen in between. */
  function lessonNext(then) {
    var L = S.lesson;
    if (!L || L.busy || L.next >= L.def.steps.length) return;
    var queue = L.def.steps[L.next].actions.slice();
    L.busy = true;
    var gap = Math.max(60, SPEEDS[S.speed].step / 2);
    (function pump() {
      if (S.lesson !== L) return;
      if (S.autoTimer || S.viewTimer && S.pendingView) { setTimeout(pump, 90); return; }
      if (!queue.length) {
        L.busy = false; L.next += 1; render();
        if (then) then();
        return;
      }
      var a = queue.shift();
      if (Eng().isLegal(S.engine, a)) doAction(a);
      else { L.busy = false; S.notice = 'This lesson no longer matches the engine (' + a.type + '). Rebuild the lessons.'; render(); return; }
      if (!SPEEDS[S.speed].step) pump(); else setTimeout(pump, gap);
    }());
  }
  function lessonPlayAll() {
    var L = S.lesson;
    if (!L) return;
    (function more() {
      if (S.lesson !== L || L.next >= L.def.steps.length) return;
      lessonNext(function () { setTimeout(more, SPEEDS[S.speed].step); });
    }());
  }
  /* Take the helm: the lesson's patrol becomes yours from this moment. */
  function takeHelm() {
    if (!S.lesson || S.lesson.busy) return;
    S.notice = 'You have the helm: this is your patrol now (seed ' + S.dice.seed + '). Undo and What if? work from here.';
    S.lesson = null;
    render();
  }
  function openLessons() {
    var body = el('div', { class: 'lesson-list' });
    body.appendChild(el('p', { class: 'hint', text: 'Each lesson is a real patrol, played by the rules engine from a fixed seed. ' +
      'Press ▶ to watch the captain\'s next move and read why; ◀ steps back. Take the helm at any point and play on yourself.' }));
    body.appendChild(bootcampPanel());
    Lessons.forEach(function (l, i) {
      var card = el('div', { class: 'lesson-card' }, [
        el('div', { class: 'lc-n', text: String(i) }),
        el('div', { class: 'lc-body' }, [
          el('div', { class: 'lc-t', text: l.title + (l.career ? ' · Career: ' + CData.career(l.career).label : '') }),
          el('div', { class: 'lc-s', text: l.summary }),
          el('ul', {}, (l.learn || []).map(function (x) { return el('li', { text: x }); }))
        ]),
        el('button', { type: 'button', class: 'lc-go', 'data-lesson': l.id, text: l.tape ? 'Watch' : 'Start',
                       onclick: function () { startLesson(l.id); } })
      ]);
      body.appendChild(card);
    });
    openSheet('Learn Silent War', 'lessons', body);
  }

  /* ---------------- rewind: Undo and What if? ---------------- */
  function patrolTotals() {
    var e = S.engine;
    return { sunk: e.shipsSunk, tons: e.tonnageSunk, damaged: e.sub.damaged, rtb: e.sub.rtb, lost: e.sub.sunk };
  }
  function rewindTo(n, why) {
    if (!S.engine || S.lesson || n < 0 || n >= S.played.length + 1) return;
    var seed = S.dice.seed, before = patrolTotals(), choice = describeChoice(n);
    var keep = S.moments.filter(function (m) { return m.n < n; }), drill = S.drill;
    replay(seed, S.played.slice(0, n));
    S.moments = keep;
    if (drill) { S.drill = drill; drill.done = false; drill.result = null; }
    if (why === 'whatif' && choice) {
      var at = patrolTotals(), bits = [];
      var ds = before.sunk - at.sunk;
      bits.push(ds ? ds + ' sunk (' + (before.tons - at.tons) + ',000 t)' : 'nothing sunk');
      if (before.lost) bits.push('the boat was lost');
      else if (before.damaged && !at.damaged) bits.push('the boat was damaged');
      if (before.rtb && !at.rtb && !before.lost) bits.push('sent home (RTB)');
      S.tries[seed + ':' + n] = { choice: choice, outcome: bits.join(', ') };
    }
    S.notice = why === 'undo' ? 'Undone: back to just before "' + choice + '".'
      : 'Rewound. Same seed, so the dice come in the same order; only your choice changes what they land on.';
    render();
  }
  /* The choice at decision n in words: a column, an aim (points per ship, read
   * from the clicks up to the fire), or the action's own label. */
  function describeChoice(n) {
    var P_ = S.played, a = P_[n];
    if (!a) return null;
    if (a.type === 'place') return 'column ' + a.column;
    if (['target', 'points', 'untarget'].indexOf(a.type) > -1) {
      var alloc = {}, order = [];
      for (var i = n; i < P_.length && P_[i].type !== 'fire'; i++) {
        var x = P_[i];
        if (x.type === 'target') { alloc[x.unit] = 1; order.push(x.unit); }
        else if (x.type === 'points') alloc[x.unit] += x.delta;
        else if (x.type === 'untarget') delete alloc[x.unit];
      }
      return order.filter(function (u) { return alloc[u]; }).map(function (u) {
        var unit = Combat.unit(S.engine, u), pc = unit && Combat.piece(unit);
        return alloc[u] + ' on ' + (pc ? (pc.name || pc.type + ' ' + pc.tonnage + ',000 t') : 'a ship');
      }).join(' and ') || placeNames(a.label);
    }
    return placeNames(a.label);
  }

  /* The decisions of the latest fight you can go back to. */
  function whatIfPoints() {
    var P_ = S.played, n = P_.length, place = -1;
    for (var i = n - 1; i >= 0; i--) {
      if (P_[i].type === 'search') break;
      if (P_[i].type === 'place') { place = i; break; }
    }
    if (place < 0) return [];
    var pts = [{ n: place, label: 'Pick another column' }];
    var fire = -1, aim = -1, gamble = -1;
    for (var j = n - 1; j > place; j--) {
      if (gamble < 0 && (P_[j].type === 'reattack' || P_[j].type === 'withdraw')) gamble = j;
      if (fire < 0 && P_[j].type === 'fire') fire = j;
    }
    if (fire > 0) {
      aim = fire;
      while (aim - 1 > place && ['target', 'points', 'untarget'].indexOf(P_[aim - 1].type) > -1) aim--;
      pts.push({ n: aim, label: 'Aim differently' });
    }
    if (gamble > 0) pts.push({ n: gamble, label: P_[gamble].type === 'reattack' ? 'Re-Attack or not, again' : 'Withdraw or not, again' });
    return pts;
  }

  /* ---------------- moments: what the debrief looks back on ---------------- */
  function allocText(state) {
    return state.allocations.map(function (al) {
      var u = Combat.unit(state, al.unit), pc = Combat.piece(u);
      return al.points + ' on ' + (u.revealed ? (pc.name || pc.type + ' ' + pc.tonnage + ',000 t') : 'a face-down ship');
    }).join(' and ');
  }
  function momentBefore(a, v) {
    var e = S.engine, m = { n: S.played.length, week: e.turn, type: a.type, grade: v ? v.grade : null, say: v ? v.say : null };
    if (a.type === 'fire') {
      var best = 0;
      e.allocations.forEach(function (al) { var pv = Combat.attackPreview(e, al); best = Math.max(best, pv.sinkChance || pv.hit * 0.5); });
      m.choice = allocText(e);
      m.odds = best;
      return m;
    }
    if (a.type === 'reattack' || a.type === 'withdraw') {
      m.risk = Combat.counterattackPreview(e, true).odds.sunk;
      m.choice = a.type === 'reattack' ? 'went round again' : 'broke off';
      return m;
    }
    if (a.type === 'place') { m.choice = 'column ' + a.column; return v && v.grade === 'poor' ? m : null; }
    if (a.type === 'bypass' || a.type === 'rtb') { m.choice = placeNames(a.label); return m; }
    if (a.type === 'sail' || a.type === 'enter_smz') { m.choice = placeNames(a.label); return m; }
    return null;
  }
  function momentAfter(m, was) {
    var e = S.engine, bits = [];
    if (e.shipsSunk > was.sunk) bits.push((e.shipsSunk - was.sunk) + ' sunk');
    if (m.type === 'fire' && e.shipsSunk === was.sunk) bits.push(Object.keys(S.results).some(function (k) { return S.results[k].kind === 'damaged'; }) ? 'damage only' : 'no sinking');
    if (e.sub.sunk) bits.push('the boat was lost');
    else if (e.sub.damaged && !was.damaged) bits.push('the boat was damaged');
    if (e.sub.rtb && !was.rtb && !e.sub.sunk) bits.push('sent home');
    m.result = bits.join(', ');
    S.moments.push(m);
  }

  /* ---------------- debrief ---------------- */
  function debriefTip(r) {
    var M = S.moments;
    var weak = M.filter(function (m) { return m.type === 'fire' && m.odds < 0.1; });
    var brave = M.filter(function (m) { return m.type === 'reattack' && m.risk > 0.05; });
    if (r.lost && brave.length) return 'The boat was lost after going round again with a ' + pctOf(brave[brave.length - 1].risk) +
      ' risk of loss. Hover Re-Attack before you commit: above about 5%, breaking off keeps the patrol alive.';
    if (weak.length) return weak.length + ' of your volleys had under a 10% chance to sink anything. Hover each target before you fire: ' +
      'concentrating points on the ship with the best firing solution usually beats spreading them.';
    if (!M.some(function (m) { return m.type === 'fire'; })) return 'No fight this patrol. Endurance ends most patrols in 3 to 5 weeks, so every contact counts: search every week.';
    if (r.final === 'none') return 'Close. Even a good captain sinks nothing in about half of all patrols; the dice are part of it. Try What if? on your aim to see the odds you left.';
    return 'Well sailed. For the next level, look for weeks in busy water (blue and red on the chart) and aim at the biggest ship your markers favour.';
  }
  function openDebrief() {
    var e = S.engine, r = Goal.rate(e);
    S.debriefShown = true;
    var body = el('div', { class: 'debrief' });
    var medal = r.final === 'failed' ? 'failed' : r.final;
    body.appendChild(el('div', { class: 'db-medal ' + medal }, [
      el('div', { class: 'm', text: r.final === 'failed' ? 'FAILED' : r.final === 'none' ? 'NO RATING' : r.final.toUpperCase() }),
      el('div', { class: 't', text: r.line })
    ]));
    body.appendChild(el('div', { class: 'db-stats' }, [
      el('div', {}, [el('b', { text: String(e.turn) }), el('span', { text: e.turn === 1 ? 'week' : 'weeks' })]),
      el('div', {}, [el('b', { text: String(e.shipsSunk) }), el('span', { text: 'ships sunk' })]),
      el('div', {}, [el('b', { text: (e.tonnageSunk * 1000).toLocaleString('en-US') }), el('span', { text: 'tons' })]),
      el('div', {}, [el('b', { text: e.sub.sunk ? 'Lost' : e.sub.damaged ? 'Damaged' : 'Intact' }), el('span', { text: 'the boat' })])
    ]));
    body.appendChild(el('div', { class: 'db-ladder' }, Goal.levels.slice().reverse().map(function (L) {
      return el('div', { class: 'rung' + (r.tons >= L.tons && !r.lost ? ' got' : '') }, [el('b', { text: L.label }), el('span', { text: L.text })]);
    })));
    var key = S.moments.filter(function (m) { return m.grade === 'poor' || /sunk|lost|damaged/.test(m.result || ''); }).slice(-4);
    if (!key.length) key = S.moments.slice(-3);
    if (key.length) {
      body.appendChild(el('h3', { text: 'The moments that decided it' }));
      key.forEach(function (m) {
        var odds = m.type === 'fire' ? ' (best chance ' + pctOf(m.odds) + ')' : m.risk !== undefined ? ' (risk of loss ' + pctOf(m.risk) + ')' : '';
        body.appendChild(el('div', { class: 'db-moment' + (m.grade === 'poor' ? ' poor' : '') }, [
          el('span', { class: 'wk', text: 'Week ' + m.week }),
          el('span', { class: 'tx', text: (m.type === 'fire' ? 'Fired ' : '') + m.choice + odds + (m.result ? ' → ' + m.result : '') +
            (m.grade === 'poor' && m.say ? '. Coach: ' + m.say : '') }),
          el('button', { type: 'button', class: 'whatif', text: '↶ Replay from here',
            onclick: function () { closeOverlay(); rewindTo(m.n, 'whatif'); } })
        ]));
      });
    }
    body.appendChild(el('div', { class: 'db-tip' }, [el('b', { text: 'Tip: ' }), el('span', { text: debriefTip(r) })]));
    body.appendChild(el('div', { class: 'pal-buttons' }, [
      el('button', { type: 'button', class: 'helm suggest', text: 'New patrol', onclick: function () { closeOverlay(); startPatrol(); } }),
      el('button', { type: 'button', text: 'Lessons', onclick: openLessons })
    ]));
    openSheet('Patrol report', 'USS ' + e.sub.name.replace('USS ', '') + ' · seed ' + S.dice.seed, body);
  }

  /* ---------------- the Welcome (Phase 9) ----------------
   * The game introduces itself: the war behind it, what you decide at each
   * level of command and what the dice and the war decide, how it teaches,
   * where to start, and what it is. Content in data/sw_intro.js. */
  var WELCOME_TABS = [['start', 'Play'], ['war', 'The war'], ['agency', 'What you decide'], ['teach', 'How it teaches'], ['about', 'About']];
  function ruleChip(ref) {
    return el('button', { type: 'button', class: 'rchip', text: '[' + ref + ']', title: 'Open the rulebook at [' + ref + ']',
      onclick: function () { openRules(ref); } });
  }
  function openWelcome(tab) {
    store('sw.briefed', '1');
    var I = window.SWIntro, cur = tab || 'war';
    var body = el('div', { class: 'welcome' });
    body.appendChild(el('div', { class: 'wl-head' }, [
      el('div', { class: 'wl-title', text: 'Silent War' }),
      el('div', { class: 'wl-sub', text: 'The US submarine campaign against Imperial Japan, 1941-45 · after the board game by Brien J. Miller (Compass Games)' })
    ]));
    body.appendChild(el('nav', { class: 'wl-tabs' }, WELCOME_TABS.map(function (t) {
      return el('button', { type: 'button', 'data-welcome': t[0], 'aria-pressed': String(t[0] === cur), text: t[1],
        onclick: function () { openWelcome(t[0]); } });
    })));
    var pane = el('div', { class: 'wl-pane' });
    if (cur === 'war') {
      pane.appendChild(el('p', { class: 'lede', text: I.war.lede }));
      pane.appendChild(el('div', { class: 'wl-grid' }, I.war.points.map(function (x) {
        return el('div', { class: 'wl-card' }, [el('b', { text: x.t }), el('p', { text: x.d })]);
      })));
      pane.appendChild(el('p', { class: 'hint', text: I.war.more }));
      pane.appendChild(el('div', { class: 'pal-buttons' }, [
        el('button', { type: 'button', class: 'helm', text: 'Read the History', onclick: function () { openPrimer('war'); } }),
        el('button', { type: 'button', class: 'helm suggest', text: 'What you decide →', onclick: function () { openWelcome('agency'); } })
      ]));
    }
    if (cur === 'agency') {
      pane.appendChild(el('p', { class: 'lede', text: 'You play at three levels of command. Each one adds decisions to the one below it.' }));
      I.commands.forEach(function (c) {
        pane.appendChild(el('div', { class: 'wl-command', 'data-command': c.id }, [
          el('div', { class: 'wc-head' }, [el('b', { text: c.title }), el('span', { text: c.scale }), el('em', { text: c.where })]),
          el('div', { class: 'wc-cols' }, [
            el('div', {}, [el('div', { class: 'wc-lbl you', text: 'You decide' })].concat(c.you.map(function (x) {
              return el('div', { class: 'wc-row' }, [el('span', { text: x[0] }), ruleChip(x[1])]); }))),
            el('div', {}, [el('div', { class: 'wc-lbl dice', text: c.id === 'captain' ? 'The dice decide' : 'The war decides' })].concat(c.dice.map(function (x) {
              return el('div', { class: 'wc-row' }, [el('span', { text: x[0] }), ruleChip(x[1])]); })))
          ])
        ]));
      });
      pane.appendChild(el('h3', { text: 'Why you do not control more' }));
      pane.appendChild(el('p', { class: 'wl-why', text: I.why }));
      pane.appendChild(el('h3', { text: 'How a good captain thinks' }));
      pane.appendChild(el('p', { class: 'hint', text: 'The coach and the built-in captain reason like this. You are free to disagree.' }));
      pane.appendChild(el('div', { class: 'wl-grid' }, I.thinking.map(function (x) {
        return el('div', { class: 'wl-card' }, [el('div', { class: 'wl-card-t' }, [el('b', { text: x.t }), ruleChip(x.rule)]), el('p', { text: x.d })]);
      })));
      pane.appendChild(el('div', { class: 'pal-buttons' }, [
        el('button', { type: 'button', class: 'helm suggest', text: 'How it teaches →', onclick: function () { openWelcome('teach'); } })]));
    }
    if (cur === 'teach') {
      pane.appendChild(el('p', { class: 'lede', text: 'Silent War is a study game: it is built to be understood, not only played.' }));
      pane.appendChild(el('div', { class: 'wl-grid' }, I.teaching.map(function (x) {
        return el('div', { class: 'wl-card' }, [el('b', { text: x.t }), el('p', { text: x.d })]);
      })));
      pane.appendChild(el('div', { class: 'pal-buttons' }, [
        el('button', { type: 'button', class: 'helm suggest', text: 'Play →', onclick: function () { openWelcome('start'); } })]));
    }
    if (cur === 'start') {
      var sv = newestSave(), done = bootcampProgress();
      var starts = [];
      if (sv) starts.push(['resume', 'Resume', sv.label, function () { resumeSave(sv); }]);
      starts.push(['bootcamp', done.length > 1 ? 'Continue boot camp' : 'Boot camp', 'New to the game: your first patrol\'s orders, then guided steps. About 10 minutes.',
        function () { openBriefing(); }]);
      starts.push(['lessons', 'Lessons', 'Fifteen short lessons on fixed dice, from the rulebook\'s worked example to wolfpacks and forward bases.', openLessons]);
      starts.push(['patrol', 'A patrol', 'Captain: USS Spearfish, March 1943, one patrol from start to finish.', function () { closeOverlay(); startPatrol(); }]);
      starts.push(['career', 'A career', 'Skipper: a historical boat over several patrols, the war moving around you.', openCareers]);
      starts.push(['scenarios', 'Scenarios', 'The book\'s ten Patrol Games, and ComSubPac in six Campaign Games from 1932 to 1945.', openScenarios]);
      starts.push(['saves', 'Saved games', 'Resume, export or import a game. Every game saves itself as you play.', openSaves]);
      starts.push(['history', 'History', 'Six short chapters on the real war behind the game.', function () { openPrimer(); }]);
      pane.appendChild(el('div', { class: 'wl-starts' }, starts.map(function (x) {
        return el('button', { type: 'button', class: 'wl-start' + (x[0] === 'resume' || (!sv && x[0] === 'bootcamp') ? ' first' : ''), 'data-start': x[0],
          onclick: x[3] }, [el('b', { text: x[1] }), el('span', { text: x[2] })]);
      })));
    }
    if (cur === 'about') {
      pane.appendChild(el('p', { text: I.about.game }));
      pane.appendChild(el('p', { text: I.about.what }));
      pane.appendChild(el('table', { class: 'wl-evidence' }, I.about.evidence.map(function (r) {
        return el('tr', {}, [el('td', { text: r[0] }), el('td', { text: r[1] }), el('td', { class: 'n', text: r[2] })]);
      })));
      pane.appendChild(el('p', { class: 'hint', text: I.about.sources }));
      pane.appendChild(el('p', { class: 'hint', text: I.about.rights + ' Version ' + (window.SW_VERSION || '') + '.' }));
      pane.appendChild(el('div', { class: 'pal-buttons' }, [
        el('button', { type: 'button', class: 'helm', text: 'Show the title screen', onclick: openTitle })]));
    }
    body.appendChild(pane);
    openSheet('Main menu', 'the Menu button, top left, always brings you back here', body);
  }

  /* ---------------- the title screen ----------------
   * Shown in front of the Welcome on every launch: the original publisher's
   * credit and the private-use notice. Any key or the button dismisses it. */
  function openTitle() {
    var T = window.SWIntro.title, old = document.getElementById('titlescreen');
    if (old) old.remove();
    function close() {
      document.removeEventListener('keydown', onKey, true);
      node.remove();
    }
    function onKey(e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    }
    var node = el('div', { id: 'titlescreen', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Title screen' }, [
      el('div', { class: 'ts-card' }, [
        el('img', { class: 'ts-cover', src: '../../Source/images/cover.jpg', alt: 'Silent War box cover, Compass Games' }),
        el('div', { class: 'ts-body' }, [
          el('div', { class: 'ts-kicker', text: T.kicker }),
          el('h1', { class: 'ts-name', text: T.name }),
          el('div', { class: 'ts-sub', text: T.sub }),
          el('section', { class: 'ts-box' }, [
            el('h2', { text: T.original.head }), el('p', { text: T.original.text }), el('p', { class: 'ts-dim', text: T.original.owns })]),
          el('section', { class: 'ts-box ts-private' }, [
            el('h2', { text: T.privacy.head }), el('p', { text: T.privacy.text }), el('p', { class: 'ts-dim', text: T.privacy.buy })]),
          el('section', { class: 'ts-box ts-vibe' }, [
            el('h2', { text: T.vibe.head }), el('p', { text: T.vibe.text }), el('p', { class: 'ts-dim', text: T.vibe.check })]),
          el('div', { class: 'pal-buttons' }, [el('button', { type: 'button', class: 'helm suggest ts-go', text: 'Enter →', onclick: close })]),
          el('div', { class: 'ts-foot', text: T.foot + ' · build ' + (window.SW_VERSION || '') })
        ])
      ])
    ]);
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(node);
    node.querySelector('.ts-go').focus();
  }

  /* ---------------- briefing and "read your boat" ---------------- */
  function openBriefing() {
    store('sw.briefed', '1');
    var body = el('div', { class: 'brief' });
    body.appendChild(el('p', { class: 'lede', text: 'March 1943. You command USS Spearfish, a US fleet submarine in the Pacific. ' +
      'Each week you choose where to hunt, search the sea lanes, and decide how hard to press an attack on a Japanese convoy. ' +
      'The escorts will hunt you back.' }));
    body.appendChild(el('h3', { text: 'Your goal this patrol' }));
    body.appendChild(el('div', { class: 'db-ladder' }, Goal.levels.slice().reverse().map(function (L) {
      return el('div', { class: 'rung' }, [el('b', { text: L.label }), el('span', { text: L.text })]);
    }).concat([el('div', { class: 'rung fail' }, [el('b', { text: 'Failed' }), el('span', { text: 'the boat is lost' })])])));
    body.appendChild(el('p', { class: 'hint', text: 'For scale: a good captain sinks something in about half of all patrols, and reaches Gold in about one in ten. ' +
      'Most patrols last 3 to 5 weeks before fuel and torpedoes send the boat home.' }));
    body.appendChild(el('h3', { text: 'Six things to know' }));
    body.appendChild(el('ol', { class: 'essentials' }, Guide.essentials.map(function (x) {
      return el('li', {}, [el('b', { text: x.t + '. ' }), el('span', { text: x.d })]);
    })));
    var done = bootcampProgress();
    body.appendChild(el('div', { class: 'pal-buttons big' }, [
      el('button', { type: 'button', class: 'helm suggest', id: 'brief-bootcamp',
        text: done.length > 1 ? 'Continue boot camp' : 'Start boot camp (about 10 minutes)',
        onclick: function () { bootcampDone('brief'); closeOverlay(); bootcampNext(); } }),
      el('button', { type: 'button', text: 'Read your boat', onclick: openBoat }),
      el('button', { type: 'button', text: 'Lessons', onclick: openLessons }),
      el('button', { type: 'button', id: 'brief-patrol', text: 'Straight to a patrol',
        onclick: function () { closeOverlay(); startPatrol(); } })
    ]));
    openSheet('Your orders', 'briefing', body);
  }
  function openBoat() {
    var body = el('div', { class: 'boat' });
    body.appendChild(el('p', { class: 'hint', text: 'Every number on a counter is a rule. The submarine has two sides: grey for hunting, blue for travelling.' }));
    ['patrol', 'transit'].forEach(function (side) {
      var B = Guide.boat[side], n0 = side === 'patrol' ? 0 : Guide.boat.patrol.marks.length;
      var fig = el('div', { class: 'boat-fig' });
      var pic = el('div', { class: 'boat-pic' }, [el('img', { src: B.art, alt: B.side })]);
      B.marks.forEach(function (mk, i) {
        pic.appendChild(el('span', { class: 'boat-mark', style: 'left:' + (mk.x * 100) + '%;top:' + (mk.y * 100) + '%;', text: String(n0 + i + 1) }));
      });
      fig.appendChild(el('div', { class: 'boat-side', text: B.side }));
      fig.appendChild(pic);
      fig.appendChild(el('ol', { class: 'boat-legend', start: String(n0 + 1) }, B.marks.map(function (mk) {
        return el('li', {}, [el('b', { text: mk.label + ': ' }), el('span', { text: plain(mk.d) })]);
      })));
      body.appendChild(fig);
    });
    body.appendChild(el('div', { class: 'pal-buttons big' }, [
      el('button', { type: 'button', class: 'helm suggest', id: 'boat-done', text: S.bcItem === 'boat' ? 'Got it: next step' : 'Got it',
        onclick: function () { bootcampDone('boat'); closeOverlay(); if (S.bcItem === 'boat') bootcampNext(); } })
    ]));
    openSheet('Read your boat', 'USS Spearfish, NEW S2 class', body);
  }

  /* ---------------- boot camp ---------------- */
  function bootcampProgress() { return jsonStore('sw.bootcamp', []); }
  function bootcampDone(id) {
    var d = bootcampProgress();
    if (d.indexOf(id) === -1) { d.push(id); store('sw.bootcamp', JSON.stringify(d)); }
  }
  function bootcampNextItem() {
    var d = bootcampProgress();
    return Guide.bootcamp.filter(function (b) { return d.indexOf(b.id) === -1; })[0] || null;
  }
  function bootcampNext() {
    var item = bootcampNextItem();
    S.bcItem = item ? item.id : null;
    S.drill = null;
    if (!item) { S.notice = 'Boot camp complete. The coach stays on until you switch it off in the top bar.'; render(); return; }
    var kind = item.id.split(':')[0], arg = item.id.split(':')[1];
    if (kind === 'brief') openBriefing();
    else if (kind === 'boat') openBoat();
    else if (kind === 'lesson') startLesson(arg);
    else if (kind === 'drill') startDrill(arg);
    else if (kind === 'patrol') {
      S.coach = true; store('sw.coach', '1');
      closeOverlay(); startPatrol(); S.bcItem = 'patrol';
      S.notice = 'Your first patrol. The coach will speak up before a clear mistake; the goal is at the top of this panel.';
      render();
    }
    if (item.id !== 'patrol') S.bcItem = item.id;
  }
  function bootcampItemDone() {
    if (!S.bcItem) return false;
    if (S.bcItem.indexOf('lesson:') === 0) return !!S.lesson && S.lesson.next >= S.lesson.def.steps.length;
    if (S.bcItem.indexOf('drill:') === 0) return !!S.drill && S.drill.done;
    if (S.bcItem === 'patrol') return !!(S.engine && S.engine.done);
    return bootcampProgress().indexOf(S.bcItem) > -1;
  }
  function bootcampPanel() {
    var d = bootcampProgress(), next = bootcampNextItem();
    return el('div', { class: 'lesson-card bootcamp' }, [
      el('div', { class: 'lc-n', text: '★' }),
      el('div', { class: 'lc-body' }, [
        el('div', { class: 'lc-t', text: 'Boot camp: your first hour' }),
        el('div', { class: 'lc-s', text: 'Watch a lesson, then do it yourself with the coach; then your first patrol.' }),
        el('ol', { class: 'bc-list' }, Guide.bootcamp.map(function (b) {
          return el('li', { class: d.indexOf(b.id) > -1 ? 'done' : next && next.id === b.id ? 'now' : '' }, [
            el('span', { class: 'mk', text: d.indexOf(b.id) > -1 ? '✓' : next && next.id === b.id ? '▶' : '' }), el('span', { text: b.label })]);
        }))
      ]),
      el('div', { class: 'bc-buttons' }, [
        el('button', { type: 'button', class: 'lc-go', id: 'bootcamp-go', text: !d.length ? 'Start' : next ? 'Continue' : 'Done ✓',
          disabled: next ? null : 'disabled', onclick: function () { closeOverlay(); bootcampNext(); } }),
        d.length ? el('button', { type: 'button', class: 'lc-reset', text: 'Start over',
          onclick: function () { store('sw.bootcamp', null); openLessons(); } }) : null
      ])
    ]);
  }

  /* ---------------- drills: do what the lesson showed ---------------- */
  function startDrill(id) {
    var def = Drills.filter(function (d) { return d.id === id; })[0];
    if (!def) return;
    closeOverlay();
    S.lesson = null;
    replay(def.seed, def.prefix);
    S.drill = { def: def, done: false, result: null };
    S.bcItem = S.bcItem && S.bcItem.indexOf('drill:') === 0 ? 'drill:' + id : S.bcItem;
    S.notice = null;
    render();
  }

  /* Everything a fresh game resets, patrol or career. */
  function resetPlay(seed) {
    S.dice = window.SWDice.seeded(seed);
    clearTimeout(S.autoTimer);
    S.autoTimer = null;
    S.pacing = { presses: 0, decisions: 0, auto: 0 };
    S.prevStats = {}; S.flash = {};
    clearTimeout(S.viewTimer); S.pendingView = null;
    theater.camKey = null; theater.subAt = null;
    S.results = {}; S.subResult = null; S.radioOpen = {};
    S.lastActionLabel = null; S.visited = {}; S.played = []; S.notice = null;
    S.coachHold = null; S.coachNote = null; S.debriefShown = false;
    S.lastBatch = null; S.lastRecord = null; S.lastStep = null; S.firstNow = null;
    if (!S.keepMoments) S.moments = [];
    if (!S.keepLesson) { S.lesson = null; S.drill = null; }
  }

  /* ---------------- careers (Phase 6) ---------------- */
  function openCareers() {
    var body = el('div', { class: 'lesson-list careers' });
    body.appendChild(el('p', { class: 'hint', text: 'A career is one boat over several patrols, with the whole weekly Sequence of Play: ' +
      'the war\'s events, ULTRA, torpedo fixes and War Progress, readying and repair in port, Transit Events on the way out and home. ' +
      'Each boat starts at the date and base of a real patrol from the scenario book [32.0]; beat the skipper\'s record on your first patrol, ' +
      'then keep the boat alive for ' + CData.careerPatrols + ' patrols.' }));
    body.appendChild(el('div', { class: 'db-ladder' }, Goal.careerLevels.slice().reverse().map(function (L) {
      return el('div', { class: 'rung' }, [el('b', { text: L.label }), el('span', { text: L.text })]);
    }).concat([el('div', { class: 'rung fail' }, [el('b', { text: 'Failed' }), el('span', { text: 'the boat is lost' })])])));
    var ijnOn = store('sw.ijn') === '1';
    body.appendChild(el('label', { class: 'ijn-opt' }, [
      el('input', { type: 'checkbox', id: 'opt-ijn', checked: ijnOn ? 'checked' : null,
        onchange: function (ev) { store('sw.ijn', ev.target.checked ? '1' : '0'); } }),
      el('span', { text: ' Optional: the IJN Expansion Kit rules [28.0]: Loners, Crash Dive, Targeting an Escort, early War Period 4.' })
    ]));
    CData.careers.filter(function (c) { return !c.patrolOnly; }).forEach(function (c) {
      var u = Units_.boat(c.boat), cls = SubClasses.forBoat(u);
      body.appendChild(el('div', { class: 'lesson-card career-card' }, [
        el('img', { class: 'cc-art', src: Units_.art(u), alt: c.label }),
        el('div', { class: 'lc-body' }, [
          el('div', { class: 'lc-t', text: c.label + ' · ' + c.skipper }),
          el('div', { class: 'lc-s', text: MONTHS[c.start.m] + ' ' + c.start.y + ' from ' + Career.name(c.base) +
            (CData.forwardBases[c.base] ? ' (a forward base: the tender at ' + Career.name(c.base) + ')' : '') +
            ' · ' + c.cls + ' class ' + cls.attack + '-' + cls.defense + '-' + cls.tactical + ', Range ' + cls.range + ', Speed ' + cls.speed +
            ' · War Period ' + c.warPeriod + ', Mk-XIV ' + (c.torpedo > 0 ? '+' : '') + c.torpedo }),
          el('div', { class: 'lc-s', text: c.story }),
          el('div', { class: 'lc-s', text: 'Record to beat [' + c.rule + ']: ' + c.record.ships + ' ships, ' +
            Math.round(c.record.tons * 1000).toLocaleString('en-US') + ' t in ' + c.record.weeks + ' weeks (' + c.patrol + ', ' + Career.name(c.destination) + ').' })
        ]),
        el('button', { type: 'button', class: 'lc-go', 'data-career': c.id, text: 'Start',
          onclick: function () { closeOverlay(); startCareer(c.id); } })
      ]));
    });
    openSheet('Careers', 'Phase 6 · one boat, the war around it', body);
  }

  function startCareer(id, seed, opts) {
    if (typeof seed !== 'number') seed = urlSeed() !== null && !S.dice ? urlSeed() : freshSeed();
    resetPlay(seed);
    S.careerId = id; S.fleet = null; S.campaignId = null;
    /* A replay keeps the options the career was started with. */
    S.careerOpts = opts || (S.keepLesson ? S.careerOpts : null) || { ijn: store('sw.ijn') === '1' };
    S.engine = Career.create(id, S.careerOpts);
    S.mode = 'patrol';
    S.logFilter = { phase: 'all', sub: 'all' };
    S.lastStep = null; S.lastRecord = null;
    syncEngineView();
    S.history = [];
    S.view = wantedView() || 'theater';
    render();
  }

  function openCareerReport() {
    var e = S.engine, c = e.career, r = Goal.rateCareer(e);
    S.debriefShown = true;
    var body = el('div', { class: 'debrief career-report' });
    body.appendChild(el('div', { class: 'db-medal ' + r.final }, [
      el('div', { class: 'm', text: r.final === 'failed' ? 'FAILED' : r.final === 'none' ? 'NO MEDAL' : r.final.toUpperCase() }),
      el('div', { class: 't', text: r.line })
    ]));
    body.appendChild(el('p', { class: 'hint', text: c.endWhy }));
    body.appendChild(el('div', { class: 'db-stats' }, [
      el('div', {}, [el('b', { text: String(c.patrols.filter(function (p) { return p.outcome !== 'overhaul'; }).length) }), el('span', { text: 'patrols' })]),
      el('div', {}, [el('b', { text: String(c.own.shipsSunk || 0) }), el('span', { text: 'ships sunk' })]),
      el('div', {}, [el('b', { text: Math.round((c.own.tonsSunk || 0) * 1000).toLocaleString('en-US') }), el('span', { text: 'tons, your boat' +
        (e.tonnageSunk > (c.own.tonsSunk || 0) ? ' (' + Math.round(e.tonnageSunk * 1000).toLocaleString('en-US') + ' with your wolfpacks)' : '') })]),
      el('div', {}, [el('b', { text: e.outcome === 'lost' ? 'Lost' : 'Survived' }), el('span', { text: 'the boat' })])
    ]));
    body.appendChild(el('div', { class: 'db-ladder' }, Goal.careerLevels.slice().reverse().map(function (L) {
      return el('div', { class: 'rung' + (r.tons >= L.tons && !r.lost ? ' got' : '') }, [el('b', { text: L.label }), el('span', { text: L.text })]);
    })));
    var first = c.patrols[0], v = Career.patrolVerdict(c.def, first);
    if (v) {
      body.appendChild(el('h3', { text: 'Your first patrol against ' + c.def.skipper + ' [' + c.def.rule + ']' }));
      body.appendChild(el('div', { class: 'db-moment' }, [el('span', { class: 'tx', text: 'Book: ' + c.def.record.ships + ' ships, ' +
        Math.round(c.def.record.tons * 1000).toLocaleString('en-US') + ' t in ' + c.def.record.weeks + ' weeks. You: ' + first.ships + ' ships, ' +
        Math.round(first.tons * 1000).toLocaleString('en-US') + ' t in ' + first.weeks + ' weeks. By the book\'s standard [32.1]: ' + v.label + '.' })]));
    }
    body.appendChild(el('h3', { text: 'Patrol by patrol' }));
    c.patrols.forEach(function (p) {
      body.appendChild(el('div', { class: 'db-moment' }, [
        el('span', { class: 'wk', text: '#' + p.n }),
        el('span', { class: 'tx', text: MONTHS[p.depart.m] + ' ' + p.depart.y + ' from ' + BaseR.baseName(p.from, e.war) + ': ' + p.ships + ' ships, ' +
          Math.round(p.tons * 1000).toLocaleString('en-US') + ' t, ' + p.weeks + ' weeks' +
          (p.pack ? ' (wolfpack with ' + p.pack.slice(1).map(function (n) { return n.replace('USS ', ''); }).join(' and ') + ': the pack sank ' +
            p.packShips + ' ships, ' + Math.round(p.packTons * 1000).toLocaleString('en-US') + ' t)' : '') +
          (p.outcome === 'overhaul' ? ', cut short by overhaul' : p.outcome === 'lost' ? ', the boat was lost' : p.to ? ', home to ' + BaseR.baseName(p.to, e.war) : '') })
      ]));
    });
    var war = e.war, fleet = war.fleet.ships + war.mine.ships;
    body.appendChild(el('h3', { text: 'The war' }));
    body.appendChild(el('div', { class: 'db-tip' }, [el('span', { text: 'By ' + War.label(c.date) + ': War Period ' + war.warPeriod + ', Mk-XIV ' +
      (war.torpedo > 0 ? '+' : '') + war.torpedo + '. All US boats together had sunk ' + fleet + ' ships; yours were ' + war.mine.ships +
      ' of them (' + (fleet ? Math.round(1000 * war.mine.ships / fleet) / 10 : 0) + '%). ' + (war.fleet.lost + (e.sub.sunk ? 1 : 0)) + ' US submarines lost.' })]));
    body.appendChild(el('div', { class: 'pal-buttons' }, [
      el('button', { type: 'button', class: 'helm suggest', text: 'New career', onclick: function () { closeOverlay(); openCareers(); } }),
      el('button', { type: 'button', text: 'Lessons', onclick: openLessons })
    ]));
    openSheet(e.patrolGame ? 'Patrol Game report' : 'Career report', c.def.label + ' · seed ' + S.dice.seed, body);
  }

  /* ---------------- Phase 8: scenarios ---------------- */
  function openScenarios() {
    var body = el('div', { class: 'lesson-list scenarios' });
    body.appendChild(el('h3', { text: 'Patrol Games [32.0]' }));
    body.appendChild(el('p', { class: 'hint', text: 'One boat, one historical patrol, from departure to return. You are the captain: no War Events, ' +
      'no Super Skippers, the War Period and torpedo as they were. Beat the ships or the tonnage and you are a good captain; both, a great one; ' +
      'both in fewer weeks, legendary. Losing the boat takes a level off [32.1].' }));
    CData.careers.forEach(function (c) {
      var u = Units_.boat(c.boat);
      body.appendChild(el('div', { class: 'lesson-card career-card' }, [
        el('img', { class: 'cc-art', src: Units_.art(u), alt: c.label }),
        el('div', { class: 'lc-body' }, [
          el('div', { class: 'lc-t', text: c.label + ' · ' + c.skipper + ' · ' + c.patrol + (c.optional ? ' · optional [' + c.rule + ']' : '') }),
          el('div', { class: 'lc-s', text: MONTHS[c.start.m] + ' ' + c.start.y + ' from ' + Career.name(c.base) + ' to ' + Career.name(c.destination) +
            ' · War Period ' + c.warPeriod + ', Mk-XIV ' + (c.torpedo > 0 ? '+' : '') + c.torpedo + (c.pack ? ' · a wolfpack with ' + c.pack.join(' and ') : '') }),
          el('div', { class: 'lc-s', text: 'The record [' + c.rule + ']: ' + c.record.ships + ' ships, ' +
            Math.round(c.record.tons * 1000).toLocaleString('en-US') + ' t in ' + c.record.weeks + ' weeks.' })
        ]),
        el('button', { type: 'button', class: 'lc-go', 'data-patrolgame': c.id, text: 'Start',
          onclick: function () { closeOverlay(); startCareer(c.id, undefined, { patrolGame: true }); } })
      ]));
    });
    body.appendChild(el('h3', { text: 'Campaign Games [31.0]: fleet command' }));
    body.appendChild(el('p', { class: 'hint', text: 'You are ComSubPac: every US boat in the campaign. Each week you send boats Ready for Sea to a patrol ' +
      'area and choose which fights to play on the Combat Display; standing orders do the rest.' }));
    var autoSel = el('select', { id: 'campaign-auto' }, [
      el('option', { value: 'captain', text: 'Fights you do not play: the captain on the full rules' }),
      el('option', { value: 'quick', text: 'Fights you do not play: Quick Resolution [27.0] (fast, generous; the book warns against it for campaigns)' })
    ]);
    var practice = el('label', { class: 'ijn-opt' }, [el('input', { type: 'checkbox', id: 'campaign-practice' }),
      el('span', { text: ' Practice: ignore Career Longevity (you are never relieved of command) [31.12]' })]);
    body.appendChild(el('div', { class: 'campaign-settings' }, [autoSel, practice]));
    /* [33.0]-[34.0] the book's optional rules, each off by default */
    var OPTS = [
      ['allied', 'Allied submarines [33.1]: Dutch and British boats, Surabaya as a base, the Dutch withdrawal; their sinkings kept apart and added at the book\'s date [33.15]'],
      ['zeeleeuw', 'Zeeleeuw [33.14]: a Dutch-crewed Balao replaces Hawkbill, K-XIV and K-XV (with Allied submarines)'],
      ['surcouf', 'Surcouf [33.3]: the Free French cruiser submarine at Pearl Harbor, May 1942 to January 1943, with its big guns'],
      ['u2513', 'U-2513 [33.4]: a captured Type XXI at Pearl Harbor, July 1945, torpedo +2'],
      ['nautilus2', 'Nautilus II [33.5]: the Scheme-17 prototype at Pearl Harbor, July 1945'],
      ['staggered', 'Staggered arrivals and withdrawals [34.0]: each boat on the list comes or goes in a rolled week'],
      ['pace', 'Historical pace (a house rule, NOT in the book): boats stay on station longer early in the war and come home sooner late, so a campaign follows the real war\'s sinkings. Shown on every roll it changes [HP].']
    ];
    var saved = jsonStore('sw.optional', {});
    body.appendChild(el('details', { class: 'optional-rules', open: Object.keys(saved).some(function (k) { return saved[k]; }) ? 'open' : null }, [
      el('summary', { text: 'Optional rules [33.0]' })
    ].concat(OPTS.map(function (o) {
      return el('label', { class: 'ijn-opt' }, [el('input', { type: 'checkbox', 'data-optional': o[0], checked: saved[o[0]] ? 'checked' : null,
        onchange: function (ev) { saved[o[0]] = ev.target.checked; store('sw.optional', JSON.stringify(saved)); } }), el('span', { text: ' ' + o[1] })]);
    }))));
    function optional() {
      var o = {}, any = false;
      OPTS.forEach(function (x) { var c = $('[data-optional="' + x[0] + '"]'); if (c && c.checked) { o[x[0]] = true; any = true; } });
      return any ? o : null;
    }
    function victoryText(cp) {
      var v = cp.victory;
      if (v.kind === 'byDate') return 'The war ends when your tonnage passes ' + (v.tons * 1000).toLocaleString('en-US') + ' t' +
        (v.tons1945 ? ' (' + (v.tons1945 * 1000).toLocaleString('en-US') + ' t in 1945)' : '') + '; the sooner, the better [' + cp.rule + '].';
      if (v.kind === 'atW4') return 'Ends when the war moves into War Period 4; the sooner, the better [31.34].';
      if (v.kind === 'eastWind') return 'Victory on tonnage by the end of December 1932, capital ships counted twice; adjusted for boats lost and each battleship or carrier sunk [31.66].';
      return 'Victory on tonnage at the end of 1942, adjusted for capital ships sunk and boats lost [31.24].';
    }
    CData.campaigns.forEach(function (cp) {
      body.appendChild(el('div', { class: 'lesson-card campaign-card' }, [
        el('div', { class: 'lc-body' }, [
          el('div', { class: 'lc-t', text: cp.title + ' [' + cp.rule + ']' }),
          el('div', { class: 'lc-s', text: cp.summary }),
          el('div', { class: 'lc-s', text: MONTHS[cp.start.m] + ' ' + cp.start.y + ', War Period ' + cp.warPeriod + ', ' +
            cp.oob.reduce(function (n, g) { return n + g.boats.length; }, 0) + ' boats. ' + victoryText(cp) +
            (cp.longevity ? ' Keep your command: ' + cp.longevity.map(function (L) { return (L.tons * 1000).toLocaleString('en-US') + ' t by ' + MONTHS[L.m].slice(0, 3) + ' ' + L.y; }).join(', ') + '.' : '') })
        ]),
        el('button', { type: 'button', class: 'lc-go', 'data-campaign': cp.id, text: 'Start',
          onclick: function () { var a = $('#campaign-auto').value, pr = $('#campaign-practice').checked, op = optional(); closeOverlay();
            var st = { auto: a, noLongevity: pr };
            if (op) st.optional = op;
            startCampaign(cp.id, undefined, st); } })
      ]));
    });
    openSheet('Scenarios', 'Phase 8 · the scenario book', body);
  }

  function startCampaign(id, seed, settings) {
    if (typeof seed !== 'number') seed = urlSeed() !== null && !S.dice ? urlSeed() : freshSeed();
    resetPlay(seed);
    S.campaignId = id; S.careerId = null; S.focusBoat = null;
    S.campaignSettings = settings || (S.keepLesson ? S.campaignSettings : null) || { auto: 'captain' };
    S.fleet = Fleet.create(id, S.dice, S.campaignSettings);
    S.engine = fleetFocus();
    S.mode = 'patrol';
    S.logFilter = { phase: 'all', sub: 'all' };
    S.lastStep = null; S.lastRecord = null;
    syncEngineView();
    S.history = [];
    S.view = 'fleet';
    render();
  }

  function fleetTotals() {
    var f = S.fleet, w = f.war, live = Fleet.live(f);
    var next = (f.def.longevity || []).filter(function (L) { return War.cmp(f.date, { y: L.y, m: L.m }) <= 0; })[0];
    return { tons: w.mine.tons, ships: w.mine.ships, capital: f.capital || 0, lost: f.lost,
             sea: live.filter(function (b) { return b.career.atSea; }).length, port: live.filter(function (b) { return !b.career.atSea; }).length,
             next: next };
  }
  function renderFleetStatus(strip) {
    var f = S.fleet, T = fleetTotals();
    strip.appendChild(stat('Date', War.label(f.date).replace(', week', ' · wk')));
    strip.appendChild(stat('War Period', term('war_period', f.war.warPeriod), true));
    strip.appendChild(stat('Mk-XIV', term('torpedo_value', (f.war.torpedo > 0 ? '+' : '') + f.war.torpedo), f.war.torpedo < 0));
    strip.appendChild(stat('Ships sunk', String(T.ships)));
    strip.appendChild(stat('Tonnage', Math.round(T.tons * 1000).toLocaleString('en-US')));
    if (T.next) strip.appendChild(stat('Keep command', (T.next.tons * 1000).toLocaleString('en-US') + ' t by end ' + MONTHS[T.next.m].slice(0, 3), T.tons < T.next.tons));
    strip.appendChild(stat('Capital ships', String(T.capital)));
    strip.appendChild(stat('Subs lost', String(T.lost), T.lost >= 12));
    strip.appendChild(stat('Boats', T.sea + ' at sea · ' + T.port + ' in port'));
    strip.appendChild(stat('Seed', String(S.dice.seed)));
    strip.appendChild(el('div', { class: 'spacer' }));
    speedControl(strip);
  }
  function fleetPalette(head, g) {
    var f = S.fleet, T = fleetTotals();
    head.appendChild(el('span', { class: 'grip', text: '⠿' }));
    head.appendChild(el('span', { class: 'ttl', text: War.label(f.date) + ' · ComSubPac' }));
    function section(label, kids, cls) { g.appendChild(el('div', { class: 'pal-sec ' + (cls || '') }, [el('div', { class: 'pal-k', text: label })].concat(kids))); }
    if (f.done) {
      section('The campaign is over', [el('div', { class: 'pal-line', text: f.verdict.level + (f.outcome === 'relieved' ? ': ' + War.label(f.date) : '') }),
        el('div', { class: 'pal-buttons' }, [el('button', { type: 'button', class: 'helm suggest', id: 'open-debrief', text: 'Campaign report', onclick: openCampaignReport })])], 'goal');
      if (!S.debriefShown && !S.replaying) setTimeout(function () { if (S.fleet && S.fleet.done && !S.debriefShown) openCampaignReport(); }, SPEEDS[S.speed].step || 0);
      return;
    }
    section('Goal', [el('div', { class: 'pal-line', text: Math.round(T.tons * 1000).toLocaleString('en-US') + ' t sunk so far' +
      (T.next ? '; keep your command: ' + (T.next.tons * 1000).toLocaleString('en-US') + ' t by the end of ' + MONTHS[T.next.m] + ' [31.12]' : '') +
      '. ' + (f.def.victory.kind === 'byDate' ? 'The war ends when your tonnage passes ' + (f.def.victory.tons * 1000).toLocaleString('en-US') + ' t: the sooner, the better.'
           : f.def.victory.kind === 'atW4' ? 'The campaign ends when the war moves into War Period 4: the sooner, the better.'
           : f.def.victory.kind === 'eastWind' ? 'Victory is judged on tonnage by the end of December 1932, capital ships counted twice [31.66].'
           : 'Victory is judged on tonnage at the end of 1942 [31.24].') })], 'goal');
    var ready = Fleet.live(f).filter(function (b) { return b.phase === 'base' && b.career.box === 'ready'; });
    var station = Fleet.live(f).filter(function (b) { return b.career.atSea && b.phase === '12.0'; });
    section('Your orders', [
      el('div', { class: 'pal-line', text: ready.length + ' boat' + (ready.length === 1 ? '' : 's') + ' Ready for Sea (' + Object.keys(f.sail).length + ' ordered out); ' +
        station.length + ' on station, ' + Object.keys(f.fight).length + ' marked to fight on the Combat Display. The rest follow standing orders ' +
        '(the captain' + (f.auto === 'quick' ? ', with Quick Resolution for their fights' : ' on the full rules') + ').' }),
      el('div', { class: 'choices' }, [
        el('button', { type: 'button', class: 'act primary-act', id: 'run-week', text: 'Carry out the week',
          onclick: function () { doAction({ type: 'run_week' }); } }),
        el('button', { type: 'button', class: 'act', text: 'Open the Fleet board', onclick: function () { go('fleet', true); } })
      ])], 'you');
    var news = f.log.filter(function (r) { return r.turn >= f.turn - 1; }).slice(-8);
    if (news.length) section('This week in the war', news.map(function (r) { return el('div', { class: 'pal-line', text: r.context + ': ' + r.result }); }), 'just');
  }

  /* The Fleet board: every boat, and the orders that are yours to give. */
  /* ---------------- the history tracker (Phase 9) ----------------
   * Your war's running tonnage and losses against the real war's, month by
   * month (SWPrimer.at: JANAC, as the campaign data's fleet curve). History is
   * the whole Pacific; MacArthur's Navy and East Wind Early have no line. */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, kids) {
    var n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function hasHistory(f) { return !f.def.noHistory && f.def.id !== 'macarthur' && window.SWPrimer; }
  function historyChart(f, W, H) {
    var ser = f.series || [], pts = ser.filter(function (p, i) { return p.w === 1 || i === ser.length - 1; });
    if (!pts.length) return null;
    var t0 = ser[0].y * 12 + ser[0].m, t1 = Math.max(f.def.end.y * 12 + f.def.end.m, ser[ser.length - 1].y * 12 + ser[ser.length - 1].m, t0 + 3);
    if (f.def.victory.kind === 'byDate' || f.def.victory.kind === 'atW4') t1 = Math.min(t1, Math.max(ser[ser.length - 1].y * 12 + ser[ser.length - 1].m + 6, t0 + 12));
    var hist = [], hmax = 0;
    if (hasHistory(f)) {
      for (var t = t0; t <= t1; t++) {
        var h = window.SWPrimer.at(Math.floor(t / 12), t % 12), base = window.SWPrimer.at(Math.floor(t0 / 12), t0 % 12 - 1 < 0 ? 11 : t0 % 12 - 1);
        /* a campaign that starts mid-war starts from the book's counters, not from zero */
        var off = f.def.counters ? f.def.counters.tons - (t0 % 12 === 0 ? window.SWPrimer.at(Math.floor(t0 / 12) - 1, 11).tons : base.tons) : 0;
        hist.push({ t: t, tons: h.tons + off, lost: h.lost });
      }
      hist.forEach(function (p) { hmax = Math.max(hmax, p.tons); });
    }
    var tmax = Math.max(hmax, ser[ser.length - 1].tons, 50) * 1.08;
    var lmax = Math.max(8, ser[ser.length - 1].lost, hist.length ? hist[hist.length - 1].lost : 0) * 1.1;
    var L = 56, R = 40, T = 14, B = 26, iw = W - L - R, ih = H - T - B;
    function X(p) { return L + ((p.y * 12 + p.m + (p.w ? (p.w - 1) / 4 : 0.99)) - t0) / (t1 - t0 + 1) * iw; }
    function Xt(t) { return L + (t - t0 + 0.99) / (t1 - t0 + 1) * iw; }
    function Y(v) { return T + ih - v / tmax * ih; }
    function YL(v) { return T + ih - v / lmax * ih; }
    var g = svg('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, class: 'history-chart', role: 'img',
      'aria-label': 'Tonnage and losses against history' });
    g.appendChild(svg('rect', { x: L, y: T, width: iw, height: ih, class: 'hc-bg' }));
    [0.25, 0.5, 0.75, 1].forEach(function (k) {
      g.appendChild(svg('line', { x1: L, x2: L + iw, y1: T + ih - k * ih, y2: T + ih - k * ih, class: 'hc-grid' }));
      g.appendChild(svg('text', { x: L - 6, y: T + ih - k * ih + 4, class: 'hc-ax', 'text-anchor': 'end' }, [Math.round(tmax * k) + 'k']));
      g.appendChild(svg('text', { x: L + iw + 6, y: T + ih - k * ih + 4, class: 'hc-ax hc-lost' }, [String(Math.round(lmax * k))]));
    });
    for (var tt = t0; tt <= t1; tt++) if (tt % 12 === 0 || (t1 - t0 < 18 && tt % 3 === 0)) {
      g.appendChild(svg('text', { x: Xt(tt - 1), y: H - 8, class: 'hc-ax', 'text-anchor': 'middle' }, [(tt % 12 === 0 ? '' : MONTHS[tt % 12].slice(0, 3) + ' ') + Math.floor(tt / 12)]));
    }
    function path(list, xf, yf) { return list.map(function (p, i) { return (i ? 'L' : 'M') + xf(p).toFixed(1) + ' ' + yf(p).toFixed(1); }).join(' '); }
    if (hist.length) {
      g.appendChild(svg('path', { d: path(hist, function (p) { return Xt(p.t); }, function (p) { return Y(p.tons); }), class: 'hc-hist' }));
      g.appendChild(svg('path', { d: path(hist, function (p) { return Xt(p.t); }, function (p) { return YL(p.lost); }), class: 'hc-hist-lost' }));
    }
    g.appendChild(svg('path', { d: path(ser, X, function (p) { return Y(p.tons); }), class: 'hc-mine' }));
    g.appendChild(svg('path', { d: path(ser, X, function (p) { return YL(p.lost); }), class: 'hc-mine-lost' }));
    (f.def.longevity || []).forEach(function (Lg) {
      var x = Xt(Lg.y * 12 + Lg.m);
      if (x < L || x > L + iw) return;
      g.appendChild(svg('circle', { cx: x, cy: Y(Lg.tons), r: 4, class: 'hc-keep' }, [svg('title', {}, ['Career longevity [31.12]: ' + (Lg.tons * 1000).toLocaleString('en-US') + ' t by the end of ' + MONTHS[Lg.m] + ' ' + Lg.y])]));
    });
    var box = el('div', { class: 'history-tracker' });
    box.appendChild(g);
    var last = ser[ser.length - 1], hNow = hist.filter(function (p) { return p.t === last.y * 12 + last.m; })[0];
    box.appendChild(el('div', { class: 'hc-key' }, [
      el('span', { class: 'k mine', text: 'your tonnage' }), el('span', { class: 'k mine-lost', text: 'your boats lost (right scale)' }),
      hist.length ? el('span', { class: 'k hist', text: 'history (JANAC)' }) : null, hist.length ? el('span', { class: 'k hist-lost', text: 'history, boats lost' }) : null,
      (f.def.longevity || []).length ? el('span', { class: 'k keep', text: 'keep-command targets' }) : null
    ].filter(Boolean)));
    if (hNow) {
      var ratio = last.tons / Math.max(1, hNow.tons);
      box.appendChild(el('div', { class: 'hc-read', text: 'You: ' + Math.round(last.tons * 1000).toLocaleString('en-US') + ' t, ' + last.lost + ' boats lost. ' +
        'History by the end of ' + MONTHS[last.m] + ' ' + last.y + ': about ' + Math.round(hNow.tons * 1000).toLocaleString('en-US') + ' t, ' + hNow.lost + ' lost. ' +
        (ratio >= 1.1 ? 'You are ahead of the real war.' : ratio >= 0.85 ? 'You are running close to history.' :
         'You are behind history, as most players are in 1942-43: see History, "Why 1942 went badly".') }));
    }
    return box;
  }

  /* ---------------- the Fleet board ----------------
   * Phase 9: filters and sorting, standing orders per base, last week's
   * summary, the history tracker, and a clearer fight choice (each boat on
   * station shows how busy its waters are). */
  var FLEET_FILTERS = [['all', 'All'], ['ready', 'Ready for Sea'], ['station', 'On station'], ['transit', 'In transit'], ['pack', 'Wolfpacks'],
                       ['port', 'In port'], ['damaged', 'Damaged']];
  function fleetGroup(b) {
    var c = b.career;
    if (b.phase === 'base' && c.box === 'ready') return 'ready';
    if (c.inPack) return 'pack';
    if (c.atSea && b.phase === '12.0') return 'station';
    if (c.atSea) return 'transit';
    return 'port';
  }
  /* How busy a boat's waters are: the Area Activity line's moderate and high
   * boxes out of ten [13.0], and ULTRA [7.0]. A reading, not a rule. */
  function prospect(b) {
    var row = window.SWAac.charts[b.area], wp = { W1: 0, W2: 1, W3: 2, W4: 3 }[S.fleet.war.warPeriod];
    var busy = row ? row.grid[wp].filter(function (x) { return x === 'moderate' || x === 'high'; }).length : 0;
    var ultra = (S.fleet.war.ultra || []).indexOf(b.area) > -1 || b.ultra;
    return { busy: busy, ultra: !!ultra, score: busy + (ultra ? 3 : 0) + (b.smz ? -5 : 0) };
  }
  function fleetUi() { return S.fleetUi || (S.fleetUi = { filter: 'all', sort: 'place', base: 'all' }); }
  function renderFleet() {
    var v = $('#view-fleet');
    clear(v);
    var f = S.fleet;
    if (!f) return;
    var U = fleetUi();
    var wrap = el('div', { class: 'board-wrap fleet-board' });
    var T = fleetTotals();
    var head = el('div', { class: 'fleet-head' });
    var hl = el('div', { class: 'fh-left' });
    hl.appendChild(el('h1', { text: f.def.title + ' · ' + War.label(f.date), style: 'margin:0 0 4px;font-size:22px;' }));
    hl.appendChild(el('div', { class: 'hint', text: Math.round(T.tons * 1000).toLocaleString('en-US') + ' t and ' + T.ships + ' ships sunk; ' +
      T.capital + ' capital ships; ' + T.lost + ' boats lost; ' + T.sea + ' at sea, ' + T.port + ' in port.' +
      (f.allied ? ' Allied boats: ' + f.allied.ships + ' ships, ' + Math.round(f.allied.tons * 1000).toLocaleString('en-US') + ' t, ' + f.allied.lost + ' lost [33.1].' : '') }));
    /* last week */
    var wk = (f.weeks || [])[f.weeks.length - 1];
    var sum = el('div', { class: 'week-summary', id: 'week-summary' });
    if (wk) {
      sum.appendChild(el('div', { class: 'ws-t', text: 'Last week · ' + War.label(wk.date) + ': ' + wk.ships + ' ship' + (wk.ships === 1 ? '' : 's') + ', ' +
        Math.round(wk.tons * 1000).toLocaleString('en-US') + ' t' + (wk.lost.length ? '; ' + wk.lost.length + ' boat' + (wk.lost.length === 1 ? '' : 's') + ' out of the war' : '') }));
      if (wk.sank.length) sum.appendChild(el('div', { class: 'ws-l', text: 'Sinkings: ' + wk.sank.slice(0, 8).map(function (x) {
        return x.boat.replace('USS ', '') + ' ' + x.ships + ' (' + Math.round(x.tons * 1000).toLocaleString('en-US') + ' t)'; }).join(', ') + (wk.sank.length > 8 ? ', …' : '') }));
      if (wk.lost.length) sum.appendChild(el('div', { class: 'ws-l bad', text: wk.lost.map(function (x) { return x.boat.replace('USS ', '') + ' ' + (x.how === 'lost' ? 'lost with all hands' : x.how); }).join('; ') }));
      wk.news.slice(0, 5).forEach(function (n) { sum.appendChild(el('div', { class: 'ws-l dim', text: n.context + ': ' + n.result })); });
    } else sum.appendChild(el('div', { class: 'ws-t', text: 'The first week: give your orders, then carry out the week. What happened will be summed up here.' }));
    hl.appendChild(sum);
    head.appendChild(hl);
    var hc = historyChart(f, 410, 180);
    if (hc) head.appendChild(el('div', { class: 'fh-right' }, [hc]));
    wrap.appendChild(head);

    var L = f.done ? [] : Fleet.legalActions(f);
    var top = el('div', { class: 'choices', style: 'margin:10px 0;' });
    var nFights = Object.keys(f.fight).length;
    L.filter(function (a) { return ['run_week', 'form_pack', 'unpack'].indexOf(a.type) > -1; }).forEach(function (a) {
      top.appendChild(el('button', { type: 'button', class: 'act' + (a.type === 'run_week' ? ' primary-act' : ''), 'data-fleet': a.type,
        text: a.type === 'run_week' ? a.label + (nFights ? ' (you fight ' + nFights + ')' : ' (the captains fight every battle)') : a.label,
        onclick: function () { doAction(a); } }));
    });
    var unordered = Fleet.live(f).filter(function (b) { return b.phase === 'base' && b.career.box === 'ready' && !f.sail[b.career.boat]; });
    if (unordered.length && !f.done) {
      top.appendChild(el('button', { type: 'button', class: 'act', id: 'sail-suggested',
        text: 'Send the ' + unordered.length + ' boat' + (unordered.length === 1 ? '' : 's') + ' Ready for Sea where the captain would',
        onclick: function () { sailSuggested(); } }));
    }
    wrap.appendChild(top);

    /* standing orders, per base */
    var st = standing();
    var bases = War.allBases(f.war).filter(function (id) { return Fleet.live(f).some(function (b) { return !b.career.atSea && b.career.base === id; }); });
    if (bases.length && !f.done) {
      wrap.appendChild(el('div', { class: 'standing' }, [el('b', { text: 'Standing orders: ' }), el('span', { class: 'hint', text: 'each week, the captain sails every boat Ready for Sea from ' })]
        .concat(bases.map(function (id) {
          return el('label', { class: 'so' }, [el('input', { type: 'checkbox', 'data-standing': id, checked: st[id] ? 'checked' : null,
            onchange: function (ev) { st[id] = ev.target.checked; if (ev.target.checked && !S.replaying) applyStanding(); else render(); } }),
            el('span', { text: ' ' + BaseR.baseName(id, f.war) })]);
        }))));
    }

    /* filters and sort */
    var live = Fleet.live(f);
    var counts = {};
    live.forEach(function (b) { var g = fleetGroup(b); counts[g] = (counts[g] || 0) + 1; if (b.sub.damaged) counts.damaged = (counts.damaged || 0) + 1; });
    counts.all = live.length;
    var bar = el('div', { class: 'fleet-filters' });
    bar.appendChild(el('div', { class: 'seg' }, FLEET_FILTERS.map(function (x) {
      return el('button', { type: 'button', 'data-filter': x[0], 'aria-pressed': String(U.filter === x[0]), text: x[1] + ' ' + (counts[x[0]] || 0),
        onclick: function () { U.filter = x[0]; render(); } });
    })));
    var allBases = [];
    live.forEach(function (b) { var k = b.career.atSea ? b.career.base : b.career.base; if (k && allBases.indexOf(k) === -1) allBases.push(k); });
    bar.appendChild(el('label', {}, [el('span', { text: 'Home base ' }), el('select', { id: 'fleet-base', onchange: function (ev) { U.base = ev.target.value; render(); } },
      [el('option', { value: 'all', text: 'all' })].concat(allBases.map(function (id) {
        return el('option', { value: id, text: BaseR.baseName(id, f.war), selected: U.base === id ? 'selected' : null }); })))]));
    bar.appendChild(el('label', {}, [el('span', { text: 'Sort by ' }), el('select', { id: 'fleet-sort', onchange: function (ev) { U.sort = ev.target.value; render(); } },
      [['place', 'where they are'], ['name', 'name'], ['sunk', 'tonnage sunk'], ['attack', 'attack rating'], ['prospect', 'busy waters']].map(function (o) {
        return el('option', { value: o[0], text: o[1], selected: U.sort === o[0] ? 'selected' : null }); }))]));
    wrap.appendChild(bar);

    function row(b, kids) {
      var c = b.career, s = b.sub;
      var tags = [s.damaged ? 'damaged' : null, s.spotted ? 'spotted' : null, s.rtb ? 'RTB' : null, c.homeBase ? 'Aleutians group' : null,
                  c.nation ? c.nation : null,
                  b.pack ? 'leads a wolfpack: ' + b.pack.filter(function (m) { return m !== s; }).map(function (m) { return m.name.replace('USS ', ''); }).join(', ') : null,
                  c.inPack ? 'in ' + c.inPack.replace('USS ', '') + '\'s wolfpack' : null,
                  f.packs[c.boat] ? 'will lead ' + f.packs[c.boat].map(function (n) { return n.replace('USS ', ''); }).join(', ') : null].filter(Boolean);
      var pr = fleetGroup(b) === 'station' ? prospect(b) : null;
      return el('tr', { 'data-boat': c.boat, class: s.damaged ? 'dmg' : null }, [
        el('td', {}, [el('a', { href: '#', text: c.boat.replace('USS ', ''), onclick: function (ev) { ev.preventDefault(); S.focusBoat = c.boat; S.engine = fleetFocus(); go('theater', true); } })]),
        el('td', { text: s.attack + '-' + s.defense + '-' + s.tactical + ' ' + s.endurance }),
        el('td', { text: c.atSea ? Career.name(b.smz || b.area) + (c.heading ? ' → ' + Career.name(c.heading.id) : '') : BaseR.baseName(c.base, f.war) + ': ' + BaseR.boxLabel[c.box] }),
        el('td', { class: 'pros' }, pr ? [el('span', { class: 'busy b' + Math.min(5, Math.round(pr.busy / 2)), title: 'Area Activity [13.0]: ' + pr.busy + ' of 10 boxes moderate or high', text: pr.busy + '/10' }),
          pr.ultra ? el('span', { class: 'ultra-tag', text: 'ULTRA' }) : null].filter(Boolean) : []),
        el('td', { text: tags.join(', ') }),
        el('td', { text: (s.shipsSunk || 0) + ' / ' + Math.round((s.tonsSunk || 0) * 1000).toLocaleString('en-US') + ' t' })
      ].concat(kids.map(function (k) { return el('td', {}, [k]); })));
    }
    var ORDER = { ready: 0, station: 1, transit: 2, pack: 3, port: 4 };
    function sorted(list) {
      var by = {
        place: function (a, b) { return 0; },
        name: function (a, b) { return a.career.boat.replace('USS ', '') < b.career.boat.replace('USS ', '') ? -1 : 1; },
        sunk: function (a, b) { return (b.sub.tonsSunk || 0) - (a.sub.tonsSunk || 0); },
        attack: function (a, b) { return b.sub.attack - a.sub.attack; },
        prospect: function (a, b) { return (fleetGroup(b) === 'station' ? prospect(b).score : -9) - (fleetGroup(a) === 'station' ? prospect(a).score : -9); }
      }[U.sort] || function () { return 0; };
      return list.slice().sort(by);
    }
    function pass(b) {
      if (U.base !== 'all' && b.career.base !== U.base) return false;
      if (U.filter === 'all') return true;
      if (U.filter === 'damaged') return !!b.sub.damaged;
      return fleetGroup(b) === U.filter;
    }
    function table(title, key, boats, extra) {
      boats = sorted(boats.filter(pass));
      if (!boats.length) return;
      wrap.appendChild(el('h3', { text: title + ' (' + boats.length + ')' }));
      var t = el('table', { class: 'fleet-table' }, [el('tr', {}, ['Boat', 'A-D-T E', 'Where', key === 'station' ? 'Waters' : '', '', 'Sunk'].concat(extra ? [extra] : []).map(function (h) { return el('th', { text: h }); }))]);
      boats.forEach(function (b) { t.appendChild(row(b, extra ? [orderCell(b)] : [])); });
      wrap.appendChild(t);
    }
    function orderCell(b) {
      var n = b.career.boat, mine = L.filter(function (a) { return a.boat === n; });
      if (b.phase === 'base' && b.career.box === 'ready') {
        /* every destination the boat has, even once it holds an order (the
         * engine then offers only "stay in port after all" for it) */
        var dests = Career.legalActions(b).filter(function (a) { return a.type === 'sail'; });
        var sel = el('select', { 'data-sail': n }, [el('option', { value: '', text: f.sail[n] ? 'Stay in port after all' : 'Stay in port' })].concat(
          dests.map(function (a) {
            return el('option', { value: a.area, text: a.label, selected: f.sail[n] === a.area ? 'selected' : null }); })));
        if (f.sail[n]) sel.value = f.sail[n];
        sel.onchange = function () {
          var a = sel.value ? mine.filter(function (x) { return x.type === 'sail' && x.area === sel.value; })[0] : mine.filter(function (x) { return x.type === 'unsail'; })[0];
          if (!a && sel.value && f.sail[n]) { doAction({ type: 'unsail', boat: n }); a = Fleet.legalActions(f).filter(function (x) { return x.type === 'sail' && x.boat === n && x.area === sel.value; })[0]; }
          if (a) doAction(a);
        };
        return sel;
      }
      var fa = mine.filter(function (a) { return a.type === 'fight' || a.type === 'quick'; })[0];
      if (fa) {
        return el('label', { class: 'fight-pick' + (f.fight[n] ? ' on' : '') }, [el('input', { type: 'checkbox', 'data-fight': n, checked: f.fight[n] ? 'checked' : null,
          onchange: function () { doAction(fa); } }), el('span', { text: f.fight[n] ? ' you fight it' : ' the captain fights' })]);
      }
      return el('span', { text: '' });
    }
    table('Ready for Sea: where do they go?', 'ready', live.filter(function (b) { return fleetGroup(b) === 'ready'; }), 'Orders');
    var onSt = live.filter(function (b) { return fleetGroup(b) === 'station'; });
    if (onSt.length && !f.done) {
      var fl = el('div', { class: 'fight-flow' }, [
        el('b', { text: 'Which fights do you take yourself? ' }),
        el('span', { class: 'hint', text: 'A boat you tick stops the week at its contact and hands you the Combat Display; the rest are fought by their captains' +
          (f.auto === 'quick' ? ' with Quick Resolution [27.0]' : ' on the full rules') + '. Busy waters and ULTRA mean a likelier contact. ' })
      ]);
      var best = onSt.filter(function (b) { return !f.fight[b.career.boat]; }).map(function (b) { return { b: b, p: prospect(b) }; })
        .filter(function (x) { return x.p.score >= 5; }).sort(function (a, b) { return b.p.score - a.p.score; }).slice(0, 3);
      if (best.length) fl.appendChild(el('button', { type: 'button', class: 'act', id: 'mark-best',
        text: 'Tick the ' + best.length + ' most promising (' + best.map(function (x) { return x.b.career.boat.replace('USS ', ''); }).join(', ') + ')',
        onclick: function () { best.forEach(function (x) { var a = Fleet.legalActions(f).filter(function (y) { return y.type === 'fight' && y.boat === x.b.career.boat; })[0]; if (a) doAction(a); }); } }));
      L.filter(function (a) { return a.type === 'fight_all' || a.type === 'quick_all'; }).forEach(function (a) {
        fl.appendChild(el('button', { type: 'button', class: 'act', 'data-fleet': a.type, text: a.type === 'fight_all' ? 'Tick them all' : 'Untick them all', onclick: function () { doAction(a); } }));
      });
      wrap.appendChild(fl);
    }
    table('On station', 'station', onSt, 'This week');
    table('In transit', 'transit', live.filter(function (b) { return fleetGroup(b) === 'transit'; }));
    table('In a wolfpack', 'pack', live.filter(function (b) { return fleetGroup(b) === 'pack'; }));
    table('In port', 'port', live.filter(function (b) { return fleetGroup(b) === 'port'; }));
    var gone = f.boats.filter(function (b) { return b.done; });
    if (gone.length) wrap.appendChild(el('div', { class: 'hint', text: 'Out of the war: ' + gone.map(function (b) {
      return b.career.boat.replace('USS ', '') + ' (' + (b.outcome === 'lost' ? 'lost' : b.outcome) + ')'; }).join(', ') }));
    wrap.appendChild(el('h3', { text: 'The war' }));
    f.log.slice(-14).reverse().forEach(function (r) { wrap.appendChild(el('div', { class: 'pal-line', text: r.date + ' — ' + r.context + ': ' + r.result })); });
    v.appendChild(wrap);
  }

  /* Standing orders: kept with the campaign's settings, so a save keeps them.
   * Each order the captain gives is an ordinary decision, recorded and
   * replayed like any other. */
  function standing() {
    var cs = S.campaignSettings || (S.campaignSettings = {});
    return cs.standing || (cs.standing = {});
  }
  function applyStanding() {
    var f = S.fleet, st = standing();
    if (!f || f.done || f.phase !== 'orders' || S.replaying) return;
    var any = Object.keys(st).some(function (k) { return st[k]; });
    if (!any) { render(); return; }
    sailSuggested(function (b) { return !!st[b.career.base]; });
  }

  /* Standing orders for the boats you have not given one: each is an order
   * the fleet engine offers, the one the captain would choose. */
  function sailSuggested(only) {
    var f = S.fleet;
    Fleet.live(f).filter(function (b) { return b.phase === 'base' && b.career.box === 'ready' && !f.sail[b.career.boat] && (!only || only(b)); }).forEach(function (b) {
      var L = Career.legalActions(b).filter(function (a) { return a.type === 'sail'; });
      if (!L.length) return;
      var t = teacher().choose(b, L), area = t && t.action ? t.action.area : L[0].area;
      var a = Fleet.legalActions(f).filter(function (x) { return x.type === 'sail' && x.boat === b.career.boat && x.area === area; })[0];
      if (a) doAction(a);
    });
    /* and wolfpacks, where the rules allow one [24.1] */
    for (var k = 0; k < 6; k++) {
      var fp = Fleet.legalActions(f).filter(function (x) { return x.type === 'form_pack'; })[0];
      if (!fp) break;
      doAction(fp);
    }
  }

  function openCampaignReport() {
    var f = S.fleet, vd = f.verdict || Fleet.verdict(f);
    S.debriefShown = true;
    var body = el('div', { class: 'debrief campaign-report' });
    var good = /Victory/.test(vd.level);
    body.appendChild(el('div', { class: 'db-medal ' + (good ? 'gold' : vd.level === 'Draw' ? 'silver' : 'failed') }, [
      el('div', { class: 'm', text: vd.level.toUpperCase() }),
      el('div', { class: 't', text: f.def.title + ' [' + vd.rule + ']' + (vd.base !== vd.level ? ': ' + vd.base + ' before modifiers' : '') })
    ]));
    body.appendChild(el('div', { class: 'db-stats' }, [
      el('div', {}, [el('b', { text: Math.round(vd.tons * 1000).toLocaleString('en-US') }), el('span', { text: 'tons sunk' })]),
      el('div', {}, [el('b', { text: String(f.war.mine.ships) }), el('span', { text: 'ships' })]),
      el('div', {}, [el('b', { text: String(vd.capital) }), el('span', { text: 'capital ships' })]),
      el('div', {}, [el('b', { text: String(vd.lost) }), el('span', { text: 'boats lost' })])
    ]));
    var V = f.def.victory;
    if (V.levels) body.appendChild(el('div', { class: 'db-ladder' }, V.levels.map(function (L) {
      return el('div', { class: 'rung' + (f.outcome !== 'relieved' && L.label === vd.base ? ' got' : '') }, [el('b', { text: L.label }), el('span', { text: (L.tons * 1000).toLocaleString('en-US') + ' t+' })]);
    })));
    if (V.table) body.appendChild(el('div', { class: 'db-ladder' }, V.table.map(function (L, i) {
      var from = i ? V.table[i - 1].before : null;
      return el('div', { class: 'rung' + (f.outcome !== 'relieved' && L.label === vd.base ? ' got' : '') }, [el('b', { text: L.label }),
        el('span', { text: 'before ' + MONTHS[L.before.m].slice(0, 3) + ' ' + L.before.y })]);
    })));
    vd.mods.forEach(function (m) { body.appendChild(el('div', { class: 'db-moment' }, [el('span', { class: 'tx', text: m.label + ': ' + (m.value > 0 ? '+' : '') + m.value + ' level' + (Math.abs(m.value) === 1 ? '' : 's') })])); });
    var hist = f.def.victory;
    if (vd.note) body.appendChild(el('div', { class: 'db-moment' }, [el('span', { class: 'tx', text: vd.note })]));
    if (vd.allied) body.appendChild(el('div', { class: 'db-moment' }, [el('span', { class: 'tx', text: vd.allied })]));
    body.appendChild(el('div', { class: 'db-tip' }, [el('span', { text: (hist.capital ? 'History: about 725,000 t in 1942, ' + hist.capital.historical + ' capital ship and ' + hist.lost.historical +
      ' US submarines lost [31.24]. ' : f.def.hypothetical ? 'A war that never happened: there is no history to compare against [31.6]. '
      : 'Ended ' + (vd.date || War.label(f.date)) + '. Historical US losses for this campaign: ' + hist.historicalLost + '. ') +
      'Your best boats: ' + f.boats.slice().sort(function (a, b) { return b.tonnageSunk - a.tonnageSunk; }).slice(0, 5)
      .map(function (b) { return b.career.boat.replace('USS ', '') + ' ' + Math.round(b.tonnageSunk * 1000).toLocaleString('en-US') + ' t'; }).join(', ') + '.' })]));
    var hc = historyChart(f, 760, 260);
    if (hc) body.appendChild(el('div', { class: 'db-history' }, [el('h3', { text: 'Your war against the real one' }), hc]));
    body.appendChild(el('div', { class: 'pal-buttons' }, [
      el('button', { type: 'button', class: 'helm suggest', text: 'Scenarios', onclick: function () { closeOverlay(); openScenarios(); } }),
      el('button', { type: 'button', class: 'helm', text: 'History: why 1942 went badly', onclick: function () { openPrimer('y1942'); } })
    ]));
    openSheet('Campaign report', f.def.title + ' · seed ' + S.dice.seed, body);
  }

  function startPatrol(seed) {
    S.careerId = null; S.fleet = null; S.campaignId = null;
    if (typeof seed !== 'number') seed = urlSeed() !== null && !S.dice ? urlSeed() : freshSeed();
    S.dice = window.SWDice.seeded(seed);
    clearTimeout(S.autoTimer);
    S.autoTimer = null;
    S.pacing = { presses: 0, decisions: 0, auto: 0 };
    S.prevStats = {}; S.flash = {};
    clearTimeout(S.viewTimer); S.pendingView = null;
    theater.camKey = null; theater.subAt = null;
    S.results = {};
    S.subResult = null;
    S.radioOpen = {};
    S.lastActionLabel = null;
    S.visited = {};
    S.played = [];
    S.notice = null;
    S.coachHold = null; S.coachNote = null;
    S.debriefShown = false;
    if (!S.keepMoments) S.moments = [];
    if (!S.keepLesson) { S.lesson = null; S.drill = null; }
    var cls = SubClasses.get('new_s2');
    S.engine = Patrol.create({
      warPeriod: 'W2', torpedoValue: -1, area: 'east_china_sea',
      activeBaseAreas: ['scs1'],
      start: { y: 1943, m: 2 },           // March 1943: radar is fitted [14.12]
      sub: { name: 'USS Spearfish', attack: cls.attack, defense: cls.defense,
             tactical: cls.tactical, endurance: cls.endurance,
             range: cls.range, speed: cls.speed,
             superSkipper: { name: 'Whitaker', value: 1 } }
    });
    S.mode = 'patrol';
    /* The log filter names phases from whichever source produced the records;
     * carrying it across a mode switch would silently hide the new ones. */
    S.logFilter = { phase: 'all', sub: 'all' };
    S.lastStep = null;
    S.lastRecord = null;
    syncEngineView();
    S.view = 'theater';
    S.history = [];
    render();
  }

  function useTape() {
    S.lesson = null;
    S.mode = 'tape';
    S.engine = null;
    S.logFilter = { phase: 'all', sub: 'all' };
    resetTape();
  }

  function renderTransport() {
    if (S.mode === 'patrol') return renderActions();
    var t = $('#transport');
    clear(t);
    t.classList.remove('actions');
    var atEnd = S.tape.done;
    t.appendChild(el('button', { type: 'button', title: 'Restart', text: '⟲',
      onclick: function () { resetTape(); } }));
    t.appendChild(el('button', {
      type: 'button', title: 'Step back', text: '◀', disabled: S.tape.index <= 0 ? 'disabled' : null,
      onclick: function () { seekTo(S.tape.index - 1); } }));
    t.appendChild(el('button', {
      type: 'button', class: 'primary', title: atEnd ? 'Tape complete' : 'Next step',
      text: atEnd ? '■' : '▶', disabled: atEnd ? 'disabled' : null,
      onclick: function () { stepTape(); } }));
    t.appendChild(el('button', {
      type: 'button', title: 'Play to the end', text: '▶▶', disabled: atEnd ? 'disabled' : null,
      onclick: playAll }));
    t.appendChild(el('div', { class: 'pos',
      text: Math.max(0, S.tape.index + 1) + ' / ' + Tape.steps.length }));
    t.appendChild(el('div', { class: 'title', text: S.lastStep ? S.lastStep.title : Tape.title }));
  }

  function applyStepResult(r) {
    if (!r) return;
    S.lastStep = r.step;
    S.lastRecord = r.record;
    if (S.autoView && r.step.view && r.step.view !== S.view) {
      S.history.push(S.view);
      S.view = r.step.view;
    }
    render();
    if (r.record && r.record.die !== null) {
      var die = $('#the-die');
      if (die) animateDie(die, r.record.die, function () {});
    }
  }

  function stepTape() {
    var r = Player.next(S.tape, Tape, DICE);
    applyStepResult(r);
  }

  function seekTo(i) {
    Player.seek(S.tape, Tape, i, DICE);
    var st = Tape.steps[Math.max(0, i)];
    S.lastStep = st || null;
    S.lastRecord = S.tape.log.length ? S.tape.log[S.tape.log.length - 1] : null;
    if (S.autoView && st && st.view) S.view = st.view;
    render();
  }

  function resetTape() {
    S.tape = Player.create(Tape);
    S.prevStats = {}; S.flash = {};
    theater.camKey = null; theater.subAt = null;
    S.lastStep = null;
    S.lastRecord = null;
    S.view = 'theater';
    S.history = [];
    render();
  }

  function playAll() {
    if (S.playing) { S.playing = false; return; }
    S.playing = true;
    var gap = SPEEDS[S.speed].step + SPEEDS[S.speed].die;
    (function tick() {
      if (!S.playing || S.tape.done) { S.playing = false; renderTransport(); return; }
      stepTape();
      setTimeout(tick, gap);
    }());
  }

  /* ---------------- render ---------------- */
  function render() {
    if (S.replaying) return;
    hideHoverCard();     // the node under the cursor may be about to be rebuilt
    renderStatus();
    renderBreadcrumb();
    renderNav();
    document.querySelectorAll('.view').forEach(function (v) {
      v.classList.toggle('active', v.id === 'view-' + S.view);
    });
    if (!theater.built) buildTheater(); else refreshTheaterTokens();
    if (S.view === 'combat') renderCombat();
    if (S.view === 'oparea') renderOpArea();
    if (S.view === 'base') renderBase();
    if (S.view === 'cups') renderCups();
    if (S.view === 'tenders') renderSimpleBoard('#view-tenders', Layout.tenderDisplay,
      'Sub Tender and Surabaya display [21.2]. Forward bases and tenders arrive with Phase 7; a Career logs where they open.');
    if (S.view === 'graveyard') renderSimpleBoard('#view-graveyard', Layout.graveyard,
      'Submarine Graveyard. A Career counts every US boat lost in the war panel.');
    if (S.view === 'log') renderLog();
    if (S.view === 'fleet') renderFleet();
    renderSide();
    renderTransport();
    renderPalette();
  }

  /* ---------------- keys ---------------- */
  function initKeys() {
    document.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'Escape') { closeOverlay(); return; }
      if (e.key === 'Backspace') { e.preventDefault(); back(); return; }
      if (e.key === ' ') { e.preventDefault(); if (!S.tape.done) stepTape(); return; }
      var v = Layout.views.filter(function (x) { return x.key === e.key; })[0];
      if (!v) return;
      if (v.id === 'charts') openCharts();
      else if (v.id === 'rules') openRules(null);
      else go(v.id, true);
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    document.body.appendChild(el('div', { id: 'hovercard', role: 'tooltip' }));
    document.title = 'Silent War ' + (window.SW_VERSION || '') + ' — Playboard';
    S.tape = Player.create(Tape);
    S.detail = param('detail') || store('sw.detail') || 'beginner';
    var c = param('coach') !== null ? param('coach') : store('sw.coach');
    S.coach = c === null ? true : c === '1';
    document.body.classList.toggle('beginner', S.detail === 'beginner');
    initTooltip();
    initKeys();
    render();
    /* First visit: the briefing, before anything else. */
    /* The Welcome is the title screen, every launch: a first visit starts at
     * the war, a returning player at "Start here" (Resume first). A ?seed=
     * link asks for that game, so it goes straight to it. */
    if (param('brief') !== '0' && urlSeed() === null) {
      openWelcome(store('sw.briefed') ? 'start' : 'war');
      openTitle();
    }
    window.addEventListener('resize', function () { if (S.view === 'theater') fitMap(); });
  }

  /* Console-only debug hooks. Never part of gameplay. Every hook drives the
   * real production path, it never reimplements one. */
  window.__swDebug = {
    state: function () { return S; },
    step: function () { stepTape(); },
    seek: function (i) { seekTo(i); },
    playAll: playAll,
    view: function (id) { go(id, true); },
    rules: function (ref) { openRules(ref); },
    patrol: function () { return S.engine; },
    startPatrol: function (seed) { startPatrol(seed); return S.dice.seed; },
    startCareer: function (id, seed, opts) { startCareer(id, seed, opts); return S.dice.seed; },
    startCampaign: function (id, seed, settings) { startCampaign(id, seed, settings); return S.dice.seed; },
    fleet: function () { return S.fleet; },
    scenarios: function () { openScenarios(); },
    careers: function () { openCareers(); },
    careerReport: function () { openCareerReport(); },
    saveRecord: function () { return saveRecord(); },
    saves: function () { openSaves(); },
    resume: function (r) { return resumeSave(r || newestSave()); },
    primer: function (ch) { openPrimer(ch); },
    welcome: function (tab) { openWelcome(tab); },
    seed: function () { return S.dice ? S.dice.seed : null; },
    /* Presses per real decision (Ambush v2's measure): presses are player
     * actions, decisions are the ones taken with more than one legal option,
     * auto are forced steps the game took itself. */
    pacing: function () { return JSON.parse(JSON.stringify(S.pacing)); },
    pending: function () { return !!S.autoTimer; },
    teacherVerdict: function (a) { return teacher().verdict(S.engine, a); },
    startDrill: function (id) { startDrill(id); },
    startLesson: function (id) { startLesson(id); },
    title: function () { openTitle(); },
    debrief: function () { if (S.fleet) openCampaignReport(); else if (isCareer()) openCareerReport(); else openDebrief(); },
    /* Take a pending forced step now instead of after its beat (tests). */
    settle: function () {
      for (var i = 0; i < 50 && S.autoTimer; i++) {
        clearTimeout(S.autoTimer); S.autoTimer = null;
        var f = forcedAction();
        if (f) doAction(f, true);
      }
      return S.engine ? S.engine.phase : null;
    },
    draws: function () { return S.dice ? S.dice.draws : 0; },
    /* Apply an exact engine action, as the bot's replay needs (act() picks the
     * first match by type, which cannot express "3 points on this ship"). */
    apply: function (action) {
      if (!Eng().isLegal(S.engine, action)) throw new Error('illegal ' + JSON.stringify(action));
      doAction(Eng().legalActions(S.engine).filter(function (a) {
        return a.type === action.type && a.area === action.area && a.unit === action.unit &&
               a.column === action.column && a.delta === action.delta && a.base === action.base &&
               a.smz === action.smz && a.via === action.via && !!a.cautious === !!action.cautious;
      })[0] || action);
      return S.engine.phase;
    },
    legalActions: function () { return S.engine ? Eng().legalActions(S.engine) : []; },
    act: function (type, extra) {
      var a = Eng().legalActions(S.engine).filter(function (x) {
        return x.type === type && (!extra || x.area === extra || x.column === extra || x.unit === extra || x.base === extra || x.smz === extra);
      })[0];
      if (!a) throw new Error('no legal action ' + type);
      doAction(a);
      return S.engine.phase;
    },
    fogCheck: function () {
      var cols = countsByColumn(), all = [];
      Object.keys(cols).forEach(function (c) { all = all.concat(cols[c]); });
      return Fog.assertNoLeak(Fog.summarize(all), all);
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}());
