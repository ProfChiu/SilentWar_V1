/* sw_map.js — Theater geometry for SW_map_final-50.png (4342x3300).
 *
 * PURE DATA. No DOM, no randomness.
 *
 * All coordinates are NORMALISED to the map image (0..1 on both axes), so the
 * UI can scale freely. They were read off a 1500px-wide render of the map by
 * eye, NOT traced from the art.
 *
 * OpArea centres are now PIXEL-DERIVED (Phase 3): `x`/`y` is the disc centre
 * recovered by watershed from the map art, and `aac` is the centre of that
 * area's Area Activity Chart, confirmed by reading every chart's printed title.
 * SMZ, base and panel coordinates are still eyeballed and remain "temp".
 */
(function (root) {
  'use strict';

  var GEOMETRY_STATUS = { opAreas: 'pixel-derived', smzs: 'temp', bases: 'temp', panels: 'temp' };

  // OpAreas: the circular areas that DO have an Area Activity Chart. [13.2A]
  // group = the AAC column header printed on the chart box.
  var OPAREAS = [
    { id: 'kurile', name: 'Kurile Islands', group: 'NORTH PAC', x: 0.53363, y: 0.19303, aac: [0.53650, 0.17602] },
    { id: 'aleutians', name: 'Aleutian Islands', group: 'NORTH PAC', x: 0.72386, y: 0.16030, aac: [0.73445, 0.14345] },
    { id: 'north_pacific', name: 'North Pacific', group: 'NORTH PAC', x: 0.64233, y: 0.24879, aac: [0.64625, 0.28390] },
    { id: 'hawaiian', name: 'Hawaiian Islands', group: 'MID PAC', x: 0.77153, y: 0.34576, aac: [0.78075, 0.32898] },
    { id: 'sea_of_japan', name: 'Sea of Japan', group: 'EMPIRE', x: 0.37172, y: 0.21727, aac: [0.35721, 0.16905] },
    { id: 'empire_pacific', name: 'Empire Pacific', group: 'EMPIRE', x: 0.46730, y: 0.26030, aac: [0.47294, 0.29557] },
    { id: 'yellow_sea', name: 'Yellow Sea', group: 'CHINA', x: 0.31506, y: 0.27848, aac: [0.25322, 0.27617] },
    { id: 'east_china_sea', name: 'East China Sea', group: 'CHINA', x: 0.36297, y: 0.39758, aac: [0.36297, 0.35936] },
    { id: 'bonins', name: 'Bonins', group: 'CEN PAC', x: 0.55620, y: 0.38242, aac: [0.55965, 0.36527] },
    { id: 'marshalls', name: 'Marshall Islands', group: 'MID PAC', x: 0.67688, y: 0.44182, aac: [0.69000, 0.47746] },
    { id: 'scs1', name: 'South China Sea 1', group: 'INDOCHINA', x: 0.25196, y: 0.48667, aac: [0.24286, 0.46966] },
    { id: 'n_phil_sea', name: 'North Philippine Sea', group: 'SW PAC', x: 0.37011, y: 0.50818, aac: [0.36665, 0.48996] },
    { id: 'marianas', name: 'Marianas', group: 'CEN PAC', x: 0.52280, y: 0.45303, aac: [0.53293, 0.48799] },
    { id: 'scs2', name: 'South China Sea 2', group: 'INDOCHINA', x: 0.21304, y: 0.54758, aac: [0.21257, 0.58830] },
    { id: 's_phil_sea', name: 'South Philippine Sea', group: 'SW PAC', x: 0.36066, y: 0.58030, aac: [0.36757, 0.61572] },
    { id: 'carolines', name: 'Carolines', group: 'CEN PAC', x: 0.56863, y: 0.57848, aac: [0.56852, 0.61420] },
    { id: 'transfer_route', name: 'Transfer Route', group: 'MID PAC', x: 0.72824, y: 0.58061, aac: [0.73468, 0.62201] },
    { id: 'bismarck_sea', name: 'Bismarck Sea', group: 'SOUTH PAC', x: 0.50392, y: 0.64879, aac: [0.47467, 0.69027] },
    { id: 'java_sea', name: 'Java Sea', group: 'INDOCHINA', x: 0.21027, y: 0.71152, aac: [0.21614, 0.75269] },
    { id: 'banda_sea', name: 'Banda Sea', group: 'SW PAC', x: 0.33257, y: 0.70909, aac: [0.34523, 0.75148] },
    { id: 'solomons', name: 'Solomons', group: 'SOUTH PAC', x: 0.60801, y: 0.74303, aac: [0.61331, 0.72633] },
    { id: 'gilberts', name: 'Gilbert Islands', group: 'SOUTH PAC', x: 0.69991, y: 0.76121, aac: [0.71580, 0.79663] },
    { id: 'coral_sea', name: 'Coral Sea', group: 'SOUTH PAC', x: 0.51865, y: 0.80364, aac: [0.54318, 0.83913] }
  ];

  // SMZs: "the circular areas on the map WITHOUT Area Activity Charts" [20.0].
  // Enterable only when activated by a War Event [20.1].
  var SMZS = [
    { id: 'inland_sea',   name: 'Inland Sea & Tokyo Bay', x: 0.4053, y: 0.2912 },
    { id: 'okinawa',      name: 'Okinawa',                x: 0.4200, y: 0.3614 },
    { id: 'formosa',      name: 'Formosa',                x: 0.2767, y: 0.3991 },
    { id: 'saipan',       name: 'Saipan',                 x: 0.4700, y: 0.3842 },
    { id: 'midway',       name: 'Midway Island',          x: 0.6867, y: 0.3614 },
    { id: 'wake',         name: 'Wake Island',            x: 0.6000, y: 0.4430 },
    { id: 'lingayen',     name: 'Lingayen Gulf',          x: 0.2700, y: 0.4579 },
    { id: 'guam',         name: 'Guam',                   x: 0.4367, y: 0.4956 },
    { id: 'davao_leyte',  name: 'Davao/Leyte Gulf',       x: 0.3000, y: 0.5702 },
    { id: 'palau',        name: 'Palau',                  x: 0.4367, y: 0.5789 },
    { id: 'truk',         name: 'Truk',                   x: 0.4747, y: 0.5807 },
    { id: 'majuro',       name: 'Majuro',                 x: 0.6367, y: 0.5789 },
    { id: 'mios_woendi',  name: 'Mios Woendi',            x: 0.4000, y: 0.6140 },
    { id: 'molucca',      name: 'Molucca Strait',         x: 0.3033, y: 0.6711 },
    { id: 'makassar',     name: 'Makassar Strait',        x: 0.2733, y: 0.6974 },
    { id: 'guadalcanal',  name: 'Guadalcanal',            x: 0.5267, y: 0.7588 }
  ];

  // The five major Bases [21.0], plus the Surabaya tender base [21.2].
  // `display` is the Base Display panel on the right edge of the map,
  // as a normalised rect [x1,y1,x2,y2]; null where the map has no panel.
  // Measured 2026-09-24 from the panels' dark outlines in the map pixels
  // (x 3656-4285, five panels of ~397 px); the earlier eyeballed rects were
  // a panel off.
  var BASES = [
    { id: 'pearl',        name: 'Pearl Harbor',   major: true,  x: 0.7933, y: 0.4193,
      display: [0.8420, 0.5264, 0.9869, 0.6467] },
    { id: 'dutch_harbor', name: 'Dutch Harbor',   major: true,  x: 0.7547, y: 0.0596,
      display: [0.8420, 0.1442, 0.9869, 0.2645] },
    { id: 'manila',       name: 'Manila/Subic',   major: true,  x: 0.2900, y: 0.4807,
      display: [0.8420, 0.0170, 0.9869, 0.1373] },
    { id: 'fremantle',    name: 'Fremantle',      major: true,  x: 0.2333, y: 0.8772,
      display: [0.8420, 0.2715, 0.9869, 0.3921] },
    { id: 'brisbane',     name: 'Brisbane',       major: true,  x: 0.4667, y: 0.8772,
      display: [0.8420, 0.3991, 0.9869, 0.5194] },
    { id: 'surabaya',     name: 'Surabaya',       major: false, x: 0.2600, y: 0.7807,
      display: null }
  ];

  // On-map tracks and printed tables. `rect` = normalised [x1,y1,x2,y2].
  // `chart` links to a scan in sw_charts.js where one exists.
  var MAP_PANELS = [
    { id: 'tonnage_track',   name: 'Tonnage & Ships Sunk / Submarines Lost', rect: [0.0133, 0.0175, 0.1533, 0.5877], ruleRef: '2.3' },
    { id: 'war_period',      name: 'Current War Period',                     rect: [0.1600, 0.0175, 0.3033, 0.1009], ruleRef: '17.0' },
    { id: 'torpedo_value',   name: 'Current Torpedo Value',                  rect: [0.1600, 0.1360, 0.3033, 0.1886], ruleRef: '6.0' },
    { id: 'calendar',        name: 'Turn Track (month / year / week)',       rect: [0.3100, 0.0132, 0.6667, 0.0921], ruleRef: '16.0' },
    { id: 'search_contact',  name: 'Search & Contact Instructions',          rect: [0.0133, 0.6053, 0.1533, 0.8860], ruleRef: '13.2' },
    { id: 'transit_event',   name: 'Transit Event Table',                    rect: [0.8433, 0.6579, 0.9933, 0.7895], ruleRef: '19.1' },
    { id: 'endurance_table', name: 'Endurance Table',                        rect: [0.7400, 0.8728, 0.8433, 0.9825], ruleRef: '14.7' },
    { id: 'damage_table',    name: 'Submarine Damage Table',                 rect: [0.8667, 0.8728, 0.9933, 0.9825], ruleRef: '18.3' },
    { id: 'west_coast',      name: 'West Coast',                             rect: [0.7900, 0.6272, 0.8367, 0.6535], ruleRef: '15.0' }
  ];

  root.SWMap = {
    image: '../../Source/images/SW_map_final-50.png',
    imageSize: { w: 4342, h: 3300 },
    geometryStatus: GEOMETRY_STATUS,
    /* One Area Activity Chart cell, in image pixels. Every printed AAC panel is
     * the same size and tools/sample_aac.py fitted its lattice at exactly this
     * pitch; an OpArea's `aac` is the centre of its 4x10 grid, so the cell for
     * War Period row r (0-3) and die d (0-9) is centred at
     *   aac + ((d - 4.5) * w, (r - 1.5) * h). */
    aacCell: { w: 22.0, h: 23.75 },
    aacCellCentre: function (areaId, row, die) {
      var a = null;
      for (var i = 0; i < OPAREAS.length; i++) { if (OPAREAS[i].id === areaId) a = OPAREAS[i]; }
      if (!a || !a.aac) return null;
      return { x: a.aac[0] * 4342 + (die - 4.5) * 22.0, y: a.aac[1] * 3300 + (row - 1.5) * 23.75 };
    },
    opAreas: OPAREAS,
    smzs: SMZS,
    bases: BASES,
    panels: MAP_PANELS,
    /* Movement graph — which OpAreas a submarine may move between [12.0].
     *
     * Read from the map art. Each OpArea is a pale disc and each legal move is
     * a pale band joining two discs. The catch that cost two rebuilds: the map
     * draws a COASTAL HALO in that same pale colour around every landmass, and
     * it forms a connected network along every coastline. A watershed run on
     * the raw colour mask therefore leaks between areas that merely share an
     * island and invents edges — it produced a plausible-looking graph with at
     * least two links that are not drawn on the map at all.
     *
     * tools/trace_adjacency.py now strips the halo with a morphological opening
     * (the halo is ~13px wide, the bands ~38px) before flooding. The resulting
     * band network was then rendered and read directly, region by region, which
     * is where this table comes from. A straight centre-to-centre corridor test
     * is NOT a valid check here: every disc has its Area Activity Chart printed
     * across the middle, so such a line always crosses a large non-pale gap.
     *
     * status: read-from-map. 36 edges, symmetric, and every area reachable.
     */
    adjacencyStatus: 'read-from-map',
    adjacency: {
      aleutians: ['hawaiian', 'kurile', 'north_pacific'],
      banda_sea: ['coral_sea', 'java_sea', 's_phil_sea'],
      bismarck_sea: ['carolines', 's_phil_sea', 'solomons'],
      bonins: ['empire_pacific', 'marianas', 'marshalls', 'north_pacific'],
      carolines: ['bismarck_sea', 'marshalls', 'solomons'],
      coral_sea: ['banda_sea', 'gilberts', 'solomons'],
      east_china_sea: ['empire_pacific', 'marianas', 'n_phil_sea', 'scs1', 'yellow_sea'],
      empire_pacific: ['bonins', 'east_china_sea', 'kurile'],
      gilberts: ['coral_sea', 'solomons', 'transfer_route'],
      hawaiian: ['aleutians', 'marshalls', 'north_pacific'],
      java_sea: ['banda_sea', 'scs2'],
      kurile: ['aleutians', 'empire_pacific', 'north_pacific', 'sea_of_japan'],
      marianas: ['bonins', 'east_china_sea', 'marshalls', 'n_phil_sea'],
      marshalls: ['bonins', 'carolines', 'hawaiian', 'marianas', 'transfer_route'],
      n_phil_sea: ['east_china_sea', 'marianas', 's_phil_sea'],
      north_pacific: ['aleutians', 'bonins', 'hawaiian', 'kurile'],
      s_phil_sea: ['banda_sea', 'bismarck_sea', 'n_phil_sea'],
      scs1: ['east_china_sea', 'scs2'],
      scs2: ['java_sea', 'scs1'],
      sea_of_japan: ['kurile'],
      solomons: ['bismarck_sea', 'carolines', 'coral_sea', 'gilberts', 'transfer_route'],
      transfer_route: ['gilberts', 'marshalls', 'solomons'],
      yellow_sea: ['east_china_sea']
    },
    /* One pair whose band could not be resolved either way: a bar runs toward
     * South China Sea 2 from the South Philippine Sea but its western end is
     * ambiguous against the Davao/Leyte SMZ spur. Left OUT of the graph. */
    uncertain: [
      ['scs2', 's_phil_sea']
    ],
    byId: function (id) {
      var all = OPAREAS.concat(SMZS, BASES);
      for (var i = 0; i < all.length; i++) { if (all[i].id === id) return all[i]; }
      return null;
    }
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
