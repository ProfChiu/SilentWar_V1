/* sw_tables.js — every printed engine table. PURE DATA.
 *
 * Sources and how each was read:
 *   ART, Counterattack, Transit Event  — PIXEL SAMPLED from Charts/page_051 by
 *     tools/sample_grid.py. These are colour matrices; they were not eyeballed.
 *     The palette was calibrated against the legend swatches on the sheet.
 *   Endurance, Contact, Engagement     — read from Charts/page_051 / the map.
 *   War Period, Torpedo Improvement,
 *   Enemy Submarines                   — read from Charts/page_050.
 *   ULTRA                              — read from Charts/page_064.
 * Area Activity Charts live in sw_aac.js; the War Mix lives in sw_ships.js.
 */
(function (root) {
  'use strict';

  /* Activity Levels are the AAC box colours [13.2A]. The map legend names them
   * by density; the Engagement Table is headed with the same names. */
  var ACTIVITY = [
    { id: 'none',     label: 'No Contact',       color: '#ffffff', engagement: null },
    { id: 'sparse',   label: 'Sparse Density',   color: '#3db879', engagement: 'SPARSE' },
    { id: 'low',      label: 'Low Density',      color: '#f99734', engagement: 'LOW' },
    { id: 'moderate', label: 'Moderate Density', color: '#0076bc', engagement: 'MODERATE' },
    { id: 'high',     label: 'High Density',     color: '#ee3439', engagement: 'HIGH' }
  ];

  /* [13.2B] Contact Table — War Period x die roll 0-9. */
  var CONTACT = {
    W1: ['C1','C1','C1','C2','C2','C2','C2','TF','TF','TF'],
    W2: ['C1','C1','C1','C1','C2','C2','C2','C2','TF','TF'],
    W3: ['C1','C1','C1','C1','C2','C2','C2','C2','TF','TF'],
    W4: ['C1','C1','C1','C1','C1','C1','C2','C2','C2','TF']
  };

  /* [13.2C] Engagement Table — Activity Level x Contact -> draws from A,B,C,D.
   * null is the printed dot, "no draw". ULTRA adds one to each real draw. */
  var ENGAGEMENT = {
    sparse:   { C1: [2, 1, null, null], C2: [3, 2, null, null], TF: [1, 2, 2, 2] },
    low:      { C1: [3, 2, null, null], C2: [4, 3, 2, null],    TF: [1, 2, 3, 3] },
    moderate: { C1: [4, 3, null, null], C2: [5, 4, 3, 2],       TF: [2, 3, 3, 4] },
    high:     { C1: [5, 3, 4, null],    C2: [5, 4, 3, 2],       TF: [3, 3, 4, 5] }
  };

  /* [14.15D] Attack Results Table — target tonnage band x die roll 0-9.
   * Modified by the current Mk-XIV value; US Type XXI adds +2, SSN21 adds +3. */
  var ART_ROWS = [
    { id: '1-4',   min: 1,  max: 4 },
    { id: '5-9',   min: 5,  max: 9 },
    { id: '10-17', min: 10, max: 17 },
    { id: '18-25', min: 18, max: 25 },
    { id: '26-35', min: 26, max: 35 },
    { id: '36-55', min: 36, max: 55 },
    { id: '56+',   min: 56, max: Infinity }
  ];
  var ART = [
    ['none','damaged','damaged','sunk','sunk','sunk','sunk','sunk','sunk','sunk'],
    ['none','none','damaged','damaged','sunk','sunk','sunk','sunk','sunk','sunk'],
    ['none','none','none','damaged','damaged','sunk','sunk','sunk','sunk','sunk'],
    ['none','none','none','none','none','damaged','sunk','sunk','sunk','sunk'],
    ['none','none','none','none','none','none','damaged','sunk','sunk','sunk'],
    ['none','none','none','none','none','none','none','damaged','sunk','sunk'],
    ['none','none','none','none','none','none','none','none','damaged','sunk']
  ];

  /* [14.2] Counterattack Table — (Japanese total - submarine total) row x die
   * roll 0-12. A trailing "+" means the printed extra-roll disc: on a
   * `damaged_rtb` cell roll 7-9 to sink, on a `sunk` cell roll 4-9 to sink;
   * otherwise the result is damaged RTB.
   * Procedure notes printed on the sheet: below 0 there is no counterattack,
   * and anything above 8 uses the 8+ line. */
  var CA_ROWS = [
    { id: '0',   min: 0, max: 0 },
    { id: '1-2', min: 1, max: 2 },
    { id: '3-4', min: 3, max: 4 },
    { id: '5-6', min: 5, max: 6 },
    { id: '7',   min: 7, max: 7 },
    { id: '8+',  min: 8, max: Infinity }
  ];
  var COUNTERATTACK = [
    ['none','none','none','none','none','none','none','none','none','spotted','damaged','damaged_rtb','sunk'],
    ['none','none','none','none','none','none','none','none','spotted','damaged','damaged','damaged_rtb+','sunk'],
    ['none','none','none','none','none','none','spotted','spotted','damaged','damaged','damaged_rtb+','sunk','sunk'],
    ['none','none','none','none','spotted','spotted','damaged','damaged','damaged_rtb','damaged_rtb+','sunk+','sunk','sunk'],
    ['none','none','spotted','spotted','spotted','damaged','damaged','damaged_rtb','damaged_rtb+','sunk+','sunk','sunk','sunk'],
    ['none','spotted','spotted','spotted','damaged','damaged','damaged_rtb+','damaged_rtb+','sunk+','sunk','sunk','sunk','sunk']
  ];
  /* Rolled the moment either is revealed [14.12] / [19.2]. Die roll 0-9. */
  var DILIGENT_ESCORT =
    ['none','none','none','none','none','none','spotted','damaged','damaged_rtb','sunk'];
  var EVENT_AIRCRAFT =
    ['none','none','none','spotted','spotted','spotted','spotted','spotted','damaged','sunk+'];

  /* [19.1] Transit Event Table. First die roll selects the row (bands differ by
   * War Period); the second die roll 0-9 gives the result. */
  var TRANSIT_ROWS = [
    { W1: [0, 2],  W2: [0, 4],  W4: [0, 4] },
    { W1: [3, 7],  W2: [5, 6],  W4: [5, 7] },
    { W1: [8, 8],  W2: [7, 7],  W4: [8, 9] },
    { W1: [9, 9],  W2: [8, 8],  W4: null },
    { W1: null,    W2: [9, 9],  W4: null }
  ];
  var TRANSIT = [
    ['none','none','none','none','none','none','none','none','spotted','spotted'],
    ['none','none','none','none','none','none','none','spotted','spotted_rtb','spotted_dmg_rtb'],
    ['none','none','none','none','none','spotted','spotted','spotted_rtb','spotted_dmg_rtb','lost'],
    ['none','none','spotted','spotted','spotted','spotted_rtb','spotted_rtb','spotted_dmg_rtb','spotted_dmg_rtb','lost'],
    ['none','spotted','spotted','spotted','spotted_rtb','spotted_rtb','spotted_dmg_rtb','spotted_dmg_rtb','lost','lost']
  ];

  /* [14.7] Endurance Table — torpedo value x endurance letter. Roll = or < the
   * number to stay on patrol. drms: damaged +1, bypassed search -1,
   * no contacts -1. */
  var ENDURANCE = {
    '-2': { A: 4, B: 3, C: 2, D: 2 },
    '-1': { A: 5, B: 4, C: 3, D: 2 },
    '0':  { A: 6, B: 5, C: 4, D: 3 },
    '1':  { A: 7, B: 6, C: 5, D: 4 },
    '2':  { A: 7, B: 7, C: 6, D: 5 }
  };

  /* [18.3] Submarine Damage Table, from the map. */
  var DAMAGE = [
    { range: [0, 2], level: 'Superficial', to: 'broom' },
    { range: [3, 5], level: 'Light',       to: 'repair1' },
    { range: [6, 7], level: 'Moderate',    to: 'repair2' },
    { range: [8, 9], level: 'Heavy',       to: 'repair3' }
  ];

  /* [17.1] War Period display: the general ASW value added to every
   * counterattack [14.2A3]. */
  var GENERAL_ASW = { W1: 0, W2: 1, W3: 2, W4: 1 };

  /* [17.1A] War Period Modification Table. Pick the greatest listed Tons Sunk
   * line that the current tons sunk is at least equal to, and the Ships Sunk
   * column likewise; the cell is the drm to the transition roll. */
  var WP_MOD = {
    W2: { tons: [400, 350, 300, 250, 200],      ships: [25, 50, 75, 100, 125] },
    W3: { tons: [1150, 1050, 950, 850, 750],    ships: [125, 175, 225, 275, 300] },
    W4: { tons: [4300, 4150, 4000, 3850, 3700], ships: [760, 840, 920, 1000, 1080] }
  };
  var WP_MOD_GRID = [
    [ 0,  1,  2,  3,  4],
    [-1,  0,  1,  2,  3],
    [-2, -1,  0,  1,  2],
    [-3, -2, -1,  0,  1],
    [-4, -3, -2, -1,  0]
  ];

  /* [17.1B] War Period Transition Table. Roll = or > the number to advance.
   * null = no transition roll may be made that month. [17.2] gives automatic
   * advance once every listed number has been attempted. */
  var WP_TRANSITION = {
    1941: [null, null, null, null, null, null, null, null, null, null, null, null],
    1942: [null, null, 9, 8, 7, 6, 5, 4, 3, 2, null, 9],
    1943: [8, 7, 6, 5, 4, 3, 2, null, null, null, null, null],
    1944: [null, null, null, null, null, 9, 8, 7, 6, 5, 4, 3],
    1945: [2, null, null, null, null, null, null, null, null, null, null, null]
  };

  /* [6.0] Torpedo Improvement Table. Once ships sunk reaches a listed number,
   * roll = or > the paired die roll to advance the Mk-XIV one step. */
  var TORPEDO_IMPROVEMENT = {
    '-2->-1': [[70,9],[75,8],[80,7],[85,6],[90,5],[95,4],[100,3],[105,2],[110,1],[115,0]],
    '-1->0':  [[270,9],[280,8],[290,7],[300,6],[310,5],[320,4],[330,3],[340,2],[350,1],[360,0]],
    '0->+1':  [[450,9],[460,8],[470,7],[485,6],[500,5],[515,4],[530,3],[540,2],[550,1],[560,0]],
    '+1->+2': [[1040,9],[1050,8],[1065,7],[1080,6],[1100,5],[1120,4],[1140,3],[1160,2],[1175,1],[1190,0]]
  };

  /* [30.3] Enemy Submarines Table, for Sub vs. Sub combat [14.6].
   * German and Italian boats appear only in the Java Sea or South China Sea 2. */
  var ENEMY_SUBS = [
    { cls: 'L4',    nation: 'JP', from: '4/32',  to: '4/43', tonnage: 1 },
    { cls: 'KD4',   nation: 'JP', from: '4/32',  to: '7/44', tonnage: 2 },
    { cls: 'C1',    nation: 'JP', from: '12/41', to: null,   tonnage: 3 },
    { cls: 'KD7',   nation: 'JP', from: '2/42',  to: null,   tonnage: 2 },
    { cls: 'K6',    nation: 'JP', from: '3/43',  to: null,   tonnage: 1 },
    { cls: 'IXC40', nation: 'DE', from: '6/43',  to: '5/45', tonnage: 1 },
    { cls: 'Calvi', nation: 'IT', from: '7/43',  to: '9/43', tonnage: 2 },
    { cls: 'IXD2',  nation: 'DE', from: '8/43',  to: '5/45', tonnage: 2 }
  ];
  var ENEMY_SUB_AREAS = ['java_sea', 'scs2'];

  /* [7.0] ULTRA Table — War Period x die roll -> the OpArea(s) marked. */
  var ULTRA = {
    W1: [['east_china_sea','s_phil_sea'], ['empire_pacific','gilberts'],
         ['scs1','bonins'], ['scs2','n_phil_sea'], ['kurile','banda_sea'],
         ['solomons','bismarck_sea'], ['marianas','coral_sea'],
         ['carolines','aleutians'], ['marshalls','java_sea'], ['north_pacific']],
    W2: [['sea_of_japan','solomons'], ['east_china_sea','marianas'],
         ['empire_pacific','coral_sea'], ['scs2','banda_sea'],
         ['kurile','east_china_sea'], ['bismarck_sea','scs1'],
         ['aleutians','bonins'], ['s_phil_sea','java_sea'],
         ['bismarck_sea','scs2'], ['n_phil_sea','carolines']],
    W3: [['yellow_sea','bonins'], ['scs2','s_phil_sea'],
         ['empire_pacific','bismarck_sea'], ['java_sea','solomons'],
         ['kurile','carolines'], ['scs1','east_china_sea'],
         ['marianas','s_phil_sea'], ['bonins','scs2'], ['east_china_sea'],
         ['sea_of_japan','n_phil_sea']],
    W4: [['sea_of_japan','kurile'], ['east_china_sea','yellow_sea'],
         ['marianas','s_phil_sea'], ['scs2'], ['empire_pacific'],
         ['yellow_sea'], ['bonins'], ['scs1'], ['n_phil_sea'],
         ['sea_of_japan','java_sea']]
  };

  /* [27.0] Quick Resolution Table — attack value (0-7) x non-white boxes on
   * the AAC's War Period line (1-10). Read from RULES.md §[27.0]. */
  var QUICK = {
    7: [1, 2, 3, 3, 4, 4, 4, 5, 5, 5],
    6: [1, 2, 2, 3, 3, 3, 4, 4, 4, 5],
    5: [1, 2, 2, 2, 3, 3, 3, 4, 4, 4],
    4: [1, 1, 2, 2, 2, 3, 3, 3, 3, 4],
    3: [1, 1, 2, 2, 2, 2, 3, 3, 3, 3],
    2: [1, 1, 1, 2, 2, 2, 2, 3, 3, 3],
    1: [1, 1, 1, 2, 2, 2, 2, 2, 3, 3],
    0: [1, 1, 1, 2, 2, 2, 2, 2, 3, 3]
  };
  /* [27.1] Quick Resolution counterattack: the box colour on the AAC line. */
  var QUICK_CA = { none: 'ends', sparse: 'spotted', low: 'rtb', moderate: 'damaged', high: 'sunk' };

  /* [19.2] Combat Events, indexed by die roll. */
  var COMBAT_EVENTS = [
    'Target lumbers into way', 'Surface gunnery combat', 'Circular running torpedo',
    'Betty bomber spots submarine', 'Mechanical troubles end attack', 'Perfect setup',
    'Tonnage doubled', 'Counterattack - combat', 'Counterattack', 'Combat - combat'
  ];

  function clampDie(d, hi) { return d < 0 ? 0 : (d > hi ? hi : d); }

  root.SWTables = {
    status: 'complete',
    activity: ACTIVITY,
    activityById: function (id) {
      for (var i = 0; i < ACTIVITY.length; i++) { if (ACTIVITY[i].id === id) return ACTIVITY[i]; }
      return null;
    },

    contact: CONTACT,
    contactLookup: function (warPeriod, die) {
      var row = CONTACT[warPeriod];
      if (!row) throw new Error('sw_tables: unknown war period ' + warPeriod);
      if (die < 0 || die > 9) throw new Error('sw_tables: die out of range ' + die);
      return row[die];
    },

    engagement: ENGAGEMENT,
    engagementLookup: function (activityId, contact, ultra) {
      var row = ENGAGEMENT[activityId];
      if (!row) return null;
      var draw = row[contact];
      if (!draw) throw new Error('sw_tables: unknown contact result ' + contact);
      return draw.map(function (n) { return n === null ? null : (ultra ? n + 1 : n); });
    },

    art: ART,
    artRows: ART_ROWS,
    artLookup: function (tonnage, modifiedDie) {
      var r = 0;
      for (var i = 0; i < ART_ROWS.length; i++) {
        if (tonnage >= ART_ROWS[i].min && tonnage <= ART_ROWS[i].max) { r = i; break; }
      }
      return ART[r][clampDie(modifiedDie, 9)];
    },

    counterattack: COUNTERATTACK,
    counterattackRows: CA_ROWS,
    diligentEscort: DILIGENT_ESCORT,
    eventAircraft: EVENT_AIRCRAFT,
    /* Returns null below zero: the sheet says there is no counterattack. */
    counterattackLookup: function (differential, modifiedDie) {
      if (differential < 0) return null;
      var r = CA_ROWS.length - 1;
      for (var i = 0; i < CA_ROWS.length; i++) {
        if (differential >= CA_ROWS[i].min && differential <= CA_ROWS[i].max) { r = i; break; }
      }
      return COUNTERATTACK[r][clampDie(modifiedDie, 12)];
    },

    transit: TRANSIT,
    transitRows: TRANSIT_ROWS,
    transitRowFor: function (warPeriod, firstDie) {
      var key = warPeriod === 'W1' ? 'W1' : (warPeriod === 'W4' ? 'W4' : 'W2');
      for (var i = 0; i < TRANSIT_ROWS.length; i++) {
        var band = TRANSIT_ROWS[i][key];
        if (band && firstDie >= band[0] && firstDie <= band[1]) return i;
      }
      return null;
    },
    transitLookup: function (warPeriod, firstDie, secondDie) {
      var r = this.transitRowFor(warPeriod, firstDie);
      return r === null ? null : TRANSIT[r][clampDie(secondDie, 9)];
    },

    endurance: ENDURANCE,
    enduranceTarget: function (torpedoValue, letter) {
      var row = ENDURANCE[String(torpedoValue)];
      if (!row) throw new Error('sw_tables: torpedo value out of range ' + torpedoValue);
      return row[letter];
    },

    damage: DAMAGE,
    damageLookup: function (die) {
      for (var i = 0; i < DAMAGE.length; i++) {
        if (die >= DAMAGE[i].range[0] && die <= DAMAGE[i].range[1]) return DAMAGE[i];
      }
      return null;
    },

    generalAsw: GENERAL_ASW,
    warPeriodMod: WP_MOD,
    warPeriodModGrid: WP_MOD_GRID,
    /* [17.1A] "Use the greatest listed line the current total is = or > than."
     * Both axes are listed high-to-low, so walk down to the first line met. */
    warPeriodModifier: function (toPeriod, tonsSunk, shipsSunk) {
      var t = WP_MOD[toPeriod];
      if (!t) throw new Error('sw_tables: no modification line to ' + toPeriod);
      var r = t.tons.length - 1, c = 0;
      for (var i = 0; i < t.tons.length; i++) {
        if (tonsSunk >= t.tons[i]) { r = i; break; }
      }
      for (var j = t.ships.length - 1; j >= 0; j--) {
        if (shipsSunk >= t.ships[j]) { c = j; break; }
      }
      return WP_MOD_GRID[r][c];
    },
    warPeriodTransition: WP_TRANSITION,
    transitionTarget: function (year, monthIndex) {
      var row = WP_TRANSITION[year];
      return row ? row[monthIndex] : null;
    },

    torpedoImprovement: TORPEDO_IMPROVEMENT,
    enemySubs: ENEMY_SUBS,
    enemySubAreas: ENEMY_SUB_AREAS,
    ultra: ULTRA,
    ultraLookup: function (warPeriod, die) {
      var row = ULTRA[warPeriod];
      if (!row) throw new Error('sw_tables: unknown war period ' + warPeriod);
      return row[clampDie(die, 9)];
    },
    combatEvents: COMBAT_EVENTS,
    quick: QUICK,
    quickCounter: QUICK_CA,
    quickLookup: function (attackValue, boxes) {
      if (boxes < 1) return 0;
      var r = QUICK[Math.max(0, Math.min(7, attackValue))];
      return r[Math.min(10, boxes) - 1];
    }
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
