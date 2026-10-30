/* sw_sop.js — Sequence of Play [4.0]. PURE DATA.
 * Drives the persistent breadcrumb so the player always knows where they are.
 * A game turn is one week [4.0]. Patrol scenarios ignore the Strategic and
 * Triple-R segments except Prep for Operations [11.0] — hence `patrol`.
 */
(function (root) {
  'use strict';

  var SEGMENTS = [
    { id: 'strategic', label: 'I. Strategic', phases: [
      { id: '5.0',  label: 'War Event',            patrol: false },
      { id: '6.0',  label: 'Torpedo Improvement',  patrol: false },
      { id: '7.0',  label: 'ULTRA',                patrol: false }
    ]},
    { id: 'triple_r', label: "II. Triple 'R'", phases: [
      { id: '8.0',  label: 'Sub Reinforcement',    patrol: false },
      { id: '9.0',  label: 'Ready Submarines',     patrol: false },
      { id: '10.0', label: 'Submarine Repair',     patrol: false },
      { id: '11.0', label: 'Prep for Operations',  patrol: true }
    ]},
    { id: 'operations', label: 'III. Operations', perSub: true, phases: [
      { id: '12.0', label: 'Patrol Movement',      patrol: true },
      { id: '13.0', label: 'Search and Contact',   patrol: true, steps: [
        { id: '13.1', label: 'Activity Determination' },
        { id: '13.2', label: 'Search and Contact Procedure' }
      ]},
      { id: '14.0', label: 'Combat',               patrol: true, steps: [
        { id: '14.1', label: 'First Attack Round' },
        { id: '14.2', label: 'Counterattack Round' },
        { id: '14.3', label: 'Withdrawal' },
        { id: '14.4', label: 'Re-Attack Rounds' },
        { id: '14.5', label: 'Super Skipper Determination' },
        { id: '14.6', label: 'Sub vs. Sub Combat' },
        { id: '14.7', label: 'Endurance Check' },
        { id: '14.8', label: 'Clean-Up' }
      ]},
      { id: '15.0', label: 'Transit Movement',     patrol: true }
    ]},
    { id: 'end_turn', label: 'IV. End Turn', phases: [
      { id: '16.0', label: 'Conclude Turn',        patrol: true },
      { id: '17.0', label: 'War Progress',         patrol: false }
    ]}
  ];

  function flatten(patrolOnly) {
    var out = [];
    SEGMENTS.forEach(function (seg) {
      seg.phases.forEach(function (p) {
        if (patrolOnly && !p.patrol) return;
        out.push({ segment: seg.id, segmentLabel: seg.label, id: p.id,
                   label: p.label, steps: p.steps || [] });
      });
    });
    return out;
  }

  root.SWSop = {
    segments: SEGMENTS,
    all: function () { return flatten(false); },
    patrol: function () { return flatten(true); },
    /* The engine names sub-steps the SOP does not print — [14.11] through
     * [14.16] all live under the First Attack Round [14.1]. Fold them up so the
     * breadcrumb always resolves. */
    normalise: function (id) {
      var m = /^(\d+)\.(\d)(\d+)$/.exec(id);
      return m ? m[1] + '.' + m[2] : id;
    },
    find: function (id) {
      id = this.normalise(id);
      var all = flatten(false);
      for (var i = 0; i < all.length; i++) {
        if (all[i].id === id) return all[i];
        for (var j = 0; j < all[i].steps.length; j++) {
          if (all[i].steps[j].id === id) {
            return { segment: all[i].segment, segmentLabel: all[i].segmentLabel,
                     id: all[i].id, label: all[i].label, steps: all[i].steps,
                     step: all[i].steps[j] };
          }
        }
      }
      return null;
    }
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
