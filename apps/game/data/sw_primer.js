/* sw_primer.js — "The Silent War": the history behind the game (Phase 9). PURE DATA.
 *
 * Written for this app in our own words. It paraphrases no rules text; where it
 * points at the book it cites the rule or page. Figures are the standard ones:
 * JANAC (1947) for sinkings, Blair (1975) for the story. `game` says where the
 * history sits in the rules, so a player can connect the two.
 */
(function (root) {
  'use strict';

  var SOURCES = {
    blair:   'Clay Blair Jr., Silent Victory: The U.S. Submarine War Against Japan (1975)',
    janac:   'Joint Army-Navy Assessment Committee (JANAC), Japanese Naval and Merchant Shipping Losses During World War II by All Causes (1947)',
    roscoe:  'Theodore Roscoe, United States Submarine Operations in World War II (US Naval Institute, 1949)',
    kuenne:  'Robert E. Kuenne, The Attack Submarine: A Study in Strategy (Yale, 1965)',
    parillo: 'Mark P. Parillo, The Japanese Merchant Marine in World War II (1993)',
    book:    'Silent War rulebook and scenario book, designer\'s notes (Brien J. Miller, Compass Games, 2005)'
  };

  var CHAPTERS = [
    { id: 'war', title: 'The war the submarines fought',
      paras: [
        'On the afternoon of 7 December 1941, hours after the attack on Pearl Harbor, Washington ordered unrestricted air and submarine warfare against Japan. ' +
        'The order reversed twenty years of American policy: submarines would now sink merchant ships on sight, as the U-boats had in the Atlantic.',
        'Japan was an island empire that imported almost everything it fought with: oil from the Dutch East Indies, iron ore and coal from China and Korea, ' +
        'rubber, bauxite and rice from the south. Every barrel and every ton moved by sea, in a merchant fleet that was too small at the start and was never replaced fast enough.',
        'The US submarine force was under 2% of the Navy\'s people. By JANAC\'s post-war count its boats sank about 1,100 merchant ships of some 4.8 million tons, ' +
        'more than half of all Japanese merchant tonnage lost to every cause, and about 200 warships, among them a battleship and eight carriers.',
        'The price was 52 submarines lost from all causes and about 3,500 men, one in five of the men who made war patrols: the heaviest proportional loss of any American service in the war.'
      ],
      game: 'You play the man in charge of that force: Commander Submarines, Pacific (ComSubPac) and his colleagues in Australia. The Campaign Games [31.x] give you the war at its real pace; the Patrol Games [32.x] put you on one boat\'s bridge.',
      sources: ['janac', 'blair', 'roscoe'] },
    { id: 'torpedo', title: 'The torpedo scandal',
      paras: [
        'For nearly two years American submarines went to war with a torpedo that did not work. The Mark XIV and its Mark VI exploder had never been tested against a real hull with a live warhead; peacetime budgets would not pay for it.',
        'There were three faults, each hiding the next. The torpedo ran about ten feet deeper than it was set, so it passed under its target. ' +
        'The magnetic exploder, meant to fire under the keel, went off early or not at all. And the contact pistol, when a torpedo finally struck squarely, crushed its own firing pin and failed to explode.',
        'Skippers who reported misses were told their aim was at fault. In June 1942 tests off Albany, Western Australia, ordered by Rear Admiral Charles Lockwood, proved the deep running with a fishing net. ' +
        'In mid-1943 Lockwood had the magnetic exploder switched off in his command, and after Tinosa fired fifteen torpedoes into a crippled whale-factory ship and heard most of them clang without exploding, ' +
        'the firing-pin fault was found and fixed by drop tests at Pearl Harbor. By late 1943 the torpedo finally worked.'
      ],
      game: 'The Mk-XIV value runs from −2 in December 1941 to +2 at best, and it adds to every attack, re-attack and Endurance roll [14.15]. It only improves when the Torpedo Improvement roll succeeds [6.0]. Sculpin\'s Patrol Game [32.12] is Chappell\'s war: good attacks, torpedoes that fail.',
      sources: ['blair', 'roscoe', 'book'] },
    { id: 'ultra', title: 'ULTRA: reading Japan\'s mail',
      paras: [
        'American and British codebreakers read much of Japan\'s naval radio traffic. From early 1943 they could read the code used to route merchant convoys, which reported noon positions, courses and destinations every day.',
        'The codebreaking units at Pearl Harbor and Melbourne passed the positions to the submarine commands, which radioed them to boats already at sea. ' +
        'By 1944 many of the war\'s big sinkings began with an ULTRA message telling a skipper where a convoy would be the next morning.',
        'ULTRA was guarded fiercely. Boats were never told where the information came from, and a sinking had to look like luck. It stayed secret for thirty years, which is one reason the submarine war was so little understood afterwards.'
      ],
      game: 'Each week the ULTRA roll [7.0] may mark OpAreas where the intercepts point. A boat there searches with a bonus. Some War Events take the roll away or double it [5.0].',
      sources: ['blair', 'kuenne'] },
    { id: 'y1942', title: 'Why 1942 went badly',
      paras: [
        'Pearl Harbor and the Philippines put the Asiatic Fleet\'s submarines at Manila on the front line with nothing behind them. Within three months they had lost Manila, then Surabaya, and fell back 2,000 miles to Australia. Every patrol began with weeks of transit.',
        'Peacetime doctrine had taught skippers that aircraft would find any boat on the surface, so they attacked submerged, by day and by sonar, from long range. ' +
        'It was cautious and it rarely worked. In 1942 about a third of the skippers were relieved for "lack of aggressiveness"; many were simply older men trained for a different war.',
        'The boats were also spent on other jobs: scouting for the battle fleet, carrying supplies and gold out of Corregidor, standing guard off Midway, landing coast-watchers. And every attack was made with the faulty torpedo.',
        'So 1942 cost the Japanese only about 180 ships and 725,000 tons, far less than they could build, and the tide did not turn until late 1943.'
      ],
      game: 'The Rising Sun [31.2] is 1942 and is the hardest campaign in the book. The Mk-XIV starts at −2, most Endurance rolls send a boat home within a week, and bases fall under you. Career Longevity [31.12] relieves you if you sink much less than history did. Harsh results in this campaign are the history, not a bug.',
      sources: ['blair', 'janac', 'book'] },
    { id: 'comsubpac', title: 'ComSubPac\'s decisions',
      paras: [
        'The submarine war was run from ashore by three commands: Pearl Harbor (ComSubPac, Lockwood from February 1943), Fremantle and Brisbane in Australia. ' +
        'They chose each boat\'s area, balanced patrols against refits, and decided which targets mattered.',
        'The big decisions were strategic. Early on, boats were held back to guard against the Japanese fleet; later they went where the shipping was. ' +
        'From 1944 tankers came first: by 1945 almost no oil was reaching Japan. Forward bases at Midway, Majuro, Saipan and Guam cut the long transits. ' +
        'Coordinated wolfpacks, three boats hunting together, started in late 1943 and became standard. Late in the war boats also stood lifeguard duty for the B-29 crews.',
        'Brien Miller\'s designer\'s notes argue that the victory was won by exactly this: not by lone heroes but by commanders who ran a relentless, calculated rotation of patrols.'
      ],
      game: 'This is your job on the Fleet board: where each boat goes, when it comes home, which fights you take yourself. Wolfpacks [24.0] open in October 1943; tenders [21.0] move the war forward.',
      sources: ['blair', 'book'] },
    { id: 'model', title: 'How the game models it',
      paras: [
        'Silent War is a solitaire system. Its design goal, in the designer\'s words, was a model that gives historical results when it is fed historical choices.',
        'An OpArea\'s Area Activity Chart [12.0] says how busy its shipping lanes are in each War Period. A search turns that into a contact [13.0]. ' +
        'The War Mix [3.1] fills four cups with the Japanese ships of the period, so what you meet changes as the war goes on. ' +
        'The attack and counterattack tables [14.0] turn a class\'s ratings, the skipper, the torpedo and the escorts into dice.',
        'At campaign scale the totals behave like the war: slow and costly in 1942 and 1943, with the targets thinning out by 1945. The History tracker on the campaign report plots your war against the real one.'
      ],
      game: 'Each chapter above points at the rules that carry it. The Rules button opens the full rulebook at any citation.',
      sources: ['book', 'kuenne'] }
  ];

  root.SWPrimer = {
    chapters: CHAPTERS,
    sources: SOURCES,
    chapter: function (id) { return CHAPTERS.filter(function (c) { return c.id === id; })[0] || CHAPTERS[0]; },
    /* The historical totals at the end of month (y, m): the campaign data's
     * off-screen fleet curve (JANAC, smoothed), summed from December 1941.
     * Tonnage in thousands. One source, so the tracker and the career's war
     * panel never disagree. */
    at: function (y, m) {
      var F = (root.SWCampaignData || (typeof require === 'function' ? require('./sw_campaign.js').SWCampaignData : {})).fleet || {};
      var out = { tons: 0, ships: 0, lost: 0 };
      Object.keys(F).forEach(function (yy) {
        for (var k = 0; k < 12; k++) {
          if (+yy * 12 + k > y * 12 + m) break;
          out.tons += F[yy].tons[k]; out.ships += F[yy].ships[k]; out.lost += F[yy].lost[k];
        }
      });
      return out;
    }
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
