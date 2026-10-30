/* sw_campaign.js — the campaign layer's data (Phase 6). PURE DATA.
 *
 * Sources, and how each was read:
 *   Base displays (repair numbers, capacity) — read off SW_map_final-50.png, the
 *     five Base Display panels on the right edge of the map [10.0].
 *   Base and SMZ links                     — read off the map art: the pale band
 *     from each base anchor to its OpArea(s), and the pale arrowhead(s) on each
 *     SMZ bubble [20.1]. Rendered and read one by one on 2026-09-23. Links marked
 *     `uncertain` were the least clear on the art.
 *   War Event Tables                       — rulebook pp. 22-26 (RULES.md §[5.0]
 *     WAR EVENT TABLES). Every conditional ("if rolled again", "if X has not
 *     occurred", date tests, one-time) is encoded here as data, not as code.
 *   Careers                                — Spanish scenario book [32.1x], pp. 17-20,
 *     the Patrol Games' stat blocks (translation and flags in docs/12_scenario_book_en.md).
 *   Withdraw / Return                      — Spanish scenario book [31.01], pp. 2-6,
 *     the Master Submarine Reinforcement list [8.0C-D].
 *   Fleet curve                            — a design call (docs/11_phase6_campaign_brief.md):
 *     US submarine sinkings per month after JANAC (1947), smoothed, so the
 *     off-screen fleet moves the war at roughly its historical pace.
 * Tonnage is in thousands, as everywhere in the engine.
 */
