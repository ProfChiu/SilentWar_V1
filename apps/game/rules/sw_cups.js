/* sw_cups.js — the four War Mix cups and the TDC pool [3.1] / [2.3C].
 * PURE MODULE. ZERO DOM, ZERO Math.random.
 *
 * Randomness arrives as opts.rollDie(10) like everywhere else; `pickIndex`
 * turns d10 digits into an unbiased index by rejection sampling, so a cup draw
 * is reproducible from a scripted die sequence in the tests.
 */
(function (root) {
  'use strict';

  var req = typeof require === 'function' ? require : null;
  var Ships = root.SWShips || (req ? req('../data/sw_ships.js').SWShips : null);
  var Units = root.SWUnits || (req ? req('../data/sw_units.js').SWUnits : null);

  /* Unbiased index in [0, n) from a d10 stream. Builds the smallest power of
   * ten that covers n and rejects the tail, so no value is favoured. */
  function pickIndex(n, opts) {
    if (n <= 0) throw new Error('sw_cups: pickIndex needs a positive range');
    if (n === 1) return 0;
    var limit = 10;
    while (limit < n) limit *= 10;
    var cap = limit - (limit % n);
    for (var guard = 0; guard < 500; guard++) {
      var v = 0, scale = limit;
      while (scale > 1) { v = v * 10 + opts.rollDie(10); scale /= 10; }
      if (v < cap) return v % n;
    }
    throw new Error('sw_cups: pickIndex failed to terminate — is rollDie random?');
  }

  /* Which piece ids belong to a War Mix row. The chart groups by category, so
   * one row can cover several counter types; [3.11] says to distribute those
   * randomly, which means the row is a bag of interchangeable pieces. */
  function piecesForRow(rowId) {
    var P = Ships.pieces;
    function ofType(t, pred) {
      return P.filter(function (p) { return p.type === t && (!pred || pred(p)); })
              .map(function (p) { return p.id; });
    }
    switch (rowId) {
      case 'event':    return ['combat_event'];
      case 'h8':       return ['h8emily2'];
      case 'h6':       return ['h6mavis2'];
      case 'cv15t':    return ofType('CV', function (p) { return p.tonnage === 15; });
      case 'cv10t':    return ofType('CV', function (p) { return p.tonnage === 10; });
      case 'kaga':     return ['cv43t50(kaga)'];
      case 'shokaku':  return ['cv25t50(shokaku)'];
      case 'taiho':    return ['cv30t60(taiho)'];
      case 'shinano':  return ['cv65t60(shinano)'];
      case 'bb32t':    return ['bb32t80'];
      case 'bb40t':    return ['bb40t90'];
      case 'bb36t':    return ['bb36t90'];
      case 'bv36t':    return ['bv36t90'];
      case 'bb35t':    return ['bb35t70'];
      case 'yamato':   return ['bb68t110(yamato)'];
      case 'asahi':    return ['ar15t30(asahi)'];
      case 'izumo':    return ['ac10t30(izumo)'];
      case 'ca15t':    return ofType('CA', function (p) { return p.tonnage === 15; });
      case 'ca9t':     return ofType('CA', function (p) { return p.tonnage === 9; });
      case 'cl5t':     return ofType('CL');
      case 'dd2t':     return ofType('DD', function (p) {
                          return p.tonnage === 2 && p.id.indexOf('diligent') === -1; });
      case 'dd1t':     return ofType('DD', function (p) { return p.tonnage === 1; });
      case 'de1t':     return ofType('DE');
      case 'diligent': return ['dd2t74(diligent)'];
      case 'm7plus':   return ofType('M', function (p) { return p.tonnage >= 7; })
                              .concat(ofType('AO', function (p) { return p.tonnage >= 7; }))
                              .concat(ofType('AF', function (p) { return p.tonnage >= 7; }));
      case 'm6minus':  return ofType('M', function (p) { return p.tonnage < 7; })
                              .concat(ofType('AO', function (p) { return p.tonnage < 7; }))
                              .concat(ofType('AF', function (p) { return p.tonnage < 7; }));
      default: throw new Error('sw_cups: no pieces mapped for War Mix row ' + rowId);
    }
  }

  /* Build cups A-D for a War Period. Each entry is a concrete counter, so the
   * cup can be drawn from without further interpretation. */
  /* `keep(rowId)`, optional: a campaign leaves out ships not yet in the war
   * [3.12] and unique ships already sunk (Phase 8). */
  /* `pieceOk(pieceId)`, optional: a scenario that uses only some counters of
   * a row (East Wind Early: only the 6-defence DD 2t [31.61 D]). */
  function build(period, opts, keep, pieceOk) {
    opts = opts || {};
    var cups = { A: [], B: [], C: [], D: [] }, seq = 0;
    Ships.warMix.forEach(function (row) {
      if (keep && !keep(row.id)) return;
      var mix = row.mix[period];
      if (!mix) throw new Error('sw_cups: unknown War Period ' + period);
      var members = piecesForRow(row.id);
      if (pieceOk) { var some = members.filter(pieceOk); if (some.length) members = some; }
      ['A', 'B', 'C', 'D'].forEach(function (cup, i) {
        for (var k = 0; k < mix[i]; k++) {
          /* [3.11] a category with several types distributes randomly; with a
           * single type the choice is degenerate and no die is spent. */
          var pieceId = members.length === 1 ? members[0]
                      : members[pickIndex(members.length, opts)];
          cups[cup].push({ uid: row.id + '#' + (seq++), row: row.id, piece: pieceId, cup: cup });
        }
      });
    });
    return cups;
  }

  /* [13.2C] Draw n pieces from a cup without examining them. Mutates the cup. */
  function draw(cup, n, opts) {
    var out = [];
    for (var i = 0; i < n && cup.length; i++) {
      out.push(cup.splice(pickIndex(cup.length, opts), 1)[0]);
    }
    return out;
  }

  /* [2.3C] 24 TDC markers, drawn blind and placed blind. */
  function tdcPool() { return Units.tdcDrawPool().slice(); }
  function drawTdc(pool, n, opts) {
    var out = [];
    for (var i = 0; i < n && pool.length; i++) {
      out.push(pool.splice(pickIndex(pool.length, opts), 1)[0]);
    }
    return out;
  }

  root.SWCups = {
    pickIndex: pickIndex,
    piecesForRow: piecesForRow,
    build: build,
    draw: draw,
    tdcPool: tdcPool,
    drawTdc: drawTdc
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
