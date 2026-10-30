/* sw_subclasses.js — the 40 submarine classes. PURE DATA.
 *
 * Read off the Vassal counter art, both sides, and cross-checked: the Range
 * printed on the Patrol side matches the Range printed on the Transit side for
 * every class, and USS Spearfish's class (NEW S2) reads 6-3-4, which is exactly
 * the rating the rulebook's worked example [14.14] gives her.
 *
 * Patrol side  [2.3A]: Attack, Defense, Tactical, Endurance letter, Range.
 * Transit side [2.3A]: Entry Date, Speed, Range, Readiness.
 *
 * The SSN21 Seawolf is the joke/what-if counter: it prints a reactor symbol
 * where the Range circle goes, so `range` is null rather than a made-up number.
 */
(function (root) {
  'use strict';

  var CLASSES = [
    { art: 'argonaut', name: 'ARGONAUT', nation: 'US', attack: 3, defense: 4, tactical: 2,
      endurance: 'A', range: 9, speed: 2, readiness: 2, entry: null },
    { art: 'b', name: 'B', nation: 'US', attack: 3, defense: 3, tactical: 2,
      endurance: 'C', range: 8, speed: 3, readiness: 3, entry: null },
    { art: 'balao', name: 'BALAO', nation: 'US', attack: 7, defense: 5, tactical: 4,
      endurance: 'A', range: 8, speed: 2, readiness: 5, entry: null },
    { art: 'balao_du', name: 'BALAO', nation: 'NL', attack: 7, defense: 5, tactical: 4,
      endurance: 'A', range: 8, speed: 2, readiness: 5, entry: null },
    { art: 'c1', name: 'C1', nation: 'JP', attack: 5, defense: 3, tactical: 2,
      endurance: 'A', range: 9, speed: 4, readiness: 3, entry: '12/41' },
    { art: 'cachelot', name: 'CACHALOT', nation: 'US', attack: 3, defense: 1, tactical: 2,
      endurance: 'C', range: 6, speed: 3, readiness: 4, entry: null },
    { art: 'calvi', name: 'CALVI', nation: 'IT', attack: 4, defense: 2, tactical: 4,
      endurance: 'C', range: 7, speed: 2, readiness: 3, entry: null },
    { art: 'dolphin', name: 'DOLPHIN', nation: 'US', attack: 4, defense: 2, tactical: 2,
      endurance: 'C', range: 6, speed: 2, readiness: 4, entry: null },
    { art: 'gato', name: 'GATO', nation: 'US', attack: 7, defense: 4, tactical: 4,
      endurance: 'A', range: 8, speed: 2, readiness: 5, entry: null },
    { art: 'k-viii', name: 'K-VIII', nation: 'NL', attack: 2, defense: 2, tactical: 3,
      endurance: 'D', range: 2, speed: 2, readiness: 3, entry: null },
    { art: 'k-xi', name: 'K-XI', nation: 'NL', attack: 3, defense: 2, tactical: 2,
      endurance: 'D', range: 2, speed: 2, readiness: 3, entry: null },
    { art: 'k-xiv', name: 'K-XIV', nation: 'NL', attack: 4, defense: 2, tactical: 3,
      endurance: 'C', range: 6, speed: 2, readiness: 4, entry: null },
    { art: 'k6', name: 'K6', nation: 'JP', attack: 3, defense: 2, tactical: 1,
      endurance: 'D', range: 3, speed: 4, readiness: 3, entry: '3/43' },
    { art: 'kd4', name: 'KD4', nation: 'JP', attack: 3, defense: 2, tactical: 2,
      endurance: 'C', range: 7, speed: 2, readiness: 3, entry: '4/32' },
    { art: 'kd7', name: 'KD7', nation: 'JP', attack: 3, defense: 2, tactical: 1,
      endurance: 'C', range: 5, speed: 4, readiness: 3, entry: '2/42' },
    { art: 'l4', name: 'L4', nation: 'JP', attack: 3, defense: 2, tactical: 2,
      endurance: 'D', range: 3, speed: 2, readiness: 3, entry: '4/32' },
    { art: 'narwhal', name: 'NARWHAL', nation: 'US', attack: 4, defense: 5, tactical: 2,
      endurance: 'A', range: 9, speed: 2, readiness: 3, entry: null },
    { art: 'new_s1', name: 'NEW S1', nation: 'US', attack: 5, defense: 2, tactical: 4,
      endurance: 'B', range: 6, speed: 2, readiness: 4, entry: null },
    { art: 'new_s2', name: 'NEW S2', nation: 'US', attack: 6, defense: 3, tactical: 4,
      endurance: 'B', range: 6, speed: 2, readiness: 4, entry: null },
    { art: 'o-16', name: 'O-16', nation: 'NL', attack: 4, defense: 2, tactical: 3,
      endurance: 'C', range: 6, speed: 2, readiness: 4, entry: null },
    { art: 'o-19', name: 'O-19', nation: 'NL', attack: 4, defense: 2, tactical: 3,
      endurance: 'C', range: 6, speed: 3, readiness: 4, entry: null },
    { art: 'o-21', name: 'O-21', nation: 'NL', attack: 4, defense: 2, tactical: 4,
      endurance: 'C', range: 6, speed: 3, readiness: 4, entry: null },
    { art: 'p1', name: 'P1', nation: 'US', attack: 4, defense: 2, tactical: 2,
      endurance: 'C', range: 6, speed: 2, readiness: 4, entry: null },
    { art: 'p2', name: 'P2', nation: 'US', attack: 4, defense: 2, tactical: 3,
      endurance: 'C', range: 6, speed: 2, readiness: 4, entry: null },
    { art: 'p3', name: 'P3', nation: 'US', attack: 4, defense: 2, tactical: 3,
      endurance: 'C', range: 6, speed: 2, readiness: 4, entry: null },
    { art: 's1', name: 'S1', nation: 'US', attack: 3, defense: 2, tactical: 2,
      endurance: 'D', range: 3, speed: 2, readiness: 3, entry: null },
    { art: 's2', name: 'S2', nation: 'US', attack: 4, defense: 2, tactical: 2,
      endurance: 'D', range: 3, speed: 2, readiness: 3, entry: null },
    { art: 's2_br', name: 'S2', nation: 'GB', attack: 4, defense: 2, tactical: 3,
      endurance: 'D', range: 4, speed: 2, readiness: 4, entry: null },
    { art: 's3', name: 'S3', nation: 'US', attack: 4, defense: 2, tactical: 2,
      endurance: 'D', range: 3, speed: 2, readiness: 4, entry: null },
    { art: 'scheme_17', name: 'SCHEME 17', nation: 'US', attack: 8, defense: 5, tactical: 5,
      endurance: 'A', range: 9, speed: 2, readiness: 5, entry: '7/45' },
    { art: 'ssn21', name: 'SSN21', nation: 'US', attack: 12, defense: 12, tactical: 16,
      endurance: 'N', range: null, speed: 3, readiness: 6, entry: '5/97' },
    { art: 'surcouf', name: 'SURCOUF', nation: 'FR', attack: 5, defense: 5, tactical: 2,
      endurance: 'B', range: 6, speed: 2, readiness: 2, entry: null },
    { art: 't', name: 'T', nation: 'US', attack: 6, defense: 3, tactical: 4,
      endurance: 'B', range: 6, speed: 2, readiness: 5, entry: null },
    { art: 't2_br', name: 'T2', nation: 'GB', attack: 5, defense: 2, tactical: 2,
      endurance: 'C', range: 5, speed: 2, readiness: 4, entry: null },
    { art: 't2_du', name: 'T2', nation: 'NL', attack: 5, defense: 2, tactical: 2,
      endurance: 'C', range: 5, speed: 2, readiness: 4, entry: null },
    { art: 'tench', name: 'TENCH', nation: 'US', attack: 7, defense: 5, tactical: 5,
      endurance: 'A', range: 8, speed: 2, readiness: 5, entry: null },
    { art: 'type_5', name: 'TYPE 5', nation: 'US', attack: 6, defense: 6, tactical: 2,
      endurance: 'A', range: 9, speed: 2, readiness: 1, entry: null },
    { art: 'type_ixc40', name: 'IXC40', nation: 'DE', attack: 4, defense: 2, tactical: 2,
      endurance: 'A', range: 9, speed: 2, readiness: 4, entry: null },
    { art: 'type_ixd2', name: 'IXD2', nation: 'DE', attack: 4, defense: 3, tactical: 2,
      endurance: 'A', range: 9, speed: 2, readiness: 4, entry: null },
    { art: 'type_xxi', name: 'TYPE XXI', nation: 'US', attack: 6, defense: 6, tactical: 6,
      endurance: 'A', range: 7, speed: 3, readiness: 4, entry: '7/45' }
  ];

  root.SWSubClasses = {
    classes: CLASSES,
    get: function (art) {
      for (var i = 0; i < CLASSES.length; i++) { if (CLASSES[i].art === art) return CLASSES[i]; }
      return null;
    },
    /* Ratings for a boat from sw_units.js, which carries only name/class/art. */
    forBoat: function (boat) { return this.get(boat.art); },
    byNation: function (n) {
      return CLASSES.filter(function (c) { return c.nation === n; });
    }
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
