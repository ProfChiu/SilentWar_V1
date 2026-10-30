/* sw_aac.js — the 23 Area Activity Charts. PURE DATA (generated).
 *
 * 920 cells, pixel-sampled from SW_map_final-50.png by tools/sample_aac.py —
 * not transcribed by eye. Each chart is 4 rows (War Periods 1-4) x 10 columns
 * (die roll 0-9); the cell gives the Activity Level [13.2A].
 *
 * `redBoxes` is the count of High Density cells per War Period row, which is
 * exactly the number [14.2A2] adds to the Japanese counterattack total. The
 * rulebook's own Spearfish example says East China Sea in War Period 2 has 3
 * red boxes; this file agrees, which is the check that the sampling is aligned.
 *
 * Verified: every chart's printed title was rendered and read to confirm the
 * chart-to-OpArea mapping, and 8 charts were compared cell-by-cell against the
 * map art. See docs/02_phase3_data.md.
 */
(function (root) {
  'use strict';

  var CHARTS = {
    kurile: {
      name: 'Kurile Islands', group: 'NORTH PAC',
      redBoxes: [2, 2, 1, 0],
      grid: [
        ['none', 'sparse', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high', 'high'],
        ['none', 'none', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high', 'high'],
        ['none', 'none', 'none', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high'],
        ['none', 'none', 'none', 'none', 'sparse', 'sparse', 'low', 'low', 'low', 'moderate']
      ]
    },
    aleutians: {
      name: 'Aleutian Islands', group: 'NORTH PAC',
      redBoxes: [2, 1, 0, 0],
      grid: [
        ['none', 'sparse', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high', 'high'],
        ['none', 'none', 'sparse', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'sparse', 'sparse', 'low', 'low'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none']
      ]
    },
    north_pacific: {
      name: 'North Pacific', group: 'NORTH PAC',
      redBoxes: [1, 1, 1, 0],
      grid: [
        ['none', 'none', 'none', 'sparse', 'low', 'low', 'low', 'moderate', 'moderate', 'high'],
        ['none', 'none', 'none', 'none', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high'],
        ['none', 'none', 'none', 'none', 'none', 'sparse', 'sparse', 'low', 'moderate', 'high'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'sparse', 'low', 'moderate']
      ]
    },
    hawaiian: {
      name: 'Hawaiian Islands', group: 'MID PAC',
      redBoxes: [3, 0, 0, 0],
      grid: [
        ['none', 'none', 'none', 'sparse', 'low', 'moderate', 'moderate', 'high', 'high', 'high'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'sparse', 'sparse', 'low'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none']
      ]
    },
    sea_of_japan: {
      name: 'Sea of Japan', group: 'EMPIRE',
      redBoxes: [3, 4, 2, 1],
      grid: [
        ['none', 'sparse', 'low', 'low', 'moderate', 'moderate', 'moderate', 'high', 'high', 'high'],
        ['sparse', 'sparse', 'low', 'moderate', 'moderate', 'moderate', 'high', 'high', 'high', 'high'],
        ['none', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'moderate', 'high', 'high'],
        ['none', 'none', 'none', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high']
      ]
    },
    empire_pacific: {
      name: 'Empire Pacific', group: 'EMPIRE',
      redBoxes: [3, 2, 1, 1],
      grid: [
        ['none', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high', 'high', 'high'],
        ['none', 'sparse', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high', 'high'],
        ['none', 'none', 'sparse', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high'],
        ['none', 'none', 'none', 'sparse', 'sparse', 'sparse', 'low', 'low', 'moderate', 'high']
      ]
    },
    yellow_sea: {
      name: 'Yellow Sea', group: 'CHINA',
      redBoxes: [3, 2, 1, 0],
      grid: [
        ['none', 'sparse', 'low', 'low', 'low', 'moderate', 'moderate', 'high', 'high', 'high'],
        ['none', 'sparse', 'sparse', 'low', 'low', 'low', 'moderate', 'moderate', 'high', 'high'],
        ['none', 'sparse', 'sparse', 'sparse', 'low', 'low', 'low', 'moderate', 'moderate', 'high'],
        ['none', 'none', 'sparse', 'sparse', 'sparse', 'sparse', 'low', 'low', 'low', 'moderate']
      ]
    },
    east_china_sea: {
      name: 'East China Sea', group: 'CHINA',
      redBoxes: [4, 3, 1, 0],
      grid: [
        ['none', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high', 'high', 'high', 'high'],
        ['none', 'none', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high', 'high', 'high'],
        ['none', 'none', 'none', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high'],
        ['none', 'none', 'none', 'none', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate']
      ]
    },
    bonins: {
      name: 'Bonins', group: 'CEN PAC',
      redBoxes: [4, 3, 1, 0],
      grid: [
        ['none', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high', 'high', 'high', 'high'],
        ['none', 'none', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high', 'high', 'high'],
        ['none', 'none', 'none', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high'],
        ['none', 'none', 'none', 'none', 'sparse', 'sparse', 'sparse', 'low', 'low', 'moderate']
      ]
    },
    marshalls: {
      name: 'Marshall Islands', group: 'MID PAC',
      redBoxes: [1, 1, 0, 0],
      grid: [
        ['none', 'sparse', 'sparse', 'sparse', 'low', 'low', 'low', 'moderate', 'moderate', 'high'],
        ['none', 'none', 'none', 'none', 'sparse', 'sparse', 'low', 'low', 'moderate', 'high'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'sparse', 'low'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none']
      ]
    },
    scs1: {
      name: 'South China Sea 1', group: 'INDOCHINA',
      redBoxes: [3, 1, 1, 0],
      grid: [
        ['none', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high', 'high', 'high'],
        ['none', 'sparse', 'sparse', 'sparse', 'low', 'low', 'low', 'moderate', 'moderate', 'high'],
        ['none', 'none', 'none', 'sparse', 'sparse', 'low', 'low', 'low', 'moderate', 'high'],
        ['none', 'none', 'none', 'none', 'sparse', 'sparse', 'sparse', 'low', 'low', 'moderate']
      ]
    },
    n_phil_sea: {
      name: 'North Philippine Sea', group: 'SW PAC',
      redBoxes: [3, 2, 1, 0],
      grid: [
        ['none', 'sparse', 'low', 'low', 'moderate', 'moderate', 'moderate', 'high', 'high', 'high'],
        ['none', 'none', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high', 'high'],
        ['none', 'none', 'none', 'sparse', 'sparse', 'sparse', 'low', 'low', 'moderate', 'high'],
        ['none', 'none', 'none', 'none', 'none', 'sparse', 'sparse', 'low', 'low', 'moderate']
      ]
    },
    marianas: {
      name: 'Marianas', group: 'CEN PAC',
      redBoxes: [3, 2, 1, 0],
      grid: [
        ['none', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high', 'high', 'high'],
        ['none', 'none', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high', 'high'],
        ['none', 'none', 'none', 'sparse', 'sparse', 'sparse', 'low', 'low', 'moderate', 'high'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'sparse', 'sparse']
      ]
    },
    scs2: {
      name: 'South China Sea 2', group: 'INDOCHINA',
      redBoxes: [2, 1, 1, 0],
      grid: [
        ['none', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'moderate', 'high', 'high'],
        ['none', 'none', 'sparse', 'sparse', 'low', 'low', 'low', 'moderate', 'moderate', 'high'],
        ['none', 'none', 'none', 'none', 'sparse', 'sparse', 'low', 'low', 'moderate', 'high'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'sparse', 'sparse', 'low']
      ]
    },
    s_phil_sea: {
      name: 'South Philippine Sea', group: 'SW PAC',
      redBoxes: [3, 2, 1, 0],
      grid: [
        ['none', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high', 'high', 'high'],
        ['none', 'sparse', 'sparse', 'low', 'low', 'low', 'moderate', 'moderate', 'high', 'high'],
        ['none', 'none', 'none', 'none', 'sparse', 'sparse', 'sparse', 'low', 'moderate', 'high'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'sparse', 'sparse']
      ]
    },
    carolines: {
      name: 'Carolines', group: 'CEN PAC',
      redBoxes: [2, 1, 0, 0],
      grid: [
        ['none', 'none', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high', 'high'],
        ['none', 'sparse', 'sparse', 'low', 'low', 'low', 'moderate', 'moderate', 'moderate', 'high'],
        ['none', 'none', 'none', 'none', 'none', 'sparse', 'sparse', 'low', 'low', 'moderate'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none']
      ]
    },
    transfer_route: {
      name: 'Transfer Route', group: 'MID PAC',
      redBoxes: [2, 1, 0, 0],
      grid: [
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'high', 'high'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'high'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none']
      ]
    },
    bismarck_sea: {
      name: 'Bismarck Sea', group: 'SOUTH PAC',
      redBoxes: [2, 1, 0, 0],
      grid: [
        ['none', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'moderate', 'high', 'high'],
        ['none', 'none', 'sparse', 'sparse', 'low', 'low', 'low', 'moderate', 'moderate', 'high'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'sparse', 'sparse', 'low'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none']
      ]
    },
    java_sea: {
      name: 'Java Sea', group: 'INDOCHINA',
      redBoxes: [3, 2, 0, 0],
      grid: [
        ['none', 'sparse', 'low', 'low', 'moderate', 'moderate', 'moderate', 'high', 'high', 'high'],
        ['none', 'sparse', 'low', 'low', 'low', 'moderate', 'moderate', 'moderate', 'high', 'high'],
        ['none', 'none', 'none', 'none', 'none', 'sparse', 'sparse', 'low', 'low', 'moderate'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'sparse']
      ]
    },
    banda_sea: {
      name: 'Banda Sea', group: 'SW PAC',
      redBoxes: [3, 1, 1, 0],
      grid: [
        ['none', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high', 'high', 'high'],
        ['none', 'none', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'moderate', 'high'],
        ['none', 'none', 'none', 'none', 'sparse', 'sparse', 'low', 'low', 'moderate', 'high'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none']
      ]
    },
    solomons: {
      name: 'Solomons', group: 'SOUTH PAC',
      redBoxes: [0, 2, 0, 0],
      grid: [
        ['none', 'none', 'none', 'sparse', 'sparse', 'low', 'low', 'low', 'moderate', 'moderate'],
        ['none', 'sparse', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high', 'high'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'sparse', 'sparse', 'low'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none']
      ]
    },
    gilberts: {
      name: 'Gilbert Islands', group: 'SOUTH PAC',
      redBoxes: [0, 0, 0, 0],
      grid: [
        ['none', 'none', 'none', 'sparse', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate'],
        ['none', 'none', 'sparse', 'sparse', 'sparse', 'sparse', 'sparse', 'low', 'low', 'moderate'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'sparse', 'sparse'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none']
      ]
    },
    coral_sea: {
      name: 'Coral Sea', group: 'SOUTH PAC',
      redBoxes: [2, 1, 0, 0],
      grid: [
        ['none', 'sparse', 'sparse', 'sparse', 'low', 'low', 'moderate', 'moderate', 'high', 'high'],
        ['none', 'none', 'none', 'none', 'sparse', 'sparse', 'low', 'low', 'moderate', 'high'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'sparse', 'sparse', 'low'],
        ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none']
      ]
    }
  };

  var LEVELS = ['none', 'sparse', 'low', 'moderate', 'high'];

  root.SWAac = {
    charts: CHARTS,
    levels: LEVELS,
    /* [13.2A] Roll a die, add the cumulative drms, read the box colour.
     * Callers pass the already-modified die; this module holds no rules. */
    lookup: function (areaId, warPeriod, die) {
      var c = CHARTS[areaId];
      if (!c) throw new Error('sw_aac: unknown OpArea ' + areaId);
      var row = { W1: 0, W2: 1, W3: 2, W4: 3 }[warPeriod];
      if (row === undefined) throw new Error('sw_aac: unknown war period ' + warPeriod);
      if (die < 0) die = 0;
      if (die > 9) die = 9;
      return c.grid[row][die];
    },
    /* [14.2A2] red boxes in this area's row for the current War Period. */
    redBoxes: function (areaId, warPeriod) {
      var c = CHARTS[areaId];
      if (!c) throw new Error('sw_aac: unknown OpArea ' + areaId);
      return c.redBoxes[{ W1: 0, W2: 1, W3: 2, W4: 3 }[warPeriod]];
    },
    ids: function () { return Object.keys(CHARTS); }
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
