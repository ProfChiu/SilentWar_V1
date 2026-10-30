/* sw_base.js — the Triple-R Segment at a base: Readying [9.0], Repair [10.0],
 * and the damage fixed on arrival [18.3]. PURE MODULE. ZERO DOM, ZERO
 * Math.random; dice arrive through opts.rollDie.
 *
 * A boat in port is in one box of the Base Display:
 *   'broom' (just in) -> 'pierside' -> 'ready' (Ready for Sea), or
 *   'repair3' -> 'repair2' -> 'repair1' -> 'broom' while under repair.
 * With one boat the Hold Box and Max Repair Capacity [10.1] never bind: the
 * fleet's other boats are off-screen.
 */
(function (root) {
  'use strict';

  var req = typeof require === 'function' ? require : null;
  var Tables = root.SWTables || (req ? req('../data/sw_tables.js').SWTables : null);
  var Data   = root.SWCampaignData || (req ? req('../data/sw_campaign.js').SWCampaignData : null);
  var Res    = root.SWResolution || (req ? req('./sw_resolution.js').SWResolution : null);

  var BOX_LABEL = { broom: 'Broom Box', pierside: 'Pier Side', shipside: 'Ship Side', ready: 'Ready for Sea',
                    repair3: 'Repair Box 3', repair2: 'Repair Box 2', repair1: 'Repair Box 1', hold: 'Hold Box', overhaul: 'West Coast (overhaul)' };

  /* A major base: the five on the map, and Surabaya while its Display is in
   * use (the Allied option [33.14], East Wind Early [31.6]). */
  function isMajor(baseId, war) { return !!Data.bases[baseId] || (baseId === 'surabaya' && !!(war && war.surabayaBase)); }
  function repairNumbers(baseId, war) {
    if (baseId === 'surabaya' && war && war.surabayaBase) return Data.allied.surabaya.repair;
    var b = Data.bases[baseId];
    if (!b) return null;                                   // a forward base has no repair boxes [21.2]
    return (baseId === 'manila' && war && war.subic) ? b.subic.repair : b.repair;
  }
  function baseName(baseId, war) {
    var b = Data.bases[baseId];
    if (!b) {
      var fb = Data.forwardBases[baseId];
      if (!fb) return baseId;
      var ts = (war && war.tenderAt && war.tenderAt[baseId]) || [];
      return fb.name + (ts.length ? ' (tender ' + ts.map(function (id) {
        return Data.tenders.filter(function (t) { return t.id === id; })[0].name; }).join(', ') + ')' : '');
    }
    return (baseId === 'manila' && war && war.subic) ? b.subic.name : b.name;
  }

  /* [9.0] then [10.0], in that order, for the one boat. Returns the new box. */
  function tripleR(box, baseId, readiness, war, opts) {
    var records = [];
    if (box === 'pierside' || box === 'shipside') {
      records.push(Res.makeRecord({ context: 'Readying — ' + baseName(baseId, war), table: 'Readying Submarines [9.0]',
        ruleRef: '9.0', inputs: [], drms: [], die: null, modifiedDie: null, target: null,
        result: (box === 'shipside' ? 'Ship Side' : 'Pier Side') + ' to Ready for Sea, automatically' }));
      return { box: 'ready', records: records };
    }
    if (box === 'broom') {
      var d = Res.d10(opts), ok = d <= readiness;
      records.push(Res.makeRecord({ context: 'Readying — ' + baseName(baseId, war), table: 'Readying Submarines [9.0]',
        ruleRef: '9.0', inputs: [{ label: 'Readiness', value: readiness, rule: '9.0' }], drms: [],
        die: d, modifiedDie: d, target: readiness,
        result: ok ? 'Ready for Sea' : 'to the ' + (isMajor(baseId, war) ? 'Pier Side' : 'Ship Side') + ' box: ready next week' }));
      var wait = isMajor(baseId, war) ? 'pierside' : 'shipside';     // a tender's box is Ship Side [9.0]
      return { box: ok ? 'ready' : wait, records: records };
    }
    var m = /^repair([123])$/.exec(box || '');
    if (m) {
      var n = Number(m[1]), need = repairNumbers(baseId, war)[n], r = Res.d10(opts), adv = r <= need;
      var to = n === 1 ? 'broom' : 'repair' + (n - 1);
      records.push(Res.makeRecord({ context: 'Repair — ' + baseName(baseId, war) + ', Box ' + n, table: 'Repair [10.0]',
        ruleRef: '10.0', inputs: [{ label: 'Repair number', value: need, rule: '10.0' }], drms: [],
        die: r, modifiedDie: r, target: need,
        result: adv ? 'repaired one step: to the ' + BOX_LABEL[to] : 'no progress this week' }));
      return { box: adv ? to : box, records: records };
    }
    return { box: box, records: records };
  }

  /* [18.3] Arrival: a damaged boat rolls on the Damage Table; with two Damage
   * markers it rolls twice and adds the Repair Box numbers [18.1] (beyond Box
   * 3 is a constructive total loss). [15.23] An undamaged boat arriving at
   * Dutch Harbor rolls too, and Repair 2 or 3 becomes Repair 1. */
  var DEPTH = { broom: 0, repair1: 1, repair2: 2, repair3: 3 };
  function arrive(sub, baseId, war, opts) {
    var markers = sub.damageMarkers || (sub.damaged ? 1 : 0);
    var dutch = baseId === 'dutch_harbor' && markers === 0;
    var rolls = markers >= 2 ? 2 : (markers === 1 || dutch ? 1 : 0);
    var records = [], depth = 0;
    for (var i = 0; i < rolls; i++) {
      var d = Res.d10(opts), row = Tables.damageLookup(d);
      var dp = DEPTH[row.to];
      if (dutch && dp > 1) dp = 1;
      depth += dp;
      records.push(Res.makeRecord({
        context: (dutch ? 'Dutch Harbor wear and tear [15.23]' : 'Damage on arrival') + (rolls > 1 ? ' (roll ' + (i + 1) + ' of 2)' : ''),
        table: 'Submarine Damage Table [18.3]', ruleRef: dutch ? '15.23' : '18.3',
        inputs: [], drms: [], die: d, modifiedDie: d, target: null,
        result: row.level + ' damage' + (dutch && DEPTH[row.to] > 1 ? ' (Repair 1 at Dutch Harbor)' : '') }));
    }
    if (depth > 3) {
      records.push(Res.makeRecord({ context: 'Two Damage markers', table: 'Damaged Submarines [18.1]', ruleRef: '18.1',
        inputs: [{ label: 'Repair boxes added', value: depth, rule: '18.1' }], drms: [], die: null, modifiedDie: null, target: 3,
        result: 'beyond Repair Box 3: a constructive total loss (not counted as sunk)' }));
      return { box: null, ctl: true, records: records };
    }
    var box = depth === 0 ? 'broom' : 'repair' + depth;
    records.push(Res.makeRecord({ context: 'In port — ' + baseName(baseId, war), table: 'Base Display [10.0]', ruleRef: '10.0',
      inputs: [], drms: [], die: null, modifiedDie: null, target: null,
      result: 'to the ' + BOX_LABEL[box] + (sub.spotted ? '; the Spotted marker is removed [16.3]' : '') }));
    return { box: box, ctl: false, records: records };
  }

  /* [21.23] A damaged boat reaching a tender rolls on the Damage Table at
   * once: Superficial is fixed there (Broom Box); anything else and it must go
   * on to a major base. An undamaged boat simply goes to the Broom Box. */
  function arriveTender(sub, fb, war, opts) {
    var markers = sub.damageMarkers || (sub.damaged ? 1 : 0);
    if (!markers) {
      return { box: 'broom', onward: false, records: [Res.makeRecord({ context: 'At the tender — ' + baseName(fb, war),
        table: 'Submarine Tenders [21.2]', ruleRef: '21.2', inputs: [], drms: [], die: null, modifiedDie: null, target: null,
        result: 'to the tender\'s Broom Box' + (sub.spotted ? '; the Spotted marker is removed [16.3]' : '') })] };
    }
    var d = Res.d10(opts), row = Tables.damageLookup(d), fixed = row.to === 'broom' && markers === 1;
    return { box: fixed ? 'broom' : null, onward: !fixed, records: [Res.makeRecord({
      context: 'Minor repairs at the tender — ' + baseName(fb, war), table: 'Submarine Damage Table [18.3]', ruleRef: '21.23',
      inputs: [{ label: 'Damage markers', value: markers, rule: '18.1' }], drms: [], die: d, modifiedDie: d, target: null,
      result: fixed ? 'Superficial: repaired at the tender, to its Broom Box [21.23]'
                    : row.level + ' damage' + (markers > 1 ? ' (two markers)' : '') + ': beyond a tender; the boat must go on to a major base [21.23]' })] };
  }

  root.SWBase = {
    isMajor: isMajor,
    arriveTender: arriveTender,
    boxLabel: BOX_LABEL,
    repairNumbers: repairNumbers,
    baseName: baseName,
    tripleR: tripleR,
    arrive: arrive
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
