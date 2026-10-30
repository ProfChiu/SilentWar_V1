/* sw_intro.js — the Welcome: what the game is, the war behind it, what the
 * player decides, how the game teaches, where to start (Phase 9). PURE DATA.
 * Written for this app. Rule numbers in [brackets] open the rulebook.
 */
(function (root) {
  'use strict';

  var WAR = {
    lede: 'December 1941 to August 1945. American submarines, under 2% of the US Navy, sank more than half of all the Japanese merchant ' +
          'shipping lost in the war, and strangled an island empire that imported almost everything it fought with. ' +
          'Silent War puts you in charge of that campaign, from a single boat\'s bridge up to the whole Pacific submarine force.',
    points: [
      { t: 'Japan lived by sea', d: 'Oil from the Dutch East Indies, iron and coal from China and Korea, rice and rubber from the south: every ton moved in a merchant fleet that was too small at the start and was never replaced fast enough.' },
      { t: 'A slow, costly start', d: 'Bases fell in the first months, skippers trained for a different war attacked cautiously, and the Mk-XIV torpedo ran deep and failed to explode. 1942 sank far less than Japan could build.' },
      { t: 'The machine that won', d: 'By 1944 the torpedo worked, codebreakers (ULTRA) sent boats to convoys, forward bases cut the transits, and wolfpacks hunted together. By 1945 almost no oil reached Japan.' },
      { t: 'The price', d: '52 US submarines and about 3,500 men were lost: one in five of the men who made war patrols, the heaviest proportional loss of any American service.' }
    ],
    more: 'The History button has six short chapters on this, each tied to the rules that model it.'
  };

  /* Player agency: three levels of command. `you` = your decisions, `dice` =
   * what chance decides, `war` = what the war decides around you. */
  var COMMANDS = [
    { id: 'captain', title: 'Captain', where: 'Patrol, Patrol Games, lessons', scale: 'one boat, one patrol, week by week',
      you: [
        ['Where to hunt this week: move to a neighbouring OpArea or stay', '12.0'],
        ['Search for ships, stay hidden (bypass), or head for home', '13.1'],
        ['Which column of the convoy to attack from', '14.11'],
        ['Which face-down counters to reveal; with radar, which to turn back', '14.12'],
        ['Which ships get your TDC firing solutions', '14.13'],
        ['How to split your attack points between targets', '14.14'],
        ['Break off, or go round again with a Re-Attack', '14.3']
      ],
      dice: [
        ['How busy the sea lanes are, and whether you find a convoy', '13.2'],
        ['What the convoy holds: its counters are drawn blind from the War Mix', '3.1'],
        ['Hits, duds and sinkings', '14.15'],
        ['The escorts\' counterattack', '14.2'],
        ['Endurance: when fuel and torpedoes send you home', '14.7'],
        ['Combat Events: gunnery, circular runs, aircraft', '19.2']
      ] },
    { id: 'skipper', title: 'Skipper', where: 'Career', scale: 'one boat across several patrols, with the war moving around it',
      you: [
        ['Which OpArea to sail for, and how fast to transit', '15.1'],
        ['Which base to come home to', '15.2'],
        ['Whether to form a wolfpack (from October 1943)', '24.1'],
        ['Whether to fight a battle in full or by Quick Resolution', '27.0']
      ],
      dice: [
        ['War Events: missions, bases opening and falling', '5.0'],
        ['Torpedo improvement', '6.0'],
        ['ULTRA intercepts', '7.0'],
        ['Transit Events on the way out and home', '19.1'],
        ['Readying and repair in port', '9.0']
      ] },
    { id: 'comsubpac', title: 'ComSubPac', where: 'Scenarios: the Campaign Games', scale: 'every boat in the theatre, week by week, for up to four years',
      you: [
        ['Where every boat Ready for Sea sails, or standing orders per base', '15.1'],
        ['Which fights you take yourself on the Combat Display; the rest go to their captains', '14.0'],
        ['Which boats lead wolfpacks', '24.1'],
        ['How to meet the Special Missions Washington orders', '5.2']
      ],
      dice: [
        ['The whole war: events, the torpedo, ULTRA, War Periods', '17.0'],
        ['Reinforcements and withdrawals on the historical lists', '8.0'],
        ['Whether you keep your command: the tonnage targets of Career Longevity', '31.12']
      ] }
  ];

  var WHY = 'You never control the dice, and the real commanders did not control the war either. Washington set the missions, the Japanese chose ' +
            'their convoy routes, and the torpedo was fixed on its own slow schedule. What you control is the odds: where you look, how much ' +
            'risk you take, and when you stop. Good decisions win more often, not every time. The game scores you on outcomes over many ' +
            'weeks, the way the Navy scored its skippers.';

  /* How a good captain thinks: the reasoning the built-in captain and the coach use. */
  var THINKING = [
    { t: 'Go where the ships are, at a price you can pay', d: 'An OpArea\'s Area Activity Chart gives the odds of finding shipping; its red boxes add to every counterattack there. Weigh both, and the weeks of transit.', rule: '12.0' },
    { t: 'Look at the cargo, not the escorts', d: 'Every escort you reveal adds its ASW to the counterattack. Merchant flags first; leave battle flags face down when you can.', rule: '14.12' },
    { t: 'Aim for tonnage', d: 'Split your attack points where the expected tonnage sunk is highest. One well-aimed ship beats three long shots.', rule: '14.14' },
    { t: 'Know when to stop', d: 'A Re-Attack improves your firing solutions, but the counterattack after it is harder (+1). Go again only when the odds of losing the boat are small.', rule: '14.4' },
    { t: 'A damaged or spotted boat hides', d: 'Bypassing a week keeps you out of trouble and eases the Endurance roll. A live boat sinks ships next month.', rule: '13.1' },
    { t: 'Think in months', d: 'In a career or a campaign, the boat in port matters as much as the boat on station: repair, readiness and transit time decide how many weeks you hunt.', rule: '10.0' }
  ];

  var TEACHING = [
    { t: 'The maths, shown', d: 'Every roll opens into its terms: ratings, skipper, torpedo value, defence, the need and the die. Hover any stat for what it means.' },
    { t: 'Rules one click away', d: 'Every [rule number] opens the rulebook at that rule. The Charts button opens the printed tables.' },
    { t: 'Lessons and drills', d: 'Fifteen lessons play real situations on fixed dice, starting with the rulebook\'s own worked example, then hand you the helm. Drills practise one decision at a time.' },
    { t: 'A coach', d: 'The coach checks a decision before you commit it, and explains a better one in the game\'s terms. Switch it off in the nav when you are ready.' },
    { t: 'Undo and What if?', d: 'Rewind any decision and play it differently on the same dice, to see what your choice really changed.' },
    { t: 'History alongside', d: 'The History primer, and in a campaign a chart of your war against the real one.' },
    { t: 'Simple or Full', d: 'Simple hides the rule numbers and folds the dice maths away; Full shows every panel.' }
  ];

  var ABOUT = {
    game: 'Silent War: The United States\' Submarine Campaign Against Imperial Japan, 1941-45. Designed by Brien J. Miller, developed by ' +
          'Stephen Jackson, published by Compass Games (2005). Spanish scenario book translated by Felipe Santamaría.',
    rights: 'The map, counters, charts and rules belong to Compass Games. This digital edition is a private prototype.',
    what: 'Every table in the rulebook is data here, checked against the printed book. The rules engine offers only legal moves and cites ' +
          'the rule for every roll. The dice are seeded, so any game can be replayed exactly (the seed is in the status strip).',
    evidence: [
      ['Unit checks', 'tables against the book, every rule module, each campaign\'s setup and victory', '2,218'],
      ['Seeded soak games', 'patrols, careers, Patrol Games and whole campaigns, with no crash, stall or uncited roll', '959'],
      ['Browser checks', 'the page itself, driven in Chromium, with zero console errors', '541']
    ],
    sources: 'History: Clay Blair Jr., Silent Victory (1975); JANAC, Japanese Naval and Merchant Shipping Losses (1947); ' +
             'Theodore Roscoe, United States Submarine Operations in World War II (1949).'
  };

  /* The title screen: who made the original game, and what this edition is. */
  var TITLE = {
    kicker: 'A digital study edition · Version 1',
    name: 'Silent War',
    sub: 'The United States\' Submarine Campaign Against Imperial Japan, 1941-45',
    original: {
      head: 'The original board game',
      text: 'Silent War is a solitaire board wargame designed by Brien J. Miller and developed by Stephen Jackson. ' +
            'It is published by Compass Games, LLC: first edition 2005, rulebook 1.1 © 2012 Compass Games, LLC.',
      owns: 'The game design, map, counters, charts, rules text and box art belong to Compass Games. ' +
            'This edition follows their printed rulebook; every rule it applies cites the book\'s paragraph.'
    },
    privacy: {
      head: 'For private use only',
      text: 'This is an unofficial, non-commercial translation made for study and teaching. It is not affiliated with, ' +
            'licensed or endorsed by Compass Games. It is not for sale, publication or distribution.',
      buy: 'To play Silent War, get the board game from Compass Games.'
    },
    vibe: {
      head: 'Made with vibe coding',
      text: 'Tools: Photoshop / Visual Studio / Claude AI.'
    },
    foot: 'Version 1 · September-October 2026 · the first step in this app\'s evolution'
  };

  root.SWIntro = { war: WAR, commands: COMMANDS, why: WHY, thinking: THINKING, teaching: TEACHING, about: ABOUT, title: TITLE };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
