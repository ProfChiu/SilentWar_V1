/* sw_ships.js — Japanese pieces and the War Mix. PURE DATA.
 *
 * The 47 ship counters decode straight out of their Vassal filenames as
 * <type><tonnage>t<defense><asw>[variant] — a pattern confirmed by rendering
 * every counter and reading its printed face. Two aircraft complete the set:
 * they carry an ASW rating and NO defense, because [2.3B] says aircraft cannot
 * be attacked.
 *
 * The War Mix Table [3.1] is transcribed from Charts/page_063 and every column
 * was checked against the per-cup totals printed on the chart itself — the
 * arithmetic ties out for all five columns, which is why it can be trusted.
 * `mix` values are [cupA, cupB, cupC, cupD, notUsed] per War Period.
 */
(function (root) {
  'use strict';

  var PIECES = [
    { id: 'ac10t30(izumo)', type: 'AC', tonnage: 10, defense: 3, asw: 0, name: 'Izumo', entry: null,
      art: '../../Source/images/ac10t30(izumo).gif' },
    { id: 'af5t30', type: 'AF', tonnage: 5, defense: 3, asw: 0, name: null, entry: null,
      art: '../../Source/images/af5t30.gif' },
    { id: 'af9t30', type: 'AF', tonnage: 9, defense: 3, asw: 0, name: null, entry: null,
      art: '../../Source/images/af9t30.gif' },
    { id: 'ao10t30', type: 'AO', tonnage: 10, defense: 3, asw: 0, name: null, entry: null,
      art: '../../Source/images/ao10t30.gif' },
    { id: 'ao15t40', type: 'AO', tonnage: 15, defense: 4, asw: 0, name: null, entry: null,
      art: '../../Source/images/ao15t40.gif' },
    { id: 'ao5t20', type: 'AO', tonnage: 5, defense: 2, asw: 0, name: null, entry: null,
      art: '../../Source/images/ao5t20.gif' },
    { id: 'ao8t30', type: 'AO', tonnage: 8, defense: 3, asw: 0, name: null, entry: null,
      art: '../../Source/images/ao8t30.gif' },
    { id: 'ar15t30(asahi)', type: 'AR', tonnage: 15, defense: 3, asw: 0, name: 'Asahi', entry: null,
      art: '../../Source/images/ar15t30(asahi).gif' },
    { id: 'bb32t80', type: 'BB', tonnage: 32, defense: 8, asw: 0, name: null, entry: null,
      art: '../../Source/images/bb32t80.gif' },
    { id: 'bb35t70', type: 'BB', tonnage: 35, defense: 7, asw: 0, name: null, entry: null,
      art: '../../Source/images/bb35t70.gif' },
    { id: 'bb36t90', type: 'BB', tonnage: 36, defense: 9, asw: 0, name: null, entry: null,
      art: '../../Source/images/bb36t90.gif' },
    { id: 'bb40t90', type: 'BB', tonnage: 40, defense: 9, asw: 0, name: null, entry: null,
      art: '../../Source/images/bb40t90.gif' },
    { id: 'bb68t110(yamato)', type: 'BB', tonnage: 68, defense: 11, asw: 0, name: 'Yamato', entry: '5/42',
      art: '../../Source/images/bb68t110(yamato).gif' },
    { id: 'bv36t90', type: 'BV', tonnage: 36, defense: 9, asw: 0, name: null, entry: '10/43',
      art: '../../Source/images/bv36t90.gif' },
    { id: 'ca15t50', type: 'CA', tonnage: 15, defense: 5, asw: 0, name: null, entry: null,
      art: '../../Source/images/ca15t50.gif' },
    { id: 'ca9t40', type: 'CA', tonnage: 9, defense: 4, asw: 0, name: null, entry: null,
      art: '../../Source/images/ca9t40.gif' },
    { id: 'cl5t40', type: 'CL', tonnage: 5, defense: 4, asw: 0, name: null, entry: null,
      art: '../../Source/images/cl5t40.gif' },
    { id: 'cv10t40', type: 'CV', tonnage: 10, defense: 4, asw: 0, name: null, entry: null,
      art: '../../Source/images/cv10t40.gif' },
    { id: 'cv15t40', type: 'CV', tonnage: 15, defense: 4, asw: 0, name: null, entry: null,
      art: '../../Source/images/cv15t40.gif' },
    { id: 'cv15t50', type: 'CV', tonnage: 15, defense: 5, asw: 0, name: null, entry: null,
      art: '../../Source/images/cv15t50.gif' },
    { id: 'cv25t50(shokaku)', type: 'CV', tonnage: 25, defense: 5, asw: 0, name: 'Shokaku', entry: null,
      art: '../../Source/images/cv25t50(shokaku).gif' },
    { id: 'cv30t60(taiho)', type: 'CV', tonnage: 30, defense: 6, asw: 0, name: 'Taiho', entry: '3/44',
      art: '../../Source/images/cv30t60(taiho).gif' },
    { id: 'cv43t50(kaga)', type: 'CV', tonnage: 43, defense: 5, asw: 0, name: 'Kaga', entry: null, scenarioOnly: '1932',
      art: '../../Source/images/cv43t50(kaga).gif' },
    { id: 'cv65t60(shinano)', type: 'CV', tonnage: 65, defense: 6, asw: 0, name: 'Shinano', entry: '11/44',
      art: '../../Source/images/cv65t60(shinano).gif' },
    { id: 'dd1t6half', type: 'DD', tonnage: 1, defense: 6, asw: 0.5, name: null, entry: null,
      art: '../../Source/images/dd1t6half.gif' },
    { id: 'dd2t61', type: 'DD', tonnage: 2, defense: 6, asw: 1, name: null, entry: null,
      art: '../../Source/images/dd2t61.gif' },
    { id: 'dd2t62', type: 'DD', tonnage: 2, defense: 6, asw: 2, name: null, entry: null,
      art: '../../Source/images/dd2t62.gif' },
    { id: 'dd2t63', type: 'DD', tonnage: 2, defense: 6, asw: 3, name: null, entry: null,
      art: '../../Source/images/dd2t63.gif' },
    { id: 'dd2t71', type: 'DD', tonnage: 2, defense: 7, asw: 1, name: null, entry: null,
      art: '../../Source/images/dd2t71.gif' },
    { id: 'dd2t72', type: 'DD', tonnage: 2, defense: 7, asw: 2, name: null, entry: null,
      art: '../../Source/images/dd2t72.gif' },
    { id: 'dd2t73', type: 'DD', tonnage: 2, defense: 7, asw: 3, name: null, entry: null,
      art: '../../Source/images/dd2t73.gif' },
    { id: 'dd2t74(diligent)', type: 'DD', tonnage: 2, defense: 7, asw: 4, name: 'Diligent', entry: null,
      art: '../../Source/images/dd2t74(diligent).gif' },
    { id: 'de1t82', type: 'DE', tonnage: 1, defense: 8, asw: 2, name: null, entry: '3/44',
      art: '../../Source/images/de1t82.gif' },
    { id: 'm10t30', type: 'M', tonnage: 10, defense: 3, asw: 0, name: null, entry: null,
      art: '../../Source/images/m10t30.gif' },
    { id: 'm15t30', type: 'M', tonnage: 15, defense: 3, asw: 0, name: null, entry: null,
      art: '../../Source/images/m15t30.gif' },
    { id: 'm1t10', type: 'M', tonnage: 1, defense: 1, asw: 0, name: null, entry: null,
      art: '../../Source/images/m1t10.gif' },
    { id: 'm1t20', type: 'M', tonnage: 1, defense: 2, asw: 0, name: null, entry: null,
      art: '../../Source/images/m1t20.gif' },
    { id: 'm20t40', type: 'M', tonnage: 20, defense: 4, asw: 0, name: null, entry: null,
      art: '../../Source/images/m20t40.gif' },
    { id: 'm2t10', type: 'M', tonnage: 2, defense: 1, asw: 0, name: null, entry: null,
      art: '../../Source/images/m2t10.gif' },
    { id: 'm2t20', type: 'M', tonnage: 2, defense: 2, asw: 0, name: null, entry: null,
      art: '../../Source/images/m2t20.gif' },
    { id: 'm3t10', type: 'M', tonnage: 3, defense: 1, asw: 0, name: null, entry: null,
      art: '../../Source/images/m3t10.gif' },
    { id: 'm3t20', type: 'M', tonnage: 3, defense: 2, asw: 0, name: null, entry: null,
      art: '../../Source/images/m3t20.gif' },
    { id: 'm3t30', type: 'M', tonnage: 3, defense: 3, asw: 0, name: null, entry: null,
      art: '../../Source/images/m3t30.gif' },
    { id: 'm5t10', type: 'M', tonnage: 5, defense: 1, asw: 0, name: null, entry: null,
      art: '../../Source/images/m5t10.gif' },
    { id: 'm5t20', type: 'M', tonnage: 5, defense: 2, asw: 0, name: null, entry: null,
      art: '../../Source/images/m5t20.gif' },
    { id: 'm5t30', type: 'M', tonnage: 5, defense: 3, asw: 0, name: null, entry: null,
      art: '../../Source/images/m5t30.gif' },
    { id: 'm8t30', type: 'M', tonnage: 8, defense: 3, asw: 0, name: null, entry: null,
      art: '../../Source/images/m8t30.gif' },
    { id: 'h8emily2', type: 'AIR', tonnage: null, defense: null, asw: 2, name: 'H8 Emily', entry: null,
      art: '../../Source/images/h8emily2.gif' },
    { id: 'h6mavis2', type: 'AIR', tonnage: null, defense: null, asw: 2, name: 'H6 Mavis', entry: null,
      art: '../../Source/images/h6mavis2.gif' },
    /* The War Mix puts four Combat Event markers in the cups [3.1], so they are
     * drawn and placed exactly like a ship even though they are not one: no
     * tonnage, no defense, no ASW. Resolved on reveal per [19.2]. */
    { id: 'combat_event', type: 'EVENT', tonnage: null, defense: null, asw: 0,
      name: 'Combat Event', entry: null,
      art: '../../Source/images/combat_event.gif' }
  ];

  var WAR_MIX = [
    { id: 'event', label: 'Event', total: 4, mix: { W1: [1, 1, 1, 1, 0], W2: [1, 1, 1, 1, 0], W3: [1, 1, 1, 1, 0], W4: [1, 1, 1, 1, 0], Y32: [1, 1, 1, 1, 0] } },
    { id: 'h8', label: 'H8 (aircraft)', total: 1, mix: { W1: [0, 1, 0, 0, 0], W2: [0, 1, 0, 0, 0], W3: [0, 1, 0, 0, 0], W4: [0, 1, 0, 0, 0], Y32: [0, 0, 0, 0, 1] } },
    { id: 'h6', label: 'H6 (aircraft)', total: 1, mix: { W1: [1, 0, 0, 0, 0], W2: [1, 0, 0, 0, 0], W3: [1, 0, 0, 0, 0], W4: [1, 0, 0, 0, 0], Y32: [0, 0, 0, 0, 1] } },
    { id: 'cv15t', label: 'CV 15t', total: 2, mix: { W1: [0, 0, 0, 2, 0], W2: [0, 0, 0, 2, 0], W3: [0, 0, 1, 1, 0], W4: [0, 0, 1, 1, 0], Y32: [0, 0, 0, 0, 2] } },
    { id: 'cv10t', label: 'CV 10t', total: 1, mix: { W1: [0, 0, 0, 1, 0], W2: [0, 1, 0, 0, 0], W3: [0, 1, 0, 0, 0], W4: [0, 1, 0, 0, 0], Y32: [0, 0, 1, 0, 0] } },
    { id: 'kaga', label: 'Kaga', total: 1, mix: { W1: [0, 0, 0, 0, 1], W2: [0, 0, 0, 0, 1], W3: [0, 0, 0, 0, 1], W4: [0, 0, 0, 0, 1], Y32: [0, 0, 0, 1, 0] } },
    { id: 'shokaku', label: 'Shokaku', total: 1, mix: { W1: [0, 0, 0, 1, 0], W2: [0, 0, 0, 1, 0], W3: [0, 0, 0, 1, 0], W4: [0, 0, 0, 1, 0], Y32: [0, 0, 0, 0, 1] } },
    { id: 'taiho', label: 'Taiho', total: 1, mix: { W1: [0, 0, 0, 0, 1], W2: [0, 0, 0, 0, 1], W3: [0, 0, 0, 1, 0], W4: [0, 0, 0, 1, 0], Y32: [0, 0, 0, 0, 1] } },
    { id: 'shinano', label: 'Shinano', total: 1, mix: { W1: [0, 0, 0, 0, 1], W2: [0, 0, 0, 0, 1], W3: [0, 0, 0, 0, 1], W4: [0, 0, 0, 1, 0], Y32: [0, 0, 0, 0, 1] } },
    { id: 'bb32t', label: 'BB 32t', total: 2, mix: { W1: [0, 0, 0, 2, 0], W2: [0, 0, 1, 1, 0], W3: [0, 0, 1, 1, 0], W4: [0, 0, 1, 0, 1], Y32: [0, 0, 1, 1, 0] } },
    { id: 'bb40t', label: 'BB 40t', total: 1, mix: { W1: [0, 0, 0, 1, 0], W2: [0, 0, 0, 1, 0], W3: [0, 0, 0, 1, 0], W4: [0, 0, 0, 1, 0], Y32: [0, 0, 0, 1, 0] } },
    { id: 'bb36t', label: 'BB 36t', total: 1, mix: { W1: [0, 0, 0, 1, 0], W2: [0, 0, 0, 1, 0], W3: [0, 0, 0, 0, 1], W4: [0, 0, 0, 0, 1], Y32: [0, 0, 0, 1, 0] } },
    { id: 'bv36t', label: 'BV 36t', total: 1, mix: { W1: [0, 0, 0, 0, 1], W2: [0, 0, 0, 0, 1], W3: [0, 0, 0, 0, 1], W4: [0, 0, 0, 1, 0], Y32: [0, 0, 0, 0, 1] } },
    { id: 'bb35t', label: 'BB 35t', total: 1, mix: { W1: [0, 0, 0, 1, 0], W2: [0, 0, 0, 1, 0], W3: [0, 0, 0, 1, 0], W4: [0, 0, 0, 0, 1], Y32: [0, 0, 0, 1, 0] } },
    { id: 'yamato', label: 'Yamato', total: 1, mix: { W1: [0, 0, 0, 0, 1], W2: [0, 0, 0, 1, 0], W3: [0, 0, 0, 1, 0], W4: [0, 0, 0, 1, 0], Y32: [0, 0, 0, 0, 1] } },
    { id: 'asahi', label: 'Asahi', total: 1, mix: { W1: [0, 0, 1, 0, 0], W2: [0, 0, 1, 0, 0], W3: [0, 0, 0, 0, 1], W4: [0, 0, 0, 0, 1], Y32: [0, 1, 0, 0, 0] } },
    { id: 'izumo', label: 'Izumo', total: 1, mix: { W1: [0, 1, 0, 0, 0], W2: [0, 1, 0, 0, 0], W3: [0, 0, 0, 0, 1], W4: [0, 0, 0, 0, 1], Y32: [0, 0, 1, 0, 0] } },
    { id: 'ca15t', label: 'CA 15t', total: 1, mix: { W1: [0, 0, 0, 1, 0], W2: [0, 0, 0, 1, 0], W3: [0, 0, 0, 1, 0], W4: [0, 0, 0, 1, 0], Y32: [0, 0, 0, 0, 1] } },
    { id: 'ca9t', label: 'CA 9t', total: 2, mix: { W1: [0, 0, 1, 1, 0], W2: [0, 0, 1, 1, 0], W3: [0, 0, 1, 1, 0], W4: [0, 0, 0, 1, 1], Y32: [0, 0, 1, 1, 0] } },
    { id: 'cl5t', label: 'CL 5t', total: 6, mix: { W1: [0, 0, 2, 4, 0], W2: [0, 0, 3, 3, 0], W3: [1, 2, 2, 1, 0], W4: [1, 2, 2, 1, 0], Y32: [0, 1, 2, 3, 0] } },
    { id: 'dd2t', label: 'DD 2t', total: 20, mix: { W1: [2, 4, 6, 8, 0], W2: [2, 6, 6, 6, 0], W3: [3, 5, 5, 3, 4], W4: [1, 2, 3, 2, 12], Y32: [1, 2, 3, 4, 10] } },
    { id: 'dd1t', label: 'DD 1t', total: 4, mix: { W1: [1, 1, 1, 1, 0], W2: [2, 1, 1, 0, 0], W3: [2, 1, 1, 0, 0], W4: [2, 1, 1, 0, 0], Y32: [1, 1, 1, 1, 0] } },
    { id: 'de1t', label: 'DE 1t', total: 5, mix: { W1: [0, 0, 0, 0, 5], W2: [0, 0, 0, 0, 5], W3: [1, 2, 1, 0, 1], W4: [1, 2, 2, 0, 0], Y32: [0, 0, 0, 0, 5] } },
    { id: 'diligent', label: 'Diligent DD', total: 3, mix: { W1: [0, 0, 0, 1, 2], W2: [0, 0, 1, 1, 1], W3: [0, 1, 1, 1, 0], W4: [0, 1, 1, 1, 0], Y32: [0, 0, 0, 0, 3] } },
    { id: 'm7plus', label: 'M 7t or more', total: 10, mix: { W1: [1, 3, 3, 3, 0], W2: [1, 3, 4, 2, 0], W3: [1, 3, 4, 2, 0], W4: [1, 3, 3, 2, 1], Y32: [2, 2, 3, 3, 0] } },
    { id: 'm6minus', label: 'M 6t or less', total: 35, mix: { W1: [16, 7, 6, 6, 0], W2: [16, 10, 6, 3, 0], W3: [10, 8, 6, 4, 7], W4: [10, 8, 7, 1, 9], Y32: [16, 10, 7, 2, 0] } }
  ];

  var PERIOD_TOTALS = { W1: [22, 18, 21, 35], W2: [23, 24, 25, 26],
                        W3: [20, 25, 24, 21], W4: [18, 22, 22, 17],
                        Y32: [21, 18, 21, 20] };

  root.SWShips = {
    pieces: PIECES,
    warMix: WAR_MIX,
    /* Printed on the chart; the tests re-derive these from `warMix` so a typo
     * in either one shows up as a mismatch. */
    printedCupTotals: PERIOD_TOTALS,
    piece: function (id) {
      for (var i = 0; i < PIECES.length; i++) { if (PIECES[i].id === id) return PIECES[i]; }
      return null;
    },
    byType: function (t) {
      return PIECES.filter(function (p) { return p.type === t; });
    },
    /* [3.12] Nine PIECES have printed Entry Dates: Yamato, the BV 36t, Taiho,
     * Shinano and the five Matsu-class destroyer escorts. Those are only four
     * distinct counter TYPES plus five copies of the DE, because the five
     * Matsu boats all share one counter. Kaga is not among them — its counter
     * reads "Kaga 32" because it belongs to the 1932 campaign, not because it
     * arrives on a date. */
    dated: function () { return PIECES.filter(function (p) { return p.entry; }); },
    /* Which War Mix row each dated counter type belongs to, so the piece count
     * can be checked against [3.12]. Explicit, because the five Matsu-class
     * destroyer escorts share one counter type. */
    datedMixRow: { 'bb68t110(yamato)': 'yamato', 'bv36t90': 'bv36t',
                   'cv30t60(taiho)': 'taiho', 'cv65t60(shinano)': 'shinano',
                   'de1t82': 'de1t' },
    datedPieceCount: function () {
      var self = this, n = 0;
      PIECES.filter(function (p) { return p.entry; }).forEach(function (p) {
        var key = self.datedMixRow[p.id];
        var row = WAR_MIX.filter(function (r) { return r.id === key; })[0];
        n += row ? row.total : 1;
      });
      return n;
    },
    cupTotals: function (period) {
      var t = [0, 0, 0, 0];
      WAR_MIX.forEach(function (r) {
        var m = r.mix[period];
        for (var i = 0; i < 4; i++) t[i] += m[i];
      });
      return t;
    }
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
