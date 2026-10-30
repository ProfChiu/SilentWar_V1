/* sw_tapeplayer.js — plays a demo tape. PURE MODULE. ZERO DOM.
 *
 * Owns tape state and effect application, so the UI file holds no game state
 * logic at all. Dice are still injected (opts.rollDie) even though every tape
 * step fixes its own die: the moment a step omits one, the callback is the only
 * source of randomness this module will ever touch.
 *
 * Deterministic teaching (playbook invariant 4): the same tape plays the same
 * way every time.
 */
(function (root) {
  'use strict';

  var Resolution = root.SWResolution ||
    (typeof require === 'function' ? require('./sw_resolution.js').SWResolution : null);

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function create(tape) {
    if (!tape || !tape.steps) throw new Error('sw_tapeplayer: a tape with steps is required');
    return {
      tapeId: tape.id,
      index: -1,                       // -1 = nothing applied yet
      units: clone(tape.units),
      board: {
        activity: null,
        contact: null,
        cupDraw: null,
        subSlot: null,
        opArea: { id: tape.setting.opArea, section: null },
        tdc: {},                       // unitId -> { slot, value|null }
        allocations: [],               // [{unit, points}]
        sunk: [],
        withdrawn: false,
        cleanedUp: false
      },
      status: clone(tape.setting),
      log: [],                         // resolution records, oldest first
      done: false
    };
  }

  function unit(state, id) {
    for (var i = 0; i < state.units.length; i++) { if (state.units[i].id === id) return state.units[i]; }
    return null;
  }

  function applyEffect(state, e) {
    switch (e.type) {
      case 'place':
        if (e.at.kind === 'combat') state.board.subSlot = e.at.slot;
        else if (e.at.kind === 'oparea') state.board.opArea = { id: e.at.id, section: e.at.section };
        break;
      case 'activity':  state.board.activity = e.level; break;
      case 'contact':   state.board.contact = e.result; break;
      case 'draw':      state.board.cupDraw = clone(e.cups); break;
      case 'reveal':
        e.units.forEach(function (id) { var u = unit(state, id); if (u) u.revealed = true; });
        break;
      case 'tdc':
        e.place.forEach(function (p) { state.board.tdc[p.unit] = { slot: p.slot, value: null }; });
        break;
      case 'tdcReveal':
        Object.keys(e.values).forEach(function (id) {
          if (!state.board.tdc[id]) state.board.tdc[id] = { slot: null, value: null };
          state.board.tdc[id].value = e.values[id];
        });
        break;
      case 'allocate':  state.board.allocations = clone(e.attacks); break;
      case 'sink':
        state.board.sunk.push(e.unit);
        state.units = state.units.filter(function (u) { return u.id !== e.unit; });
        state.status.shipsSunk += 1;
        state.status.tonnageSunk += e.tonnage;
        break;
      case 'withdraw':  state.board.withdrawn = true; break;
      case 'cleanup':
        state.board.cleanedUp = true;
        state.board.tdc = {};
        state.board.allocations = [];
        break;
      default:
        throw new Error('sw_tapeplayer: unknown effect "' + e.type + '"');
    }
  }

  /* Apply the next step. Returns { step, record } — record is null for steps
   * that place tokens without a table lookup. */
  function next(state, tape, opts) {
    if (state.index >= tape.steps.length - 1) { state.done = true; return null; }
    state.index += 1;
    var step = tape.steps[state.index];
    var record = null;

    if (step.attack) {
      var t = unit(state, step.attack.target);
      record = Resolution.attackRecord({
        context: (t ? t.label : step.attack.target),
        attacker: step.attack.attacker,
        defender: step.attack.defender,
        die: step.attack.die
      }, opts);
    } else if (step.counterattack) {
      record = Resolution.counterattackRecord({
        context: 'Counterattack on ' + tape.submarine.name,
        japanese: step.counterattack.japanese,
        submarine: step.counterattack.submarine,
        drms: step.counterattack.drms,
        die: step.counterattack.die,
        result: step.counterattack.result
      }, opts);
    } else if (step.record) {
      record = Resolution.makeRecord(step.record);
    }

    if (record) {
      record.stepId = step.id;
      record.sop = step.sop;
      record.submarine = tape.submarine.name;
      state.log.push(record);
    }

    (step.effects || []).forEach(function (e) { applyEffect(state, e); });
    if (state.index === tape.steps.length - 1) state.done = true;
    return { step: step, record: record };
  }

  /* Rewind and replay to `target` — the only honest way to step backwards
   * through a state machine whose effects are not individually invertible. */
  function seek(state, tape, target, opts) {
    var fresh = create(tape);
    for (var i = 0; i <= target && i < tape.steps.length; i++) next(fresh, tape, opts);
    Object.keys(fresh).forEach(function (k) { state[k] = fresh[k]; });
    return state;
  }

  function revealedUnits(state) {
    return state.units.filter(function (u) { return u.revealed; });
  }

  root.SWTapePlayer = {
    create: create,
    next: next,
    seek: seek,
    unit: unit,
    revealedUnits: revealedUnits
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
