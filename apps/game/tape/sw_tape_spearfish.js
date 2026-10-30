/* sw_tape_spearfish.js — the Phase 2 demo tape. PURE DATA.
 *
 * One scripted patrol turn, played back by the UI so that every Phase 2
 * interface contract (token placement, fog-safe summaries, resolution records,
 * the ledger, the roll log, speed control, auto view-switching) is exercised
 * before any rules engine exists. There is NO rules logic here and none in the
 * player: the tape states what happened, the UI shows it.
 *
 * SOURCE: the rulebook's own worked example — USS Spearfish (6-3-4), Whitaker
 * (+1) super skipper, War Period 2, East China Sea, Mk-XIV torpedo value -1,
 * general ASW 1 — printed across [14.14], [14.15] and [14.2] (rulebook p.9-10).
 * ACTION_PLAN.md named the Spanish scenario book's Seawolf example; the
 * Spearfish example is the same kind of content, is already the designated test
 * fixture for the resolution-record contract, and is in English. Substituted
 * deliberately.
 *
 * Counter art is the real Vassal art and it matches the example exactly:
 * new_s2.gif is printed 6-3-4 (Spearfish's class), m5t20.gif is a 5,000-ton
 * 2-0 maru, m3t10.gif a 3,000-ton 1-0 maru, dd2t71.gif a 2,000-ton 7-1
 * destroyer. Filenames decode as <type><tonnage>t<defense><asw>[variant].
 * The example does not state the marus' tonnage; 5t and 3t are the smallest
 * printed counters carrying the stated 2-0 and 1-0 ratings.
 *
 * Steps 1-6 (movement through the engagement draw) are NOT in the rulebook
 * example. They are constructed to be consistent with its stated situation and
 * are marked `constructed: true`. Every die they use is fixed.
 *
 * KNOWN RULEBOOK INCONSISTENCY, carried deliberately:
 * [14.14] says the 1-0 cargo ship has "a TDC value of 0", but the worked
 * calculation in [14.15] uses "TDC +1" to reach 1+1+1 = +3 and "roll = or < 0".
 * The tape uses +1 so the printed arithmetic chain is reproducible. See the
 * `errata` field on the target-selection step.
 */
