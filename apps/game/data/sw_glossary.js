/* sw_glossary.js — plain-language definitions for every abstract rating.
 * PURE DATA. Text condensed from RULES.md [2.3] and the cited rules.
 * Each entry: term, short (tooltip line), long (rules-viewer blurb), ruleRef.
 * Tooltips obey the same fog-of-war constraint as summaries: nothing here
 * reveals a hidden value, it only explains what a rating means.
 */
(function (root) {
  'use strict';

  var TERMS = [
    { id: 'attack', term: 'Attack', ruleRef: '2.3',
      short: 'The sub’s fighting value — tube count and torpedo loadout. Split it among targets.',
      long: 'Fighting value: number of tubes, fore/aft split, torpedo loadout. In target selection [14.14] the player allocates this value across as many targets as he likes, minimum one; total attacks may not exceed it.' },
    { id: 'defense', term: 'Defense', ruleRef: '2.3',
      short: 'Maneuver, dive speed, diving depth, tonnage, robustness. Size matters.',
      long: 'Used in the Counterattack Round [14.2B] together with any Super Skipper bonus. Bigger, tougher, deeper-diving boats survive more depth charges.' },
    { id: 'tactical', term: 'Tactical', ruleRef: '2.3',
      short: '“Handiness” — sets how many enemy units you reveal AND how many TDC markers you draw.',
      long: 'Modernity, engineering responsiveness, combat systems (scopes, TDC, radar, sonar). It does double duty: reveal that many Japanese units [14.12] and draw that many TDC markers [14.13].' },
    { id: 'endurance', term: 'Endurance', ruleRef: '14.7',
      short: 'Letter rating A–D. Cross-index with torpedo value to see if the boat may stay on patrol.',
      long: 'Fuel, victuals, crew, and — usually the binding limit — torpedo loadout (12–24 fish). Roll higher than the table number and the sub is marked RTB. −1 if it bypassed Search and Contact or found nothing; +1 if damaged.' },
    { id: 'range', term: 'Range', ruleRef: '2.3',
      short: 'Maximum number of OpAreas the sub may ever be from a friendly base.',
      long: 'A hard leash, checked continuously — not just at the end of movement.' },
    { id: 'speed', term: 'Speed', ruleRef: '2.3',
      short: 'How many OpAreas the sub may move in one turn (Transit side).',
      long: 'Printed on the Transit (light blue) side of the counter, along with entry date, range, and readiness.' },
    { id: 'readiness', term: 'Readiness', ruleRef: '9.0',
      short: 'Roll this or less to move the boat out of the Broom Box toward Ready for Sea.',
      long: 'Ready Submarines Phase: roll = or < the Ready number → Ready for Sea Box; roll > → Pierside Box.' },
    { id: 'tonnage', term: 'Tonnage', ruleRef: '2.3',
      short: 'Ship size in thousands of Tons Light — the ART row, and what you score when you sink it.',
      long: 'Tons Light = ship weight without cargo or fuel. Also the left-column index on the Attack Results Table [14.15D].' },
    { id: 'defense_rating', term: 'Defense Rating', ruleRef: '2.3',
      short: 'How hard a Japanese ship is to hit and how much it can absorb. Aircraft have none — they cannot be attacked.',
      long: 'Factors in inherent explosion dangers. Unrevealed units count as defense 1 until turned face up [14.16 note].' },
    { id: 'asw', term: 'ASW Rating', ruleRef: '2.3',
      short: '0, ½, 1, 2, 3 or 4. A damaged ship’s ASW is zero. Aircraft ASW counts from any column.',
      long: 'Added to the target total when attacking [14.15B2] and to the Japanese total when counterattacking [14.2A1], where fractions round up.' },
    { id: 'tdc', term: 'TDC Marker', ruleRef: '2.3',
      short: 'Target Data Computer solution, −3 to +3. Drawn blind, placed blind, then revealed.',
      long: 'Pool of 24: −3×2, −2×4, −1×4, 0×4, +1×4, +2×4, +3×2, identical in every War Period. Placed one per target on revealed OR face-down ships in the sub’s column or an adjacent one [14.13]; once placed they may not be moved. In a Re-Attack, subtract one from every TDC except −3s [14.4].' },
    { id: 'super_skipper', term: 'Super Skipper', ruleRef: '25.0',
      short: 'A named ace. His bonus is added to EVERY attack and to the counterattack defense.',
      long: 'Top U.S. skippers with a combat bonus folded into both the attack [14.15A2] and defense [14.2B2] calculations. Each individual attack gets the bonus, not the round as a whole.' },
    { id: 'activity_level', term: 'Activity Level', ruleRef: '13.2',
      short: 'The AAC box colour: white none, green very small, orange small, blue moderate, red large.',
      long: 'Rolled on the Area Activity Chart for the current War Period. Cumulative drms: +1 ULTRA area, +2 barrier wolfpack, −1 if Spotted in War Period 1 or 2. Cross-index with the Contact result to get cup draws.' },
    { id: 'contact_c1', term: 'C1', ruleRef: '13.2',
      short: 'Small convoy.', long: 'Contact Table result: small convoy.' },
    { id: 'contact_c2', term: 'C2', ruleRef: '13.2',
      short: 'Large convoy.', long: 'Contact Table result: large convoy.' },
    { id: 'contact_tf', term: 'TF', ruleRef: '13.2',
      short: 'Naval task force.', long: 'Contact Table result: naval task force — the heavy stuff, and the heavy escort.' },
    { id: 'cups', term: 'Cups A–D', ruleRef: '3.1',
      short: 'The four War Mix cups. A piece drawn from cup A goes in Combat Display column A.',
      long: 'Cup composition changes with the War Period. Draw pieces without examining them and place them face down in the matching column [13.2C]. An ULTRA marker adds one piece per cup, unless that cup’s result was “no draw”.' },
    { id: 'war_period', term: 'War Period', ruleRef: '17.0',
      short: 'W1–W4. Sets the AAC row, the cup contents, and the general ASW value.',
      long: 'Advances via the War Period Transition Table in the War Progress Phase [17.0], with automatic advance dates [17.2].' },
    { id: 'general_asw', term: 'General ASW Value', ruleRef: '14.2',
      short: 'A flat wartime bonus to every Japanese counterattack, read off the War Period display.',
      long: 'War Period 1 = 0, W2 = 1, W3 = 2, W4 = 1, per the printed track. Added in [14.2A3].' },
    { id: 'torpedo_value', term: 'Torpedo Value', ruleRef: '6.0',
      short: 'The Mk-XIV modifier, −2 to +2. It counts twice: once to hit, once to detonate.',
      long: 'Added to the attacker total [14.15A3] and again to the ART roll [14.15D] — running at the proper depth, then exploding correctly. Improves via the Torpedo Improvement Table [6.0].' },
    { id: 'crash_dive', term: 'Crash Dive', ruleRef: 'IJN 5.0',
      short: 'IJN expansion: an emergency dive to break off, at a cost.',
      long: 'See the IJN Expansion Kit rules [IJN 5.0].' },
    { id: 'spotted', term: 'Spotted', ruleRef: '23.0',
      short: 'The enemy knows roughly where you are: −1 on the AAC roll (W1–W2) and +1 to their counterattack.',
      long: 'Removed on a Conclude Turn roll of 0–6, or automatically on return to base [16.0].' },
    { id: 'diligent_escort', term: 'Diligent Escort', ruleRef: '14.12',
      short: 'A specially aggressive destroyer captain — rolls on the Counterattack Table the moment it is revealed.',
      long: 'Three pieces, orange DD silhouette on a gray band. Revealed during [14.12] you may withdraw if damaged; revealed during target selection [14.14] you may not.' },
    { id: 'rtb', term: 'RTB', ruleRef: '15.2',
      short: 'Return to Base. The boat is done patrolling and heads home.',
      long: 'Entered voluntarily [13.1], or forced by combat, event, or a failed Endurance check [14.7].' },
    { id: 'congregating', term: 'Congregating Risk', ruleRef: '22.0',
      short: 'Too many boats in one OpArea draws attention.',
      long: 'Subs in an active SMZ are exempt in that OpArea [20.2].' }
  ];

  root.SWGlossary = {
    terms: TERMS,
    get: function (id) {
      for (var i = 0; i < TERMS.length; i++) { if (TERMS[i].id === id) return TERMS[i]; }
      return null;
    }
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