(function (root) {
  'use strict';

  /* [21.0] The five major bases. `links` = the OpAreas joined to the base by a
   * pale band (transit only [12.2]); `repair` = the numbers printed in Repair
   * Boxes 3, 2, 1 [10.0]; `capacity` = "SUBS MAX" [10.1]. Manila's panel prints
   * two sets: Manila 1/3/5 (6 subs) and, once re-activated as Subic Bay, 2/4/6
   * (9 subs). */
  var BASES = {
    pearl:        { name: 'Pearl Harbor', links: ['hawaiian', 'transfer_route'], repair: { 3: 4, 2: 6, 1: 8 }, capacity: 16 },
    brisbane:     { name: 'Brisbane',     links: ['coral_sea'],                  repair: { 3: 2, 2: 4, 1: 6 }, capacity: 16 },
    fremantle:    { name: 'Fremantle',    links: ['java_sea', 'banda_sea'],      repair: { 3: 3, 2: 5, 1: 7 }, capacity: 20 },
    dutch_harbor: { name: 'Dutch Harbor', links: ['aleutians'],                  repair: { 3: 1, 2: 3, 1: 5 }, capacity: 6 },
    manila:       { name: 'Manila',       links: ['scs1', 'n_phil_sea'],         repair: { 3: 1, 2: 3, 1: 5 }, capacity: 6,
                    subic: { name: 'Subic Bay', repair: { 3: 2, 2: 4, 1: 6 }, capacity: 9 },
                    uncertain: ['n_phil_sea'] }
  };

  /* [21.1] Forward bases: a Submarine Tender in an SMZ (Phase 7). Entered and
   * left through the SMZ's own links at no cost to Speed [15.1 note]; no +2
   * on the Transit Event check going there [21.11]. Wake is East Wind Early only. */
  var FORWARD_BASES = {
    surabaya:    { name: 'Surabaya' },
    midway:      { name: 'Midway' },
    majuro:      { name: 'Majuro' },
    mios_woendi: { name: 'Mios Woendi' },
    saipan:      { name: 'Saipan' },
    guam:        { name: 'Guam' },
    /* East Wind Early only [31.6]: tender Holland at Wake (event 6), Canopus at Davao (event 8) */
    wake:        { name: 'Wake', eastWind: true },
    davao_leyte: { name: 'Davao', eastWind: true }
  };

  /* [21.2] The Submarine Tenders, read off the Submarine Tender display
   * (Source/Charts/page_065): deployment date (month index 0-11, null = war
   * start) and support capacity, the most boats in its Broom, Ship Side and
   * Ready for Sea boxes at once [21.22]. */
  var TENDERS = [
    { id: 'holland',  name: 'Holland',  from: null,              capacity: 4 },
    { id: 'canopus',  name: 'Canopus',  from: null,              capacity: 4 },
    { id: 'fulton',   name: 'Fulton',   from: null,              capacity: 6 },
    { id: 'sperry',   name: 'Sperry',   from: { y: 1942, m: 7 }, capacity: 6 },
    { id: 'bushnell', name: 'Bushnell', from: { y: 1943, m: 3 }, capacity: 6 },
    { id: 'orion',    name: 'Orion',    from: { y: 1943, m: 9 }, capacity: 6 },
    { id: 'proteus',  name: 'Proteus',  from: { y: 1944, m: 2 }, capacity: 6 },
    { id: 'gilmore',  name: 'Gilmore',  from: { y: 1944, m: 8 }, capacity: 6 },
    /* Dutch tenders that mark Surabaya active, never drawn for a forward
     * base: Zuiderkruis [33.14], Pelikaan (East Wind Early, event 9). */
    { id: 'zuiderkruis', name: 'Zuiderkruis', from: null, capacity: 12, dutch: true },
    { id: 'pelikaan',    name: 'Pelikaan',    from: null, capacity: 12, dutch: true }
  ];

  /* [20.1] Each SMZ may only be entered from the OpArea(s) its arrowhead(s)
   * point at. Surabaya is a tender base [21.1] that War Events also use as a
   * mission zone, entered from the Java Sea. */
  var SMZ_LINKS = {
    inland_sea:  ['empire_pacific', 'east_china_sea'],
    okinawa:     ['east_china_sea'],
    formosa:     ['east_china_sea', 'scs1'],
    saipan:      ['marianas'],
    midway:      ['north_pacific'],
    wake:        ['marshalls'],
    lingayen:    ['scs1'],
    guam:        ['n_phil_sea', 'marianas'],
    davao_leyte: ['s_phil_sea'],
    palau:       ['s_phil_sea', 'bismarck_sea'],
    truk:        ['carolines'],
    majuro:      ['marshalls'],
    mios_woendi: ['s_phil_sea'],
    molucca:     ['banda_sea'],
    makassar:    ['java_sea'],
    guadalcanal: ['solomons'],
    surabaya:    ['java_sea']
  };
  var SMZ_UNCERTAIN = ['palau', 'mios_woendi', 'lingayen'];

  /* ---- [5.0] War Event Tables ----
   * type: 'ultra2'   roll twice on the ULTRA table [7.3]
   *       'noultra'  no ULTRA roll this turn
   *       'mission'  a Special Mission: `smz` and/or `areas` are where the boats
   *                  go; `contacts` 'TF' | 'C2TF' | 'none' (no attacks may be made)
   *       'relegate' Relegation to Training Duty
   *       'political' only TF contacts, everywhere except the EMPIRE and CHINA groups
   *       'base'     a base or tender change and nothing else
   *       'none'     No Event
   * Conditionals, applied in this order by sw_war.resolveEvent:
   *   insteadUnless: id  — "If <id> has not occurred, conduct that Event instead"
   *   notBefore / beforeUse — the date test; before it, conduct `beforeUse`
   *   byYear             — { 1944: id, 1945: id } picks by year
   *   again: def         — "If this Event is rolled a second time, conduct ..."
   *   oneTime + after    — "one time only"; later rolls conduct `after` (default No Event)
   * effects: activate / deactivate a base, tender (a forward base: Phase 7),
   *   relegateSBoats, piersideTo (base -> OpArea, patrol side up), subic. */
  var NONE = { id: 'none', type: 'none', name: 'No Event' };
  var ULTRA2 = function (id) { return { id: id, type: 'ultra2', name: 'Roll twice on the ULTRA table' }; };
  var NOULTRA = function (id) { return { id: id, type: 'noultra', name: 'No roll on the ULTRA table this turn' }; };
  function relegate(id, first, exemptAttack, lostAt) {
    return { id: id, type: 'relegate', name: 'Relegation to Training Duty', count: 3, first: first,
             exemptAttack: exemptAttack, fewerAtLost: lostAt,
             text: 'Remove three submarines from play (at sea, at a base or under repair); not counted as sunk. ' +
                   (first.length ? 'The first removed must be ' + first.join(', ') + ' if still in play. ' : '') +
                   'Boats with attack ' + exemptAttack + '+ need not be removed; only two if Subs Lost is ' + lostAt + '+.' };
  }

  var EVENTS = {
    W1: [
      { id: 'w1_luzon', type: 'mission', name: 'Special Mission: Fall of Luzon', smz: ['davao_leyte'], count: 3, contacts: 'none',
        text: 'Three submarines move to Davao to evacuate Allied personnel and the Filipino gold reserves. No attacks. Manila falls; Fremantle becomes operational; tender Holland at Surabaya.',
        effects: [{ deactivate: 'manila', evacuateTo: 'fremantle', scuttleRepair: true }, { activate: 'fremantle' }, { tender: 'surabaya' }],
        oneTime: true, again: { id: 'w1_corregidor', type: 'mission', name: 'Special Mission: Run to Corregidor',
          smz: ['davao_leyte'], count: 2, contacts: 'none', text: 'Two submarines move to Davao delivering supplies and evacuating VIPs. No attacks.' } },
      { id: 'w1_dei', type: 'mission', name: 'Special Mission: Fall of Dutch East Indies', insteadUnless: 'w1_luzon', smz: ['surabaya'], count: 6, contacts: 'none',
        text: 'Six submarines move to Surabaya to evacuate Allied personnel. No attacks. Surabaya is abandoned; Brisbane becomes operational.',
        effects: [{ tenderRemoved: 'surabaya' }, { activate: 'brisbane' }],
        oneTime: true, after: 'w1_barrier' },
      { id: 'w1_barrier', type: 'mission', name: 'Special Mission: Barrier mission in the East Indies Straits', smz: ['makassar', 'molucca'], count: 8, contacts: 'C2TF',
        text: 'Deploy eight submarines to the Makassar and Molucca Straits. Only C2 and TF contacts are used.' },
      ULTRA2('w1_u3'),
      NOULTRA('w1_n4'),
      { id: 'w1_bear', type: 'mission', name: 'The Hunt for Wounded Bear', areas: ['coral_sea', 'bismarck_sea', 'carolines'], count: 12, contacts: 'TF', oneTime: true,
        text: 'The Battle of the Coral Sea has occurred. Twelve submarines deploy to the Coral Sea, Bismarck Sea and/or Carolines to search for the damaged carrier Shokaku. Only TF results count there.' },
      { id: 'w1_aleutians', type: 'mission', name: 'Aleutians Campaign Opens', areas: ['aleutians'], count: 8, contacts: null, oneTime: true,
        text: 'Eight submarines deploy to the Aleutians. Dutch Harbor becomes operational; eight boats are designated to base there.',
        effects: [{ activate: 'dutch_harbor' }] },
      NOULTRA('w1_n7'),
      ULTRA2('w1_u8'),
      { id: 'w1_midway', type: 'mission', name: 'The Battle of Midway', insteadUnless: 'w1_bear', smz: ['midway'], count: 11, contacts: 'TF', oneTime: true,
        text: 'Eleven submarines deploy to Midway. Boats pierside at Pearl Harbor go to the Hawaiian Islands, patrol side up. Only TF results are used there and at Midway.',
        effects: [{ piersideTo: { pearl: 'hawaiian', dutch_harbor: 'aleutians' } }], tfAreas: ['hawaiian', 'aleutians'] }
    ],
    W2: [
      ULTRA2('w2_u0'),
      NOULTRA('w2_n1'),
      relegate('w2_relegate', ['USS Cachalot', 'USS Cuttlefish'], 4, 20),
      ULTRA2('w2_u3'),
      NOULTRA('w2_n4'),
      { id: 'w2_truk', type: 'mission', name: 'Special Mission: Blockade of Truk', smz: ['truk'], count: 15, contacts: 'C2TF',
        text: 'Deploy fifteen submarines to Truk. Only C2 and TF contacts are used.' },
      { id: 'w2_mines', type: 'mission', name: 'Torpedo Shortage', smz: ['formosa', 'lingayen', 'davao_leyte', 'makassar', 'molucca', 'mios_woendi', 'surabaya'],
        count: 4, contacts: 'none', notClasses: ['s1', 's3'],
        text: 'Four submarines are sent on inshore minelaying missions instead, to Formosa, Lingayen Gulf, Davao, Makassar Strait, Molucca Strait, Mios Woendi or Surabaya. No S1 or S3 classes. No attacks.' },
      { id: 'w2_political', type: 'political', name: 'Political Pressure',
        text: 'Submarines are ordered to concentrate on warships: for all OpAreas except Empire and China, only TF contacts are used.' },
      { id: 'w2_midway_base', type: 'base', name: 'Midway Base Operational', oneTime: true,
        text: 'Place a Submarine Tender on Midway in the War Progress Phase.', effects: [{ tender: 'midway' }] },
      { id: 'w2_solomons', type: 'mission', name: 'Special Mission: Solomons Campaign', smz: ['guadalcanal'], count: 12, contacts: 'TF',
        text: 'Deploy twelve submarines to Guadalcanal. Only TF contacts are used.' }
    ],
    W3: [
      { id: 'w3_aleutians_end', type: 'mission', name: 'Special Mission: End of Aleutians Campaign', notBefore: { y: 1943, m: 9 }, beforeUse: 'w3_relegate',
        areas: ['aleutians', 'kurile'], count: 12, contacts: 'TF', oneTime: true,
        text: 'Deploy twelve submarines to the Aleutians and Kuriles. Only TF contacts are used. Dutch Harbor then closes and all remaining S-boats (S1 and S3 classes) are relegated to training duty.',
        effects: [{ deactivate: 'dutch_harbor' }, { relegateSBoats: true }] },
      NOULTRA('w3_n1'),
      relegate('w3_relegate', ['USS Argonaut', 'USS Narwhal', 'USS Nautilus'], 6, 50),
      { id: 'w3_truk', type: 'mission', name: 'Special Mission: Airstrike on Truk', smz: ['truk'], count: 10, contacts: 'C2TF',
        text: 'Deploy ten submarines to Truk. Only C2 and TF contacts are used.' },
      { id: 'w3_marshalls', type: 'mission', name: 'Special Mission: Invasion of the Marshalls', smz: ['majuro'], count: 12, contacts: 'TF', oneTime: true,
        text: 'Deploy twelve submarines to Majuro. Only TF contacts are used. A Submarine Tender goes to Majuro.', effects: [{ tender: 'majuro' }] },
      { id: 'w3_palau', type: 'mission', name: 'Special Mission: Airstrike on Palau', smz: ['palau'], count: 12, contacts: 'TF',
        text: 'Deploy twelve submarines to Palau. Only TF contacts are used.' },
      ULTRA2('w3_u6'),
      { id: 'w3_surabaya', type: 'mission', name: 'Special Mission: Airstrike on Surabaya', smz: ['surabaya'], count: 10, contacts: 'C2TF',
        text: 'Deploy ten submarines to Surabaya. Only C2 and TF contacts are used.' },
      { id: 'w3_biak', type: 'mission', name: 'Special Mission: Invasion of Biak', smz: ['mios_woendi'], count: 10, contacts: 'TF', oneTime: true,
        text: 'Deploy ten submarines to Mios Woendi. Only TF contacts are used. A Submarine Tender goes to Mios Woendi.', effects: [{ tender: 'mios_woendi' }] },
      { id: 'w3_saipan', type: 'mission', name: 'Special Mission: Invasion of Saipan', notBefore: { y: 1944, m: 3 }, beforeUse: 'w3_u6',
        smz: ['saipan'], areas: ['bonins'], count: 12, contacts: 'TF', oneTime: true, after: 'none',
        text: 'Deploy six submarines to Saipan and six to the Bonins. Only TF contacts are used there. A Submarine Tender goes to Saipan.',
        effects: [{ tender: 'saipan' }],
        again: { id: 'w3_guam', type: 'mission', name: 'Special Mission: Invasion of Guam', smz: ['guam'], areas: ['bonins'], count: 12, contacts: 'TF', oneTime: true,
                 text: 'Deploy six submarines to Guam and six to the Bonins. Only TF contacts are used. A Submarine Tender goes to Guam.', effects: [{ tender: 'guam' }] } }
    ],
    /* East Wind Early [31.6]: the rulebook's own table (RULES.md, "War
     * Events for East Wind Early Campaign"). 'ultraline': roll once on the
     * ULTRA table on the named line; ULTRA is rolled only when an event says so [31.61 B]. */
    Y32: [
      { id: 'y0_luzon', type: 'mission', name: 'Special Mission: Japanese landing on Luzon', smz: ['lingayen'], count: 4, contacts: 'C2TF',
        text: 'Four submarines move to Lingayen Gulf to attack the landing forces. Only C2 and TF contacts are used.',
        again: { id: 'y0_ultra', type: 'ultraline', line: 'W4', name: 'Roll on the ULTRA table (W4 line)' } },
      { id: 'y1_guam', type: 'mission', name: 'Special Mission: Japanese invasion of Guam', smz: ['guam'], count: 4, contacts: 'C2TF',
        text: 'Four submarines move to Guam to attack the landing forces. Only C2 and TF contacts are used.',
        again: { id: 'y1_ultra', type: 'ultraline', line: 'W3', name: 'Roll on the ULTRA table (W3 line)' } },
      { id: 'y2_formosa', type: 'mission', name: 'Special Mission: Interdiction of Japanese support forces', smz: ['formosa'], count: 2, contacts: 'C2TF', hold: true,
        text: 'Two submarines move to Formosa and each stays until Spotted, Damaged or sent home (RTB). Only C2 and TF contacts are used.' },
      { id: 'y3_okinawa', type: 'mission', name: 'Special Mission: Bombardment of port facilities at Okinawa', smz: ['okinawa'], count: 2, contacts: 'TF',
        prefer: ['USS Leviathon', 'USS Argonaut', 'USS Narwhal', 'USS Nautilus', 'USS Barracuda', 'USS Bass', 'USS Bonita'],
        text: 'Two submarines move to Okinawa; the big-gun boats (Leviathan, Argonaut, Narwhal, Nautilus, Barracuda, Bass, Bonita) go first if available. Only TF contacts are used.',
        again: { id: 'y3_ultra', type: 'ultraline', line: 'W3', name: 'Roll on the ULTRA table (W3 line)' } },
      { id: 'y4_ultra', type: 'ultraline', line: 'W4', name: 'Roll on the ULTRA table this turn (W4 line)' },
      { id: 'y5_ultra', type: 'ultraline', line: 'W3', name: 'Roll on the ULTRA table this turn (W3 line)' },
      { id: 'y6_wake', type: 'base', name: 'Advance base set up at Wake', oneTime: true,
        text: 'Place submarine tender Holland at Wake Island.', effects: [{ tender: 'wake', tenderId: 'holland' }],
        again: { id: 'y6_ultra', type: 'ultraline', line: 'W3', name: 'Roll on the ULTRA table (W3 line)' } },
      { id: 'y7_ultra', type: 'ultraline', line: 'W4', name: 'Roll on the ULTRA table this turn (W4 line)' },
      { id: 'y8_manila', type: 'base', name: 'Japanese Army forces approach Manila', insteadUnless: 'y0_luzon', notBefore: { y: 1932, m: 9 }, beforeUse: 'y7_ultra', oneTime: true,
        text: 'Submarines withdraw to Mindanao: tender Canopus at Davao with every undamaged boat in port at Manila; damaged boats at Manila are scuttled (not counted as lost); damaged boats at sea make for Pearl Harbor.',
        effects: [{ tenderNow: 'davao_leyte', tenderId: 'canopus' }, { deactivate: 'manila', moveTo: 'davao_leyte', scuttleDamaged: true, damagedRtb: 'pearl' }],
        again: { id: 'y8_ultra', type: 'ultraline', line: 'W3', name: 'Roll on the ULTRA table (W3 line)' } },
      { id: 'y9_dutch', type: 'base', name: 'Dutch Intervention', oneTime: true,
        text: 'The Dutch send a submarine division: tender Pelikaan at Surabaya; K-VIII, K-X, K-XI and K-XII in its Broom Box. They use the American torpedo value.',
        effects: [{ dutchIntervention: ['K-VIII', 'K-X', 'K-XI', 'K-XII'] }],
        again: { id: 'y9_ultra', type: 'ultraline', line: 'W4', name: 'Roll on the ULTRA table (W4 line)' } }
    ],
    W4: [
      { id: 'w4_okinawa', type: 'mission', name: 'Special Mission: Invasion of Okinawa and the Hunt for Iron Maiden', byYear: { 1944: 'w4_ryukyus' },
        smz: ['okinawa'], count: 11, contacts: 'TF', oneTime: true, after: 'w4_relegate',
        text: 'Deploy eleven submarines to Okinawa to cover the invasion and intercept the Yamato force. Only TF contacts are used.' },
      { id: 'w4_leyte', type: 'mission', name: 'Special Mission: Invasion of Leyte', smz: ['davao_leyte', 'formosa'], count: 15, contacts: 'TF',
        text: 'Deploy fifteen submarines to Davao and/or Formosa. Only TF contacts are used.',
        again: { id: 'w4_liberation', type: 'mission', name: 'Special Mission: Liberation of the Philippines', smz: ['lingayen', 'formosa'], count: 20, contacts: 'TF', oneTime: true,
                 text: 'Deploy twenty submarines to Lingayen Gulf and/or Formosa. Only TF contacts are used. Subic Bay becomes operational.',
                 effects: [{ subic: true }] } },
      { id: 'w4_ryukyus', type: 'mission', name: 'Special Mission: Airstrike on Ryukyus', smz: ['okinawa'], count: 8, contacts: 'C2TF',
        text: 'Deploy eight submarines to Okinawa. Only C2 and TF contacts are used.' },
      ULTRA2('w4_u3'),
      NOULTRA('w4_n4'),
      { id: 'w4_formosa', type: 'mission', name: 'Special Mission: Airstrike on Formosa', smz: ['formosa'], count: 12, contacts: 'C2TF',
        text: 'Deploy twelve submarines to Formosa. Only C2 and TF contacts are used.' },
      relegate('w4_relegate', [], 7, 70),
      { id: 'w4_b29', type: 'mission', name: 'Special Mission: Support B-29 raids on Japan', smz: ['inland_sea'], count: 6, contacts: 'none',
        text: 'Deploy six submarines to the Inland Sea to rescue downed pilots. No attacks may be made.' },
      { id: 'w4_ise', type: 'mission', name: 'Special Mission: Pursuit of Ise & Hyuga', smz: ['formosa'], count: 10, contacts: 'TF', oneTime: true, after: 'w4_b29',
        text: 'Deploy ten submarines to Formosa to intercept the hybrid carrier force. Only TF contacts are used.' },
      { id: 'w4_iwo', type: 'mission', name: 'Special Mission: Invasion of Iwo Jima', smz: ['inland_sea'], areas: ['bonins'], count: 5, contacts: 'TF',
        text: 'Deploy five submarines to the Inland Sea. Only TF contacts are used for subs in the Bonins and Inland Sea.',
        again: { id: 'w4_guam2', type: 'base', name: 'A second Submarine Tender in Guam', oneTime: true,
                 text: 'Place a second Submarine Tender in Guam.', effects: [{ tender: 'guam' }] } }
    ]
  };

  /* The period boxes' "if certain Events have not been rolled" notes, applied
   * when the War Period advances into that period [17.0]. */
  var PERIOD_START = {
    W2: { text: 'Manila and Surabaya are no longer operational; Fremantle, Brisbane and Dutch Harbor are; the Aleutian Campaign opens.',
          effects: [{ deactivate: 'manila', evacuateTo: 'fremantle' }, { activate: 'fremantle' }, { activate: 'brisbane' }, { activate: 'dutch_harbor' }],
          marks: ['w1_luzon', 'w1_dei', 'w1_aleutians'] },
    W3: { text: 'Midway becomes operational; Cachalot and Cuttlefish are relegated to training duty.',
          effects: [{ tender: 'midway' }, { relegateNamed: ['USS Cachalot', 'USS Cuttlefish'] }], marks: ['w2_midway_base'] },
    W4: { text: 'The Aleutians Campaign is ended and Dutch Harbor closed; Mios Woendi, Majuro, Saipan and Guam become operational; all S-boats and Argonaut, Narwhal, Nautilus are relegated.',
          effects: [{ deactivate: 'dutch_harbor' }, { tender: 'mios_woendi' }, { tender: 'majuro' }, { tender: 'saipan' }, { tender: 'guam' },
                    { relegateSBoats: true }, { relegateNamed: ['USS Argonaut', 'USS Narwhal', 'USS Nautilus'] }],
          marks: ['w3_aleutians_end', 'w3_marshalls', 'w3_biak', 'w3_saipan'] }
  };

  /* Which bases are open at a date, for a career that starts mid-war: the
   * period-start notes above applied in order. */
  var BASES_AT_PERIOD = {
    W1: ['pearl', 'manila'],
    W2: ['pearl', 'fremantle', 'brisbane', 'dutch_harbor'],
    W3: ['pearl', 'fremantle', 'brisbane', 'dutch_harbor'],
    W4: ['pearl', 'fremantle', 'brisbane']
  };

  /* [17.1B] The War Period Transition Table read as three blocks: the months
   * whose numbers move the war into `to`, and the month of the automatic
   * advance [17.2] once all of them have been tried. Month index 0-11. */
  var TRANSITIONS = [
    { from: 'W1', to: 'W2', first: { y: 1942, m: 2 },  last: { y: 1942, m: 9 },  auto: { y: 1942, m: 10 } },
    { from: 'W2', to: 'W3', first: { y: 1942, m: 11 }, last: { y: 1943, m: 6 },  auto: { y: 1943, m: 7 } },
    { from: 'W3', to: 'W4', first: { y: 1944, m: 5 },  last: { y: 1945, m: 0 },  auto: { y: 1945, m: 1 } }
  ];

  /* ---- Careers: the Patrol Games [32.1x] as starting points ----
   * `start` = month of departure (index 0-11); the boat begins that month's
   * week 1 in the base's Ready for Sea box. `record` = the historical patrol
   * the book asks you to beat [32.1]. */
  var CAREERS = [
    { id: 's38', boat: 'S38', label: 'USS S-38 (SS-143)', cls: 'S-1', skipper: 'Lt. Henry G. Munson', patrol: '7th patrol',
      base: 'brisbane', start: { y: 1942, m: 6 }, warPeriod: 'W2', torpedo: -1, destination: 'solomons',
      record: { ships: 1, tons: 5.6, weeks: 3 }, rule: '32.11', page: 17,
      story: 'An old S-boat out of Brisbane. On 8 August 1942 Munson slipped under an escort off Guadalcanal and sank the Meiyo Maru, the relief force\'s headquarters ship.' },
    { id: 'sculpin', boat: 'USS Sculpin', label: 'USS Sculpin (SS-191)', cls: 'New S-2', skipper: 'Lucius H. Chappell', patrol: '5th patrol',
      base: 'brisbane', start: { y: 1942, m: 8 }, warPeriod: 'W2', torpedo: -1, destination: 'solomons',
      record: { ships: 2, tons: 6.6, weeks: 7 }, rule: '32.12', page: 18,
      story: 'Chappell had watched torpedo after torpedo run under its target or fail to explode, and was reprimanded for saying so. Off New Britain he sank two Marus and damaged the cruiser Yura.' },
    { id: 'wahoo', boat: 'USS Wahoo', label: 'USS Wahoo (SS-238)', cls: 'Gato', skipper: 'Dudley W. "Mush" Morton', patrol: '4th patrol',
      base: 'pearl', start: { y: 1943, m: 1 }, warPeriod: 'W2', torpedo: -1, destination: 'east_china_sea',
      record: { ships: 9, tons: 20.0, weeks: 6 }, rule: '32.13', page: 18,
      story: 'Morton swept the shallow northern Yellow Sea with torpedoes and the deck gun; intercepts showed the Japanese thought a wolfpack had arrived. Nine ships, a record at the time.' },
    { id: 'harder', boat: 'USS Harder', label: 'USS Harder (SS-257)', cls: 'Gato', skipper: 'Samuel D. Dealey', patrol: '2nd patrol',
      base: 'pearl', start: { y: 1943, m: 7 }, warPeriod: 'W3', torpedo: 0, destination: 'empire_pacific',
      record: { ships: 5, tons: 15.2, weeks: 6 }, rule: '32.14', page: 18,
      story: 'Nine separate attacks off Honshu. Dealey became famous for "down the throat" shots at charging destroyers; he was lost with Harder in August 1944.' },
    { id: 'tang', boat: 'USS Tang', label: 'USS Tang (SS-306)', cls: 'Balao', skipper: 'Richard H. O\'Kane', patrol: '3rd patrol',
      base: 'pearl', start: { y: 1944, m: 4 }, warPeriod: 'W3', torpedo: 1, destination: 'east_china_sea',
      record: { ships: 10, tons: 39.1, weeks: 5 }, rule: '32.15', page: 19,
      story: 'By any measure the finest patrol ever made by an American submarine: ten ships in the East China Sea. (Tang was lost on a later patrol, off Formosa, to her own circular-running torpedo.)' },
    { id: 'rasher', boat: 'USS Rasher', label: 'USS Rasher (SS-269)', cls: 'Gato', skipper: 'Henry G. Munson', patrol: '5th patrol',
      base: 'fremantle', start: { y: 1944, m: 6 }, warPeriod: 'W3', torpedo: 1, destination: 'pearl',
      record: { ships: 5, tons: 52.6, weeks: 6 }, rule: '32.16', page: 19,
      story: 'On a pitch-black rainy night Munson hit convoy HI-71 and its escort carrier Taiyo, loaded with aviation fuel. He finished the night with a Re-Attack that emptied his tubes: five ships, 52,600 tons. The patrol ended at Pearl Harbor.' },
    { id: 'flasher', boat: 'USS Flasher', label: 'USS Flasher (SS-249)', cls: 'Gato', skipper: 'George W. Grider', patrol: '5th patrol',
      base: 'fremantle', start: { y: 1944, m: 10 }, warPeriod: 'W4', torpedo: 1, destination: 'scs1',
      record: { ships: 6, tons: 42.8, weeks: 7 }, rule: '32.17', page: 19,
      story: 'Grider\'s first command patrol, west of Mindoro: two destroyers and a tanker in the rain, then three more tankers two weeks later. The third best patrol of the war.' },
    { id: 'tirante', boat: 'USS Tirante', label: 'USS Tirante (SS-420)', cls: 'Tench', skipper: 'George L. Street III', patrol: '1st patrol',
      base: 'saipan', start: { y: 1945, m: 2 }, warPeriod: 'W4', torpedo: 2, destination: 'east_china_sea',
      record: { ships: 6, tons: 12.6, weeks: 7 }, rule: '32.18', page: 20,
      story: 'Targets were scarce by 1945. Street took his new boat into Cheju Do harbour at night in 60 feet of water: a transport and two escorts sunk, and the Medal of Honor.' },
    { id: 'kxiv', boat: 'K-XIV', label: 'HNLMS K-XIV', cls: 'K-XIV', skipper: 'Lt. Carel A. J. van Well Groeneveld', patrol: '2nd patrol',
      base: 'surabaya', start: { y: 1941, m: 11 }, warPeriod: 'W1', torpedo: -1, destination: 'scs2', nation: 'NL',
      record: { ships: 2, tons: 14.0, weeks: 2 }, rule: '33.2', page: 22, patrolOnly: true, optional: true,
      story: 'Guided by a Dutch flying boat, van Well Groeneveld surfaced at night off Sarawak among the Japanese landing ships: two transports sunk, a third put out of action for nine months. An optional Patrol Game [33.2].' },
    { id: 'momsen', boat: 'USS Cero', label: 'The First Wolfpack (USS Cero)', cls: 'Gato', skipper: 'Charles B. "Swede" Momsen', patrol: 'the first wolfpack',
      base: 'pearl', start: { y: 1943, m: 8 }, warPeriod: 'W3', torpedo: 0, destination: 'east_china_sea',
      record: { ships: 3, tons: 23.5, weeks: 7 }, rule: '32.19', page: 20, patrolOnly: true,
      pack: ['USS Shad', 'USS Grayback'],
      story: 'The US Navy\'s first wolfpack, under Squadron Commander Momsen flying his flag in Cero, with Shad and Grayback. Coordination at sea proved so hard that Momsen reported packs should be run from ashore, as Doenitz did.' }
  ];

  /* [8.0C-D] Master Submarine Reinforcement list [31.01]: withdrawals for
   * overhaul on the West Coast, and returns. Month keys are 'YYYY-MM' (1-12). */
  var WITHDRAW = {
    '1942-02': ['Dolphin', 'Argonaut', 'Plunger', 'Pompano', 'Tautog'],
    '1942-06': ['Tarpon', 'Perch'],
    '1942-07': ['Porpoise', 'Pike', 'Pollack', 'Shark'],
    '1942-09': ['Pickerel', 'Permit', 'Pompano', 'Narwhal'],
    '1942-10': ['S40', 'S41', 'S42', 'S43', 'S44', 'S45', 'S46', 'S47'],
    '1942-12': ['Salmon', 'Seal', 'Skipjack', 'Seawolf'],
    '1943-01': ['Sturgeon', 'Sargo', 'Saury', 'Sculpin', 'Seadragon', 'Sealion'],
    '1943-02': ['Spearfish', 'Sailfish', 'Snapper'],
    '1943-03': ['Swordfish', 'Searaven'],
    '1943-04': ['Kingfish'],
    '1943-06': ['Grayback', 'Gudgeon', 'Grenadier', 'Gato', 'Wahoo'],
    '1943-07': ['Tautog', 'Gunnel'],
    '1943-08': ['Thresher', 'Triton'],
    '1943-09': ['Gar', 'Grampus', 'Tambor', 'Whale', 'Finback', 'Tunny'],
    '1943-10': ['Grayling', 'Trout', 'Jack', 'Greenling', 'Grouper'],
    '1943-11': ['Stingray', 'Hoe', 'Lapon', 'Paddle', 'Growler', 'Grunion'],
    '1943-12': ['Drum', 'Pargo', 'Harder', 'Mingo', 'Shad', 'Tuna'],
    '1944-01': ['Gurnard'],
    '1944-03': ['Muskallunge', 'Guardfish', 'Albacore', 'Barb', 'Amberjack'],
    '1944-05': ['Trigger', 'Skipjack'],
    '1944-06': ['Halibut', 'Herring', 'Silversides', 'Pogy', 'Kingfish', 'Sargo', 'Spearfish'],
    '1944-07': ['Peto'],
    '1944-08': ['Tinosa', 'Tullibee'],
    '1944-09': ['Pompon', 'Puffer', 'Rasher', 'Scorpion', 'Steelhead', 'Sandlance', 'Tautog'],
    '1944-11': ['Flying Fish'],
    '1944-12': ['Cod', 'Cero', 'Corvina', 'Darter', 'Raton', 'Ray'],
    '1945-01': ['Haddo', 'Redfin', 'Robalo'],
    '1945-02': ['Angler', 'Dace', 'Whale'],
    '1945-03': ['Hake', 'Snook'],
    '1945-04': ['Flasher', 'Flounder'],
    '1945-05': ['Rock', 'Runner', 'Sawfish', 'Scamp', 'Sunfish'],
    '1945-06': ['Bream']
  };

  /* [8.0B] Arrivals, same list [31.01]: new boats, by month and arrival base,
   * into that base's Broom Box. A base not yet active (or fallen) sends them to
   * Pearl Harbor; Brisbane's go to Fremantle if Fremantle is active. */
  var ARRIVE = {
    '1942-01': { pearl: ['Cuttlefish', 'Grayling', 'Tuna'] },
    '1942-02': { dutch_harbor: ['S18', 'S23'], pearl: ['Gar', 'Grampus', 'Grayback', 'Grenadier'] },
    '1942-04': { dutch_harbor: ['S34', 'S35'], brisbane: ['S42', 'S44', 'S47'], pearl: ['Drum', 'Gato', 'Greenling', 'Silversides'] },
    '1942-05': { dutch_harbor: ['S27', 'S28'], pearl: ['Flying Fish', 'Grouper', 'Growler', 'Nautilus', 'Trigger'], brisbane: ['S43', 'S45', 'S46'] },
    '1942-06': { dutch_harbor: ['Grunion', 'Finback'] },
    '1942-07': { dutch_harbor: ['S31', 'S32', 'S33'], pearl: ['Haddock'] },
    '1942-08': { dutch_harbor: ['S30', 'Halibut'], pearl: ['Albacore', 'Guardfish', 'Wahoo'] },
    '1942-09': { pearl: ['Amberjack', 'Kingfish'] },
    '1942-10': { pearl: ['Whale'] },
    '1942-11': { pearl: ['Sunfish'] },
    '1943-01': { brisbane: ['Peto'], pearl: ['Runner', 'Sawfish', 'Tunny'] },
    '1943-03': { pearl: ['Scamp'] },
    '1943-04': { pearl: ['Pogy', 'Scorpion', 'Snook', 'Steelhead'] },
    '1943-05': { pearl: ['Hoe', 'Tinosa'] },
    '1943-06': { pearl: ['Gunnel', 'Gurnard', 'Harder', 'Jack', 'Lapon', 'Mingo'] },
    '1943-07': { brisbane: ['Balao', 'Pompon'], pearl: ['Paddle', 'Tullibee'] },
    '1943-08': { fremantle: ['Billfish', 'Bowfin', 'Puffer'], pearl: ['Pargo', 'Seahorse'] },
    '1943-09': { brisbane: ['Bluefish', 'Bonefish', 'Cisco', 'Rasher'], pearl: ['Barb', 'Cabrilla', 'Cero', 'Muskallunge', 'Shad', 'Skate'] },
    '1943-10': { brisbane: ['Blackfish'], fremantle: ['Capelin', 'Cod', 'Crevalle'], pearl: ['Dace'] },
    '1943-11': { brisbane: ['Raton', 'Ray'], pearl: ['Apogon', 'Aspro', 'Corvina'] },
    '1943-12': { pearl: ['Archerfish', 'Batfish', 'Darter', 'Haddo', 'Hake', 'Herring'] },
    '1944-01': { fremantle: ['Redfin'], pearl: ['Angler', 'Flasher', 'Robalo', 'Tang'] },
    '1944-02': { pearl: ['Burrfish', 'Picuda', 'Rock', 'Sandlance'] },
    '1944-03': { pearl: ['Bang', 'Golet', 'Pampanito', 'Parche'] },
    '1944-04': { brisbane: ['Bashaw', 'Bluegill', 'Flounder'], pearl: ['Gabilan', 'Guavina', 'Perch II', 'Tilefish'] },
    '1944-05': { pearl: ['Flier', 'Guitarro', 'Pilotfish', 'Pintado', 'Pipefish', 'Shark II'] },
    '1944-06': { brisbane: ['Bream'], pearl: ['Cavalla', 'Cobia', 'Hammerhead', 'Piranha', 'Plaice', 'Pomfret', 'Sealion II'] },
    '1944-07': { pearl: ['Barbel', 'Croaker', 'Hardhead', 'Redfish', 'Ronquil', 'Spadefish', 'Sterlet'] },
    '1944-08': { pearl: ['Barbero', 'Baya', 'Becuna', 'Hawkbill', 'Queenfish', 'Razorback', 'Scabbardfish', 'Segundo'] },
    '1944-09': { pearl: ['Bergall', 'Besugo', 'Escolar', 'Icefish', 'Sea Devil', 'Sea Dog', 'Trepang'] },
    '1944-10': { pearl: ['Atule', 'Jallao', 'Kete', 'Sea Cat', 'Sea Fox', 'Blackfin'] },
    '1944-11': { pearl: ['Blenny', 'Caiman', 'Dragonet', 'Sea Owl', 'Sea Poacher', 'Sea Robin', 'Spikefish'] },
    '1944-12': { pearl: ['Blueback', 'Boarfish', 'Charr', 'Devilfish', 'Kraken', 'Spot', 'Threadfin'] },
    '1945-01': { pearl: ['Blower', 'Brill', 'Lagarto', 'Piper', 'Sennet'] },
    '1945-02': { pearl: ['Bugara', 'Chub', 'Lamprey', 'Springer', 'Tench'] },
    '1945-03': { pearl: ['Hackleback', 'Tigrone', 'Tirante', 'Trutta', 'Bullhead'] },
    '1945-04': { pearl: ['Bumper', 'Lionfish', 'Lizardfish', 'Toro', 'Torsk'] },
    '1945-05': { pearl: ['Cabezon', 'Capitaine', 'Carbonero', 'Dentuda', 'Loggerhead', 'Manta', 'Quillback'] },
    '1945-06': { pearl: ['Carp', 'Moray', 'Runner II', 'Thornback', 'Argonaut II'] },
    '1945-07': { pearl: ['Catfish', 'Entemedor', 'Macabi'] },
    '1945-08': { pearl: ['Cutlass', 'Stickleback'] }
  };

  /* Phase 8: the campaigns [31.x]. Order of battle entries: `at` a base (with
   * `box`), an OpArea (`area`) or an SMZ (`smz`, entered from `via`); `rule`
   * the special orders the book gives for the first turns. Names as the list
   * prints them: rosterName() turns them into roster names. */
  var CAMPAIGNS = [
    { id: 'rising_sun', title: 'The Rising Sun', rule: '31.2', page: 7, turns: 51,
      summary: 'December 1941 to December 1942: the shortest campaign and the hardest. Few boats, faulty torpedoes, bases falling, and a hard tonnage target to keep your command.',
      start: { y: 1941, m: 11, w: 2 }, end: { y: 1942, m: 11, w: 4 }, warPeriod: 'W1', torpedo: -2, bases: ['pearl', 'manila'],
      oob: [
        { base: 'manila', box: 'ready', boats: ['Perch', 'Permit', 'Pickerel', 'Pike', 'Porpoise', 'S37', 'S38', 'S39', 'S40', 'S41', 'Sailfish',
          'Salmon', 'Sargo', 'Saury', 'Sculpin', 'Seal', 'Searaven', 'Seawolf', 'Shark', 'Skipjack', 'Snapper', 'Spearfish', 'Stingray',
          'Sturgeon', 'Swordfish', 'Tarpon'] },
        { base: 'manila', box: 'repair1', boats: ['Sealion', 'Seadragon'] },
        { smz: 'lingayen', via: 'scs1', home: 'manila', boats: ['S36'], rule: { noMove: true, tf: true, rtbFirst: true } },
        { base: 'pearl', box: 'ready', boats: ['Dolphin', 'Tautog'] },
        { base: 'pearl', box: 'repair3', boats: ['Narwhal', 'Cachalot'] },
        { area: 'hawaiian', home: 'pearl', boats: ['Gudgeon', 'Plunger', 'Pollack', 'Pompano', 'Thresher'], rule: { noMove: true, tf: true, rtbFirst: true } },
        { smz: 'midway', via: 'north_pacific', home: 'pearl', boats: ['Argonaut', 'Trout'], rule: { tf: true, smzWeeks: 2 } },
        { smz: 'wake', via: 'marshalls', home: 'pearl', boats: ['Tambor', 'Triton'], rule: { tf: true, smzWeeks: 2 } }
      ],
      reinforcementsUntil: '1942-11',
      /* [31.12] Career longevity: after the last week of these months. */
      longevity: [{ y: 1942, m: 1, tons: 90 }, { y: 1942, m: 4, tons: 220 }, { y: 1942, m: 7, tons: 360 }, { y: 1942, m: 10, tons: 620 }],
      /* [31.24] Victory, on tonnage at the end of December 1942. */
      victory: { levels: [{ tons: 800, label: 'Decisive Victory' }, { tons: 780, label: 'Substantial Victory' }, { tons: 750, label: 'Draw' },
                          { tons: 720, label: 'Defeat' }, { tons: 0, label: 'Failure' }],
                 capital: { types: ['CA', 'BB', 'CV'], mods: [[4, 2], [3, 1], [1, 0], [0, -1]], historical: 1 },
                 lost: { atLeast: 12, mod: -1, historical: 7 } } }
  ];
  /* The Vassal roster spells one boat differently from the list (Entemedor). */
  var ROSTER_ALIAS = { Entemedor: 'Etemedor' };
  /* [31.14] victory by the date the war ends (tonnage passes its mark), and
   * the Subs Lost modifiers; [31.34] Campaign 3's own; [31.55] Campaign 5's. */
  var BY_DATE_31_14 = [{ before: { y: 1945, m: 0 }, label: 'Total Victory' }, { before: { y: 1945, m: 3 }, label: 'Decisive Victory' },
                       { before: { y: 1945, m: 6 }, label: 'Improved Victory' }, { before: { y: 1945, m: 8 }, label: 'Historical Victory' },
                       { before: { y: 1945, m: 9 }, label: 'Draw' }, { before: { y: 1946, m: 0 }, label: 'Failure' }];
  var LOST_31_14 = [[20, 2], [40, 1], [60, 0], [80, -1], [9999, -2]];
  var FULL_OOB = CAMPAIGNS[0].oob;
  CAMPAIGNS.push(
    { id: 'full', title: 'The Submarine Campaign against Japan', rule: '31.1', page: 6, turns: 178,
      summary: 'The whole war, December 1941 until Japan is beaten: about 178 weeks. The more you sink, the sooner the war ends.',
      start: { y: 1941, m: 11, w: 2 }, end: { y: 1945, m: 11, w: 4 }, warPeriod: 'W1', torpedo: -2, bases: ['pearl', 'manila'],
      oob: FULL_OOB, reinforcementsUntil: '1945-08',
      longevity: [{ y: 1942, m: 1, tons: 90 }, { y: 1942, m: 4, tons: 220 }, { y: 1942, m: 7, tons: 360 }, { y: 1942, m: 10, tons: 620 },
                  { y: 1943, m: 1, tons: 720 }, { y: 1943, m: 4, tons: 980 }],
      victory: { kind: 'byDate', tons: 5500, table: BY_DATE_31_14, lost: LOST_31_14, historicalLost: 49 } },
    { id: 'tide', title: 'The Turning Tide', rule: '31.3', page: 8,
      summary: 'April 1943 to the transition into War Period 4: the submarine force comes into its own, the torpedo is fixed, and the convoys start to die.',
      start: { y: 1943, m: 3, w: 1 }, end: { y: 1945, m: 11, w: 4 }, warPeriod: 'W3', torpedo: -1, bases: ['pearl', 'fremantle', 'brisbane', 'dutch_harbor'],
      counters: { ships: 233, tons: 977, lost: 12 }, tenders: { midway: 'sperry' }, reinforcementsFrom: '1943-05', reinforcementsUntil: '1945-08',
      oob: [
        { base: 'fremantle', box: 'broom', boats: ['Gar', 'Thresher'] },
        { area: 'n_phil_sea', boats: ['Grayling'] }, { area: 's_phil_sea', boats: ['Tambor'] }, { area: 'scs2', boats: ['Tautog', 'Trout'] },
        { area: 'java_sea', boats: ['Gudgeon', 'Grenadier'] },
        { base: 'brisbane', box: 'broom', boats: ['Albacore', 'Grayback', 'Grouper', 'Growler', 'Peto'] },
        { area: 'solomons', boats: ['Greenling', 'Guardfish', 'Tuna'] }, { area: 'bismarck_sea', boats: ['Haddock', 'Halibut'] },
        { area: 'transfer_route', rtb: 'pearl', boats: ['Gato'] }, { area: 'transfer_route', rtb: 'brisbane', boats: ['S31', 'Drum'] },
        { base: 'pearl', box: 'broom', boats: ['Permit', 'Plunger', 'Pogy', 'Runner', 'Salmon', 'Sawfish', 'Scamp', 'Scorpion', 'Seal', 'Seawolf',
          'Skipjack', 'Snook', 'Steelhead', 'Stingray', 'Sunfish'] },
        { base: 'pearl', box: 'repair3', boats: ['Silversides'] },
        { base: 'midway', box: 'broom', boats: ['Trigger', 'Wahoo*Morton'] },
        { area: 'empire_pacific', boats: ['Flying Fish', 'Pickerel', 'Pompano'] }, { area: 'east_china_sea', boats: ['Kingfish'] },
        { area: 'carolines', boats: ['Pike', 'Tarpon', 'Tunny'] },
        { smz: 'truk', via: 'carolines', boats: ['Finback', 'Porpoise'], rule: { rtbFirst: true } },
        { area: 'marshalls', boats: ['Pollack'] }, { area: 'marianas', boats: ['Whale'] },
        { base: 'dutch_harbor', box: 'broom', boats: ['S30', 'S33', 'S34'], aleutians: true },
        { base: 'dutch_harbor', box: 'repair2', boats: ['S28', 'S35'], aleutians: true },
        { area: 'aleutians', home: 'dutch_harbor', boats: ['S23', 'S32'], aleutians: true },
        { overhaul: true, boats: ['S40', 'S41', 'S42', 'S44', 'S45', 'S46', 'S47', 'Snapper', 'Sturgeon', 'Sargo', 'Saury', 'Sculpin',
          'Seadragon', 'Spearfish', 'Sailfish', 'Swordfish', 'Searaven'] }
      ],
      /* [31.34] ends at the transition into War Period 4 */
      victory: { kind: 'atW4', table: [{ before: { y: 1944, m: 6 }, label: 'Decisive Victory' }, { before: { y: 1944, m: 8 }, label: 'Dramatic Victory' },
                                        { before: { y: 1944, m: 9 }, label: 'Historical (Draw)' }, { before: { y: 1944, m: 11 }, label: 'Marginal Failure' },
                                        { before: { y: 1946, m: 0 }, label: 'Dramatic Failure' }],
                 bonusTons: 4300, lost: [[23, 2], [29, 1], [36, 0], [42, -1], [9999, -2]], historicalLost: 33 } },
    { id: 'setting', title: 'The Setting Sun', rule: '31.4', page: 9,
      summary: 'September 1944 to the end: the last year, targets growing scarce, the Japanese antisubmarine forces at their best, and wolfpacks at sea.',
      start: { y: 1944, m: 8, w: 1 }, end: { y: 1945, m: 11, w: 4 }, warPeriod: 'W4', torpedo: 1, bases: ['pearl', 'fremantle', 'brisbane'],
      counters: { ships: 918, tons: 3986, lost: 34 }, sunkRows: ['taiho', 'shokaku'], packXp: 10,
      tenders: { midway: 'bushnell', majuro: 'sperry', mios_woendi: 'orion', guam: 'holland', saipan: 'fulton' },
      reinforcementsFrom: '1944-10', reinforcementsUntil: '1945-08',
      oob: [
        { base: 'pearl', box: 'broom', boats: ['Apogon', 'Barbel', 'Bergall', 'Besugo', 'Blackfish', 'Burrfish', 'Cobia', 'Croaker', 'Drum', 'Escolar',
          'Gabilan', 'Icefish', 'Parche', 'Perch II', 'Pomfret', 'Rock', 'Ronquil', 'Salmon', 'Saury', 'Sawfish', 'Sea Devil', 'Sea Dog',
          'Seadragon', 'Shark II', 'Silversides*Coye', 'Skate', 'Snapper', 'Snook', 'Sterlet', 'Tilefish', 'Trepang', 'Trigger', 'Blackfin'] },
        { base: 'pearl', box: 'repair2', boats: ['Flying Fish', 'Bluefish'] },
        { base: 'pearl', box: 'repair3', boats: ['Haddock', 'Scamp', 'Swordfish'] },
        { base: 'fremantle', box: 'broom', boats: ['Angler', 'Aspro', 'Bluegill*Barr', 'Bonefish', 'Cabrilla', 'Cod', 'Crevalle', 'Flasher*Whitaker',
          'Hammerhead', 'Hoe', 'Lapon', 'Pargo', 'Ray', 'Barbero', 'Batfish', 'Cavalla', 'Hawkbill', 'Baya', 'Becuna', 'Hardhead'] },
        { base: 'brisbane', box: 'broom', boats: ['Stingray', 'Cero', 'Dace', 'Darter', 'Permit', 'Gar', 'Seawolf'] },
        { base: 'saipan', box: 'broom', boats: ['Picuda', 'Spadefish*Underwood', 'Redfish'], note: 'a wolfpack in the book' },
        { area: 'kurile', boats: ['Seal', 'Searaven', 'Tambor'] },
        { area: 'empire_pacific', boats: ['Albacore', 'Archerfish', 'Bang', 'Pipefish', 'Plaice', 'Scabbardfish', 'Shad'] },
        { area: 'east_china_sea', boats: ['Guardfish', 'Sunfish', 'Thresher', 'Pintado'] },
        { area: 'bonins', boats: ['Finback', 'Gato', 'Pilotfish'] },
        { smz: 'davao_leyte', via: 's_phil_sea', boats: ['Bashaw', 'Flounder', 'Guavina'] },
        { smz: 'palau', via: 's_phil_sea', boats: ['Grouper'] },
        { smz: 'truk', via: 'carolines', boats: ['Tarpon', 'Plunger'] },
        { area: 'n_phil_sea', boats: ['Seahorse*Cutter', 'Billfish', 'Sailfish', 'Greenling', 'Barb*Fluckey', 'Queenfish', 'Tunny', 'Growler',
          'Pampanito', 'Sealion II'], packs: [['Billfish', 'Sailfish', 'Greenling'], ['Barb', 'Queenfish', 'Tunny'], ['Growler', 'Pampanito', 'Sealion II']] },
        { area: 's_phil_sea', boats: ['Piranha', 'Razorback', 'Segundo', 'Whale', 'Redfin'] },
        { area: 'scs1', boats: ['Muskallunge', 'Paddle'] }, { area: 'scs2', boats: ['Haddo', 'Hake', 'Jack', 'Mingo'] },
        { area: 'java_sea', rtb: true, boats: ['Guitarro', 'Gunnel'] }, { area: 'banda_sea', rtb: true, boats: ['Gurnard', 'Raton'] },
        { area: 'bismarck_sea', rtb: true, boats: ['Bream'] },
        { area: 'north_pacific', rtb: 'pearl', boats: ['Tuna', 'Bowfin', 'Tang*O\'Kane'] },
        { area: 'carolines', rtb: true, boats: ['Balao'] },
        { overhaul: true, boats: ['Halibut', 'Herring', 'Tinosa', 'Tullibee', 'Pompon', 'Puffer', 'Rasher*Munson', 'Steelhead', 'Peto', 'Pogy',
          'Sandlance', 'Tautog', 'Skipjack', 'Kingfish', 'Sargo', 'Spearfish'] }
      ],
      /* [31.41] ends when tonnage passes 5,000,000 t; [31.43] victory as [31.14] */
      victory: { kind: 'byDate', tons: 5000, table: BY_DATE_31_14, lost: LOST_31_14, historicalLost: 49 } },
    { id: 'macarthur', title: 'MacArthur\'s Navy', rule: '31.5', page: 11,
      summary: 'The whole war in the Southwest Pacific only: Manila, then Fremantle, Brisbane and Subic Bay, with the boats General MacArthur\'s command had.',
      start: { y: 1941, m: 11, w: 2 }, end: { y: 1945, m: 11, w: 4 }, warPeriod: 'W1', torpedo: -2, bases: ['manila'],
      allowedBases: ['manila', 'fremantle', 'brisbane'], allowedForward: ['surabaya', 'mios_woendi'],
      areas: ['scs1', 'scs2', 'java_sea', 'n_phil_sea', 's_phil_sea', 'banda_sea', 'bismarck_sea', 'solomons', 'coral_sea'],
      relegateCount: 1, arriveFallback: 'fremantle', noReturns: true,
      oob: [FULL_OOB[0], FULL_OOB[1], FULL_OOB[2]],
      reinforcementsUntil: '1945-08',
      longevity: [{ y: 1942, m: 1, tons: 40 }, { y: 1942, m: 4, tons: 100 }, { y: 1942, m: 7, tons: 160 }, { y: 1942, m: 10, tons: 200 },
                  { y: 1943, m: 1, tons: 300 }, { y: 1943, m: 4, tons: 410 }],
      /* [31.54] D: the torpedo and the War Periods follow the list, not the tables */
      schedule: { '1942-07': { warPeriod: 'W2' }, '1942-08': { torpedo: -1 }, '1943-04': { warPeriod: 'W3' }, '1943-08': { torpedo: 0 },
                  '1944-01': { torpedo: 1 }, '1944-09': { warPeriod: 'W4' }, '1945-01': { torpedo: 2 } },
      arrive: {
        '1942-04': { brisbane: ['S42', 'S44', 'S47'] },
        '1942-05': { fremantle: ['Gar', 'Grampus'], brisbane: ['S43', 'S45', 'S46'] },
        '1942-07': { fremantle: ['Thresher'] },
        '1942-08': { fremantle: ['Grenadier', 'Gudgeon', 'Tambor'] },
        '1942-10': { brisbane: ['Amberjack'] },
        '1942-11': { fremantle: ['Grayling'], brisbane: ['Flying Fish', 'Growler', 'Plunger', 'Silversides'] },
        '1942-12': { brisbane: ['Albacore', 'Gato', 'Grouper', 'Tuna', 'Wahoo'] },
        '1943-01': { brisbane: ['Peto', 'Argonaut', 'Greenling', 'Guardfish', 'Nautilus', 'Triton'] },
        '1943-04': { brisbane: ['S31', 'Drum'] },
        '1943-05': { brisbane: ['Scamp'] },
        '1943-06': { brisbane: ['Silversides'] },
        '1943-07': { brisbane: ['Balao', 'Pompon', 'Stingray', 'S38'] },
        '1943-08': { fremantle: ['Kingfish', 'Billfish', 'Bowfin', 'Puffer'] },
        '1943-09': { brisbane: ['Bluefish', 'Bonefish', 'Cisco', 'Rasher'] },
        '1943-10': { brisbane: ['Blackfish', 'Gato'], fremantle: ['Capelin', 'Cod', 'Crevalle', 'Cabrilla'] },
        '1943-11': { brisbane: ['Raton', 'Ray'], fremantle: ['Tinosa'] },
        '1944-01': { fremantle: ['Redfin', 'Haddo', 'Hake'], brisbane: ['Cero'] },
        '1944-02': { fremantle: ['Flasher', 'Hoe', 'Jack', 'Robalo'], brisbane: ['Dace', 'Darter'] },
        '1944-03': { fremantle: ['Angler', 'Gunnel', 'Lapon', 'Silversides*Coye'], brisbane: ['Mingo', 'Tunny'] },
        '1944-04': { brisbane: ['Bashaw', 'Bluegill', 'Flounder', 'Seahorse*Cutter'], fremantle: ['Paddle', 'Pargo', 'Harder*Dealey'] },
        '1944-05': { fremantle: ['Aspro', 'Gurnard', 'Muskallunge', 'Sandlance'] },
        '1944-06': { brisbane: ['Flying Fish', 'Bream'], fremantle: ['Flier', 'Guitarro'] },
        '1944-07': { brisbane: ['Hammerhead', 'Rock', 'Guavina', 'Permit'] },
        '1944-08': { brisbane: ['Pollack', 'Seawolf'], fremantle: ['Hardhead'] },
        '1944-09': { fremantle: ['Barbero', 'Batfish', 'Cavalla', 'Growler', 'Hawkbill', 'Baya', 'Becuna'], brisbane: ['Gar'] },
        '1944-10': { fremantle: ['Bergall', 'Cobia'] },
        '1944-11': { brisbane: ['Pintado', 'Tuna', 'Tullibee'], fremantle: ['Barbel', 'Blackfin', 'Pampanito'] },
        '1944-12': { fremantle: ['Besugo', 'Blenny', 'Caiman', 'Sea Robin'] },
        '1945-01': { fremantle: ['Blueback', 'Boarfish*Gross', 'Charr', 'Croaker', 'Perch II', 'Sealion II', 'Gabilan'] },
        '1945-02': { fremantle: ['Blower', 'Brill', 'Lagarto', 'Kraken'] },
        '1945-03': { fremantle: ['Bugara', 'Chub', 'Lamprey', 'Puffer'] },
        '1945-04': { fremantle: ['Bullhead', 'Cod', 'Sculpin'] },
        '1945-05': { fremantle: ['Herring', 'Bluefish', 'Bumper', 'Lizardfish'] },
        '1945-06': { fremantle: ['Capitaine', 'Carbonero', 'Icefish', 'Loggerhead'] },
        '1945-07': { fremantle: ['Cabrilla', 'Rasher', 'Raton'] },
        '1945-08': { fremantle: ['Ray'] }
      },
      withdraw: {
        '1942-04': ['Tarpon'], '1942-07': ['Porpoise', 'Pike', 'Shark'], '1942-09': ['Pickerel', 'Permit'],
        '1942-10': ['S37', 'S38', 'S39', 'S40', 'S41', 'S42', 'S43', 'S44', 'S45', 'S46', 'S47'],
        '1942-12': ['Salmon', 'Seal', 'Skipjack', 'Seawolf', 'Sailfish', 'Plunger'],
        '1943-01': ['Silversides', 'Sturgeon', 'Sargo', 'Saury', 'Sculpin', 'Seadragon', 'Sealion'],
        '1943-02': ['Spearfish', 'Snapper', 'Flying Fish'], '1943-03': ['Swordfish', 'Searaven', 'Argonaut', 'Nautilus'],
        '1943-06': ['Grayback', 'Gudgeon', 'Grenadier', 'Gato', 'Wahoo'], '1943-07': ['Tautog'], '1943-08': ['Grayling', 'Thresher', 'Triton'],
        '1943-09': ['Gar', 'Grampus', 'Tambor'], '1943-10': ['Greenling', 'Grouper'], '1943-11': ['Stingray', 'Growler', 'Silversides'],
        '1943-12': ['Drum', 'Tuna', 'S31', 'S36', 'S38'], '1944-01': ['Kingfish'], '1944-02': ['Tinosa'],
        '1944-03': ['Guardfish', 'Albacore', 'Amberjack', 'Pompon', 'Balao'], '1944-05': ['Blackfish', 'Scamp', 'Tunny'],
        '1944-06': ['Bowfin', 'Billfish', 'Silversides'], '1944-07': ['Seahorse', 'Peto'], '1944-08': ['Tullibee', 'Cabrilla'],
        '1944-09': ['Bluefish', 'Puffer', 'Rasher', 'Sandlance'], '1944-11': ['Flying Fish', 'Cisco', 'Crevalle'],
        '1944-12': ['Aspro', 'Batfish', 'Gunnel', 'Jack', 'Muskallunge', 'Bonefish', 'Cod', 'Cero', 'Permit', 'Darter', 'Raton', 'Ray'],
        '1945-01': ['Haddo', 'Redfin', 'Robalo', 'Gar', 'Lapon', 'Paddle'], '1945-02': ['Angler', 'Dace', 'Harder'],
        '1945-03': ['Hake', 'Pargo', 'Pintado', 'Hoe', 'Mingo', 'Sea Robin'], '1945-04': ['Gabilan', 'Gurnard', 'Flasher', 'Flounder'],
        '1945-05': ['Rock', 'Blackfin', 'Barbero', 'Bashaw'], '1945-06': ['Bream', 'Cavalla', 'Perch II'], '1945-07': ['Bluegill']
      },
      /* [31.55] the war ends when tonnage passes 1,900,000 t in 1945, or 2,000,000 t in 1944 */
      victory: { kind: 'byDate', tons: 2000, tons1945: 1900,
                 table: [{ before: { y: 1945, m: 0 }, label: 'Total Victory' }, { before: { y: 1945, m: 3 }, label: 'Decisive Victory' },
                         { before: { y: 1945, m: 6 }, label: 'Dramatic Victory' }, { before: { y: 1945, m: 8 }, label: 'Historical Victory' },
                         { before: { y: 1945, m: 9 }, label: 'Draw' }, { before: { y: 1946, m: 0 }, label: 'Failure' }],
                 lost: [[12, 2], [20, 1], [25, 0], [34, -1], [9999, -2]], historicalLost: 23 } }
  );

  /* [31.6] East Wind Early: a hypothetical 1932 war (Spanish scenario book pp. 14-17). */
  CAMPAIGNS.push(
    { id: 'east_wind', title: 'East Wind Early (1932)', rule: '31.6', page: 14, turns: 34, hypothetical: true,
      summary: 'A war that never happened: 1932, the Depression biting, Japan moving south. Old S-boats hold the Philippines until the battle fleet can cross the Pacific. Hypothetical, from the book\'s bonus campaign.',
      start: { y: 1932, m: 3, w: 3 }, end: { y: 1932, m: 11, w: 4 }, warPeriod: 'W1', torpedo: -1, bases: ['pearl', 'manila'],
      /* [31.61] the rule changes */
      mix: 'Y32', eventTable: 'Y32', ultraByEvent: true, noWarProgress: true, generalAsw: 0, torpedoCap: 0, torpedoColumn: '-2->-1',
      areas: ['scs1', 'scs2', 'n_phil_sea', 's_phil_sea', 'kurile', 'empire_pacific', 'yellow_sea', 'east_china_sea', 'bonins', 'marianas', 'carolines'],
      bbAreas: ['n_phil_sea', 'scs1', 's_phil_sea', 'scs2'], diligentPieces: ['dd2t63'], ddDefense: 6, uniqueRows: ['cv10t'],
      aircraft: 'Mitsubishi B1M torpedo bomber', noHistory: true, allSmz: true,     // "All SMZs are playable" [31.61 A] noReturns: true, withdraw: {},
      allowedForward: ['wake', 'davao_leyte', 'surabaya', 'guam', 'lingayen', 'formosa', 'okinawa'],
      /* [31.63] */
      oob: [
        { base: 'manila', box: 'ready', boats: ['S2', 'S30', 'S31', 'S32', 'S35', 'S36', 'S38', 'S39', 'S40', 'S41'] },
        { base: 'manila', box: 'repair1', boats: ['S33'] },
        { smz: 'lingayen', via: 'scs1', home: 'manila', boats: ['S37'], rule: { noMove: true, tf: true, rtbFirst: true } },
        { smz: 'formosa', via: 'scs1', home: 'manila', boats: ['S34'], rule: { noMove: true, noAttack: true, rtbFirst: true },
          note: 'in the neutral port of Tsingtao' },
        { base: 'pearl', box: 'ready', boats: ['S1', 'S18', 'S19', 'S23', 'S26', 'S28', 'S42', 'S43', 'S44'] },
        { base: 'pearl', box: 'repair3', boats: ['S27'] }
      ],
      /* [31.64] all into Pearl Harbor's Broom Box */
      arrive: {
        '1932-05': { pearl: ['Bass', 'Bonita'] },
        '1932-06': { pearl: ['Barracuda', 'Narwhal', 'S47', 'S48', 'Leviathon'] },
        '1932-07': { pearl: ['Argonaut', 'S45', 'S46'] },
        '1932-08': { pearl: ['Nautilus'] },
        '1932-09': { pearl: ['Dolphin'] }
      },
      reinforcementsUntil: '1932-12',
      /* [31.66] tonnage by the end of December 1932, capital ships doubled */
      victory: { kind: 'eastWind', doubled: ['CV', 'BB', 'AR', 'AC', 'CA'],
                 levels: [{ tons: 500, label: 'Decisive Victory' }, { tons: 400, label: 'Victory' }, { tons: 300, label: 'Draw' },
                          { tons: 250, label: 'Defeat' }, { tons: 0, label: 'Catastrophic Defeat' }],
                 lost: [{ under: 6, mod: 1 }, { over: 15, mod: -1 }, { over: 20, mod: -2 }], bbcv: 1 } }
  );

  function rosterName(n) { n = n.split('*')[0]; return /^S\d/.test(n) ? n : 'USS ' + (ROSTER_ALIAS[n] || n); }
  function skipperOf(n) { return n.indexOf('*') > -1 ? n.split('*')[1] : null; }

  /* [8.0D] Returns from overhaul, same list: all to Pearl Harbor's Broom Box,
   * S-boats to Dutch Harbor's [31.01]. */
  var RETURN = {
    '1942-05': ['Dolphin', 'Pompano', 'Tautog'],
    '1942-06': ['Plunger'],
    '1942-08': ['Argonaut'],
    '1942-10': ['Tarpon', 'Pollack', 'Perch'],
    '1942-12': ['Porpoise', 'Pike', 'Shark'],
    '1943-01': ['Pompano'],
    '1943-02': ['Pickerel', 'Permit'],
    '1943-04': ['Salmon', 'Seal', 'Skipjack', 'Seawolf'],
    '1943-05': ['Seadragon', 'Sargo', 'Saury', 'Sculpin', 'Sailfish', 'Sealion',
                'S40', 'S41', 'S42', 'S43', 'S44', 'S45', 'S46', 'S47', 'Narwhal'],
    '1943-06': ['Sturgeon', 'Spearfish', 'Searaven', 'Snapper'],
    '1943-07': ['Kingfish', 'Swordfish'],
    '1943-08': ['Wahoo'],
    '1943-09': ['Gudgeon', 'Grenadier', 'Gato', 'Grayback'],
    '1943-10': ['Tautog'],
    '1943-11': ['Triton', 'Thresher', 'Gunnel'],
    '1943-12': ['Greenling', 'Whale', 'Finback', 'Gar', 'Grampus'],
    '1944-01': ['Jack', 'Tambor'],
    '1944-02': ['Growler', 'Grayling', 'Hoe', 'Lapon', 'Mingo', 'Trout', 'Tunny'],
    '1944-03': ['Paddle', 'Pargo', 'Harder', 'Grouper', 'Grunion'],
    '1944-04': ['Drum', 'Gurnard', 'Muskallunge', 'Tuna'],
    '1944-05': ['Albacore', 'Barb'],
    '1944-06': ['Guardfish', 'Amberjack'],
    '1944-09': ['Shad', 'Silversides', 'Trigger'],
    '1944-10': ['Peto', 'Pogy', 'Skipjack', 'Kingfish', 'Sargo', 'Spearfish'],
    '1944-12': ['Tinosa', 'Tullibee', 'Tautog'],
    '1945-01': ['Pompon', 'Rasher'],
    '1945-02': ['Puffer', 'Scorpion'],
    '1945-03': ['Cod', 'Cero'],
    '1945-04': ['Corvina', 'Darter', 'Raton', 'Ray', 'Sandlance'],
    '1945-05': ['Haddo', 'Dace', 'Flying Fish'],
    '1945-06': ['Whale', 'Angler', 'Redfin', 'Robalo'],
    '1945-07': ['Hake', 'Snook'],
    '1945-08': ['Flasher', 'Flounder'],
    '1945-09': ['Bream', 'Rock', 'Sawfish', 'Sunfish']
  };

  /* The off-screen fleet: US submarine sinkings per month (ships, thousands of
   * tons) and US submarines lost, after JANAC, smoothed within each year. Index
   * 0 = January. 1941 has only December. */
  var FLEET = {
    1941: { ships: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6], tons: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 30],
            lost: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] },
    1942: { ships: [6, 8, 10, 12, 14, 16, 16, 16, 18, 20, 20, 24], tons: [25, 30, 40, 45, 55, 60, 60, 65, 70, 80, 85, 110],
            lost: [1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1] },
    1943: { ships: [22, 24, 26, 26, 28, 28, 28, 28, 30, 32, 34, 39], tons: [90, 95, 100, 105, 110, 115, 120, 125, 130, 140, 150, 170],
            lost: [1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 1] },
    1944: { ships: [50, 52, 50, 48, 50, 52, 48, 50, 52, 60, 55, 40], tons: [240, 256, 250, 200, 230, 210, 215, 245, 220, 320, 250, 100],
            lost: [2, 2, 1, 1, 1, 2, 1, 2, 2, 3, 2, 0] },
    1945: { ships: [30, 20, 25, 20, 25, 20, 20, 10, 0, 0, 0, 0], tons: [90, 60, 70, 60, 60, 50, 45, 15, 0, 0, 0, 0],
            lost: [2, 2, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0] }
  };

  /* ---- [33.0] Optional rules (Phase 9), from the Spanish scenario book pp. 20-24 ----
   * [33.1] Allied submarines: Dutch and British boats, tallied apart from yours.
   * Names are the Vassal roster's (British boats carry "HMS "). */
  var ALLIED = {
    /* [33.14] Surabaya starts active, tender Zuiderkruis in its zone: the
     * Surabaya Display is a full submarine base (repair 1-3-5, Hold 12). */
    tender: { id: 'zuiderkruis', name: 'Zuiderkruis', capacity: 12, dutch: true },
    surabaya: { name: 'Surabaya', repair: { 3: 1, 2: 3, 1: 5 }, capacity: 12 },
    oob: [
      { base: 'surabaya', box: 'repair2', boats: ['K-VIII', 'K-X'] },
      { area: 'java_sea', home: 'surabaya', boats: ['K-XIV'], rule: { noMove: true, tf: true, rtbFirst: true } },
      { smz: 'makassar', via: 'java_sea', home: 'surabaya', boats: ['K-XV', 'K-XVI'], rule: { noMove: true, tf: true, holdSmz: true } }
    ],
    arrive: {
      '1942-01': { surabaya: ['K-XVIII'] },
      '1942-02': { surabaya: ['K-XI', 'K-XII', 'O-19'] },
      '1943-09': { fremantle: ['O-21'] },
      '1944-02': { fremantle: ['K-XV'] },
      '1944-04': { fremantle: ['K-XIV'] },
      '1944-09': { fremantle: ['O-19', 'Zwaardvisch'] },
      '1944-10': { fremantle: ['HMS Telemachus', 'HMS Tantivy', 'HMS Spiteful', 'HMS Sea Rover', 'HMS Sturdy', 'HMS Sirdar', 'HMS Stoic'] },
      '1944-11': { fremantle: ['HMS Tantalus'] },
      '1945-01': { fremantle: ['HMS Tradewind', 'HMS Spark'] },
      '1945-03': { fremantle: ['HMS Tudor'] },
      '1945-04': { fremantle: ['O-24', 'HMS Sea Scout', 'HMS Stygian'] },
      /* the four returning British boats come back even if the originals were sunk [33.14 note] */
      '1945-05': { fremantle: ['HMS Trenchant', 'HMS Tiptoe', 'HMS Taciturn', 'HMS Supreme', 'HMS Telemachus', 'HMS Tantivy', 'HMS Spiteful', 'HMS Sirdar', 'O-27'] }
    },
    withdraw: { '1943-11': ['O-21'], '1944-12': ['HMS Stoic'], '1945-01': ['HMS Sea Rover'], '1945-02': ['HMS Telemachus'],
                '1945-03': ['HMS Tantivy', 'HMS Sirdar'], '1945-04': ['HMS Spiteful'], '1945-06': ['Zwaardvisch'] },
    /* [33.14 *] a sunk K-XIV / K-XV may be replaced by K-XVI / K-XVIII if those survive */
    replace: { 'K-XV': 'K-XVI', 'K-XIV': 'K-XVIII' },
    /* O-27 has no counter in the roster: the May 1945 boats "represent other
     * submarines of the same class" [33.14 note], so it uses the O-21 counter. */
    extraUnits: [{ name: 'O-27', class: 'o-21', art: 'o-21', entry: '5/45' }],
    /* [33.15] campaign adjustments: from this date the Tonnage and Subs Lost
     * boxes lose these and gain the Allied totals. `atEnd`: when it ends. */
    adjust: {
      full: { at: { y: 1945, m: 0 }, tons: 63, lost: 4 },
      rising_sun: { at: { y: 1942, m: 11 }, tons: 24, lost: 2 },
      tide: { atEnd: true, tons: 1, lost: 0 },
      setting: { at: { y: 1945, m: 0 }, tons: 38, lost: 2 },
      macarthur: { at: { y: 1945, m: 0 }, tons: 63, lost: 4 }
    },
    /* [33.15] Campaign 4 starts with four Dutch boats at Fremantle. */
    startOob: { setting: [{ base: 'fremantle', box: 'broom', boats: ['K-XV', 'O-19', 'Zwaardvisch'] }, { base: 'fremantle', box: 'repair3', boats: ['K-XIV'] }] },
    /* [33.14] optional: Zeeleeuw replaces Hawkbill, K-XIV and K-XV, at Fremantle in November 1944. */
    zeeleeuw: { key: '1944-11', base: 'fremantle', removes: ['USS Hawkbill', 'K-XIV', 'K-XV'] },
    /* [33.11] after Surabaya falls, Dutch and British boats use only these. */
    basesAfterFall: ['fremantle', 'manila', 'mios_woendi'],
    /* [33.13] from the second week of March 1942 */
    withdrawFrom: { y: 1942, m: 2, w: 2 }
  };
  /* [33.3]-[33.5] single boats, each its own option. */
  var OPTIONAL_BOATS = {
    surcouf:   { boat: 'Surcouf', key: '1942-05', base: 'pearl', leaves: '1943-01', rule: '33.3', gunnery: true,
                 text: 'Free French cruiser submarine: Pearl Harbor May 1942, leaves in January 1943; may choose surface gunnery [33.31].' },
    u2513:     { boat: 'U-2513', key: '1945-07', base: 'pearl', torpedo: 2, oneDamage: true, rule: '33.4',
                 text: 'Type XXI "Elektroboot": Pearl Harbor July 1945, torpedo +2 always, withdrawn after the first patrol on which it is damaged [33.41].' },
    nautilus2: { boat: 'USS Nautilus II', key: '1945-07', base: 'pearl', oneDamage: true, rule: '33.5',
                 text: 'The Scheme-17 prototype: Pearl Harbor July 1945, withdrawn after the first patrol on which it is damaged [33.51].' }
  };
  /* [34.0] Staggered arrivals and withdrawals: the week a boat comes or goes. */
  var STAGGER = [[2, 1], [4, 2], [7, 3], [9, 4]];    // die 0-2 week 1, 3-4 week 2, 5-7 week 3, 8-9 week 4

  /* Historical pace: a HOUSE RULE, not in the book, off by default. A modifier
   * on the Endurance roll [14.7] by War Period (negative = stays on station
   * longer), tuned by soak so the captain's campaigns track the JANAC curve
   * (docs/20). The printed game is unchanged when the option is off. */
  /* end: Endurance [14.7]; ca: the counterattack [14.2]; transit: the Transit
   * Event check [19.1]. Tuned 2026-09-28 on the captain's campaigns (docs/20). */
  var PACE = { W1: { end: -1, ca: -2, transit: -4 }, W2: { end: -1, ca: -1, transit: -3 },
               W3: { end: -1, ca: -1, transit: -2 }, W4: { end: 1, ca: 0, transit: -1 } };

  /* The war ends in the third week of August 1945 [31.51]. */
  var WAR_END = { y: 1945, m: 7, w: 3 };

  /* [16.2] / [14.7]-style one-line reasons the engine quotes. */
  var CAREER_PATROLS = 5;

  root.SWCampaignData = {
    bases: BASES,
    forwardBases: FORWARD_BASES,
    tenders: TENDERS,
    smzLinks: SMZ_LINKS,
    smzUncertain: SMZ_UNCERTAIN,
    events: EVENTS,
    periodStart: PERIOD_START,
    basesAtPeriod: BASES_AT_PERIOD,
    transitions: TRANSITIONS,
    careers: CAREERS,
    withdraw: WITHDRAW,
    returns: RETURN,
    arrive: ARRIVE,
    campaigns: CAMPAIGNS,
    rosterName: rosterName,
    skipperOf: skipperOf,
    campaign: function (id) { for (var i = 0; i < CAMPAIGNS.length; i++) if (CAMPAIGNS[i].id === id) return CAMPAIGNS[i]; return null; },
    /* The first Return month after `key` ('YYYY-MM') for a boat, or null. */
    returnAfter: function (boat, key) {
      var ks = Object.keys(RETURN).sort();
      for (var i = 0; i < ks.length; i++) if (ks[i] > key && RETURN[ks[i]].indexOf(boat) > -1) return ks[i];
      return null;
    },
    fleet: FLEET,
    allied: ALLIED,
    optionalBoats: OPTIONAL_BOATS,
    pace: PACE,
    stagger: STAGGER,
    warEnd: WAR_END,
    careerPatrols: CAREER_PATROLS,
    career: function (id) {
      for (var i = 0; i < CAREERS.length; i++) if (CAREERS[i].id === id) return CAREERS[i];
      return null;
    },
    /* Every event def by id, including the "again" variants. */
    eventById: function (id) {
      var found = null;
      Object.keys(EVENTS).forEach(function (wp) {
        EVENTS[wp].forEach(function (e) {
          if (e.id === id) found = e;
          if (e.again && e.again.id === id) found = e.again;
        });
      });
      return id === 'none' ? NONE : found;
    },
    none: NONE
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
