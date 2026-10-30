/* sw_combat.js — the Combat Phase [14.0]. PURE MODULE.
 * ZERO DOM, ZERO Math.random; dice arrive through opts.rollDie.
 *
 * Everything the UI needs in order to hard-lock is a `can*` function here:
 * canReveal, canPlaceTdc, canTarget, canAllocate. Each answers with a reason
 * when the answer is no, and the reason cites the rule. The UI renders those
 * reasons; it never works one out.
 */
(function (root) {
  'use strict';

  var req = typeof require === 'function' ? require : null;
  var Tables = root.SWTables || (req ? req('../data/sw_tables.js').SWTables : null);
  var Ships  = root.SWShips  || (req ? req('../data/sw_ships.js').SWShips : null);
  var Aac    = root.SWAac    || (req ? req('../data/sw_aac.js').SWAac : null);
  var Res    = root.SWResolution || (req ? req('./sw_resolution.js').SWResolution : null);
  var Fog    = root.SWFog    || (req ? req('./sw_fog.js').SWFog : null);
  var Layout = root.SWLayout || (req ? req('../data/sw_layout.js').SWLayout : null);

  var COLUMNS = ['A', 'B', 'C', 'D'];

  function piece(u) { return Ships.piece(u.piece); }
  function isAircraft(u) { return piece(u).type === 'AIR'; }
  function isEvent(u) { return u.piece === 'combat_event'; }
  /* [31.61 D] East Wind Early also treats the DD 6-3 as a Diligent Escort. */
  function isDiligent(u) { return u.piece === 'dd2t74(diligent)' || !!u.diligent; }

  function eligibleColumns(state) {
    return [state.sub.column].concat(Layout.adjacentColumns(state.sub.column));
  }
  function inEligibleColumn(state, u) {
    return eligibleColumns(state).indexOf(u.column) > -1;
  }
  /* On the display and in play: not sunk, and not a second Combat Event
   * marker returned to the cup this round [14.12]. */
  function live(state) {
    return state.units.filter(function (u) { return !u.sunk && !u.returned; });
  }
  function unit(state, uid) {
    return state.units.filter(function (u) { return u.uid === uid; })[0] || null;
  }
  function isMerchant(u) { var p = piece(u); return p && (p.type === 'M' || p.type === 'AO' || p.type === 'AF'); }
  /* Any revealed IJN warship, aircraft or Diligent Escort on the display. */
  function isWarship(u) { return !isEvent(u) && !isMerchant(u); }

  /* ---- [14.11] place the submarine ---- */
  function placeSub(state, column) {
    if (COLUMNS.indexOf(column) < 0) throw new Error('sw_combat: no such column ' + column);
    state.sub.column = column;
    return state;
  }

  /* ---- [14.12] Reveal, Tactical Rating many, own or adjacent column ---- */
  function revealBudget(state) { return state.sub.tactical; }

  function canReveal(state, uid) {
    var u = unit(state, uid);
    if (!u) return { ok: false, why: 'No such counter.' };
    if (u.sunk) return { ok: false, why: 'Already sunk.' };
    if (u.revealed) return { ok: false, why: 'Already face up.' };
    if (u.returned) return { ok: false, why: 'Returned to the cup [14.12].' };
    if (u.unflippedRound === state.round) {
      return { ok: false, why: 'Turned back face down by radar: another unit must be revealed in its place [14.12].' };
    }
    if (!inEligibleColumn(state, u)) {
      return { ok: false, why: 'Only the submarine’s own column or an adjacent one [14.12].' };
    }
    if (state.revealedThisRound >= revealBudget(state)) {
      return { ok: false, why: 'Tactical Rating ' + state.sub.tactical + ' is spent [14.12].' };
    }
    /* [14.4A] In a Re-Attack, Rising Sun flags must be turned first. */
    if (state.round > 1) {
      var flagsLeft = live(state).some(function (x) {
        return !x.revealed && inEligibleColumn(state, x) && backOf(x) === 'battle';
      });
      if (flagsLeft && backOf(u) !== 'battle') {
        return { ok: false, why: 'Rising Sun flags must be revealed first in a Re-Attack [14.4A].' };
      }
    }
    return { ok: true, why: null };
  }

  /* Which counter back a piece shows — it governs Re-Attack reveal order. */
  function backOf(u) {
    var p = piece(u);
    if (u.piece === 'combat_event') return 'merchant';
    return (p.type === 'M' || p.type === 'AO' || p.type === 'AF') ? 'merchant' : 'battle';
  }

  /* Turn one counter face up. What a Combat Event or Diligent Escort then does
   * is the patrol's business (sw_patrol), because it changes the round. */
  function reveal(state, uid, opts) {
    var check = canReveal(state, uid);
    if (!check.ok) throw new Error('sw_combat: illegal reveal — ' + check.why);
    var u = unit(state, uid);
    u.revealed = true;
    u.revealedRound = state.round;
    state.revealedThisRound += 1;
    state.lastReveal = uid;
    return { unit: u, event: isEvent(u), diligent: isDiligent(u) };
  }

  /* ---- [14.12] Radar (1943-45): unflip the unit just revealed ----
   * "The submarine may unflip any one Japanese unit, unless it is a Combat
   * Event, Diligent Escort or Aircraft. The choice must be made immediately,
   * before any other units are revealed. If a unit is unflipped, another unit
   * must be revealed in its place." [14.4B]: not a unit revealed in round 1. */
  function canUnflip(state, uid) {
    var u = unit(state, uid);
    if (!state.radar) return { ok: false, why: 'No radar before 1943 [14.12].' };
    if (state.radarUsed) return { ok: false, why: 'Radar has already unflipped a unit this round [14.12].' };
    if (!u || !u.revealed || state.lastReveal !== uid) {
      return { ok: false, why: 'Only the unit just revealed, before any other is revealed [14.12].' };
    }
    if (isEvent(u) || isDiligent(u) || isAircraft(u)) {
      return { ok: false, why: 'Combat Events, Diligent Escorts and aircraft cannot be unflipped [14.12].' };
    }
    if (state.round > 1 && u.revealedRound !== state.round) {
      return { ok: false, why: 'A unit revealed in the first round may not be unflipped in a Re-Attack [14.4B].' };
    }
    return { ok: true, why: null };
  }
  function unflip(state, uid) {
    var c = canUnflip(state, uid);
    if (!c.ok) throw new Error('sw_combat: illegal unflip — ' + c.why);
    var u = unit(state, uid);
    u.revealed = false;
    u.unflippedRound = state.round;
    state.revealedThisRound -= 1;
    state.radarUsed = true;
    state.lastReveal = null;
    return Res.makeRecord({ context: 'Radar: ' + (piece(u).name || piece(u).type + ' ' + piece(u).tonnage + 't') + ' turned back face down',
      table: 'Radar [14.12]', ruleRef: '14.12', inputs: [], drms: [], die: null, modifiedDie: null, target: null,
      result: 'unflipped: its ASW no longer counts; reveal another in its place' });
  }

  /* ---- [14.4] a Re-Attack TDC marker: -1, except a -3 ---- */
  function tdcEffective(state, drawn) {
    return state.round > 1 && drawn !== -3 ? drawn - 1 : drawn;
  }

  /* ---- [14.13] TDC placement, Tactical Rating many ---- */
  function canPlaceTdc(state, uid) {
    var u = unit(state, uid);
    if (!u) return { ok: false, why: 'No such counter.' };
    if (u.sunk) return { ok: false, why: 'Already sunk.' };
    if (u.returned) return { ok: false, why: 'No longer on the display (returned to the cup) [14.12].' };
    if (u.revealed && isAircraft(u)) return { ok: false, why: 'TDC markers go on ships; an aircraft is not one [14.13].' };
    if (u.tdc !== null && u.tdc !== undefined) {
      return { ok: false, why: 'Already carries a TDC marker; they may not be moved [14.13].' };
    }
    if (!inEligibleColumn(state, u)) {
      return { ok: false, why: 'Only the submarine’s own column or an adjacent one [14.13].' };
    }
    if (state.tdcPlaced >= revealBudget(state)) {
      return { ok: false, why: 'Tactical Rating ' + state.sub.tactical + ' is spent [14.13].' };
    }
    return { ok: true, why: null };
  }

  /* Markers are placed WITHOUT examining them, so the value is stored hidden
   * until [14.14] turns them over. */
  function placeTdc(state, uid, value) {
    var check = canPlaceTdc(state, uid);
    if (!check.ok) throw new Error('sw_combat: illegal TDC placement — ' + check.why);
    var u = unit(state, uid);
    u.tdc = value;
    u.tdcRevealed = false;
    state.tdcPlaced += 1;
    return u;
  }

  function revealTdcs(state) {
    live(state).forEach(function (u) { if (u.tdc !== null && u.tdc !== undefined) u.tdcRevealed = true; });
  }

  /* ---- [14.14] Target selection ---- */
  function canTarget(state, uid) {
    var u = unit(state, uid);
    if (!u) return { ok: false, why: 'No such counter.' };
    if (u.sunk) return { ok: false, why: 'Already sunk.' };
    if (u.returned) return { ok: false, why: 'No longer on the display (returned to the cup) [14.12].' };
    if (u.tdc === null || u.tdc === undefined) {
      return { ok: false, why: 'A target must carry a TDC marker [14.14].' };
    }
    if (!inEligibleColumn(state, u)) {
      return { ok: false, why: 'Only the same or an adjacent column may be attacked [14.14].' };
    }
    if (u.revealed && isAircraft(u)) {
      return { ok: false, why: 'Aircraft have no defense rating and cannot be attacked [2.3B].' };
    }
    if (u.revealed && isEvent(u)) {
      return { ok: false, why: 'A Combat Event marker is not a target [14.14].' };
    }
    return { ok: true, why: null };
  }

  /* [14.14] "Total attacks may not exceed the submarine's attack value",
   * minimum one target. */
  function canAllocate(state, allocations) {
    if (!allocations.length) return { ok: false, why: 'At least one target must be attacked [14.14].' };
    var total = allocations.reduce(function (n, a) { return n + a.points; }, 0);
    if (total > state.sub.attack) {
      return { ok: false, why: 'Allocated ' + total + ' of ' + state.sub.attack +
                              ' attack points [14.14].' };
    }
    for (var i = 0; i < allocations.length; i++) {
      if (allocations[i].points < 1) {
        return { ok: false, why: 'Every target needs at least one attack point [14.14].' };
      }
      var c = canTarget(state, allocations[i].unit);
      if (!c.ok) return c;
    }
    return { ok: true, why: null };
  }

  /* ---- [14.15] Attack resolution ---- */

  /* [14.15B2] ASW of all REVEALED Japanese vessels in the submarine's column
   * and adjacent columns, plus revealed aircraft regardless of column.
   * A damaged ship's ASW is zero [2.3B]. */
  function revealedEscortAsw(state) {
    /* [24.54] in a wolfpack an escort in an adjacent column counts against
     * this boat only if no other boat of the pack is in that column. */
    var taken = state.pc ? state.pc.order.filter(function (m) { return m !== state.sub && !m.sunk && m.column; })
                                         .map(function (m) { return m.column; }) : [];
    return live(state).reduce(function (t, u) {
      if (!u.revealed || u.damaged) return t;
      var p = piece(u);
      if (isEvent(u)) return t;
      if (p.type === 'AIR') return t + p.asw;
      if (u.column === state.sub.column) return t + p.asw;
      return inEligibleColumn(state, u) && taken.indexOf(u.column) === -1 ? t + p.asw : t;
    }, 0);
  }

  /* [IJN 6.0] Targeting an Escort (optional rule): in the first round, one
   * escort fired at does not count its own ASW in its defense. Not when the
   * boat is spotted, a Diligent Escort or an aircraft is revealed, the round's
   * Event is 3, 7 or 8, or another wolfpack member has already attacked. */
  function isEscort(u) {
    var p = piece(u);
    return u.revealed && !isEvent(u) && !isAircraft(u) && !isMerchant(u) && p && p.asw > 0;
  }
  function escortTarget(state) {
    if (!state.ijn || state.round !== 1 || state.sub.spotted) return null;
    if (state.pack && state.packIndex > 0) return null;
    if (state.roundEvent && [3, 7, 8].indexOf(state.roundEvent.id) > -1) return null;
    if (live(state).some(function (u) { return u.revealed && (isDiligent(u) || isAircraft(u)); })) return null;
    if (state.escortTargeted) return state.escortTargeted;
    var a = (state.allocations || []).filter(function (x) { var u = unit(state, x.unit); return u && isEscort(u); })[0];
    return a ? a.unit : null;
  }

  /* [14.15A-B] Both sides of one attack, as ledger terms. Shared by attack()
   * and attackPreview() so the odds a player hovers are the odds they roll. */
  function attackTerms(state, alloc) {
    var u = unit(state, alloc.unit);
    var p = piece(u);
    var skipper = state.sub.superSkipper ? state.sub.superSkipper.value : 0;

    var attacker = [{ label: 'Attack points allocated', value: alloc.points, rule: '14.15A1' }];
    if (skipper) attacker.push({ label: 'Super skipper', value: skipper, rule: '14.15A2' });
    attacker.push({ label: 'Mk-XIV torpedo value', value: state.torpedoValue, rule: '14.15A3' });

    /* An unrevealed target counts as defense 1 until turned over [14.16]. */
    var defender = [{ label: 'Defense', value: Fog.defenseFor(
      { revealed: u.revealed, defense: p.defense }), rule: '14.15B1' }];
    var asw = revealedEscortAsw(state);
    if (asw) defender.push({ label: 'Revealed escort ASW', value: asw, rule: '14.15B2' });
    if (asw && isEscort(u) && escortTarget(state) === u.uid && !u.damaged && inEligibleColumn(state, u)) {
      defender.push({ label: 'Targeting an escort: its own ASW', value: -p.asw, rule: 'IJN 6.0' });
    }
    /* [19.2] event 5, Perfect Setup: every TDC marker this round counts negative. */
    if (state.roundEvent && state.roundEvent.id === 5) {
      defender.push({ label: 'TDC marker (Perfect setup: negative)', value: -Math.abs(u.tdc), rule: '19.2' });
    } else {
      defender.push({ label: 'TDC marker', value: u.tdc, rule: '14.15B3' });
    }
    if (u.column !== state.sub.column) {
      defender.push({ label: 'Adjacent column', value: 1, rule: '14.15B4' });
    }
    if (u.damaged) defender.push({ label: 'Target damaged', value: -1, rule: '14.15B5' });
    return { unit: u, piece: p, attacker: attacker, defender: defender,
             context: p.name || (p.type + ' ' + p.tonnage + 't') };
  }

  /* What an attack would need, without rolling. Fog-safe: an unrevealed
   * target is defense 1 and its tonnage (so its ART odds) stays unknown. The
   * TDC value is only counted once the markers are turned over [14.14]. */
  function attackPreview(state, alloc) {
    var t = attackTerms(state, alloc);
    var atk = Res.sum(t.attacker), def = Res.sum(t.defender);
    var need = Math.floor(atk - def);
    var hit = Math.max(0, Math.min(10, need + 1)) / 10;     // d10 0-9, roll = or < need
    var art = null;
    if (t.unit.revealed && typeof t.piece.tonnage === 'number') {
      var sunk = 0, dmg = 0;
      for (var d = 0; d < 10; d++) {
        var r = Tables.artLookup(t.piece.tonnage, d + state.torpedoValue);
        if (r === 'sunk' || (r === 'damaged' && t.unit.damaged)) sunk++;
        else if (r === 'damaged') dmg++;
      }
      art = { sunk: sunk / 10, damaged: dmg / 10 };
    }
    return { attacker: t.attacker, defender: t.defender, attack: atk, defense: def,
             need: need, hit: hit, art: art,
             sinkChance: art ? hit * art.sunk : null, rule: '14.15' };
  }

  function attack(state, alloc, opts) {
    var t = attackTerms(state, alloc);
    var u = t.unit, p = t.piece;
    var rec = Res.attackRecord({
      context: t.context, attacker: t.attacker, defender: t.defender
    }, opts);
    rec.unit = u.uid;

    /* [14.16 note] If the target simply cannot be hit the attack still goes
     * through, as an automatic miss. */
    if (rec.target < 0) {
      rec.result = 'automatic miss';
      rec.impossible = true;
    }

    var out = { record: rec, hit: rec.result === 'HIT', artRecord: null, sunk: false, damaged: false };
    if (!out.hit) return out;

    /* [14.15D] Attack Results Table, adding the current Mk-XIV value. */
    var die = Res.d10(opts);
    var modified = die + state.torpedoValue;
    var art = Tables.artLookup(p.tonnage, modified);
    out.artRecord = Res.makeRecord({
      context: 'ART — ' + p.tonnage + ',000 tons',
      table: 'Attack Results Table [14.15D]', ruleRef: '14.15',
      inputs: [], drms: [{ label: 'Mk-XIV torpedo value', value: state.torpedoValue, rule: '14.15D' }],
      die: die, modifiedDie: modified, target: null,
      result: art === 'sunk' ? 'Red — SUNK' : art === 'damaged' ? 'Orange — damaged' : 'No effect'
    });
    if (art === 'sunk' || (art === 'damaged' && u.damaged)) {
      u.sunk = true;
      out.sunk = true;
      out.tonnage = p.tonnage;
    } else if (art === 'damaged') {
      u.damaged = true;
      out.damaged = true;
    }
    return out;
  }

  /* ---- [14.2] Counterattack ---- */
  function counterattackTerms(state) {
    var japanese = [
      { label: 'Revealed ASW', value: revealedEscortAsw(state), rule: '14.2A1' },
      { label: 'Red boxes in the AAC', value: Aac.redBoxes(state.area, state.warPeriod), rule: '14.2A2' },
      { label: 'General ASW', value: state.generalAsw !== undefined ? state.generalAsw : Tables.generalAsw[state.warPeriod], rule: state.generalAsw !== undefined ? '31.61' : '14.2A3' }
    ];
    var submarine = [{ label: 'Submarine defense', value: state.sub.defense, rule: '14.2B1' }];
    if (state.sub.superSkipper) {
      submarine.push({ label: 'Super skipper', value: state.sub.superSkipper.value, rule: '14.2B2' });
    }
    var drms = [];
    if (state.sub.damaged) drms.push({ label: 'Submarine damaged', value: 1, rule: '14.2C1' });
    if (state.round > 1) drms.push({ label: 'Follows a Re-Attack', value: 1, rule: '14.2C2' });
    if (state.sub.spotted) drms.push({ label: 'Spotted', value: 1, rule: '14.2C3' });
    /* Historical pace (house rule, off by default): Japanese ASW was poor early
     * in the war and formidable late. docs/20. */
    if (state.pace && state.pace.ca) drms.push({ label: 'Historical pace (house rule)', value: state.pace.ca, rule: 'HP' });
    return { japanese: japanese, submarine: submarine, drms: drms };
  }

  /* The odds of the escorts' counterattack as things stand, without rolling.
   * `reattack` asks "and if I go round again?" (+1 [14.2C2]). Only revealed
   * ASW counts, as in the real roll, so this leaks nothing face-down. */
  function counterattackPreview(state, reattack) {
    var view = reattack ? Object.assign({}, state, { round: Math.max(2, state.round + 1) }) : state;
    var t = counterattackTerms(view);
    var jp = Math.floor(Res.sum(t.japanese) + 0.5), sb = Res.sum(t.submarine);
    var row = jp - sb, mod = Res.sum(t.drms);
    var out = { none: 0, spotted: 0, damaged: 0, damaged_rtb: 0, sunk: 0 };
    for (var d = 0; d < 10; d++) {
      var r = Tables.counterattackLookup(row, d + mod);
      if (r === null) { out.none += 0.1; continue; }
      if (r.slice(-1) === '+') {
        var p = (r === 'sunk+' ? 6 : 3) / 10;     // extra roll: 4-9 or 7-9 sinks
        out.sunk += 0.1 * p;
        out.damaged_rtb += 0.1 * (1 - p);
        continue;
      }
      out[r in out ? r : 'none'] += 0.1;
    }
    Object.keys(out).forEach(function (k) { out[k] = Math.round(out[k] * 1000) / 1000; });
    return { japanese: t.japanese, submarine: t.submarine, drms: t.drms,
             row: row, odds: out, rule: '14.2' };
  }

  function counterattack(state, opts) {
    var t = counterattackTerms(state), japanese = t.japanese, submarine = t.submarine, drms = t.drms;
    var rec = Res.counterattackRecord({
      context: 'Counterattack on ' + state.sub.name,
      japanese: japanese, submarine: submarine, drms: drms
    }, opts);
    var result = Tables.counterattackLookup(rec.target, rec.modifiedDie);
    rec.result = result === null ? 'No counterattack (below zero) [14.2]' : result;

    var extra = null;
    if (result && result.slice(-1) === '+') {
      /* The printed disc: roll again. On a damaged-RTB cell 7-9 sinks; on a
       * sunk cell 4-9 sinks. Otherwise the boat is damaged and RTB. */
      var need = result === 'sunk+' ? 4 : 7;
      var d = Res.d10(opts);
      var sank = d >= need;
      extra = Res.makeRecord({
        context: 'Counterattack extra roll', table: 'Counterattack Table [14.2]',
        ruleRef: '14.2', inputs: [], drms: [],
        die: d, modifiedDie: d, target: null,
        result: sank ? 'SUNK' : 'damaged, RTB'
      });
      rec.result = sank ? 'sunk' : 'damaged_rtb';
    }
    return { record: rec, extraRecord: extra, result: rec.result };
  }

  /* [18.0] A Damage marker. The first just marks the boat; a second calls for
   * the [18.1] roll against Defense and a third sinks it [18.2]. The roll needs
   * a die, so it is left pending here and resolveDamage() makes it. */
  function damage(state) {
    var had = state.sub.damageMarkers || (state.sub.damaged ? 1 : 0);
    state.sub.damageMarkers = had + 1;
    state.sub.damaged = true;
    if (had >= 1) state.sub.damagePending = true;
    return state;
  }
  function resolveDamage(state, opts) {
    if (!state.sub.damagePending) return [];
    state.sub.damagePending = false;
    var n = state.sub.damageMarkers;
    if (n >= 3) {
      state.sub.sunk = true;
      return [Res.makeRecord({ context: 'A third Damage marker', table: 'Damaged Submarines [18.2]', ruleRef: '18.2',
        inputs: [{ label: 'Damage markers', value: n, rule: '18.2' }], drms: [], die: null, modifiedDie: null, target: null,
        result: 'the submarine is SUNK' })];
    }
    var die = Res.d10(opts), def = state.sub.defense, sunk = die > def;
    if (sunk) state.sub.sunk = true;
    return [Res.makeRecord({ context: 'A second Damage marker', table: 'Damaged Submarines [18.1]', ruleRef: '18.1',
      inputs: [{ label: 'Defense', value: def, rule: '18.1' }], drms: [], die: die, modifiedDie: die, target: def,
      result: sunk ? 'rolled over Defense: the submarine is SUNK' : 'survives with two Damage markers (repair: two rolls, added) [18.1]' })];
  }

  function applyCounterattack(state, result) {
    switch (result) {
      case 'none': break;
      case 'spotted': state.sub.spotted = true; break;
      case 'damaged': damage(state); break;
      case 'damaged_rtb': damage(state); state.sub.rtb = true; break;
      case 'sunk': state.sub.sunk = true; break;
      default: break;   // "No counterattack" and any unmapped text change nothing
    }
    return state;
  }

  /* ---- [14.4] Re-Attack ---- */
  /* [14.4] "TDC markers from the first round are removed and mixed back into
   * the draw pool. Revealed Japanese units remain revealed." The -1 applies to
   * the markers drawn for the Re-Attack (tdcEffective), not to the old ones.
   * (Phase 4 kept the old markers and reduced them; corrected 2026-09-21.)
   * Returns the markers, as drawn, for the caller's pool. */
  function beginReAttack(state) {
    state.round += 1;
    state.revealedThisRound = 0;
    state.tdcPlaced = 0;
    var back = [];
    state.units.forEach(function (u) {
      if (u.tdc !== null && u.tdc !== undefined) {
        back.push(u.tdcDrawn !== undefined ? u.tdcDrawn : u.tdc);
        u.tdc = null; u.tdcDrawn = undefined; u.tdcRevealed = false;
      }
    });
    return back;
  }

  /* ---- a '+' result: the printed disc rolls again ----
   * On a damaged-RTB cell 7-9 sinks; on a sunk cell 4-9 sinks; otherwise the
   * boat is damaged and RTB. Shared by the Counterattack, Diligent Escort and
   * Event Aircraft rows. */
  function extraRoll(result, context, opts) {
    if (!result || result.slice(-1) !== '+') return { result: result, record: null };
    var need = result === 'sunk+' ? 4 : 7;
    var d = Res.d10(opts), sank = d >= need;
    return { result: sank ? 'sunk' : 'damaged_rtb',
      record: Res.makeRecord({ context: context + ': extra roll', table: 'Counterattack Table [14.2]', ruleRef: '14.2',
        inputs: [], drms: [], die: d, modifiedDie: d, target: null, result: sank ? 'SUNK' : 'damaged, RTB' }) };
  }

  /* [14.12] Diligent Escort revealed: its own row, applied at once. */
  function diligentEscort(opts) {
    var d = Res.d10(opts), raw = Tables.diligentEscort[d];
    var rec = Res.makeRecord({ context: 'Diligent Escort revealed', table: 'Counterattack Table, Diligent Escort row [14.12]',
      ruleRef: '14.12', inputs: [], drms: [], die: d, modifiedDie: d, target: null, result: raw });
    var x = extraRoll(raw, 'Diligent Escort', opts);
    return { result: x.result, records: x.record ? [rec, x.record] : [rec] };
  }

  /* ---- [19.2] Combat Events ---- */
  function rollEvent(opts) {
    var d = Res.d10(opts);
    return { id: d, name: Tables.combatEvents[d],
      record: Res.makeRecord({ context: 'Combat Event', table: 'Combat Events [19.2]', ruleRef: '19.2',
        inputs: [], drms: [], die: d, modifiedDie: d, target: null, result: Tables.combatEvents[d] }) };
  }
  /* Event 3, Betty bomber: the Event Aircraft row. */
  /* [31.61 A] East Wind Early meets a Mitsubishi B1M instead of the Betty. */
  function eventAircraft(opts, plane) {
    var d = Res.d10(opts), raw = Tables.eventAircraft[d];
    var rec = Res.makeRecord({ context: (plane || 'Betty bomber') + ' spots the submarine', table: 'Counterattack Table, Event Aircraft row [19.2]',
      ruleRef: '19.2', inputs: [], drms: [], die: d, modifiedDie: d, target: null, result: raw });
    var x = extraRoll(raw, plane || 'Betty bomber', opts);
    return { result: x.result, records: x.record ? [rec, x.record] : [rec] };
  }
  /* Event 4, Mechanical troubles: odd = damaged and RTB, even = fixed. */
  function mechanical(opts) {
    var d = Res.d10(opts), odd = d % 2 === 1;
    return { odd: odd, record: Res.makeRecord({ context: 'Mechanical troubles', table: 'Combat Events [19.2]', ruleRef: '19.2',
      inputs: [], drms: [], die: d, modifiedDie: d, target: null,
      result: odd ? 'odd: Damage and RTB markers' : 'even: fixed, no Endurance roll this turn' }) };
  }
  /* ART on a given size line, with a modifier; applies sunk / damaged to u. */
  function artOn(u, sizeTons, modifier, context, ruleRef, opts) {
    var d = Res.d10(opts), m = d + modifier, art = Tables.artLookup(sizeTons, m);
    var sunk = art === 'sunk' || (art === 'damaged' && u.damaged);
    if (sunk) u.sunk = true; else if (art === 'damaged') u.damaged = true;
    return { sunk: sunk, damaged: !sunk && art === 'damaged',
      record: Res.makeRecord({ context: context, table: 'Attack Results Table [14.15D]', ruleRef: ruleRef,
        inputs: [], drms: modifier ? [{ label: 'Mk-XIV torpedo value', value: modifier, rule: '14.15D' }] : [],
        die: d, modifiedDie: m, target: null,
        result: sunk ? 'Red — SUNK' : art === 'damaged' ? 'Orange — damaged' : 'No effect' }) };
  }
  /* Event 0: which face-down red-ball ships may lumber into the torpedoes. */
  function lumberCandidates(state) {
    return live(state).filter(function (u) { return !u.revealed && backOf(u) === 'merchant' && inEligibleColumn(state, u); });
  }
  /* Event 1: surface gunnery applies only with a revealed merchant in the
   * sub's column and no revealed IJN warship, aircraft or Diligent Escort. */
  function gunneryCandidates(state) {
    var blocked = live(state).some(function (u) { return u.revealed && isWarship(u); });
    if (blocked) return [];
    return live(state).filter(function (u) { return u.revealed && isMerchant(u) && u.column === state.sub.column; });
  }
  /* Event 2: the circular runner, against your own boat. */
  function circularRun(state, marker, opts) {
    var terms = [{ label: 'Mk-XIV torpedo value', value: state.torpedoValue, rule: '19.2' },
                 { label: 'Circular run', value: 1, rule: '19.2' },
                 { label: 'Specially drawn TDC marker', value: marker, rule: '19.2' }];
    var target = Res.sum(terms), d = Res.d10(opts), hit = d <= target;
    return { hit: hit, record: Res.makeRecord({ context: 'Circular running torpedo', table: 'Combat Events [19.2]', ruleRef: '19.2',
      inputs: terms, drms: [], die: d, modifiedDie: d, target: target,
      result: hit ? 'the torpedo hits: the submarine is SUNK' : 'it misses' }) };
  }

  /* ---- [14.6] Sub vs. Sub combat ----
   * `date` = { y, m } for the Enemy Submarine Table [30.3]; `subClass` looks a
   * class up by name. One attack round, no counterattack, no Re-Attack. */
  function monthIndex(s) { var p = s.split('/'); var y = parseInt(p[1], 10); return (y < 100 ? 1900 + y : y) * 12 + parseInt(p[0], 10) - 1; }
  function enemySubsAvailable(area, date) {
    var now = date.y * 12 + date.m;
    return Tables.enemySubs.filter(function (e) {
      if (monthIndex(e.from) > now) return false;
      if (e.to && monthIndex(e.to) < now) return false;
      if (e.nation !== 'JP' && Tables.enemySubAreas.indexOf(area) < 0) return false;
      return true;
    });
  }
  function subVsSub(state, date, subClass, drawMarker, pickIndex, opts) {
    var records = [], sub = state.sub;
    var drms = [];
    if (sub.spotted || sub.damaged) drms.push({ label: 'Spotted and/or damaged', value: -1, rule: '14.6B' });
    if (state.radar) drms.push({ label: 'Radar', value: 1, rule: '14.6B' });
    var d = Res.d10(opts), m = d + Res.sum(drms), weFirst = m >= 4;
    records.push(Res.makeRecord({ context: 'Sub vs. Sub: who detects whom', table: 'Sub vs. Sub [14.6B]', ruleRef: '14.6',
      inputs: [], drms: drms, die: d, modifiedDie: m, target: null,
      result: weFirst ? '4-9: you detected the enemy first' : '0-3: the enemy spotted you first' }));
    var avail = enemySubsAvailable(state.area, date);
    if (!avail.length) return { records: records, ended: 'no enemy submarine available [30.3]' };
    var e = avail[pickIndex(avail.length, opts)], ec = subClass(e.cls);
    var skipper = sub.superSkipper ? sub.superSkipper.value : 0;
    var us = { name: sub.name, attack: sub.attack, defense: sub.defense, torp: state.torpedoValue, skipper: skipper };
    var them = { name: ec.name + ' (' + (e.nation === 'JP' ? 'Japanese' : e.nation === 'DE' ? 'German' : 'Italian') + ')',
                 attack: ec.attack, defense: ec.defense, torp: 1, skipper: 0, tonnage: e.tonnage };
    records.push(Res.makeRecord({ context: 'Enemy submarine drawn: ' + them.name, table: 'Enemy Submarines [30.3]', ruleRef: '14.6',
      inputs: [], drms: [], die: null, modifiedDie: null, target: null, result: them.name + ', ' + them.tonnage + ',000 t' }));
    var tdcMarker = drawMarker();                     // [14.6D] after B and C, in the book's order
    var shooter = weFirst ? us : them, target = weFirst ? them : us;
    var atk = [{ label: shooter.name + ' attack', value: shooter.attack, rule: '14.6E' }];
    if (shooter.skipper) atk.push({ label: 'Super skipper', value: shooter.skipper, rule: '14.6E' });
    atk.push({ label: weFirst ? 'Mk-XIV torpedo value' : 'Axis torpedo value', value: shooter.torp, rule: '14.6E' });
    var def = [{ label: target.name + ' defense', value: target.defense, rule: '14.6E' }];
    if (target.skipper) def.push({ label: 'Super skipper', value: target.skipper, rule: '14.6E' });
    def.push({ label: 'TDC marker', value: tdcMarker, rule: '14.6D' });
    var rec = Res.attackRecord({ context: (weFirst ? 'You fire at ' : 'The enemy fires at ') + target.name, attacker: atk, defender: def }, opts);
    if (rec.target < 0) { rec.result = 'automatic miss'; rec.impossible = true; }
    records.push(rec);
    var out = { records: records, weFirst: weFirst, enemy: them, hit: rec.result === 'HIT', sunk: false, damaged: false };
    if (out.hit) {
      var d2 = Res.d10(opts), m2 = d2 + shooter.torp, art = Tables.artLookup(weFirst ? them.tonnage : 2, m2);
      out.sunk = art === 'sunk'; out.damaged = art === 'damaged';
      records.push(Res.makeRecord({ context: 'ART, 1-4 row: ' + target.name, table: 'Attack Results Table [14.6F]', ruleRef: '14.6',
        inputs: [], drms: [{ label: 'torpedo value', value: shooter.torp, rule: '14.6F' }], die: d2, modifiedDie: m2, target: null,
        result: out.sunk ? 'Red — SUNK' : out.damaged ? 'Orange — damaged' : 'No effect' }));
    }
    return out;
  }

  /* ---- [14.7] Endurance ---- */
  function endurance(state, extraDrm, opts) {
    var target = Tables.enduranceTarget(state.torpedoValue, state.sub.endurance);
    var drms = [];
    if (extraDrm) drms.push({ label: 'No contact / bypassed search', value: extraDrm, rule: '14.7' });
    if (state.sub.damaged) drms.push({ label: 'Submarine damaged', value: 1, rule: '14.7' });
    /* Historical pace (a house rule, off by default; not in the book): boats
     * stay out longer early in the war and come home sooner late, so a
     * campaign tracks the real war's sinkings. docs/20. */
    if (state.pace && state.pace.end) drms.push({ label: 'Historical pace (house rule)', value: state.pace.end, rule: 'HP' });
    var die = Res.d10(opts);
    var modified = die + Res.sum(drms);
    var stays = modified <= target;
    return {
      stays: stays,
      record: Res.makeRecord({
        context: 'Endurance ' + state.sub.endurance + ', torpedo ' + state.torpedoValue,
        table: 'Endurance Table [14.7]', ruleRef: '14.7',
        inputs: [], drms: drms, die: die, modifiedDie: modified, target: target,
        result: stays ? 'Remains on patrol — to the DONE section'
                      : 'RTB — mark Return To Base'
      })
    };
  }

  /* ---- [14.5] Super Skipper Determination ---- */
  function superSkipperEarned(sunkList) {
    var ships = sunkList.length;
    var tons = sunkList.reduce(function (t, s) { return t + s.tonnage; }, 0);
    return ships >= 3 && tons >= 16;
  }

  /* [IJN 5.0] Crash Dive (optional rule). Ratings by class art; null = cannot. */
  var CRASH = { new_s1: 1, new_s2: 1, 'o-21': 1, s2_br: 1, t2_br: 2, argonaut: null, narwhal: null, leviathan: null };
  function crashRating(cls) { return cls && CRASH.hasOwnProperty(cls) ? CRASH[cls] : 0; }
  function crashDive(state, why, opts) {
    if (!state.ijn) return null;
    var r = crashRating(state.sub.cls);
    if (r === null) return { ok: false, record: Res.makeRecord({ context: 'Crash Dive: ' + why, table: 'Crash Dive [IJN 5.1]', ruleRef: 'IJN 5.1',
      inputs: [], drms: [], die: null, modifiedDie: null, target: null, result: 'this class cannot crash dive [IJN 5.2]' }) };
    var ss = state.sub.superSkipper ? state.sub.superSkipper.value : 0;
    var d = Res.d10(opts), m = d - ss, ok = m <= r;
    return { ok: ok, record: Res.makeRecord({ context: 'Crash Dive: ' + why, table: 'Crash Dive [IJN 5.1]', ruleRef: 'IJN 5.1',
      inputs: [{ label: 'Crash Dive rating', value: r, rule: 'IJN 5.2' }],
      drms: ss ? [{ label: 'Super Skipper', value: -ss, rule: 'IJN 5.1' }] : [], die: d, modifiedDie: m, target: r,
      result: ok ? 'down in time: any result but No Effect becomes Spotted' : 'too slow: resolved normally' }) };
  }
  /* A successful crash dive turns any result but "none" into "spotted". */
  function softened(result) { return result && result !== 'none' ? 'spotted' : result; }

  root.SWCombat = {
    isEscort: isEscort, escortTarget: escortTarget, crashRating: crashRating, crashDive: crashDive, softened: softened,
    COLUMNS: COLUMNS,
    piece: piece, unit: unit, live: live, backOf: backOf,
    eligibleColumns: eligibleColumns,
    placeSub: placeSub,
    revealBudget: revealBudget,
    canReveal: canReveal, reveal: reveal,
    canPlaceTdc: canPlaceTdc, placeTdc: placeTdc, revealTdcs: revealTdcs,
    canTarget: canTarget, canAllocate: canAllocate,
    revealedEscortAsw: revealedEscortAsw,
    attack: attack, attackPreview: attackPreview,
    counterattack: counterattack, counterattackPreview: counterattackPreview, counterattackTerms: counterattackTerms, applyCounterattack: applyCounterattack,
    damage: damage, resolveDamage: resolveDamage,
    beginReAttack: beginReAttack, tdcEffective: tdcEffective,
    canUnflip: canUnflip, unflip: unflip,
    isMerchant: isMerchant, isWarship: isWarship, isEvent: isEvent, isDiligent: isDiligent, isAircraft: isAircraft,
    extraRoll: extraRoll, diligentEscort: diligentEscort, rollEvent: rollEvent, eventAircraft: eventAircraft,
    mechanical: mechanical, artOn: artOn, lumberCandidates: lumberCandidates, gunneryCandidates: gunneryCandidates,
    circularRun: circularRun, enemySubsAvailable: enemySubsAvailable, subVsSub: subVsSub,
    endurance: endurance,
    superSkipperEarned: superSkipperEarned
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
