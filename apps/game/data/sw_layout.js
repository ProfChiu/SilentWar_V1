/* sw_layout.js — Combat Display geometry + the view registry.
 *
 * PURE DATA. No DOM, no randomness.
 *
 * Slot coordinates are the Vassal module's own Region points from
 * Source/Silent_War.vmod (buildFile), extracted to
 * Source/extracted/vassal_layout.json and normalised against
 * combat_display.png (1620x1218). These are pixel-exact, NOT estimates.
 *
 * Columns A-D correspond to War Mix cups A-D [13.2C]: pieces drawn from cup A
 * go in column A, and so on. Column A and D carry six target rows; B and C
 * carry five. 8 submarine boxes, 22 target slots, 22 TDC slots.
 */
(function (root) {
  'use strict';

  var SUB_SLOTS = [
    { id: 'Sub_A1', column: 'A', index: 1, x: 0.1500, y: 0.8112 },
    { id: 'Sub_A2', column: 'A', index: 2, x: 0.1500, y: 0.9294 },
    { id: 'Sub_B1', column: 'B', index: 1, x: 0.4037, y: 0.8112 },
    { id: 'Sub_B2', column: 'B', index: 2, x: 0.4037, y: 0.9294 },
    { id: 'Sub_C1', column: 'C', index: 1, x: 0.6648, y: 0.8112 },
    { id: 'Sub_C2', column: 'C', index: 2, x: 0.6648, y: 0.9294 },
    { id: 'Sub_D1', column: 'D', index: 1, x: 0.9247, y: 0.8112 },
    { id: 'Sub_D2', column: 'D', index: 2, x: 0.9247, y: 0.9294 }
  ];

  var TARGET_SLOTS = [
    { id: 'TS_A1', column: 'A', index: 1, x: 0.1525, y: 0.6445 },
    { id: 'TS_A2', column: 'A', index: 2, x: 0.1525, y: 0.5468 },
    { id: 'TS_A3', column: 'A', index: 3, x: 0.1525, y: 0.4499 },
    { id: 'TS_A4', column: 'A', index: 4, x: 0.1525, y: 0.3539 },
    { id: 'TS_A5', column: 'A', index: 5, x: 0.1525, y: 0.2562 },
    { id: 'TS_A6', column: 'A', index: 6, x: 0.1525, y: 0.1593 },
    { id: 'TS_B1', column: 'B', index: 1, x: 0.4062, y: 0.6273 },
    { id: 'TS_B2', column: 'B', index: 2, x: 0.4062, y: 0.5131 },
    { id: 'TS_B3', column: 'B', index: 3, x: 0.4062, y: 0.3990 },
    { id: 'TS_B4', column: 'B', index: 4, x: 0.4062, y: 0.2849 },
    { id: 'TS_B5', column: 'B', index: 5, x: 0.4062, y: 0.1708 },
    { id: 'TS_C1', column: 'C', index: 1, x: 0.6660, y: 0.6273 },
    { id: 'TS_C2', column: 'C', index: 2, x: 0.6660, y: 0.5131 },
    { id: 'TS_C3', column: 'C', index: 3, x: 0.6660, y: 0.3990 },
    { id: 'TS_C4', column: 'C', index: 4, x: 0.6660, y: 0.2849 },
    { id: 'TS_C5', column: 'C', index: 5, x: 0.6660, y: 0.1708 },
    { id: 'TS_D1', column: 'D', index: 1, x: 0.9241, y: 0.6445 },
    { id: 'TS_D2', column: 'D', index: 2, x: 0.9241, y: 0.5468 },
    { id: 'TS_D3', column: 'D', index: 3, x: 0.9241, y: 0.4499 },
    { id: 'TS_D4', column: 'D', index: 4, x: 0.9241, y: 0.3539 },
    { id: 'TS_D5', column: 'D', index: 5, x: 0.9241, y: 0.2562 },
    { id: 'TS_D6', column: 'D', index: 6, x: 0.9241, y: 0.1593 }
  ];

  var TDC_SLOTS = [
    { id: 'TDC_A1', column: 'A', index: 1, x: 0.0735, y: 0.6445 },
    { id: 'TDC_A2', column: 'A', index: 2, x: 0.0735, y: 0.5468 },
    { id: 'TDC_A3', column: 'A', index: 3, x: 0.0735, y: 0.4499 },
    { id: 'TDC_A4', column: 'A', index: 4, x: 0.0735, y: 0.3539 },
    { id: 'TDC_A5', column: 'A', index: 5, x: 0.0735, y: 0.2562 },
    { id: 'TDC_A6', column: 'A', index: 6, x: 0.0735, y: 0.1593 },
    { id: 'TDC_B1', column: 'B', index: 1, x: 0.3265, y: 0.6273 },
    { id: 'TDC_B2', column: 'B', index: 2, x: 0.3265, y: 0.5131 },
    { id: 'TDC_B3', column: 'B', index: 3, x: 0.3265, y: 0.3990 },
    { id: 'TDC_B4', column: 'B', index: 4, x: 0.3265, y: 0.2849 },
    { id: 'TDC_B5', column: 'B', index: 5, x: 0.3265, y: 0.1708 },
    { id: 'TDC_C1', column: 'C', index: 1, x: 0.5864, y: 0.6273 },
    { id: 'TDC_C2', column: 'C', index: 2, x: 0.5864, y: 0.5131 },
    { id: 'TDC_C3', column: 'C', index: 3, x: 0.5864, y: 0.3990 },
    { id: 'TDC_C4', column: 'C', index: 4, x: 0.5864, y: 0.2849 },
    { id: 'TDC_C5', column: 'C', index: 5, x: 0.5864, y: 0.1708 },
    { id: 'TDC_D1', column: 'D', index: 1, x: 0.8451, y: 0.6445 },
    { id: 'TDC_D2', column: 'D', index: 2, x: 0.8451, y: 0.5468 },
    { id: 'TDC_D3', column: 'D', index: 3, x: 0.8451, y: 0.4499 },
    { id: 'TDC_D4', column: 'D', index: 4, x: 0.8451, y: 0.3539 },
    { id: 'TDC_D5', column: 'D', index: 5, x: 0.8451, y: 0.2562 },
    { id: 'TDC_D6', column: 'D', index: 6, x: 0.8451, y: 0.1593 }
  ];

  var COLUMNS = ['A', 'B', 'C', 'D'];

  /* Views [Phase 2 addition D]. `mode`:
   *   destination — you work there, it owns the viewport
   *   overlay     — you glance and dismiss; never a history destination
   * `vassal` records which Vassal window the view was derived from. */
  var VIEWS = [
    { id: 'theater',   label: 'Theater',   key: '1', mode: 'destination', vassal: 'Pacific (main map)' },
    { id: 'combat',    label: 'Combat',    key: '2', mode: 'destination', vassal: 'Combat Display (F4)' },
    { id: 'oparea',    label: 'OpArea',    key: '3', mode: 'destination', vassal: null },
    { id: 'base',      label: 'Base',      key: '4', mode: 'destination', vassal: 'Zones on main map' },
    { id: 'cups',      label: 'Cups',      key: '5', mode: 'destination', vassal: 'W1-W4 + 1932 Cups (F5-F9)' },
    { id: 'tenders',   label: 'Tenders',   key: '6', mode: 'destination', vassal: 'Sub Tenders (F3)' },
    { id: 'graveyard', label: 'Graveyard', key: '7', mode: 'destination', vassal: 'Submarine Graveyard' },
    { id: 'log',       label: 'Log',       key: '8', mode: 'destination', vassal: 'Chatter' },
    { id: 'fleet',     label: 'Fleet',     key: '9', mode: 'destination', vassal: null },
    { id: 'charts',    label: 'Charts',    key: 'c', mode: 'overlay',     vassal: null },
    { id: 'rules',     label: 'Rules',     key: 'r', mode: 'overlay',     vassal: null }
  ];

  /* Which view the app auto-switches to at each phase boundary.
   * Manual override is always available [Phase 2 addition D]. */
  var PHASE_VIEW = {
    '5.0': 'theater',  '6.0': 'theater',  '7.0': 'theater',
    '8.0': 'base',     '9.0': 'base',     '10.0': 'base',   '11.0': 'oparea',
    '12.0': 'theater', '13.0': 'theater',  '14.0': 'combat', '15.0': 'theater',
    '16.0': 'theater', '17.0': 'theater'
  };

  root.SWLayout = {
    combatDisplay: {
      image: '../../Source/images/combat_display.png',
      imageSize: { w: 1620, h: 1218 },
      geometryStatus: 'exact',
      source: 'Silent_War.vmod buildFile',
      columns: COLUMNS,
      subSlots: SUB_SLOTS,
      targetSlots: TARGET_SLOTS,
      tdcSlots: TDC_SLOTS
    },
    tenderDisplay: {
      image: '../../Source/images/sub_tender_display.png',
      imageSize: { w: 1480, h: 1160 },
      zones: ['Sub Base Surabaya', 'Holland', 'Canopus', 'Fulton', 'Sperry',
              'Bushnell', 'Orion', 'Proteus', 'Gilmore']
    },
    graveyard: {
      image: '../../Source/images/sunk.jpg',
      imageSize: { w: 1600, h: 1108 }
    },
    cupBoards: [
      { id: 'w1',   label: 'War Period 1', image: '../../Source/images/cups_w1.gif' },
      { id: 'w2',   label: 'War Period 2', image: '../../Source/images/cups_w2.gif' },
      { id: 'w3',   label: 'War Period 3', image: '../../Source/images/cups_w3.gif' },
      { id: 'w4',   label: 'War Period 4', image: '../../Source/images/cups_w4.gif' },
      { id: 'y32',  label: '1932 Scenario', image: '../../Source/images/cups_32.gif' }
    ],
    views: VIEWS,
    phaseView: PHASE_VIEW,
    /* Adjacent columns matter constantly in combat: reveal [14.12], TDC
     * placement [14.13], target selection [14.14], escort ASW totals
     * [14.15B2], counterattack ASW [14.2A1]. */
    adjacentColumns: function (col) {
      var i = COLUMNS.indexOf(col);
      if (i < 0) return [];
      return COLUMNS.filter(function (c, j) { return Math.abs(j - i) === 1; });
    },
    slotsInColumn: function (kind, col) {
      var src = kind === 'sub' ? SUB_SLOTS : kind === 'tdc' ? TDC_SLOTS : TARGET_SLOTS;
      return src.filter(function (s) { return s.column === col; });
    },
    view: function (id) {
      for (var i = 0; i < VIEWS.length; i++) { if (VIEWS[i].id === id) return VIEWS[i]; }
      return null;
    }
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
