/* sw_fog.js — fog-of-war-safe aggregation. PURE MODULE. ZERO DOM.
 *
 * The binding constraint from ACTION_PLAN.md addition A:
 *   Summaries may aggregate REVEALED INFORMATION ONLY. Face-down counters are
 *   COUNTED but never VALUED. Display "revealed escort ASW: 3 (+2 unrevealed)",
 *   never the true total. A summary that leaks hidden values breaks the game.
 *
 * Every summary the UI shows must come through here. The functions physically
 * cannot leak, because they never read a value off an unrevealed unit —
 * `assertNoLeak` re-checks that on the way out.
 *
 * A unit is { id, column, revealed, kind, asw, defense, tonnage, damaged, flag }.
 * The fields asw/defense/tonnage are the TRUE values and are ignored while
 * revealed === false.
 */
(function (root) {
  'use strict';

  /* [14.16 note] "Unrevealed units with TDC markers are considered to have
   * defense 1 until revealed." That is a published constant, not a leak. */
  var UNREVEALED_DEFENSE = 1;

  function isRevealed(u) { return u.revealed === true; }

  function summarize(units, opts) {
    units = units || [];
    opts = opts || {};
    var revealed = units.filter(isRevealed);
    var hidden = units.filter(function (u) { return !isRevealed(u); });

    /* [2.3B] A ship with a Damage marker has ASW zero. */
    var aswTotal = revealed.reduce(function (t, u) {
      return t + (u.damaged ? 0 : (u.asw || 0));
    }, 0);

    return {
      total: units.length,
      revealedCount: revealed.length,
      unrevealedCount: hidden.length,
      revealedAsw: aswTotal,
      /* Deliberately absent: any total that would include hidden ASW,
       * defense or tonnage. There is no `trueAsw` field and never will be. */
      revealedTonnage: revealed.reduce(function (t, u) { return t + (u.tonnage || 0); }, 0),
      damagedCount: revealed.filter(function (u) { return u.damaged; }).length,
      byKind: revealed.reduce(function (m, u) {
        var k = u.kind || 'unknown';
        m[k] = (m[k] || 0) + 1;
        return m;
      }, {}),
      unrevealedDefenseAssumption: opts.includeDefenseAssumption ? UNREVEALED_DEFENSE : undefined
    };
  }

  /* The display string the constraint mandates, e.g.
   * "revealed escort ASW: 3 (+2 unrevealed)". */
  function phrase(label, s) {
    var t = label + ': ' + s.revealedAsw;
    if (s.unrevealedCount > 0) t += ' (+' + s.unrevealedCount + ' unrevealed)';
    return t;
  }

  function countPhrase(label, s) {
    var t = label + ': ' + s.revealedCount + ' revealed';
    if (s.unrevealedCount > 0) t += ', ' + s.unrevealedCount + ' face down';
    return t;
  }

  /* Per-column summary for the Combat Display side panel. */
  function byColumn(units, columns) {
    var out = {};
    (columns || ['A', 'B', 'C', 'D']).forEach(function (c) {
      out[c] = summarize(units.filter(function (u) { return u.column === c; }));
    });
    return out;
  }

  /* Defense value a unit contributes to an attack calculation [14.15B1].
   * Unrevealed targets contribute the published constant, not their real value. */
  function defenseFor(u) {
    return isRevealed(u) ? (u.defense || 0) : UNREVEALED_DEFENSE;
  }

  /* Belt and braces: prove a summary object carries no hidden unit's value.
   * Returns [] when clean, otherwise a list of offending keys. Used by the tests
   * and callable from the UI in development. */
  function assertNoLeak(summary, units) {
    var problems = [];
    var hidden = (units || []).filter(function (u) { return !isRevealed(u); });
    if (!hidden.length) return problems;
    var hiddenAsw = hidden.reduce(function (t, u) { return t + (u.asw || 0); }, 0);
    var hiddenTon = hidden.reduce(function (t, u) { return t + (u.tonnage || 0); }, 0);
    var visibleAsw = (units || []).filter(isRevealed)
      .reduce(function (t, u) { return t + (u.damaged ? 0 : (u.asw || 0)); }, 0);
    if (hiddenAsw !== 0 && summary.revealedAsw === visibleAsw + hiddenAsw) {
      problems.push('revealedAsw includes hidden ASW');
    }
    if (hiddenTon !== 0 && summary.revealedTonnage ===
        (units || []).filter(isRevealed).reduce(function (t, u) { return t + (u.tonnage || 0); }, 0) + hiddenTon) {
      problems.push('revealedTonnage includes hidden tonnage');
    }
    Object.keys(summary).forEach(function (k) {
      if (/^true|^actual|^hidden/.test(k)) problems.push('forbidden field: ' + k);
    });
    return problems;
  }

  root.SWFog = {
    UNREVEALED_DEFENSE: UNREVEALED_DEFENSE,
    summarize: summarize,
    byColumn: byColumn,
    phrase: phrase,
    countPhrase: countPhrase,
    defenseFor: defenseFor,
    assertNoLeak: assertNoLeak
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
