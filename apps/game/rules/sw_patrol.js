/* sw_patrol.js — the single-submarine operations loop [4.0 III]. PURE MODULE.
 * ZERO DOM, ZERO Math.random; dice arrive through opts.rollDie.
 *
 * The engine is a state machine over the Sequence of Play. Its contract with
 * the UI is two functions:
 *    legalActions(state) -> every action that may be taken right now
 *    apply(state, action, opts) -> the new state, plus the records to render
 * Anything not returned by legalActions is not offered. That is the hard lock.
 */
(function (root) {
  'use strict';

  var req = typeof require === 'function' ? require : null;
  var Move   = root.SWMovement || (req ? req('./sw_movement.js').SWMovement : null);
  var Search = root.SWSearch   || (req ? req('./sw_search.js').SWSearch : null);
  var Combat = root.SWCombat   || (req ? req('./sw_combat.js').SWCombat : null);
  var Cups   = root.SWCups     || (req ? req('./sw_cups.js').SWCups : null);
  var Ships  = root.SWShips    || (req ? req('../data/sw_ships.js').SWShips : null);
  var Layout = root.SWLayout   || (req ? req('../data/sw_layout.js').SWLayout : null);
  var Res    = root.SWResolution || (req ? req('./sw_resolution.js').SWResolution : null);
  var Tables = root.SWTables   || (req ? req('../data/sw_tables.js').SWTables : null);
  var SubCls = root.SWSubClasses || (req ? req('../data/sw_subclasses.js').SWSubClasses : null);
  var Aac    = root.SWAac      || (req ? req('../data/sw_aac.js').SWAac : null);

  function create(setup) {
    return {
      phase: '12.0',
      turn: 1,
      warPeriod: setup.warPeriod,
      torpedoValue: setup.torpedoValue,
      activeBaseAreas: setup.activeBaseAreas || [],
      area: setup.area,
      ultra: !!setup.ultra,
      /* [14.12] radar arrives in 1943: setup.radar, or from the start year. */
      radar: setup.radar !== undefined ? !!setup.radar : (setup.start ? setup.start.y >= 1943 : false),
      start: setup.start || { y: 1943, m: 2 },     // month index 0-11; turn 1 = its first week
      sub: {
        name: setup.sub.name, column: null,
        attack: setup.sub.attack, defense: setup.sub.defense,
        tactical: setup.sub.tactical, endurance: setup.sub.endurance,
        range: setup.sub.range, speed: setup.sub.speed,
        superSkipper: setup.sub.superSkipper || null,
        side: 'patrol', damaged: false, spotted: false, rtb: false, sunk: false
      },
      cups: null, tdcPool: null,
      units: [], round: 1, revealedThisRound: 0, tdcPlaced: 0,
      allocations: [], attacksResolved: 0,
      sunkThisPhase: [], enduranceDrm: 0,
      /* Phase 5 combat state, reset for every fight (freshCombat). */
      radarUsed: false, lastReveal: null, roundEvent: null, combatEvents: [],
      combatSunk: [], skipEndurance: false, diligentWithdraw: false, enemySub: null,
      shipsSunk: 0, tonnageSunk: 0,
      log: [], history: [], done: false, outcome: null
    };
  }

  /* sw_movement works on a submarine that knows where it is; the loop keeps
   * the area on the state, so hand it a merged view. */
  function moveView(state) {
    return { area: state.area, side: state.sub.side, range: state.sub.range,
             speed: state.sub.speed, rtb: state.sub.rtb };
  }

  /* The engine's own view of the combat sub-state, which sw_combat expects. */
  /* sw_combat reads the patrol state directly (radar, the round's Combat
   * Event, etc. all live on it), so the "view" is the state itself. */
  function combatView(state) { return state; }
  function syncBack() {}

  /* The date of a turn: four weeks to a month from the setup's start. */
  function dateOf(state) {
    var m = state.start.m + Math.floor((state.turn - 1) / 4);
    return { y: state.start.y + Math.floor(m / 12), m: m % 12 };
  }

  function freshCombat(state) {
    state.escortTargeted = null; state.loner = false; state.pc = null;
    state.round = 1; state.revealedThisRound = 0; state.tdcPlaced = 0;
    state.radarUsed = false; state.lastReveal = null; state.roundEvent = null;
    state.combatEvents = []; state.combatSunk = []; state.skipEndurance = false;
    state.diligentWithdraw = false; state.allocations = []; state.sunkThisPhase = [];
  }
  function newRound(state) {
    state.radarUsed = false; state.lastReveal = null; state.roundEvent = null; state.diligentWithdraw = false;
  }

  /* [14.16A] Could any attack succeed at all? Judged on what the player can
   * see: face-down targets count as defense 1 until revealed [14.16 note]. */
  function anyAttackPossible(state) {
    return state.units.some(function (u) {
      return Combat.canTarget(state, u.uid).ok &&
             Combat.attackPreview(state, { unit: u.uid, points: state.sub.attack }).hit > 0;
    });
  }

  function push(state, records) {
    (records || []).forEach(function (r) {
      r.turn = state.turn;
      r.submarine = state.sub.name;
      r.sop = state.phase;
      state.log.push(r);
    });
  }

  function allocatedPoints(state) {
    return state.allocations.reduce(function (n, a) { return n + a.points; }, 0);
  }

  function legalActions(state) {
    if (state.done) return [];
    var v = combatView(state);
    var out = [];

    switch (state.phase) {
      case '12.0':
        Move.legalPatrolMoves(moveView(state), { activeBaseAreas: state.activeBaseAreas })
          .moves.forEach(function (a) {
            out.push({ type: 'move', area: a, label: 'Move to ' + a, rule: '12.0' });
          });
        out.push({ type: 'stay', label: 'Remain on station', rule: '12.0' });
        break;

      case '13.1':
        if (state.pack) {
          out.push({ type: 'search', label: 'Search as a Group pack: one roll [24.31]', rule: '24.31' });
          out.push({ type: 'search', barrier: true, label: 'Search as a Barrier pack: +2, not every boat may reach the convoy [24.32]', rule: '24.32' });
        } else
        out.push({ type: 'search', label: 'Search for contacts', rule: '13.2' });
        /* [27.0] Quick Resolution: offered where the caller allows it (a
         * career), never in a Special Mission Zone. */
        if (state.allowQuick && !state.smz && !state.pack) {
          out.push({ type: 'quick', label: 'Quick resolution: search and fight in one roll', rule: '27.0' });
        }
        out.push({ type: 'bypass', label: 'Bypass: stay hidden this week', rule: '13.1' });
        out.push({ type: 'rtb', label: 'Voluntarily return to base', rule: '13.1' });
        break;

      case '14.11':
        Combat.COLUMNS.forEach(function (c) {
          if (state.pc && columnCount(state, c) >= 2) return;            // [24.5] no more than two a column
          out.push({ type: 'place', column: c, label: (state.pc ? 'Place ' + state.sub.name + ' in column ' : 'Place in column ') + c,
                     rule: state.pc ? '24.5' : '14.11' });
        });
        break;

      case '14.12': {
        state.units.forEach(function (u) {
          if (Combat.canReveal(v, u.uid).ok) {
            out.push({ type: 'reveal', unit: u.uid, label: 'Reveal a counter in ' + u.column, rule: '14.12' });
          }
        });
        /* [14.12] Radar: the unit just revealed may be turned back face down. */
        if (state.lastReveal && Combat.canUnflip(state, state.lastReveal).ok) {
          out.push({ type: 'unflip', unit: state.lastReveal, rule: '14.12',
                     label: 'Radar: turn it back face down (reveal another instead)' });
        }
        /* [14.12] a Diligent Escort that damaged the boat: it may withdraw now. */
        if (state.diligentWithdraw && state.sub.damaged) {
          out.push({ type: 'withdraw', label: 'Withdraw: the boat is damaged [14.12]', rule: '14.12' });
        }
        if (state.revealedThisRound >= Combat.revealBudget(v) ||
            !state.units.some(function (u) { return Combat.canReveal(v, u.uid).ok; })) {
          out.push({ type: 'done_reveal', label: 'Proceed to TDC placement', rule: '14.13' });
        }
        break;
      }

      case '14.13':
        state.units.forEach(function (u) {
          if (Combat.canPlaceTdc(v, u.uid).ok) {
            out.push({ type: 'tdc', unit: u.uid, label: 'Place a TDC marker', rule: '14.13' });
          }
        });
        if (state.tdcPlaced >= Combat.revealBudget(v) ||
            !state.units.some(function (u) { return Combat.canPlaceTdc(v, u.uid).ok; })) {
          out.push({ type: 'done_tdc', label: 'Reveal the TDC markers', rule: '14.14' });
        }
        break;

      case '14.14': {
        var ev = state.roundEvent;
        /* [19.2] event 8, Counterattack: held down, the boat cannot attack. */
        if (ev && ev.id === 8) {
          out.push({ type: 'endure', label: 'Held down: take the counterattack', rule: '19.2' });
          break;
        }
        /* [19.2] event 1, Surface gunnery, instead of the attack round. */
        if (ev && ev.id === 1 && !ev.done) {
          var guns = Combat.gunneryCandidates(state);
          if (guns.length) {
            guns.forEach(function (u) {
              out.push({ type: 'gunnery', unit: u.uid, label: 'Surface and shell this ship', rule: '19.2' });
            });
            break;
          }
        }
        /* [19.2] event 0, Target lumbers into way, before the first attack. */
        if (ev && ev.id === 0 && !ev.done && state.round === 1) {
          var lum = Combat.lumberCandidates(state);
          if (lum.length) {
            lum.forEach(function (u) {
              out.push({ type: 'lumber', unit: u.uid, label: 'This red-ball ship lumbers into the torpedoes', rule: '19.2' });
            });
            break;
          }
        }
        /* [IJN 4.3] a loner that is not a naval unit may be shelled instead. */
        if (state.loner && state.round === 1 && !state.allocations.length) {
          state.units.forEach(function (u) {
            if (!u.sunk && Combat.isMerchant(u) && u.column === state.sub.column) {
              out.push({ type: 'gunnery', unit: u.uid, label: 'Surface gunnery on the loner (Combat Event 1, by choice)', rule: 'IJN 4.3' });
            }
          });
        }
        /* [33.31] Surcouf / [31.65] Leviathan: with no Combat Event and no
         * warship revealed, the big guns may be used by choice (Event 1). */
        if (state.sub.gunnery && !state.loner && !ev && state.round === 1 && !state.allocations.length) {
          Combat.gunneryCandidates(state).forEach(function (u) {
            out.push({ type: 'gunnery', unit: u.uid, label: 'Surface and shell this ship with the big guns (Combat Event 1, by choice)', rule: state.sub.gunnery });
          });
        }
        /* [14.16] No attack can succeed: nothing in reach carries a TDC
         * marker, or every target is beyond hitting even with all points. */
        if (!state.allocations.length && !anyAttackPossible(state)) {
          out.push({ type: 'no_attack', rule: '14.16',
                     label: state.round === 1 ? 'No attack can succeed: no counterattack [14.16A]'
                                              : 'No attack can succeed: the escorts counterattack [14.16B]' });
          break;
        }
        state.units.forEach(function (u) {
          if (Combat.canTarget(v, u.uid).ok &&
              !state.allocations.some(function (a) { return a.unit === u.uid; })) {
            out.push({ type: 'target', unit: u.uid, label: 'Target this ship', rule: '14.14' });
          }
        });
        /* [14.14] "The player may select as many targets as he can allocate the
         * submarine's attack value to." Allocation is the interesting decision
         * in the game, so it is exposed a point at a time rather than split
         * evenly for the player. */
        state.allocations.forEach(function (a) {
          if (allocatedPoints(state) < state.sub.attack) {
            out.push({ type: 'points', unit: a.unit, delta: 1,
                       label: 'Add an attack point', rule: '14.14' });
          }
          if (a.points > 1) {
            out.push({ type: 'points', unit: a.unit, delta: -1,
                       label: 'Remove an attack point', rule: '14.14' });
          }
          out.push({ type: 'untarget', unit: a.unit, label: 'Drop this target', rule: '14.14' });
        });
        if (state.allocations.length) {
          out.push({ type: 'fire', label: 'Fire', rule: '14.15' });
        }
        break;
      }

      case '14.3':
        if (state.pc) {
          out.push({ type: 'withdraw', label: 'The pack withdraws from combat', rule: '14.3' });
          if (state.round === 1) out.push({ type: 'reattack', label: 'Wolfpack Re-Attack: each boat rolls its Tactical or less [24.55]', rule: '24.55' });
          break;
        }
        out.push({ type: 'withdraw', label: 'Withdraw from combat', rule: '14.3' });
        /* [14.41] the first Re-Attack is the player's option; a second needs a
         * Super Skipper and a roll = or < his rating. [14.42] then combat ends. */
        if (!state.sub.rtb && !state.sub.sunk) {
          if (state.round === 1) out.push({ type: 'reattack', label: 'Conduct a Re-Attack round', rule: '14.4' });
          else if (state.round === 2 && state.sub.superSkipper) {
            out.push({ type: 'reattack', rule: '14.41',
                       label: 'Try a second Re-Attack (Super Skipper roll: ' + state.sub.superSkipper.value + ' or less)' });
          }
        }
        break;

      case '14.4':
        /* [14.4] Before a Re-Attack the boat may move to an adjacent column. */
        Layout.adjacentColumns(state.sub.column).forEach(function (c) {
          out.push({ type: 'reposition', column: c, label: 'Move to column ' + c, rule: '14.4' });
        });
        out.push({ type: 'stay_column', label: 'Stay in column ' + state.sub.column, rule: '14.4' });
        break;

      case '15.0':
        Move.legalTransitMoves(moveView(state), { activeBaseAreas: state.activeBaseAreas })
          .moves.forEach(function (m) {
            out.push({ type: 'transit', area: m.area, steps: m.steps,
                       label: 'Transit to ' + m.area + ' (' + m.steps + ')', rule: '15.0' });
          });
        out.push({ type: 'hold', label: 'Stay in this area', rule: '15.0' });
        break;

      case '16.0':
        out.push({ type: 'end_turn', label: 'Conclude the turn', rule: '16.0' });
        break;
      default:
        break;
    }
    return out;
  }

  /* [14.8] Clean-Up: Japanese units go back to their cups (the italicized War
   * Mix ships, if sunk, leave the game) and TDC markers go back to the pool.
   * Before this the engine simply dropped both, so the pool of 24 TDCs ran dry
   * after a few fights and the next placement crashed; the soak found it. */
  var LEAVE_WHEN_SUNK = ['shokaku', 'taiho', 'shinano', 'yamato', 'kaga', 'asahi', 'izumo', 'bv36t'];
  /* [31.61 D] BBs appear only in these waters in East Wind Early: one drawn
   * elsewhere goes back and another is drawn in its place. */
  function drawFrom(state, cup, n, opts) {
    var got = Cups.draw(state.cups[cup], n, opts);
    if (!state.bbAreas || state.bbAreas.indexOf(state.area) > -1) return got;
    var back = [];
    got = got.map(function (p) {
      for (var g = 0; g < 8 && p && Ships.piece(p.piece) && Ships.piece(p.piece).type === 'BB'; g++) {
        back.push(p);
        p = Cups.draw(state.cups[cup], 1, opts)[0] || null;
      }
      return p && Ships.piece(p.piece) && Ships.piece(p.piece).type === 'BB' ? (back.push(p), null) : p;
    }).filter(Boolean);
    back.forEach(function (p) { state.cups[cup].push(p); });
    return got;
  }
  function cleanUp(state) {
    state.units.forEach(function (u) {
      if (u.tdc !== null && u.tdc !== undefined && state.tdcPool) state.tdcPool.push(u.tdcDrawn);
      /* [31.66] a capital ship damaged and escaping counts at its tonnage */
      var pc = Ships.piece(u.piece);
      if (state.damagedCapitalCounts && u.damaged && !u.sunk && !u.tallied && pc && ['CV', 'BB', 'AR', 'AC', 'CA'].indexOf(pc.type) > -1) {
        u.tallied = true; state.capitalDamagedTons = (state.capitalDamagedTons || 0) + pc.tonnage;
      }
      if (u.sunk && (LEAVE_WHEN_SUNK.indexOf(u.row) > -1 || (state.extraUnique || []).indexOf(u.row) > -1)) { state.goneRows = (state.goneRows || []).concat([u.row]); return; }
      if (state.cups && state.cups[u.cup]) {
        state.cups[u.cup].push({ uid: u.uid, row: u.row, piece: u.piece, cup: u.cup });
      }
    });
  }

  /* [14.2] The Counterattack Round, then Withdrawal [14.3] unless sunk. */
  function counterattack(state, v, opts) {
    state.phase = '14.2';
    var ca = Combat.counterattack(v, opts);
    push(state, [ca.record]);
    if (ca.extraRecord) push(state, [ca.extraRecord]);
    Combat.applyCounterattack(state, ca.result);
    if (state.sub.sunk) { lost(state); if (!state.done) state.phase = '14.3'; }
    else state.phase = '14.3';
  }

  function note(context, result, rule) {
    return Res.makeRecord({ context: context, table: 'Procedure [' + rule + ']', ruleRef: rule,
      inputs: [], drms: [], die: null, modifiedDie: null, target: null, result: result });
  }
  function shipName(u) {
    var p = Ships.piece(u.piece);
    return p ? (p.name || p.type + ' ' + p.tonnage + 't') : u.piece;
  }
  function sank(state, u) {
    var p = Ships.piece(u.piece);
    state.shipsSunk += 1;
    state.tonnageSunk += p.tonnage;
    /* Each boat's own tally too: in a wolfpack the career scores your boat. */
    state.sub.shipsSunk = (state.sub.shipsSunk || 0) + 1;
    /* Capital ships (CA, BB, CV) count for some campaigns' victory [31.24]. */
    if (p.type === 'CA' || p.type === 'BB' || p.type === 'CV') state.capitalSunk = (state.capitalSunk || 0) + 1;
    /* [31.66] East Wind Early doubles capital tonnage and counts BB/CV sunk */
    if (['CV', 'BB', 'AR', 'AC', 'CA'].indexOf(p.type) > -1) state.capitalTons = (state.capitalTons || 0) + p.tonnage;
    if (p.type === 'BB' || p.type === 'CV') state.bbcvSunk = (state.bbcvSunk || 0) + 1;
    state.sub.tonsSunk = Math.round(((state.sub.tonsSunk || 0) + p.tonnage) * 10) / 10;
    state.combatSunk.push({ unit: u.uid, tonnage: p.tonnage, merchant: Combat.isMerchant(u), by: state.sub.name });
  }
  function lost(state) {
    /* [24.41] a wolfpack member other than your boat is removed from play;
     * the pack fights on. Your own boat lost ends everything. */
    if (state.pack && state.flag && state.sub !== state.flag) {
      var m = state.sub;
      m.sunk = true;
      state.packLost = (state.packLost || 0) + 1;
      state.pack = state.pack.filter(function (x) { return x !== m; });
      push(state, [note(m.name, 'lost with all hands; the wolfpack fights on [24.41]', '24.41')]);
      if (state.pc) state.pc.memberDone = true;
      return;
    }
    state.outcome = 'lost'; state.done = true; state.phase = '16.0';
  }

  /* A result on the Counterattack-style rows, applied to the boat. */
  function hurt(state, result) {
    Combat.applyCounterattack(state, result);
    if (state.sub.sunk) lost(state);
  }

  /* [14.12] / [14.14] a Combat Event marker turned face up. Only one Event per
   * attack round; any further marker goes back to the cup. */
  function revealedEvent(state, u, opts) {
    if (state.roundEvent) {
      u.returned = true;
      push(state, [note('A second Combat Event marker this round', 'returned to the cup [14.12]', '14.12')]);
      return;
    }
    var ev = Combat.rollEvent(opts);
    push(state, [ev.record]);
    state.roundEvent = { id: ev.id, name: ev.name, round: state.round, done: false };
    state.combatEvents.push(ev.id);
    u.returned = true;           // the marker leaves the display once resolved
    if (ev.id === 3) {           // Betty bomber: Event Aircraft row, then Endurance
      var cdb = Combat.crashDive(state, 'a ' + (state.aircraftName || 'Betty bomber'), opts);
      if (cdb) push(state, [cdb.record]);
      var air = Combat.eventAircraft(opts, state.aircraftName);
      push(state, air.records);
      hurt(state, cdb && cdb.ok ? Combat.softened(air.result) : air.result);
      if (!state.done) state.phase = '14.7';
    } else if (ev.id === 4) {    // Mechanical troubles: no combat this turn
      var mech = Combat.mechanical(opts);
      push(state, [mech.record]);
      if (mech.odd) { Combat.damage(state); state.sub.rtb = true; }
      state.skipEndurance = true;
      state.phase = '14.7';
    }
  }

  /* [14.12] / [14.14] a Diligent Escort turned face up: its row, at once. In
   * the reveal step a damaged boat may then withdraw; at targeting it may not. */
  function revealedDiligent(state, mayWithdraw, opts) {
    /* [24.51] in a wolfpack the Diligent Escort attacks a boat chosen at random. */
    if (state.pc) {
      var boats = state.pc.order.filter(function (m) { return !m.sunk; });
      var target = boats[Cups.pickIndex(boats.length, opts)], active = state.sub, wasDone = state.pc.memberDone;
      push(state, [note('Diligent Escort', 'it goes for ' + target.name + ' [24.51]', '24.51')]);
      state.sub = target;
      diligentOn(state, false, opts);              // a member sunk here is removed by lost()
      if (!state.done && target.damagePending && !target.sunk) {
        push(state, Combat.resolveDamage(state, opts));
        if (target.sunk) lost(state);
      }
      if (state.pc) state.pc.memberDone = wasDone || active.sunk;
      state.sub = active;
      return;
    }
    diligentOn(state, mayWithdraw, opts);
  }
  function diligentOn(state, mayWithdraw, opts) {
    var cd = Combat.crashDive(state, 'a Diligent Escort', opts);
    if (cd) push(state, [cd.record]);
    var dg = Combat.diligentEscort(opts);
    push(state, dg.records);
    hurt(state, cd && cd.ok ? Combat.softened(dg.result) : dg.result);
    state.diligentWithdraw = mayWithdraw && state.sub.damaged && !state.done;
  }

  /* [14.14]-[14.15] Fire. Face-down targets are turned up first; an aircraft
   * or Combat Event found that way frees its points and the aim is taken
   * again. Then the round runs as the round's Combat Event says. */
  function fire(state, opts) {
    var v = state, freed = [];
    state.allocations.slice().forEach(function (a) {
      var u = Combat.unit(state, a.unit);
      if (u.revealed) return;
      u.revealed = true; u.revealedRound = state.round;
      if (Combat.isEvent(u)) {
        freed.push(a.unit);
        revealedEvent(state, u, opts);
      } else if (Combat.isAircraft(u)) {
        freed.push(a.unit);
        if (u.tdc !== null && u.tdc !== undefined) { state.tdcPool.push(u.tdcDrawn); u.tdc = null; u.tdcDrawn = undefined; }
        push(state, [note('Target turned up: an aircraft', 'its TDC marker is removed; its points are freed [14.14]', '14.14')]);
      } else if (Combat.isDiligent(u)) {
        revealedDiligent(state, false, opts);
      }
    });
    if (state.done || state.phase === '14.7') { state.allocations = []; return; }
    if (freed.length) {
      state.allocations = state.allocations.filter(function (a) { return freed.indexOf(a.unit) < 0; });
      push(state, [note('Targets turned face up', 'points freed: aim again, then Fire [14.14]', '14.14')]);
      return;                    // back to the aim: legalActions follow the new situation
    }
    var ev = state.roundEvent ? state.roundEvent.id : null;
    function attacks() {
      state.sunkThisPhase = [];
      var esc = Combat.escortTarget(state);
      if (esc) state.escortTargeted = esc;
      state.allocations.forEach(function (a) {
        var out = Combat.attack(v, a, opts);
        push(state, [out.record]);
        if (out.artRecord) push(state, [out.artRecord]);
        if (out.sunk) { state.sunkThisPhase.push({ unit: a.unit, tonnage: out.tonnage }); sank(state, Combat.unit(state, a.unit)); }
      });
      state.allocations = [];
    }
    if (ev === 7) {
      /* [19.2] event 7: the escorts attack first; the boat then attacks if it
       * is neither sunk nor forced home; no counterattack after. */
      counterattack(state, v, opts);
      if (!state.done && !state.sub.rtb) attacks();
      else state.allocations = [];
      if (!state.done) state.phase = '14.3';
      return;
    }
    attacks();
    if (ev === 2) {
      /* [19.2] event 2: a circular runner, with its own TDC marker. [IJN 5.1]
       * a boat that crash dives in time is missed automatically. */
      var cdc = Combat.crashDive(state, 'a circular running torpedo', opts);
      if (cdc) push(state, [cdc.record]);
      if (cdc && cdc.ok) { push(state, [note('Circular running torpedo', 'it misses the diving boat [IJN 5.1]', 'IJN 5.1')]); }
      else {
      var mk = state.tdcPool[Cups.pickIndex(state.tdcPool.length, opts)];
      var cr = Combat.circularRun(state, mk, opts);
      push(state, [cr.record]);
      if (cr.hit) { state.sub.sunk = true; lost(state); state.allocations = []; return; }
      }
    }
    if (ev === 9) {
      /* [19.2] event 9: the boat eludes the escorts; no counterattack. */
      push(state, [note('Combat - combat', 'no counterattack this round [19.2]', '19.2')]);
      state.phase = '14.3';
      return;
    }
    counterattack(state, v, opts);
  }

  /* [14.5]-[14.8] end of the Combat Phase: tonnage doubled, Super Skipper. */
  function endOfCombat(state, opts) {
    if (state.combatEvents.indexOf(6) > -1) {
      var big = state.combatSunk.filter(function (x) { return x.merchant; })
        .sort(function (a, b) { return b.tonnage - a.tonnage; })[0];
      if (big) {
        state.tonnageSunk += big.tonnage;
        push(state, [note('Tonnage doubled', 'the largest merchant sunk counts twice: +' + big.tonnage + ',000 t [19.2]', '19.2')]);
      }
    }
    /* [14.5] 3 or more ships totalling 16,000 t or more in this Combat Phase. */
    /* [32.0] Patrol Games: "Super Skippers are not used". */
    if (!state.noSuperSkipper && Combat.superSkipperEarned(state.combatSunk)) {
      var ss = state.sub.superSkipper;
      if (!ss) state.sub.superSkipper = { name: 'drawn', value: 1 };
      else if (ss.value === 1) ss.value = 2;
      push(state, [note('Super Skipper', !ss ? 'a Super Skipper joins at +1 [14.5]' :
        ss.value === 2 ? 'the Super Skipper rises to +2 [14.5]' : 'already +2 [14.5]', '14.5')]);
    }
    state.combatSunk = [];
  }

  /* [14.6] Sub vs. Sub: one round, automatic, then Endurance. */
  function subVsSub(state, opts) {
    var pool = state.tdcPool || Cups.tdcPool();
    var r = Combat.subVsSub(state, dateOf(state), function (name) {
      return SubCls.classes.filter(function (c) { return c.name === name.toUpperCase(); })[0];
    }, function () { return pool[Cups.pickIndex(pool.length, opts)]; }, Cups.pickIndex, opts);
    push(state, r.records);
    state.enemySub = r.enemy || null;
    if (r.hit && r.weFirst && r.sunk) {
      state.shipsSunk += 1;
      state.tonnageSunk += r.enemy.tonnage;
    } else if (r.hit && !r.weFirst) {
      if (r.sunk) { state.sub.sunk = true; lost(state); return; }
      if (r.damaged) Combat.damage(state);
    }
    state.phase = '14.7';
  }

  /* ---- [24.0] Wolfpack combat ----
   * state.pack: the boats of the pack (your boat is state.flag). A contact
   * opens state.pc: { order: boats in this combat, i, placing, stage }.
   * stage 'place' [24.5] -> 'turns' (one boat at a time [24.53]) -> 'decide'
   * (withdraw, or Re-Attack once [24.55]) -> 'end'. state.sub is the boat
   * acting; outside a pack combat it is always your boat. */
  function setActive(state, i) {
    var m = state.pc.order[i];
    state.pc.i = i;
    state.packIndex = state.pc.acted;
    state.sub = m;
    state.revealedThisRound = 0; state.tdcPlaced = 0; state.allocations = [];
    newRound(state);
  }
  function packStart(state, participants) {
    state.pc = { order: participants, i: 0, placing: 0, stage: 'place', acted: 0, memberDone: false };
    state.sub = participants[0];
  }
  function columnCount(state, col) {
    return state.pc.order.filter(function (m, k) { return k < state.pc.placing && m.column === col && !m.sunk; }).length;
  }
  function nextActor(state, from) {
    for (var k = from; k < state.pc.order.length; k++) {
      var m = state.pc.order[k];
      if (!m.sunk && !m.out) return k;
    }
    return -1;
  }
  /* After an action: has the acting boat's turn ended? Then the next boat,
   * or the pack's decision, or the end of the Combat Phase. */
  function packAdvance(state, opts) {
    var pc = state.pc;
    if (!pc || state.done || pc.stage !== 'turns') return;
    var over = pc.memberDone || state.phase === '14.3' || state.phase === '14.7' || state.phase === '16.0';
    if (!over) return;
    var cur = state.sub;
    if (cur.damagePending && !cur.sunk) {
      push(state, Combat.resolveDamage(state, opts));
      if (cur.sunk) lost(state);
      if (state.done) return;
    }
    if (state.phase === '14.7' && !cur.sunk) cur.out = true;          // Betty, engine trouble, or a withdrawal
    if (state.skipEndurance) { cur.skipEnd = true; state.skipEndurance = false; }
    pc.memberDone = false;
    pc.acted += 1;
    var nx = nextActor(state, pc.i + 1);
    if (nx > -1) { setActive(state, nx); state.phase = '14.12'; return; }
    state.sub = state.flag;
    var canGo = pc.order.some(function (m) { return !m.sunk && !m.out && !m.rtb; });
    if (state.round === 1 && canGo) { pc.stage = 'decide'; state.phase = '14.3'; }
    else { pc.stage = 'end'; state.phase = '14.7'; }
  }
  /* [24.55] Re-Attack once: each boat rolls its Tactical (+ Super Skipper) or
   * less, damaged boats +2 on the roll; those who fail withdraw. */
  function packReattack(state, opts) {
    var pc = state.pc, going = [];
    pc.order.forEach(function (m) {
      if (m.sunk || m.out || m.rtb) return;
      var ss = m.superSkipper ? m.superSkipper.value : 0, need = m.tactical + ss;
      var drms = m.damaged ? [{ label: 'Damaged', value: 2, rule: '24.55' }] : [];
      var d = Res.d10(opts), md = d + Res.sum(drms), ok = md <= need;
      push(state, [Res.makeRecord({ context: 'Wolfpack Re-Attack: ' + m.name, table: 'Wolfpack Re-Attack [24.55]', ruleRef: '24.55',
        inputs: [{ label: 'Tactical' + (ss ? ' + Super Skipper' : ''), value: need, rule: '24.55' }], drms: drms, die: d, modifiedDie: md, target: need,
        result: ok ? 'goes round again' : 'loses the convoy: withdraws, still in the pack' })]);
      if (ok) going.push(m); else m.out = true;
    });
    if (!going.length) { pc.stage = 'end'; state.phase = '14.7'; state.sub = state.flag; return; }
    Combat.beginReAttack(state).forEach(function (mk) { state.tdcPool.push(mk); });
    pc.stage = 'turns'; pc.acted = 1;                   // [IJN 6.1e] no longer the first to attack
    setActive(state, pc.order.indexOf(going[0]));
    state.phase = '14.12';
  }
  /* [14.5]-[14.8] and [24.6]-[24.7] for the whole pack, then Endurance for
   * every boat, drop-outs and disbanding [24.14]. */
  function packEnd(state, opts) {
    var pc = state.pc, boats = state.pack.slice();
    /* Super Skipper per boat, from what each sank. */
    var by = {};
    state.combatSunk.forEach(function (x) { (by[x.by] = by[x.by] || []).push(x); });
    boats.forEach(function (m) {
      var mine = by[m.name] || [];
      if (!state.noSuperSkipper && Combat.superSkipperEarned(mine)) {
        var had = m.superSkipper;
        if (!had) m.superSkipper = { name: 'drawn', value: 1 };
        else if (had.value === 1) had.value = 2;
        push(state, [note('Super Skipper — ' + m.name, !had ? 'a Super Skipper joins at +1 [14.5]' : 'the Super Skipper rises to +2 [14.5]', '14.5')]);
      }
    });
    if (state.combatEvents.indexOf(6) > -1) {
      var big = state.combatSunk.filter(function (x) { return x.merchant; }).sort(function (a, b) { return b.tonnage - a.tonnage; })[0];
      if (big) { state.tonnageSunk += big.tonnage; push(state, [note('Tonnage doubled', '+' + big.tonnage + ',000 t [19.2]', '19.2')]); }
    }
    /* [24.7] two or more boats each sank a ship: a Wolfpack Experience Point, once a patrol. */
    if (Object.keys(by).length >= 2 && !state.packXpThisPatrol) {
      state.packXpThisPatrol = true;
      state.packXp = (state.packXp || 0) + 1;
      push(state, [note('Wolfpack Experience', 'two boats sank ships in one fight: experience ' + state.packXp + ' [24.7]', '24.7')]);
    }
    state.combatSunk = [];
    /* [24.6] one boat spotted spots them all. */
    if (boats.some(function (m) { return m.spotted; })) boats.forEach(function (m) { m.spotted = true; });
    /* Endurance, boat by boat [14.7]. */
    boats.forEach(function (m) {
      if (m.sunk) return;
      state.sub = m;
      if (state.smz) { m.rtb = true; return; }
      if (m.skipEnd) { push(state, [note('No Endurance roll — ' + m.name, 'mechanical troubles [19.2]', '19.2')]); return; }
      var e = Combat.endurance(state, state.enduranceDrm, opts);
      e.record.context = m.name + ': ' + e.record.context;
      push(state, [e.record]);
      if (!e.stays) m.rtb = true;
    });
    if (state.smz) push(state, [note('Special Mission Zone', 'no Endurance checks: the pack is marked RTB [20.5]', '20.5')]);
    state.sub = state.flag;
    boats.forEach(function (m) { m.out = false; m.skipEnd = false; });
    state.pc = null;
    packDropOuts(state);
  }
  /* [24.14] boats that must go home leave the pack; below three it disbands,
   * at once. Boats that leave go back to the rest of the fleet. */
  function packDropOuts(state) {
    if (!state.pack) return;
    var flag = state.flag;
    if (flag.rtb) {
      var others = state.pack.filter(function (m) { return m !== flag && !m.sunk; });
      if (others.length) push(state, [note('Wolfpack', 'your boat must go home: the pack breaks up; ' + others.map(function (m) { return m.name; }).join(' and ') + ' rejoin the fleet [24.14]', '24.14')]);
      state.pack = null;
      return;
    }
    state.pack.slice().forEach(function (m) {
      if (m !== flag && (m.rtb || m.sunk)) {
        state.pack = state.pack.filter(function (x) { return x !== m; });
        if (!m.sunk) push(state, [note('Wolfpack', m.name + ' must go home and leaves the pack [24.41]', '24.41')]);
      }
    });
    if (state.pack.length < 3) {
      push(state, [note('Wolfpack', 'below three boats: the pack disbands [24.14]', '24.14')]);
      state.pack = null;
    }
  }

  /* ---- [IJN 4.2-4.3] a Loner (optional rule) ---- */
  var LONER_CUP = { W1: 'A', W2: 'B', W3: 'C', W4: 'D' };
  function lonerSetup(state, opts) {
    state.cups = state.cups || Cups.build(state.warPeriod, opts);
    state.tdcPool = state.tdcPool || Cups.tdcPool();
    state.units = [];
    freshCombat(state);
    state.loner = true;
    var cup = LONER_CUP[state.warPeriod], got = Cups.draw(state.cups[cup], 1, opts)[0];
    if (!got) { push(state, [note('Loner', 'the cup is empty: nothing to attack', 'IJN 4.2')]); state.phase = '14.7'; return; }
    var u = { uid: got.uid, row: got.row, cup: got.cup, piece: got.piece, column: cup, revealed: true, revealedRound: 1,
              damaged: false, sunk: false, tdc: null };
    state.units.push(u);
    var ss = state.sub.superSkipper ? state.sub.superSkipper.value : 0;
    var d = Res.d10(opts), m = d - ss, same = m <= state.sub.tactical;
    state.sub.column = same ? cup : Layout.adjacentColumns(cup)[0];
    push(state, [Res.makeRecord({ context: 'Loner: the submarine\'s approach', table: 'Loners [IJN 4.2]', ruleRef: 'IJN 4.2',
      inputs: [{ label: 'Tactical rating', value: state.sub.tactical, rule: 'IJN 4.2' }],
      drms: ss ? [{ label: 'Super Skipper', value: -ss, rule: 'IJN 4.2' }] : [], die: d, modifiedDie: m, target: state.sub.tactical,
      result: 'the boat is in column ' + state.sub.column + (same ? ', with the target' : ', next to the target') + '; the target: ' + shipName(u) })]);
    state.enduranceDrm = -1;                     // [IJN 4.3] −1 on the Endurance check after
    if (Combat.isEvent(u)) {
      u.returned = true;
      var ev = Combat.rollEvent(opts);
      push(state, [ev.record]);
      if (ev.id === 3 || ev.id === 4) {
        state.roundEvent = { id: ev.id, name: ev.name, round: 1, done: false };
        state.combatEvents.push(ev.id);
        if (ev.id === 3) {
          var air = Combat.eventAircraft(opts, state.aircraftName); push(state, air.records); hurt(state, air.result);
        } else {
          var mech = Combat.mechanical(opts); push(state, [mech.record]);
          if (mech.odd) { Combat.damage(state); state.sub.rtb = true; }
          state.skipEndurance = true;
        }
      } else {
        push(state, [note('Loner: a Combat Event marker', 'only 3 or 4 apply to a loner: no event, and no ship [IJN 4.3]', 'IJN 4.3')]);
      }
      if (!state.done) state.phase = '14.7';
      return;
    }
    if (Combat.isAircraft(u)) {
      push(state, [note('Loner: an aircraft', 'one counterattack round, then combat ends [IJN 4.3]', 'IJN 4.3')]);
      counterattack(state, state, opts);
      if (!state.done) state.phase = '14.7';
      return;
    }
    state.phase = '14.13';                       // placed and revealed: straight to the firing solution
  }

  /* ---- [27.0] Quick Resolution ---- */
  var QR_CUPS = ['A', 'B', 'C', 'D'];
  function quick(state, opts) {
    var sub = state.sub, rows = { W1: 0, W2: 1, W3: 2, W4: 3 };
    var d1 = Res.d10(opts), d2 = Res.d10(opts);
    push(state, [Res.makeRecord({ context: 'Quick Resolution: two dice', table: 'Quick Resolution [27.0]', ruleRef: '27.0',
      inputs: [{ label: 'First die', value: d1, rule: '27.0' }], drms: [], die: d2, modifiedDie: d2, target: null,
      result: d1 === 0 && d2 === 0 ? '0,0: an enemy submarine [14.6]' : 'no enemy submarine' })]);
    if (d1 === 0 && d2 === 0) { subVsSub(state, opts); return; }
    var began = { damaged: sub.damaged };
    /* Step 2: the attack value; Step 3: the chart's non-white boxes. */
    var less = Math.min(2, (sub.damaged ? 1 : 0) + (sub.spotted ? 1 : 0));
    var skip = sub.superSkipper ? sub.superSkipper.value : 0;
    var av = sub.attack + skip + state.torpedoValue - less;
    var line = Aac.charts[state.area].grid[rows[state.warPeriod]];
    var boxes = line.filter(function (c) { return c !== 'none'; }).length;
    var value = Tables.quickLookup(av, boxes);
    /* Step 4-5: one die, less ULTRA, radar, wolfpack (at most -3). */
    var drms = [];
    if (state.ultra) drms.push({ label: 'ULTRA Area', value: -1, rule: '27.0' });
    if (state.radar) drms.push({ label: 'Radar (1943-45)', value: -1, rule: '27.0' });
    if (state.pack) drms.push({ label: 'Wolfpack member', value: -1, rule: '27.0' });
    var die = Res.d10(opts), mod = die + Res.sum(drms), n = Math.max(0, value - mod);
    push(state, [Res.makeRecord({ context: 'Quick Resolution Table', table: 'Quick Resolution [27.0]', ruleRef: '27.0',
      inputs: [{ label: 'Attack value (attack + skipper + Mk-XIV' + (less ? ', −' + less : '') + ')', value: av, rule: '27.0' },
               { label: 'Non-white boxes on the chart', value: boxes, rule: '27.0' },
               { label: 'Table value', value: value, rule: '27.0' }],
      drms: drms, die: die, modifiedDie: mod, target: value,
      result: n ? n + ' ship' + (n > 1 ? 's' : '') + ' drawn: sunk unless Diligent Escorts' : 'nothing sunk; no fight this week' })]);
    if (!n) { state.enduranceDrm = -1; state.phase = '14.7'; return; }
    /* Step 6-10: draw from A, B, C, D in turn, carrying on from last time. */
    state.cups = state.cups || Cups.build(state.warPeriod, opts);
    state.tdcPool = state.tdcPool || Cups.tdcPool();
    state.units = [];
    freshCombat(state);
    var stop = false;
    for (var i = 0; i < n && !stop && !state.done; i++) {
      var cup = QR_CUPS[((state.qrCup || 0) + i) % 4];
      var got = drawFrom(state, cup, 1, opts)[0];
      if (!got) continue;
      var u = { uid: got.uid, row: got.row, cup: got.cup, piece: got.piece, column: cup, revealed: true,
                damaged: false, sunk: false, tdc: null };
      if (state.diligentPieces && state.diligentPieces.indexOf(got.piece) > -1) u.diligent = true;
      state.units.push(u);
      if (Combat.isEvent(u)) {
        u.returned = true;
        var ev = Combat.rollEvent(opts);
        push(state, [ev.record]);
        if (ev.id === 2) {
          var mk = state.tdcPool[Cups.pickIndex(state.tdcPool.length, opts)];
          var cr = Combat.circularRun(state, mk, opts);
          push(state, [cr.record]);
          if (cr.hit) { sub.sunk = true; lost(state); return; }
        } else if (ev.id === 3) {
          var air = Combat.eventAircraft(opts, state.aircraftName);
          push(state, air.records);
          hurt(state, air.result);
          stop = true;
        } else if (ev.id === 4) {
          var mech = Combat.mechanical(opts);
          push(state, [mech.record]);
          if (mech.odd) { Combat.damage(state); sub.rtb = true; }
          state.skipEndurance = true;
          state.phase = '14.7';
          return;
        } else {
          push(state, [note('Combat Event ' + ev.name, 'disregarded in Quick Resolution [27.0]', '27.0')]);
        }
      } else if (Combat.isDiligent(u)) {
        revealedDiligent(state, false, opts);
      } else if (Combat.isAircraft(u)) {
        var ea = Combat.eventAircraft(opts, state.aircraftName);
        push(state, ea.records);
        hurt(state, ea.result);
      } else {
        u.sunk = true;
        sank(state, u);
        push(state, [note('Quick Resolution: ' + shipName(u) + ' (cup ' + cup + ')', 'SUNK [27.0]', '27.0')]);
      }
    }
    state.qrCup = ((state.qrCup || 0) + n) % 4;
    if (state.done) return;
    if (state.phase === '14.7') return;
    /* [27.1] the counterattack: die − half the Defense (rounded up), +1 if
     * the boat began damaged; the box colour on this area's line. */
    var cdrms = [{ label: 'Half the Defense, rounded up', value: -Math.ceil(sub.defense / 2), rule: '27.1' }];
    if (began.damaged) cdrms.push({ label: 'Began the combat damaged', value: 1, rule: '27.1' });
    var cd = Res.d10(opts), cm = cd + Res.sum(cdrms), col = line[Math.max(0, Math.min(9, cm))];
    var what = Tables.quickCounter[col];
    push(state, [Res.makeRecord({ context: 'Quick Resolution counterattack', table: 'Quick Resolution Counter Attack [27.1]', ruleRef: '27.1',
      inputs: [], drms: cdrms, die: cd, modifiedDie: cm, target: null,
      result: { ends: 'white: combat ends', spotted: 'green: spotted', rtb: 'orange: must RTB', damaged: 'blue: damaged', sunk: 'red: SUNK' }[what] })]);
    if (what === 'spotted') sub.spotted = true;
    else if (what === 'rtb') sub.rtb = true;
    else if (what === 'damaged') Combat.damage(state);
    else if (what === 'sunk') { sub.sunk = true; lost(state); return; }
    state.phase = '14.7';
  }

  function isLegal(state, action) {
    return legalActions(state).some(function (a) {
      return a.type === action.type &&
             (a.area === undefined || a.area === action.area) &&
             (a.unit === undefined || a.unit === action.unit) &&
             (a.column === undefined || a.column === action.column) &&
             (a.delta === undefined || a.delta === action.delta) &&
             (!!a.barrier === !!action.barrier);
    });
  }

  function apply(state, action, opts) {
    if (!isLegal(state, action)) {
      throw new Error('sw_patrol: illegal action "' + action.type + '" in phase ' + state.phase);
    }
    state.history.push({ phase: state.phase, action: action.type });
    var v = combatView(state);

    switch (action.type) {
      case 'move':
        state.area = action.area;
        state.phase = '13.1';
        break;
      case 'stay':
        state.phase = '13.1';
        break;

      case 'bypass':
        state.enduranceDrm = -1;
        state.phase = '14.7';
        break;
      case 'rtb':
        state.sub.rtb = true;
        state.phase = '15.0';
        break;

      case 'quick':
        quick(state, opts);
        break;

      case 'search': {
        /* Campaign layer: a Special Mission Zone raises the Activity Level one
         * step [20.4]; a War Event may restrict which contacts count. */
        var res = Search.run({
          area: state.area, warPeriod: state.warPeriod, ultra: state.ultra,
          spotted: state.sub.spotted, bypass: false, barrierWolfpack: !!(state.pack && action.barrier),
          activityShift: state.smz ? 1 : 0, contactsOnly: state.contactsOnly || null,
          contactsWhy: state.contactsWhy || null
        }, opts);
        push(state, res.records);
        state.enduranceDrm = res.enduranceDrm;
        if (res.outcome === 'sub_vs_sub') {
          subVsSub(state, opts);
          break;
        }
        if (res.outcome === 'loner') { lonerSetup(state, opts); break; }
        if (res.outcome === 'contact') {
          state.cups = state.cups || Cups.build(state.warPeriod, opts);
          state.tdcPool = state.tdcPool || Cups.tdcPool();
          state.units = [];
          freshCombat(state);
          ['A', 'B', 'C', 'D'].forEach(function (c, i) {
            var n = res.draw[i];
            if (!n) return;
            drawFrom(state, c, n, opts).forEach(function (p) {
              var nu = { uid: p.uid, row: p.row, cup: p.cup, piece: p.piece, column: c,
                         revealed: false, damaged: false, sunk: false, tdc: null };
              if (state.diligentPieces && state.diligentPieces.indexOf(p.piece) > -1) nu.diligent = true;
              state.units.push(nu);
            });
          });
          if (state.pack) {
            /* [24.31] a Group pack all engage; [24.32] a Barrier pack: one boat
             * at random made contact, each other intercepts on 0-5. */
            var inIt = state.pack.slice();
            if (action.barrier) {
              var first = inIt[Cups.pickIndex(inIt.length, opts)];
              push(state, [note('Barrier pack', first.name + ' made the contact [24.32]', '24.32')]);
              inIt = [first].concat(inIt.filter(function (m) { return m !== first; }).filter(function (m) {
                var d = Res.d10(opts), ok = d <= 5;
                push(state, [Res.makeRecord({ context: 'Barrier pack: can ' + m.name + ' intercept?', table: 'Wolfpacks [24.32]', ruleRef: '24.32',
                  inputs: [], drms: [], die: d, modifiedDie: d, target: 5, result: ok ? 'intercepts' : 'cannot catch the convoy: set aside' })]);
                return ok;
              }));
            }
            packStart(state, inIt);
          }
          state.phase = '14.11';
        } else {
          state.outcome = res.outcome;
          state.phase = '14.7';
        }
        break;
      }

      case 'place':
        Combat.placeSub(v, action.column);
        state.sub.column = action.column;
        if (state.pc) {
          state.pc.placing += 1;
          if (state.pc.placing < state.pc.order.length) { state.sub = state.pc.order[state.pc.placing]; break; }
          state.pc.stage = 'turns';
          setActive(state, 0);
        }
        state.phase = '14.12';
        break;

      case 'reveal': {
        var r = Combat.reveal(v, action.unit, opts);
        if (r.event) revealedEvent(state, r.unit, opts);
        else if (r.diligent) revealedDiligent(state, true, opts);
        break;
      }
      case 'unflip':
        push(state, [Combat.unflip(state, action.unit)]);
        break;
      case 'done_reveal':
        state.lastReveal = null;
        state.diligentWithdraw = false;
        state.phase = '14.13';
        break;

      case 'tdc': {
        /* The marker as drawn is kept (it is what returns to the pool [14.8]);
         * in a Re-Attack it counts one better, except a -3 [14.4]. */
        var marker = state.tdcPool.splice(Cups.pickIndex(state.tdcPool.length, opts), 1)[0];
        Combat.placeTdc(v, action.unit, Combat.tdcEffective(state, marker)).tdcDrawn = marker;
        break;
      }
      case 'done_tdc':
        Combat.revealTdcs(v);
        state.phase = '14.14';
        break;

      case 'target': {
        /* One point to start with; the player adds more explicitly [14.14]. */
        state.allocations.push({ unit: action.unit, points: 1 });
        break;
      }

      case 'points': {
        var alloc = state.allocations.filter(function (a) { return a.unit === action.unit; })[0];
        if (alloc) alloc.points += action.delta;
        break;
      }

      case 'untarget':
        state.allocations = state.allocations.filter(function (a) { return a.unit !== action.unit; });
        break;

      case 'fire':
        fire(state, opts);
        break;

      case 'no_attack':
        /* [14.16A] first round: no counterattack, straight to Withdrawal.
         * [14.16B] Re-Attack round: the escorts counterattack regardless. */
        push(state, [note('No successful attack can be made', state.round === 1
          ? 'no counterattack: withdraw or Re-Attack [14.16A]' : 'the escorts counterattack anyway [14.16B]', '14.16')]);
        if (state.round === 1) state.phase = '14.3';
        else counterattack(state, v, opts);
        break;

      case 'endure':
        /* [19.2] event 8: held down; the counterattack, and no attack. */
        counterattack(state, v, opts);
        break;

      case 'lumber': {
        /* [19.2] event 0: a face-down red-ball ship crosses the torpedoes. */
        var lu = Combat.unit(state, action.unit);
        lu.revealed = true; lu.revealedRound = state.round;
        state.roundEvent.done = true;
        if (Combat.isEvent(lu) || !Ships.piece(lu.piece) || !Ships.piece(lu.piece).tonnage) {
          lu.returned = true;
          push(state, [note('It was not a ship', 'returned to the cup [14.12]', '19.2')]);
          break;
        }
        var lp = Ships.piece(lu.piece);
        var lo = Combat.artOn(lu, lp.tonnage, state.torpedoValue, 'Lumbers into the torpedoes: ' + shipName(lu), '19.2', opts);
        lo.record.unit = lu.uid;
        push(state, [lo.record]);
        if (lo.sunk) sank(state, lu);
        break;
      }

      case 'gunnery': {
        /* [19.2] event 1: surface, be spotted, shell one merchant on the
         * 26-35 line without the Mk-XIV; then the counterattack. */
        var gu = Combat.unit(state, action.unit);
        state.sub.spotted = true;
        if (state.roundEvent) state.roundEvent.done = true;
        var go = Combat.artOn(gu, state.sub.gunLine || 30, 0, 'Surface gunnery: ' + shipName(gu), state.sub.gunnery || '19.2', opts);
        go.record.unit = gu.uid;
        push(state, [go.record]);
        if (go.sunk) sank(state, gu);
        counterattack(state, v, opts);
        break;
      }

      case 'reattack': {
        if (state.pc) { packReattack(state, opts); break; }
        if (state.round === 2) {
          /* [14.41] the second Re-Attack: roll = or < the Super Skipper. */
          var sd = Res.d10(opts), ok = sd <= state.sub.superSkipper.value;
          push(state, [Res.makeRecord({ context: 'Second Re-Attack: Super Skipper roll', table: 'Re-Attack [14.41]',
            ruleRef: '14.41', inputs: [{ label: 'Super Skipper rating', value: state.sub.superSkipper.value, rule: '14.41' }],
            drms: [], die: sd, modifiedDie: sd, target: state.sub.superSkipper.value,
            result: ok ? 'the boat goes round a third time' : 'no: combat ends' })]);
          if (!ok) { state.phase = '14.7'; break; }
        }
        Combat.beginReAttack(v).forEach(function (m) { state.tdcPool.push(m); });
        newRound(state);
        state.phase = '14.4';
        break;
      }
      case 'reposition':
        Combat.placeSub(v, action.column);
        state.phase = '14.12';
        break;
      case 'stay_column':
        state.phase = '14.12';
        break;

      case 'withdraw':
        if (state.pc && state.pc.stage === 'decide') { state.pc.stage = 'end'; state.sub = state.flag; }
        state.phase = '14.7';
        break;

      case 'end_turn':
        cleanUp(state);
        state.turn += 1;
        state.round = 1;
        state.revealedThisRound = 0;
        state.tdcPlaced = 0;
        state.units = [];
        freshCombat(state);
        state.phase = state.sub.rtb ? '15.0' : '12.0';
        if (state.sub.rtb && state.activeBaseAreas.indexOf(state.area) > -1) {
          state.outcome = 'returned';
          state.done = true;
        }
        break;

      case 'transit':
        state.area = action.area;
        state.phase = '16.0';
        break;
      case 'hold':
        state.phase = '16.0';
        break;
      default:
        throw new Error('sw_patrol: unhandled action ' + action.type);
    }

    /* [18.1] / [18.2] a second or third Damage marker is resolved at once. */
    if (state.sub.damagePending && !state.done) {
      push(state, Combat.resolveDamage(state, opts));
      if (state.sub.sunk) lost(state);
    }
    /* [24.53] a wolfpack: the next boat's turn, the pack's decision, or the end. */
    packAdvance(state, opts);
    if (state.pack && state.phase === '14.7' && !state.done && (!state.pc || state.pc.stage === 'end')) {
      packEnd(state, opts);
      state.enduranceDrm = 0; state.skipEndurance = false;
      state.phase = '16.0';
    }

    /* Automatic phases: endurance and clean-up need no decision. */
    if (state.phase === '14.7' && !state.done) {
      endOfCombat(state, opts);
      if (state.smz && state.smzWeeks > 1) {
        /* [31.13] a boat ordered to stay in a zone for so many turns. */
        state.smzWeeks -= 1;
        push(state, [note('Special Mission Zone', 'no Endurance check; the boat stays in ' + state.smz + ' as ordered [31.13]', '31.13')]);
      } else if (state.smz) {
        /* [20.5] In an SMZ: no Endurance check; the boat is marked RTB. */
        state.sub.rtb = true;
        push(state, [note('Special Mission Zone', 'no Endurance check: marked RTB, back to the DONE section of ' +
          state.area + ' [20.5]', '20.5')]);
      } else if (state.skipEndurance) {
        push(state, [note('No Endurance roll this turn', 'mechanical troubles [19.2]', '19.2')]);
      } else {
        var e = Combat.endurance(v, state.enduranceDrm, opts);
        push(state, [e.record]);
        if (!e.stays) state.sub.rtb = true;
      }
      state.enduranceDrm = 0;
      state.skipEndurance = false;
      state.phase = '16.0';
    }
    return state;
  }

  /* [14.8] Clean-Up now, for a fleet: several boats fight in one week and
   * share the cups and the TDC pool (Phase 8). */
  function cleanNow(state) {
    cleanUp(state);
    state.units = [];
    state.allocations = [];
  }

  root.SWPatrol = {
    create: create,
    cleanUp: cleanNow,
    _drawFrom: drawFrom,          // tests: [31.61 D] the battleship doctrine
    dateOf: dateOf,
    allocatedPoints: allocatedPoints,
    legalActions: legalActions,
    isLegal: isLegal,
    apply: apply
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
