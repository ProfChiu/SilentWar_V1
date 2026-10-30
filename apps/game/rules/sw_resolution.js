/* sw_resolution.js — the resolution-record contract. PURE MODULE.
 *
 * ZERO DOM. ZERO Math.random. Every die comes from an injected
 * opts.rollDie() callback, so the identical function runs in the browser and
 * under `node tools/test_sw_resolution.js`.
 *
 * The binding rule from ACTION_PLAN.md addition B: every table lookup in the
 * engine emits a structured resolution record; the UI RENDERS records and never
 * recomputes them. This module owns that shape and the arithmetic around it.
 * The tables themselves (ART, Counterattack, Contact, Engagement) are Phase 3
 * data + Phase 4 logic — this module deliberately does not know them.
 *
 * Record shape:
 *   { context, table, inputs:[{label,value,rule}], drms:[{label,value,rule}],
 *     target, die, modifiedDie, result, ruleRef }
 */
(function (root) {
  'use strict';

  /* [2.5] "When rolling the d10, zero (0) is always zero, not ten." */
  function d10(opts) {
    if (!opts || typeof opts.rollDie !== 'function') {
      throw new Error('sw_resolution: opts.rollDie(sides) is required — this module never rolls its own dice');
    }
    var n = opts.rollDie(10);
    if (typeof n !== 'number' || n < 0 || n > 9 || n !== Math.floor(n)) {
      throw new Error('sw_resolution: rollDie(10) must return an integer 0..9, got ' + n);
    }
    return n;
  }

  function sum(terms) {
    return (terms || []).reduce(function (t, x) { return t + x.value; }, 0);
  }

  /* [2.5] Fractions < 0.499 round down, >= 0.5 round up. */
  function roundHalfUp(n) { return Math.floor(n + 0.5); }

  var REQUIRED = ['context', 'table', 'ruleRef'];

  function makeRecord(spec) {
    REQUIRED.forEach(function (k) {
      if (!spec || !spec[k]) throw new Error('sw_resolution: record missing "' + k + '"');
    });
    var inputs = spec.inputs || [];
    var drms = spec.drms || [];
    [].concat(inputs, drms).forEach(function (t) {
      if (typeof t.label !== 'string' || typeof t.value !== 'number') {
        throw new Error('sw_resolution: every input/drm needs {label, value}; got ' + JSON.stringify(t));
      }
    });
    return {
      context: spec.context,
      table: spec.table,
      inputs: inputs,
      drms: drms,
      target: typeof spec.target === 'number' ? spec.target : null,
      die: typeof spec.die === 'number' ? spec.die : null,
      modifiedDie: typeof spec.modifiedDie === 'number' ? spec.modifiedDie : null,
      result: spec.result === undefined ? null : spec.result,
      ruleRef: spec.ruleRef,
      sides: spec.sides || []
    };
  }

  /* The universal Silent War comparison: roll = or < target -> success [2.5]. */
  function resolveRollUnder(spec, opts) {
    var die = typeof spec.die === 'number' ? spec.die : d10(opts);
    var modified = die + sum(spec.drms);
    var target = typeof spec.target === 'number' ? spec.target : sum(spec.inputs);
    var hit = modified <= target;
    return makeRecord({
      context: spec.context, table: spec.table, ruleRef: spec.ruleRef,
      inputs: spec.inputs, drms: spec.drms, sides: spec.sides,
      target: target, die: die, modifiedDie: modified,
      result: spec.resultFor ? spec.resultFor(hit, modified, target)
                             : (hit ? 'hit' : 'miss')
    });
  }

  /* [14.15] Attack resolution, steps A-C. Step D (the Attack Results Table)
   * is a table lookup and belongs to Phase 4; this returns the to-hit record. */
  function attackRecord(spec, opts) {
    var attacker = spec.attacker || [];   // [14.15A] allocated attack, skipper, torpedo value
    var defender = spec.defender || [];   // [14.15B] defense, escort ASW, TDC, +1 adjacent, -1 damaged
    var atk = sum(attacker);
    var def = sum(defender);
    var target = Math.floor(atk - def);   // [14.15C] "round down"
    var die = typeof spec.die === 'number' ? spec.die : d10(opts);
    return makeRecord({
      context: spec.context || 'Attack',
      table: 'To-hit [14.15C]',
      ruleRef: '14.15',
      inputs: attacker,
      drms: [],
      sides: [
        { label: 'Attacker', terms: attacker, total: atk, rule: '14.15A' },
        { label: 'Target', terms: defender, total: def, rule: '14.15B' }
      ],
      target: target,
      die: die,
      modifiedDie: die,
      result: die <= target ? 'HIT' : 'miss'
    });
  }

  /* [14.2] Counterattack. Japanese total minus submarine total gives the row on
   * the Counterattack Table; the table itself is Phase 3 data. */
  function counterattackRecord(spec, opts) {
    var japanese = spec.japanese || [];   // [14.2A] revealed ASW (round up), red boxes, general ASW
    var submarine = spec.submarine || []; // [14.2B] defense, super skipper
    var jp = roundHalfUp(sum(japanese));  // [14.2A1] "fractions rounded up"
    var sub = sum(submarine);
    var row = jp - sub;
    var die = typeof spec.die === 'number' ? spec.die : d10(opts);
    var drms = spec.drms || [];           // [14.2C] +1 per damage, +1 after re-attack, +1 spotted
    return makeRecord({
      context: spec.context || 'Counterattack',
      table: 'Counterattack Table [14.2]',
      ruleRef: '14.2',
      inputs: japanese,
      drms: drms,
      sides: [
        { label: 'Japanese', terms: japanese, total: jp, rule: '14.2A' },
        { label: 'Submarine', terms: submarine, total: sub, rule: '14.2B' }
      ],
      target: row,
      die: die,
      modifiedDie: die + sum(drms),
      result: spec.result === undefined ? null : spec.result
    });
  }

  function fmt(n) { return (n >= 0 ? '+' : '') + n; }

  /* Render a record as a stacked ledger — plain strings, no DOM.
   * Mirrors the rulebook's own worked examples [14.15], [14.2]. */
  function ledgerLines(rec) {
    var out = [];
    if (rec.sides && rec.sides.length) {
      rec.sides.forEach(function (side) {
        out.push({
          kind: 'side',
          label: side.label,
          text: side.terms.map(function (t) { return t.label + ' ' + fmt(t.value); }).join(' ') +
                ' = ' + fmt(side.total),
          total: side.total,
          rule: side.rule
        });
      });
    } else if (rec.inputs.length) {
      out.push({
        kind: 'side', label: 'Total',
        text: rec.inputs.map(function (t) { return t.label + ' ' + fmt(t.value); }).join(' ') +
              ' = ' + fmt(sum(rec.inputs)),
        total: sum(rec.inputs), rule: rec.ruleRef
      });
    }
    if (rec.drms.length) {
      out.push({
        kind: 'drm', label: 'drms',
        text: rec.drms.map(function (t) { return t.label + ' ' + fmt(t.value); }).join(' ') +
              ' = ' + fmt(sum(rec.drms)),
        total: sum(rec.drms), rule: rec.ruleRef
      });
    }
    if (rec.target !== null) {
      out.push({ kind: 'target', label: 'Need', text: 'need = or < ' + rec.target, rule: rec.ruleRef });
    }
    if (rec.die !== null) {
      var rolled = 'rolled ' + rec.die;
      if (rec.modifiedDie !== rec.die) rolled += ' → ' + rec.modifiedDie + ' modified';
      out.push({ kind: 'roll', label: 'Die', text: rolled, rule: '2.5' });
    }
    if (rec.result !== null) {
      out.push({ kind: 'result', label: 'Result', text: String(rec.result), rule: rec.ruleRef });
    }
    return out;
  }

  function ledgerText(rec) {
    return ledgerLines(rec).map(function (l) { return l.label + ': ' + l.text; }).join('\n');
  }

  root.SWResolution = {
    d10: d10,
    sum: sum,
    roundHalfUp: roundHalfUp,
    makeRecord: makeRecord,
    resolveRollUnder: resolveRollUnder,
    attackRecord: attackRecord,
    counterattackRecord: counterattackRecord,
    ledgerLines: ledgerLines,
    ledgerText: ledgerText
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