(function (root) {
  'use strict';

  var SUB = {
    id: 'spearfish', name: 'USS Spearfish', cls: 'Sargo',
    attack: 6, defense: 3, tactical: 4, endurance: 'B',
    art: '../../Source/images/new_s2.gif',
    superSkipper: { name: 'Whitaker', value: 1 }
  };

  /* Japanese units as the example states them. `revealed` is the state BEFORE
   * the step that reveals it; the tape flips it. Face-down units carry their
   * true values here but the UI must route every total through SWFog. */
  var UNITS = [
    { id: 'j_a1', column: 'A', kind: 'M',  label: 'Cargo maru #1', defense: 2, asw: 0, tonnage: 5,
      art: '../../Source/images/m5t20.gif', back: '../../Source/images/flag_merchant.gif', revealed: false },
    { id: 'j_b1', column: 'B', kind: 'M',  label: 'Cargo maru #2', defense: 2, asw: 0, tonnage: 5,
      art: '../../Source/images/m5t20.gif', back: '../../Source/images/flag_merchant.gif', revealed: false },
    { id: 'j_b2', column: 'B', kind: 'M',  label: 'Cargo maru #3', defense: 1, asw: 0, tonnage: 3,
      art: '../../Source/images/m3t10.gif', back: '../../Source/images/flag_merchant.gif', revealed: false },
    { id: 'j_b3', column: 'B', kind: 'DD', label: 'Destroyer',     defense: 7, asw: 1, tonnage: 2,
      art: '../../Source/images/dd2t71.gif', back: '../../Source/images/flag_battle.gif', revealed: false }
  ];

  var STEPS = [
    { id: 's1', sop: '12.0', view: 'theater', constructed: true,
      title: 'Patrol Movement',
      narrative: 'Spearfish is already on station in the East China Sea, Operating section. No move this turn, so no Transit Event check [19.1].',
      effects: [{ type: 'place', token: 'spearfish', at: { kind: 'oparea', id: 'east_china_sea', section: 'operating' } }] },

    { id: 's2', sop: '13.1', view: 'theater', constructed: true,
      title: 'Activity Determination',
      narrative: 'The player does not bypass Search and Contact, and does not voluntarily RTB.',
      effects: [] },

    { id: 's3', sop: '13.2', view: 'theater', constructed: true,
      title: 'Area Activity Chart',
      narrative: 'Roll on the East China Sea AAC, War Period 2 row.',
      record: { context: 'East China Sea AAC, War Period 2', table: 'Area Activity Chart [13.2A]',
                ruleRef: '13.2', inputs: [], drms: [], die: 5, modifiedDie: 5,
                target: null, result: 'Moderate Density (blue)' },
      effects: [{ type: 'activity', level: 'moderate' }] },

    { id: 's4', sop: '13.2', view: 'theater', constructed: true,
      title: 'Contact Table',
      narrative: 'Contact made. Cross-index War Period 2 with the die roll.',
      record: { context: 'Contact, War Period 2', table: 'Contact Table [13.2B]',
                ruleRef: '13.2', inputs: [], drms: [], die: 6, modifiedDie: 6,
                target: null, result: 'C2 — Large Convoy' },
      effects: [{ type: 'contact', result: 'C2' }] },

    { id: 's5', sop: '13.2', view: 'combat', constructed: true,
      title: 'Engagement Table — draw the cups',
      narrative: 'Moderate Density crossed with C2 draws 5 / 4 / 3 / 2 from cups A / B / C / D. Fourteen pieces go face down into their matching columns, unexamined.',
      record: { context: 'Moderate x C2', table: 'Engagement Table [13.2C]',
                ruleRef: '13.2', inputs: [], drms: [], die: null, modifiedDie: null,
                target: null, result: 'A5 B4 C3 D2 — 14 pieces face down' },
      effects: [{ type: 'draw', cups: { A: 5, B: 4, C: 3, D: 2 }, faceDown: true }] },

    { id: 's6', sop: '14.1', view: 'combat', constructed: true,
      title: 'Place the submarine',
      narrative: 'Spearfish takes a submarine box in column B [14.11].',
      effects: [{ type: 'place', token: 'spearfish', at: { kind: 'combat', slot: 'Sub_B1' } }] },

    { id: 's7', sop: '14.1', view: 'combat',
      title: 'Reveal — Tactical 4',
      narrative: 'Tactical Rating 4 reveals four units, from column B or an adjacent column [14.12]. One 2-0 cargo maru in column A, a second 2-0 and a 1-0 in column B, and a 7-1 destroyer in column B.',
      effects: [{ type: 'reveal', units: ['j_a1', 'j_b1', 'j_b2', 'j_b3'] }] },

    { id: 's8', sop: '14.1', view: 'combat',
      title: 'TDC placement — Tactical 4',
      narrative: 'Tactical Rating 4 also draws four TDC markers from the face-down pool, placed one per target and not examined until revealed [14.13].',
      effects: [{ type: 'tdc', place: [
        { unit: 'j_a1', slot: 'TDC_A1' }, { unit: 'j_b1', slot: 'TDC_B1' },
        { unit: 'j_b2', slot: 'TDC_B2' }, { unit: 'j_b3', slot: 'TDC_B3' }] }] },

    { id: 's9', sop: '14.1', view: 'combat',
      title: 'Reveal TDCs and select targets',
      narrative: 'Cargo #1 (column A, adjacent) has TDC −2. Cargo #2 has +1. Cargo #3 has +1. The player allocates 3 attack points to cargo #1 and 3 to cargo #3 — 6 of 6 — and targets neither cargo #2 nor the escort [14.14].',
      errata: 'Rulebook [14.14] prints "The 1-0 cargo ship has a TDC value of 0", but the worked calculation in [14.15] uses TDC +1 (1+1+1 = +3, roll = or < 0). The tape follows [14.15].',
      effects: [
        { type: 'tdcReveal', values: { j_a1: -2, j_b1: 1, j_b2: 1, j_b3: 0 } },
        { type: 'allocate', attacks: [{ unit: 'j_a1', points: 3 }, { unit: 'j_b2', points: 3 }] }] },

    { id: 's10', sop: '14.1', view: 'combat',
      title: 'Attack — Cargo maru #1 (2-0, adjacent column)',
      narrative: 'Resolve each attack separately [14.15].',
      attack: {
        target: 'j_a1',
        attacker: [
          { label: 'Attack points allocated', value: 3, rule: '14.15A1' },
          { label: 'Super skipper Whitaker', value: 1, rule: '14.15A2' },
          { label: 'Mk-XIV torpedo value', value: -1, rule: '14.15A3' }],
        defender: [
          { label: 'Defense', value: 2, rule: '14.15B1' },
          { label: 'Revealed escort ASW', value: 1, rule: '14.15B2' },
          { label: 'TDC marker', value: -2, rule: '14.15B3' },
          { label: 'Adjacent column', value: 1, rule: '14.15B4' }],
        die: 4 } },

    { id: 's11', sop: '14.1', view: 'combat',
      title: 'Attack — Cargo maru #3 (1-0, same column)',
      narrative: 'Second attack, same round.',
      attack: {
        target: 'j_b2',
        attacker: [
          { label: 'Attack points allocated', value: 3, rule: '14.15A1' },
          { label: 'Super skipper Whitaker', value: 1, rule: '14.15A2' },
          { label: 'Mk-XIV torpedo value', value: -1, rule: '14.15A3' }],
        defender: [
          { label: 'Defense', value: 1, rule: '14.15B1' },
          { label: 'Revealed escort ASW', value: 1, rule: '14.15B2' },
          { label: 'TDC marker', value: 1, rule: '14.15B3' }],
        die: 0 } },

    { id: 's12', sop: '14.1', view: 'combat', constructed: true,
      title: 'Attack Results Table',
      narrative: 'Cargo maru #3 was hit. Consult the ART on its tonnage row, adding the Mk-XIV torpedo value [14.15D]. The ART itself is Phase 3 data — the tape states the printed outcome.',
      record: { context: 'ART, 3,000-ton target', table: 'Attack Results Table [14.15D]',
                ruleRef: '14.15', inputs: [], drms: [{ label: 'Mk-XIV torpedo value', value: -1, rule: '14.15D' }],
                die: 8, modifiedDie: 7, target: null, result: 'Red — SUNK' },
      effects: [{ type: 'sink', unit: 'j_b2', tonnage: 3 }] },

    { id: 's13', sop: '14.2', view: 'combat',
      title: 'Counterattack Round',
      narrative: 'Units sunk in the attack round are removed first. The destroyer answers [14.2].',
      counterattack: {
        japanese: [
          { label: 'Revealed ASW', value: 1, rule: '14.2A1' },
          { label: 'Red boxes in the AAC', value: 3, rule: '14.2A2' },
          { label: 'General ASW, War Period 2', value: 1, rule: '14.2A3' }],
        submarine: [
          { label: 'Submarine defense', value: 3, rule: '14.2B1' },
          { label: 'Super skipper Whitaker', value: 1, rule: '14.2B2' }],
        drms: [],
        die: 6,
        result: "Consult the '1' line of the Counterattack Table — no damage" } },

    { id: 's14', sop: '14.3', view: 'combat', constructed: true,
      title: 'Withdrawal',
      narrative: 'The player declines a Re-Attack and withdraws [14.3], going to Super Skipper Determination.',
      effects: [{ type: 'withdraw', token: 'spearfish' }] },

    { id: 's15', sop: '14.5', view: 'combat', constructed: true,
      title: 'Super Skipper Determination',
      narrative: 'One ship of 3,000 tons is short of the three ships / 16,000 tons threshold [14.5]. Whitaker stays at +1.',
      effects: [] },

    { id: 's16', sop: '14.7', view: 'theater', constructed: true,
      title: 'Endurance Check',
      narrative: 'Cross-index Endurance B with the current Mk-XIV torpedo value and roll [14.7].',
      record: { context: 'Endurance B, torpedo value -1', table: 'Endurance Table [14.7]',
                ruleRef: '14.7', inputs: [], drms: [], die: 2, modifiedDie: 2,
                target: 4, result: '= or < 4 — remains on patrol, to the DONE section' },
      effects: [{ type: 'place', token: 'spearfish',
                  at: { kind: 'oparea', id: 'east_china_sea', section: 'done' } }] },

    { id: 's17', sop: '14.8', view: 'combat', constructed: true,
      title: 'Clean-Up',
      narrative: 'Japanese units and Combat Event markers return to their cups; TDC markers go back to the draw pool [14.8]. Nothing italicised was sunk, so nothing leaves the game.',
      effects: [{ type: 'cleanup' }] }
  ];

  root.SWTapeSpearfish = {
    id: 'spearfish_patrol',
    title: 'USS Spearfish — East China Sea',
    subtitle: 'The rulebook’s worked example, played through end to end',
    citation: 'Silent War rulebook v1.1 [14.14], [14.15], [14.2] (p.9-10)',
    setting: {
      warPeriod: 'W2', year: 1943, month: 'March', week: 2,
      opArea: 'east_china_sea', torpedoValue: -1, generalAsw: 1,
      redBoxesInAac: 3, shipsSunk: 0, tonnageSunk: 0, subsLost: 0
    },
    submarine: SUB,
    units: UNITS,
    steps: STEPS
  };
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
