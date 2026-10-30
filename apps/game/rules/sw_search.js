/* sw_search.js — Search and Contact Phase [13.0]. PURE MODULE.
 * ZERO DOM, ZERO Math.random; every die comes from opts.rollDie.
 * Every table lookup emits a resolution record, per the Phase 2 contract.
 */
(function (root) {
  'use strict';

  var req = typeof require === 'function' ? require : null;
  var Tables = root.SWTables || (req ? req('../data/sw_tables.js').SWTables : null);
  var Aac    = root.SWAac    || (req ? req('../data/sw_aac.js').SWAac : null);
  var Res    = root.SWResolution || (req ? req('./sw_resolution.js').SWResolution : null);

  /* [13.2A] Area Activity Chart. Cumulative drms: +1 ULTRA, +2 barrier
   * wolfpack, -1 if Spotted in War Period 1 or 2. */
  function activityDrms(state) {
    var d = [];
    if (state.ultra) d.push({ label: 'ULTRA area', value: 1, rule: '13.2A' });
    if (state.barrierWolfpack) d.push({ label: 'Barrier wolfpack', value: 2, rule: '13.2A' });
    if (state.congregating) d.push({ label: 'Congregating Risk', value: -state.congregating, rule: '22.1B' });
    if (state.spotted && (state.warPeriod === 'W1' || state.warPeriod === 'W2')) {
      d.push({ label: 'Spotted', value: -1, rule: '13.2A' });
    }
    return d;
  }

  function areaActivity(state, opts) {
    var drms = activityDrms(state);
    var die = Res.d10(opts);
    var modified = die + Res.sum(drms);
    var level = Aac.lookup(state.area, state.warPeriod, modified);
    /* [20.4] In a Special Mission Zone every result is one Activity Level
     * higher; High stays High and No Contact stays No Contact. */
    var shifted = false;
    if (state.activityShift && level !== 'none' && level !== 'high') {
      level = Aac.levels[Aac.levels.indexOf(level) + 1];
      shifted = true;
    }

    /* [13.2A] "If the die roll is a zero, the box is white, and the row has at
     * least one coloured box -> roll a second die. If that is also zero, the
     * submarine has encountered an enemy submarine." Note the rulebook keys
     * this on the DIE being zero, not the modified result. */
    var subVsSub = false, secondDie = null;
    var row = Aac.charts[state.area].grid[{ W1: 0, W2: 1, W3: 2, W4: 3 }[state.warPeriod]];
    var rowHasColour = row.some(function (v) { return v !== 'none'; });
    if (die === 0 && level === 'none' && rowHasColour) {
      secondDie = Res.d10(opts);
      if (secondDie === 0) subVsSub = true;
    }
    /* [IJN 4.1] Loners (optional rule): a white box on a line with red boxes
     * rolls again; a red box on that roll is a lone ship. [4.11] A zero first
     * roll uses the same second roll for the Sub vs. Sub check. */
    var loner = false;
    if (state.ijn && level === 'none' && row.indexOf('high') > -1 && !subVsSub) {
      if (secondDie === null) secondDie = Res.d10(opts);
      loner = row[secondDie] === 'high';
    }

    var record = Res.makeRecord({
      context: 'Area Activity — ' + state.area,
      table: 'Area Activity Chart [13.2A]',
      ruleRef: '13.2',
      inputs: [], drms: drms,
      die: die, modifiedDie: modified, target: null,
      result: subVsSub ? 'Enemy submarine encountered [14.6]'
                       : loner ? 'No convoy; second roll ' + secondDie + ' is a red box: a LONER [IJN 4.1]'
                       : Tables.activityById(level).label + (shifted ? ' (one level up in the SMZ [20.4])' : '')
    });
    return { level: level, subVsSub: subVsSub, loner: loner, secondDie: secondDie, record: record };
  }

  /* [13.2B] Contact Table. */
  function contact(state, opts) {
    var die = Res.d10(opts);
    var result = Tables.contactLookup(state.warPeriod, die);
    return {
      contact: result,
      record: Res.makeRecord({
        context: 'Contact — ' + state.warPeriod,
        table: 'Contact Table [13.2B]', ruleRef: '13.2',
        inputs: [], drms: [], die: die, modifiedDie: die, target: null,
        result: result + (result === 'C1' ? ' — Small Convoy'
                        : result === 'C2' ? ' — Large Convoy' : ' — Task Force')
      })
    };
  }

  /* [13.2C] Engagement Table -> how many pieces come out of each cup. */
  function engagement(level, contactResult, state) {
    var draw = Tables.engagementLookup(level, contactResult, !!state.ultra);
    return {
      draw: draw,
      record: Res.makeRecord({
        context: Tables.activityById(level).label + ' x ' + contactResult,
        table: 'Engagement Table [13.2C]', ruleRef: '13.2',
        inputs: [], drms: [], die: null, modifiedDie: null, target: null,
        result: draw === null ? 'no draw'
          : ['A', 'B', 'C', 'D'].map(function (c, i) {
              return c + (draw[i] === null ? '-' : draw[i]);
            }).join(' ')
      })
    };
  }

  /* The whole phase. Returns what happened plus every record, in order.
   * `bypass` is the player's choice under [13.1]; it is not decided here. */
  function run(state, opts) {
    var records = [];
    if (state.bypass) {
      return { outcome: 'bypassed', enduranceDrm: -1, records: records,
               note: 'Bypassed Search and Contact [13.1]: -1 to the Endurance roll.' };
    }

    var act = areaActivity(state, opts);
    records.push(act.record);
    if (act.subVsSub) {
      return { outcome: 'sub_vs_sub', enduranceDrm: 0, records: records,
               note: 'Enemy submarine encountered [14.6].' };
    }
    if (act.loner) {
      return { outcome: 'loner', enduranceDrm: -1, records: records, note: 'A lone ship [IJN 4.1].' };
    }
    if (act.level === 'none') {
      return { outcome: 'no_contact', enduranceDrm: -1, records: records, level: act.level,
               note: 'No contact [13.2A]: -1 to the Endurance roll.' };
    }

    var con = contact(state, opts);
    records.push(con.record);
    /* A War Event may say "only contacts with TF (or C2 and TF) results are
     * used" [5.0]: any other contact is passed by. */
    if (state.contactsOnly && state.contactsOnly.indexOf(con.contact) === -1) {
      records.push(Res.makeRecord({
        context: 'Contact ' + con.contact + ' not used', table: 'War Event [5.0]', ruleRef: '5.0',
        inputs: [], drms: [], die: null, modifiedDie: null, target: null,
        result: 'only ' + state.contactsOnly.join(' and ') + ' contacts are used' +
                (state.contactsWhy ? ' (' + state.contactsWhy + ')' : '') + ': no engagement'
      }));
      return { outcome: 'no_contact', enduranceDrm: -1, records: records, level: act.level,
               note: 'Contact not used under the War Event [5.0].' };
    }
    var eng = engagement(act.level, con.contact, state);
    records.push(eng.record);

    return {
      outcome: 'contact', level: act.level, contact: con.contact,
      draw: eng.draw, enduranceDrm: 0, records: records, note: null
    };
  }

  /* What a search in `area` would find, without rolling: the chance of each
   * Area Activity level on the d10 with the current drms [13.2A]. */
  function preview(state) {
    var drms = activityDrms(state), mod = Res.sum(drms), levels = {};
    for (var d = 0; d < 10; d++) {
      var lv = Aac.lookup(state.area, state.warPeriod, d + mod);
      levels[lv] = Math.round(((levels[lv] || 0) + 0.1) * 10) / 10;
    }
    return { levels: levels, contact: Math.round((1 - (levels.none || 0)) * 10) / 10,
             drms: drms, redBoxes: Aac.redBoxes(state.area, state.warPeriod), rule: '13.2' };
  }

  root.SWSearch = {
    preview: preview,
    activityDrms: activityDrms,
    areaActivity: areaActivity,
    contact: contact,
    engagement: engagement,
    run: run
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
