/* sw_guide.js — the phase guide in the floating palette. PURE DATA.
 *
 * Plain-language explanations of each step of a patrol week, keyed by the
 * Sequence of Play ids the engine and the demo tape use. `what` says what is
 * going on and why it matters; `you` says what the player does (patrol mode);
 * `next` says what follows. Rules are cited so every line can be checked in
 * RULES.md. Written 2026-09-20 after Wan's playtest: "I have no idea what is
 * happening ... explain the phases better."
 */
(function (root) {
  'use strict';

  /* The week at a glance: the five phases a patrolling boat goes through. */
  var WEEK = [
    { id: '12.0', label: 'Move',              rule: '12.0' },
    { id: '13.0', label: 'Search for ships',  rule: '13.0' },
    { id: '14.0', label: 'Combat',            rule: '14.0' },
    { id: '15.0', label: 'Transit',           rule: '15.0' },
    { id: '16.0', label: 'End of the week',   rule: '16.0' }
  ];

  /* Phase 6: a career's week has the whole Sequence of Play [4.0]. */
  var CAREER_WEEK = [
    { id: '5.0',  label: 'The war this week', rule: '5.0' },
    { id: '9.0',  label: 'In port',           rule: '9.0' },
    { id: '12.0', label: 'Move',              rule: '12.0' },
    { id: '13.0', label: 'Search for ships',  rule: '13.0' },
    { id: '14.0', label: 'Combat',            rule: '14.0' },
    { id: '15.0', label: 'Transit',           rule: '15.0' },
    { id: '16.0', label: 'End of the week',   rule: '16.0' }
  ];
  var CAREER_BUCKET = { '5.0': 0, '6.0': 0, '7.0': 0, '8.0': 1, '9.0': 1, '10.0': 1, '11.0': 1, 'base': 1,
                        '12.0': 2, '13.0': 3, '14.0': 4, '15.0': 5, '16.0': 6, '17.0': 6 };

  var STEPS = {
    'base': { title: 'In port',
      what: 'The boat is at a base. A boat just in goes to the Broom Box and must be readied: one die against its Readiness puts it Ready for Sea, otherwise it waits a week at the Pier Side. A damaged boat works its way through the Repair Boxes first, 3 to 2 to 1, one die a week against the number printed on each box.',
      you: 'When the boat is Ready for Sea, click an OpArea on the map to sail for it (every glowing area is within Range), or wait a week.',
      next: 'Sailing is Transit Movement: up to Speed areas a week, with one Transit Event check on the way.' },
    '5.0': { title: 'The war this week',
      what: 'Every week begins with the war: one die for a War Event (0-3 means one happens: a Special Mission, extra ULTRA, a base opening or closing), then Torpedo Improvement once enough ships are sunk, then ULTRA, the code-breakers marking where convoys will be (+1 to searches there).',
      you: null, next: 'Port business, then the boat\'s own week.' },
    '15.0c': { title: 'Transit',
      what: 'On the Transit side the boat travels up to its Speed in areas a week, along the pale lines. Every trip rolls once for a Transit Event, on the most dangerous chart it passes (the one whose red boxes start lowest): submarines were spotted, bombed or mined on the way. Cautious Transit (one area) is safer. A boat heading home docks when it reaches a base.',
      you: 'Choose below.',
      next: 'The week ends.' },
    '17.0': { title: 'War Progress',
      what: 'At the start of some months the war may move on to the next War Period: a die plus a bonus for everything sunk so far (the whole fleet\'s and yours). Each period has its own charts, contacts and escorts.',
      you: null, next: 'The new week.' },
    '12.0': { title: 'Move',
      what: 'Each week the boat may shift to one neighbouring OpArea (the big pale discs), or stay where it is. Where it ends up is where it hunts this week. It can never go further from a friendly base than its Range.',
      you: 'Click a glowing area on the map, or Remain on station.',
      next: 'Search for ships in the area you chose.' },
    '13.1': { title: 'Search or stay hidden?',
      what: 'The boat can look for Japanese shipping. Searching risks a fight. Bypassing keeps it hidden and scores nothing this week; with no fight it saves fuel and torpedoes, so this week\'s Endurance roll gets −1 (which helps). It can also turn for home.',
      you: 'Search, Bypass, or Return to base. Hover Search for the odds of contact here.',
      next: 'One die on this area\'s activity chart.' },
    '13.2': { title: 'Search: what is out there?',
      what: 'One die on the Area Activity Chart printed inside this area, reading the row for the current War Period. The colour it lands on is how busy the sea lanes are: white is empty, green sparse, orange low, blue moderate, red high. If anything is found, the Contact Table says what (C1 small convoy, C2 large convoy, TF task force) and the Engagement Table how many counters come out of each cup.',
      you: null,
      next: 'Contact: the counters go face down on the Combat Display. Nothing: straight to the Endurance check.' },
    '14.1': { title: 'Combat: first attack round',
      what: 'The convoy is laid out face down in columns A–D on the Combat Display. You pick a column; you can only see and shoot into your own column and the ones beside it.',
      you: null, next: 'Reveal, mark targets, fire.' },
    '14.11': { title: 'Combat: pick your column',
      what: 'The convoy lies face down in four columns. You can only reveal and attack ships in your own column and the ones beside it, and the escorts there are the ones that can hunt you.',
      you: 'Click a submarine box on the Combat Display.',
      next: 'Reveal counters (your Tactical rating says how many).' },
    '14.12': { title: 'Combat: reveal',
      what: 'Your Tactical rating is how many face-down counters you may turn over. Revealing shows you the targets, but a revealed escort adds its ASW to the defence of every ship near it and to the counterattack against you.',
      you: 'Click face-down counters in your column or next to it. With radar (from 1943) you may put the one you just revealed back face down.',
      next: 'Place TDC markers (firing solutions).' },
    '14.13': { title: 'Combat: firing solutions',
      what: 'TDC markers are your firing solutions: a value from −3 (good) to +3 (bad) added to the target\'s defence. You place them face down, one per ship, and only learn how good each is when they turn over.',
      you: 'Click the ships you might want to shoot.',
      next: 'The markers turn over; then choose targets.' },
    '14.14': { title: 'Combat: aim',
      what: 'Share your Attack points among ships that carry a TDC marker. Each attack is your points + skipper + torpedo value against the ship\'s defence + nearby escort ASW + its TDC marker; roll that difference or less to hit. More points on one ship means better odds on that ship.',
      you: 'Click a ship to target it, set its points with − / +, then Fire. Hover any ship for its odds.',
      next: 'Each attack is rolled; hits roll again on the Attack Results Table (sunk / damaged / dud).' },
    '14.2': { title: 'Counterattack',
      what: 'The escorts hunt the boat: their revealed ASW + the red boxes on this area\'s chart + the War Period\'s general ASW, against the boat\'s defence (+ skipper). The difference picks a row on the Counterattack Table; one die gives the result.',
      you: null, next: 'Withdraw, or go round again.' },
    '14.3': { title: 'Break off or go again?',
      what: 'The first round is over. Withdraw now and the fight ends. A Re-Attack lets you shoot again (your TDC markers improve by one), but the counterattack that follows is +1 against you.',
      you: 'Withdraw from combat, or Conduct a Re-Attack round. Hover Re-Attack for the risk.',
      next: 'Endurance check, or another round.' },
    '14.4': { title: 'Re-Attack: reposition',
      what: 'Going round again: the boat may first shift to an adjacent column. The first round\'s TDC markers went back into the pool; the new ones count one better (except a −3), and revealed ships stay revealed. A second Re-Attack needs a Super Skipper roll.',
      you: 'Click the submarine box of an adjacent column, or stay where you are.',
      next: 'Reveal, firing solutions, aim, fire; then a counterattack with +1.' },
    '14.5': { title: 'Super Skipper',
      what: 'A captain who sinks a big enough haul in one fight may be promoted to Super Skipper, a bonus on every later attack.',
      you: null, next: 'Endurance check.' },
    '14.7': { title: 'Endurance: can the boat stay out?',
      what: 'One die against the boat\'s Endurance rating (fuel, food, torpedoes, crew): equal or under the number and it stays out. A week without a fight is −1 (it helps); a damaged boat is +1. Fail and it must Return To Base.',
      you: null, next: 'Clean-up, then transit.' },
    '14.8': { title: 'Clean-up',
      what: 'Surviving Japanese counters go back into their cups and the TDC markers back into the pool, ready for the next fight.',
      you: null, next: 'Transit.' },
    '15.0': { title: 'Transit',
      what: 'A boat heading home (RTB) moves up to its Speed in areas toward base. A boat still on patrol may also reposition here.',
      you: 'Click a glowing area on the map, or stay.',
      next: 'The week ends.' },
    '16.0': { title: 'End of the week',
      what: 'The week is over. The calendar moves on and a new week begins with movement. A boat back at base ends its patrol.',
      you: null, next: 'Next week: Move.' }
  };

  /* The six things a newcomer needs before a first patrol (docs/08_first_hour.md). */
  var ESSENTIALS = [
    { t: 'You and your goal', d: 'You command one US submarine, March 1943. Sink Japanese tonnage and bring the boat home. Lose the boat and the patrol fails.' },
    { t: 'Your boat\'s numbers', d: 'Attack, Defense and Tactical are printed as 6•3•4. Endurance (B) is how long it can stay out; Range (6) how far from base it may go.' },
    { t: 'The week', d: 'Each week: move, search for ships, maybe fight, then check endurance. The palette always shows where you are.' },
    { t: 'The dice', d: 'One ten-sided die, 0 to 9. You want to roll LOW: equal to or under the number needed. Modifiers are added to the roll.' },
    { t: 'The fight', d: 'Pick a column, reveal ships, place firing solutions, share out your attack points, fire. Then the escorts hit back.' },
    { t: 'The risks', d: 'Busy seas bite back (the red boxes on each chart). Every fight and every week at sea can end the patrol.' }
  ];

  /* Reading the submarine counter. Positions are fractions of the counter art
   * (195 x 100), read off the enlarged scans of new_s2.gif / new_s2_transit.gif. */
  var BOAT = {
    patrol: { art: '../../Source/images/new_s2.gif', side: 'Patrol side (grey): used while hunting', marks: [
      { x: 0.70, y: 0.83, label: 'Attack 6', d: 'Points you share out among targets each attack round [14.14].' },
      { x: 0.81, y: 0.83, label: 'Defense 3', d: 'Your side of the counterattack sum: higher is safer [14.2B].' },
      { x: 0.93, y: 0.83, label: 'Tactical 4', d: 'How many counters you may reveal, and TDC markers you may place, each round [14.12].' },
      { x: 0.79, y: 0.16, label: 'Range 6', d: 'The boat may never be more than 6 areas from a friendly base [2.3A].' },
      { x: 0.91, y: 0.16, label: 'Endurance B', d: 'Fuel, food, torpedoes: each week one die decides whether it can stay out [14.7].' },
      { x: 0.20, y: 0.83, label: 'Class', d: 'The boat\'s class, NEW S2. Spearfish is one of them.' }
    ] },
    transit: { art: '../../Source/images/new_s2_transit.gif', side: 'Transit side (blue): used while travelling', marks: [
      { x: 0.76, y: 0.83, label: 'Speed 2', d: 'Areas it may move in one Transit phase, e.g. when heading home [15.0].' },
      { x: 0.89, y: 0.83, label: 'Range 6', d: 'The same leash from base as on the patrol side.' },
      { x: 0.91, y: 0.16, label: 'Readiness 4', d: 'The roll to get the boat ready for sea at base [9.0]: in a Career, roll this or less and it sails next week.' }
    ] }
  };

  /* First time a concept appears, one short explanation (beginner view). */
  var FIRSTS = [
    { id: 'roll', t: 'Your first die roll', d: 'One ten-sided die, 0 to 9 (0 is zero, not ten). In Silent War you usually want to roll LOW: equal to or under the number needed. The side panel on the right (behind the Rolls button in a narrow window) shows the sum behind every roll.' },
    { id: 'chart', t: 'The Area Activity Chart', d: 'Every area has a coloured grid printed on the map. The die picks a column, the War Period picks the row (W2 now). The colour is how busy the sea is: white nothing, green sparse, orange low, blue moderate, red high.' },
    { id: 'facedown', t: 'Face-down counters', d: 'The convoy hides until you reveal it. The back tells you a little: a merchant flag or a battle flag (warship). Face-down ships count as defense 1 until revealed.' },
    { id: 'counter', t: 'Reading a Japanese counter', d: 'Top right: the ship\'s size in thousands of tons (your score if you sink it). Bottom: Defense·ASW. Defense is how hard it is to hit; ASW is how hard its escorts hunt you.' },
    { id: 'tdc', t: 'Firing solutions turned over', d: 'Each TDC marker is added to its target\'s defense: −3 is a superb solution, +3 a poor one. Aim at the ships your markers favour.' },
    { id: 'counterattack', t: 'The escorts hit back', d: 'Their total (revealed ASW + the area\'s red boxes + a general value) minus your boat\'s defense picks a row; one die on that row. Low is good for you here too.' },
    { id: 'sunk', t: 'A ship sunk', d: 'Its tonnage is your score (top strip). Bronze needs any ship, Silver 5,000 tons, Gold 10,000, and the boat must come home.' },
    { id: 'endurance', t: 'The Endurance roll', d: 'Every week at sea ends with one die against the boat\'s Endurance. Equal to or under the number and it stays out. A week with no contact is −1, which helps (no torpedoes or fuel spent fighting); a damaged boat is +1. Fail and the boat must head home.' },
    { id: 'event', t: 'A Combat Event', d: 'One counter in each cup is a Combat Event. When it turns up, one die decides what happens this round: a ship lumbering into your torpedoes, surface gunnery, a circular run, a bomber, engine trouble, a perfect setup, doubled tonnage, or the escorts striking first. Its result overrides the normal rules. Only one per round.' },
    { id: 'radar', t: 'Radar', d: 'From 1943 your boat has radar. Right after revealing a counter you may put it back face down (once a round): a face-down escort adds no ASW against you. You then reveal another counter instead.' },
    { id: 'diligent', t: 'A Diligent Escort', d: 'A particularly alert destroyer: the moment it is revealed it attacks on its own row of the Counterattack Table. If it damages the boat during the reveal step, you may withdraw at once.' },
    { id: 'subvssub', t: 'An enemy submarine', d: 'Two zeros on the activity chart mean another submarine. A die decides who sees whom first (radar helps); that boat fires once. No escorts, no counterattack, no second round.' },
    { id: 'rtb', t: 'Return To Base', d: 'The boat can no longer hunt. It travels home at its Speed; the patrol ends when it arrives.' },
    { id: 'port', t: 'In port', d: 'Back at base the boat is readied for sea: one die against its Readiness (printed on the blue Transit side). A damaged boat is repaired first, one box a week. Then it can sail again.' },
    { id: 'warevent', t: 'A War Event', d: 'Something happened in the wider war. Most are Special Missions for a number of boats, a week of extra (or no) ULTRA, or a base opening or closing. If your boat is in reach of a mission, it is ordered in.' },
    { id: 'ultra', t: 'ULTRA', d: 'The code-breakers read the Japanese convoy signals. This week the marked areas get +1 on the search die and one more ship from each cup. You are never forced to go there.' },
    { id: 'transitevent', t: 'A Transit Event', d: 'Out in the open the boat was found before it found anyone: a plane, a mine, a submarine. Spotted is a nuisance; a return-to-base result sends it home at once, maybe damaged; the worst is Lost at sea.' },
    { id: 'mission', t: 'Special Mission orders', d: 'The high command needs boats for an operation. Your boat is ordered into the zone this week; only some contacts count there (often Task Forces only), and some missions allow no attacks at all. Afterwards the boat heads home.' },
    { id: 'torpedo', t: 'The torpedoes improve', d: 'The Mk-XIV started the war badly flawed. As ships are sunk the fixes arrive: its value is added to every attack and to the Endurance number, so each step up matters.' },
    { id: 'warperiod', t: 'A new War Period', d: 'The war has moved on. The activity charts use a new row, convoys and escorts change, and some bases open or close. Check the top strip.' },
    { id: 'wolfpack', t: 'A wolfpack', d: 'Three boats under your command, moving as one. When they find a convoy each boat attacks in turn and takes its own counterattack; escorts next door count against a boat only if no other boat is between. The pack may go round again once. Your medal counts your own boat\'s sinkings.' },
    { id: 'tender', t: 'A forward base', d: 'A submarine tender in a mission zone: a base closer to the hunting grounds, and leaving it costs no Speed. It can only fix light (Superficial) damage; anything worse must go on to a major base.' },
    { id: 'quick', t: 'Quick resolution', d: 'The whole search and fight in a couple of rolls: how many ships sink depends on your attack and how busy the chart is; then one die against the chart for the counterattack. Faster, rougher, and not for the lessons of the board.' },
    { id: 'loner', t: 'A loner', d: 'An IJN rule: on an empty search in busy water a lone ship may still turn up. You meet it alone, beside or in its column; a merchant can even be shelled with the deck gun.' },
    { id: 'crashdive', t: 'Crash dive', d: 'An IJN rule: against a Diligent Escort, a Betty bomber or your own circular-running torpedo, one die against the class\'s Crash Dive rating. Down in time and the worst becomes merely Spotted.' },
    { id: 'overhaul', t: 'Overhaul', d: 'The Master Reinforcement list sends the boat to California for a refit. It leaves at once, wherever it is, and comes back to Pearl Harbor months later. The war goes on without you meanwhile.' }
  ];

  /* Boot camp: the first hour, in order. */
  var BOOTCAMP = [
    { id: 'brief',           label: 'Briefing: your role and your goal' },
    { id: 'boat',            label: 'Read your boat' },
    { id: 'lesson:search',   label: 'Watch: moving and searching' },
    { id: 'lesson:attack',   label: 'Watch: setting up an attack' },
    { id: 'drill:column',    label: 'Do: pick your column' },
    { id: 'drill:aim',       label: 'Do: aim the torpedoes' },
    { id: 'lesson:reattack', label: 'Watch: the Re-Attack gamble' },
    { id: 'drill:reattack',  label: 'Do: go again, or break off?' },
    { id: 'patrol',          label: 'Your first patrol, with the coach' }
  ];

  /* Plain names for the status strip in the beginner view. */
  var PLAIN = { 'Gen. ASW': 'Enemy ASW', 'Mk-XIV': 'Torpedoes', 'War Period': 'War period', 'Subs lost': 'Boats lost' };

  root.SWGuide = {
    essentials: ESSENTIALS,
    boat: BOAT,
    firsts: FIRSTS,
    bootcamp: BOOTCAMP,
    plain: PLAIN,
    week: WEEK,
    careerWeek: CAREER_WEEK,
    careerWeekIndex: function (id) {
      id = String(id || '');
      if (CAREER_BUCKET[id] !== undefined) return CAREER_BUCKET[id];
      var major = id.split('.')[0] + '.0';
      return CAREER_BUCKET[major] !== undefined ? CAREER_BUCKET[major] : -1;
    },
    steps: STEPS,
    /* The most specific entry for an SOP id: 14.14 -> 14.14, 14.15 -> 14.1. */
    step: function (id) {
      id = String(id || '');
      if (STEPS[id]) return STEPS[id];
      var major = id.split('.')[0];
      var short = major + '.' + (id.split('.')[1] || '0').charAt(0);
      return STEPS[short] || STEPS[major + '.0'] || null;
    },
    weekIndex: function (id) {
      var major = String(id || '').split('.')[0] + '.0';
      for (var i = 0; i < WEEK.length; i++) if (WEEK[i].id === major) return i;
      return -1;
    }
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
