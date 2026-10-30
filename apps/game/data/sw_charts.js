/* sw_charts.js — the chart overlay gallery. PURE DATA.
 * Charts are OVERLAYS, never destinations: you glance and dismiss.
 * `priority` orders the gallery; identification comes from PHASE1_ASSET_REVIEW.md.
 */
(function (root) {
  'use strict';

  var CHARTS = [
    { id: 'combat_tables', name: 'Combat Tables', priority: 1, ruleRef: '14.0',
      file: '../../Source/Charts/page_051_img_01_xref_150.jpeg',
      holds: ['Attack Results Table', 'Counterattack Table', 'Transit Event',
              'Search & Contact', 'Endurance Table', 'Combat Events index'] },
    { id: 'charts_tables', name: 'Charts & Tables', priority: 2, ruleRef: '17.0',
      file: '../../Source/Charts/page_050_img_01_xref_147.jpeg',
      holds: ['War Period Modification', 'War Period Transition',
              'Torpedo Improvement', 'Enemy Submarines'] },
    { id: 'war_mix', name: 'War Mix', priority: 3, ruleRef: '3.1',
      file: '../../Source/Charts/page_063_img_01_xref_186.jpeg',
      holds: ['Cup composition, all 4 War Periods + 1932'] },
    { id: 'counter_explanation', name: 'Counter Explanation', priority: 4, ruleRef: '2.3',
      file: '../../Source/Charts/page_052_img_01_xref_153.jpeg',
      holds: ['How to read submarine and Japanese counters'] },
    { id: 'ultra', name: 'ULTRA Table', priority: 5, ruleRef: '7.0',
      file: '../../Source/Charts/page_064_img_01_xref_189.jpeg',
      holds: ['4x10 area grid'] },
    { id: 'combat_display_scan', name: 'Combat Display (print scan)', priority: 6, ruleRef: '14.1',
      file: '../../Source/Charts/page_054_img_01_xref_159.jpeg',
      holds: ['Print-quality Combat Display — the Combat view is the live one'] },
    { id: 'sense_of_scale', name: 'Sense of Scale', priority: 7, ruleRef: '2.4',
      file: '../../Source/Charts/page_053_img_01_xref_156.jpeg',
      holds: ['U.S. submarine class roster with years'] },
    { id: 'tender_display', name: 'Sub Tender / Surabaya Display', priority: 8, ruleRef: '21.2',
      file: '../../Source/Charts/page_065_img_01_xref_192.jpeg',
      holds: ['Tender boxes — the Tenders view is the live one'] },
    { id: 'quick_resolution', name: 'Quick Resolution Table', priority: 9, ruleRef: '27.0',
      file: '../../Source/Charts/page_019_diagram_01_402x118.png',
      holds: ['Optional fast-combat path'] }
  ];

  root.SWCharts = {
    all: CHARTS.slice().sort(function (a, b) { return a.priority - b.priority; }),
    get: function (id) {
      for (var i = 0; i < CHARTS.length; i++) { if (CHARTS[i].id === id) return CHARTS[i]; }
      return null;
    }
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
