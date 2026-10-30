/* sw_lessons.js — the lesson library. PURE DATA (generated).
 *
 * Written by tools/lessons/build_lessons.js: each lesson is a real seeded
 * patrol played by the teaching captain (tools/bot/teacher.js), with the
 * captain's reason for every step computed from the engine's own odds.
 * Do not edit by hand; change the builder and regenerate.
 * tools/test_sw_lessons.js replays every lesson through the engine.
 */
(function (root) {
  'use strict';
  root.SWLessons = [
 {
  "id": "rulebook",
  "title": "The rulebook example",
  "tape": true,
  "summary": "USS Spearfish in the East China Sea, exactly as the rulebook plays it, with the book's own numbers.",
  "learn": [
   "The whole combat procedure, step by step",
   "The rulebook's worked examples [14.14], [14.15], [14.2]"
  ]
 },
 {
  "id": "search",
  "title": "Moving and searching",
  "summary": "A week at sea: where to go, what the search roll means, and why an empty week is easier on endurance.",
  "learn": [
   "Move one area a week, within Range of base [12.0]",
   "The search die on the printed Area Activity Chart [13.2A]",
   "No contact: −1 on the Endurance roll, which helps the boat stay out [14.7]",
   "Contact: the Contact and Engagement tables [13.2B-C]"
  ],
  "seed": 19,
  "start": 0,
  "tryAt": null,
  "steps": [
   {
    "turn": 1,
    "phase": "12.0",
    "why": "Move to Empire Pacific: a search there finds ships 90% of the time, against 80% in East China Sea.",
    "actions": [
     {
      "type": "move",
      "area": "empire_pacific",
      "label": "Move to empire_pacific",
      "rule": "12.0"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "13.1",
    "why": "Search: a sub earns its keep by finding convoys. Contact chance here 90%.",
    "actions": [
     {
      "type": "search",
      "label": "Search for contacts",
      "rule": "13.2"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "12.0",
    "why": "Stay in Empire Pacific: nowhere in reach is busier (contact 90% here).",
    "actions": [
     {
      "type": "stay",
      "label": "Remain on station",
      "rule": "12.0"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "13.1",
    "why": "Search: a sub earns its keep by finding convoys. Contact chance here 90%.",
    "actions": [
     {
      "type": "search",
      "label": "Search for contacts",
      "rule": "13.2"
     }
    ]
   }
  ]
 },
 {
  "id": "attack",
  "title": "Setting up an attack",
  "summary": "From contact to torpedoes: pick a column, reveal, place firing solutions, aim, fire, and take the counterattack.",
  "learn": [
   "Your column reaches its neighbours only [14.11]",
   "Tactical rating: reveals and TDC markers [14.12-14.13]",
   "Aiming: points against defence + escorts + TDC [14.14-14.15]",
   "The Attack Results Table and the counterattack [14.15D, 14.2]"
  ],
  "seed": 1592,
  "start": 2,
  "tryAt": 6,
  "steps": [
   {
    "turn": 1,
    "phase": "12.0",
    "why": "Move to Empire Pacific: a search there finds ships 90% of the time, against 80% in East China Sea.",
    "actions": [
     {
      "type": "move",
      "area": "empire_pacific",
      "label": "Move to empire_pacific",
      "rule": "12.0"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "13.1",
    "why": "Search: a sub earns its keep by finding convoys. Contact chance here 90%.",
    "actions": [
     {
      "type": "search",
      "label": "Search for contacts",
      "rule": "13.2"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.11",
    "why": "Column A: it reaches 3 of the 3 counters (its own column and the ones beside it).",
    "actions": [
     {
      "type": "place",
      "column": "A",
      "label": "Place in column A",
      "rule": "14.11"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.12",
    "why": "Reveal 2 counters. Tactical 4 allows 4 this round. Seeing the ships shows what is worth a torpedo, though each escort revealed adds its ASW.",
    "actions": [
     {
      "type": "reveal",
      "unit": "m6minus#73",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "dd2t#28",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.12",
    "why": "Radar: turn the DD 2,000 t back face down. A face-down escort adds no ASW (1) to your targets' defence or to the counterattack; reveal another counter instead.",
    "actions": [
     {
      "type": "unflip",
      "unit": "dd2t#28",
      "rule": "14.12",
      "label": "Radar: turn it back face down (reveal another instead)"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.13",
    "why": "Place 2 firing solutions. The captain prefers cargo to escorts. The markers are face down: good or bad shows when they turn over.",
    "actions": [
     {
      "type": "tdc",
      "unit": "m6minus#73",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "dd2t#28",
      "label": "Place a TDC marker",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.14",
    "why": "Aim. The captain puts 1 on maru 1,000 t (hit 30%, sink 18%) and 5 on maru 1,000 t (hit 60%, sink 36%).",
    "actions": [
     {
      "type": "target",
      "unit": "m6minus#73",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "target",
      "unit": "m6minus#79",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#79",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#79",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#79",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#79",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 100%, damaged 0%, sunk 0%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   }
  ]
 },
 {
  "id": "reattack",
  "title": "The counterattack and the Re-Attack gamble",
  "summary": "After the first round: break off, or go again for more tonnage at a +1 risk. Watch the captain weigh it, and the escorts answer.",
  "learn": [
   "What the escorts add up to [14.2A]",
   "Re-Attack: TDC markers improve, the counterattack is +1 [14.4, 14.2C2]",
   "Reading the odds before you commit"
  ],
  "seed": 1248,
  "start": 6,
  "tryAt": 7,
  "steps": [
   {
    "turn": 1,
    "phase": "12.0",
    "why": "Move to Empire Pacific: a search there finds ships 90% of the time, against 80% in East China Sea.",
    "actions": [
     {
      "type": "move",
      "area": "empire_pacific",
      "label": "Move to empire_pacific",
      "rule": "12.0"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "13.1",
    "why": "Search: a sub earns its keep by finding convoys. Contact chance here 90%.",
    "actions": [
     {
      "type": "search",
      "label": "Search for contacts",
      "rule": "13.2"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.11",
    "why": "Column A: it reaches 3 of the 3 counters (its own column and the ones beside it).",
    "actions": [
     {
      "type": "place",
      "column": "A",
      "label": "Place in column A",
      "rule": "14.11"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.12",
    "why": "Reveal 3 counters. Tactical 4 allows 4 this round. Seeing the ships shows what is worth a torpedo, though each escort revealed adds its ASW.",
    "actions": [
     {
      "type": "reveal",
      "unit": "m6minus#69",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "m6minus#77",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "h8#4",
      "label": "Reveal a counter in B",
      "rule": "14.12"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.13",
    "why": "Place 1 firing solution. The captain prefers cargo to escorts. The markers are face down: good or bad shows when they turn over.",
    "actions": [
     {
      "type": "tdc",
      "unit": "m6minus#69",
      "label": "Place a TDC marker",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.14",
    "why": "Aim. The captain puts 6 on maru 2,000 t (hit 50%, sink 30%).",
    "actions": [
     {
      "type": "target",
      "unit": "m6minus#77",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#77",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#77",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#77",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#77",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#77",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 80%, damaged 10%, sunk 0%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.3",
    "why": "Re-Attack: 3 ships still afloat and little chance of losing the boat (sunk 0%), though it may be damaged (20%). The TDC markers improve by one.",
    "actions": [
     {
      "type": "reattack",
      "label": "Conduct a Re-Attack round",
      "rule": "14.4"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.4",
    "why": "Stay in column A: no neighbouring column reaches more ships [14.4].",
    "actions": [
     {
      "type": "stay_column",
      "label": "Stay in column A",
      "rule": "14.4"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.13",
    "why": "Place 1 firing solution. The captain prefers cargo to escorts. The markers are face down: good or bad shows when they turn over.",
    "actions": [
     {
      "type": "tdc",
      "unit": "m6minus#69",
      "label": "Place a TDC marker",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.14",
    "why": "Aim. The captain puts 6 on maru 2,000 t (hit 30%, sink 18%).",
    "actions": [
     {
      "type": "target",
      "unit": "m6minus#77",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#77",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#77",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#77",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#77",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#77",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 70%, damaged 20%, sunk 0%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.3",
    "why": "Withdraw: going again risks too much (sunk 3%, damaged 27%, and the boat is already damaged).",
    "actions": [
     {
      "type": "withdraw",
      "label": "Withdraw from combat",
      "rule": "14.3"
     }
    ]
   }
  ]
 },
 {
  "id": "home",
  "title": "Endurance and the trip home",
  "summary": "Fuel, food and torpedoes run out: a failed Endurance roll sends the boat home, and the long transit back to base.",
  "learn": [
   "The Endurance roll [14.7]",
   "Return To Base and Transit at Speed [15.0]",
   "Ending a patrol at base [16.0]"
  ],
  "seed": 7,
  "start": 0,
  "tryAt": null,
  "steps": [
   {
    "turn": 1,
    "phase": "12.0",
    "why": "Move to Empire Pacific: a search there finds ships 90% of the time, against 80% in East China Sea.",
    "actions": [
     {
      "type": "move",
      "area": "empire_pacific",
      "label": "Move to empire_pacific",
      "rule": "12.0"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "13.1",
    "why": "Search: a sub earns its keep by finding convoys. Contact chance here 90%.",
    "actions": [
     {
      "type": "search",
      "label": "Search for contacts",
      "rule": "13.2"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "15.0",
    "why": "Heading home (RTB) at Speed 2: South China Sea 1 is the base.",
    "actions": [
     {
      "type": "transit",
      "area": "scs1",
      "steps": 2,
      "label": "Transit to scs1 (2)",
      "rule": "15.0"
     }
    ]
   }
  ]
 },
 {
  "id": "radar",
  "title": "Radar: hiding an escort",
  "summary": "From 1943 the boat has radar: the captain turns a revealed destroyer back face down, so its ASW counts against neither your torpedoes nor you.",
  "learn": [
   "Radar unflip: one unit per round, the one just revealed [14.12]",
   "Why a face-down escort is safer than a revealed one [14.15B2, 14.2A1]",
   "Another counter must be revealed in its place [14.12]"
  ],
  "seed": 3212,
  "start": 2,
  "tryAt": 4,
  "steps": [
   {
    "turn": 1,
    "phase": "12.0",
    "why": "Move to Empire Pacific: a search there finds ships 90% of the time, against 80% in East China Sea.",
    "actions": [
     {
      "type": "move",
      "area": "empire_pacific",
      "label": "Move to empire_pacific",
      "rule": "12.0"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "13.1",
    "why": "Search: a sub earns its keep by finding convoys. Contact chance here 90%.",
    "actions": [
     {
      "type": "search",
      "label": "Search for contacts",
      "rule": "13.2"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.11",
    "why": "Column A: it reaches 3 of the 3 counters (its own column and the ones beside it).",
    "actions": [
     {
      "type": "place",
      "column": "A",
      "label": "Place in column A",
      "rule": "14.11"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.12",
    "why": "Reveal 2 counters. Tactical 4 allows 4 this round. Seeing the ships shows what is worth a torpedo, though each escort revealed adds its ASW.",
    "actions": [
     {
      "type": "reveal",
      "unit": "event#0",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "h6#5",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.12",
    "why": "Radar: turn the DD 2,000 t back face down. A face-down escort adds no ASW (2) to your targets' defence or to the counterattack; reveal another counter instead.",
    "actions": [
     {
      "type": "unflip",
      "unit": "dd2t#30",
      "rule": "14.12",
      "label": "Radar: turn it back face down (reveal another instead)"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.14",
    "why": "Aim. The captain puts 6 on a face-down ship (hit 40%).",
    "actions": [
     {
      "type": "points",
      "unit": "dd2t#30",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "dd2t#30",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "dd2t#30",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "dd2t#30",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "dd2t#30",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 80%, damaged 10%, sunk 0%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   }
  ]
 },
 {
  "id": "events",
  "title": "Combat Events",
  "summary": "One counter in each cup is a Combat Event: when it turns up, one die decides what happens to this attack round. Watch one change a fight.",
  "learn": [
   "Only one Event per attack round; a second goes back to the cup [14.12]",
   "The ten Events and what each changes [19.2]",
   "\"The results of the Event supersede the rules\" [19.2]"
  ],
  "seed": 1664,
  "start": 38,
  "tryAt": null,
  "steps": [
   {
    "turn": 1,
    "phase": "12.0",
    "why": "Move to Empire Pacific: a search there finds ships 90% of the time, against 80% in East China Sea.",
    "actions": [
     {
      "type": "move",
      "area": "empire_pacific",
      "label": "Move to empire_pacific",
      "rule": "12.0"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "13.1",
    "why": "Search: a sub earns its keep by finding convoys. Contact chance here 90%.",
    "actions": [
     {
      "type": "search",
      "label": "Search for contacts",
      "rule": "13.2"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.11",
    "why": "Column A: it reaches 5 of the 5 counters (its own column and the ones beside it).",
    "actions": [
     {
      "type": "place",
      "column": "A",
      "label": "Place in column A",
      "rule": "14.11"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.12",
    "why": "Reveal 2 counters. Tactical 4 allows 4 this round. Seeing the ships shows what is worth a torpedo, though each escort revealed adds its ASW.",
    "actions": [
     {
      "type": "reveal",
      "unit": "m7plus#53",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "dd1t#48",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.12",
    "why": "Radar: turn the DD 1,000 t back face down. A face-down escort adds no ASW (0.5) to your targets' defence or to the counterattack; reveal another counter instead.",
    "actions": [
     {
      "type": "unflip",
      "unit": "dd1t#48",
      "rule": "14.12",
      "label": "Radar: turn it back face down (reveal another instead)"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.12",
    "why": "Reveal 2 counters. Tactical 4 allows 4 this round. Seeing the ships shows what is worth a torpedo, though each escort revealed adds its ASW.",
    "actions": [
     {
      "type": "reveal",
      "unit": "event#0",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "h8#4",
      "label": "Reveal a counter in B",
      "rule": "14.12"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.13",
    "why": "Place 2 firing solutions. The captain prefers cargo to escorts. The markers are face down: good or bad shows when they turn over.",
    "actions": [
     {
      "type": "tdc",
      "unit": "m7plus#53",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "dd1t#48",
      "label": "Place a TDC marker",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.14",
    "why": "Aim. The captain puts 6 on maru 20,000 t (hit 10%, sink 3%).",
    "actions": [
     {
      "type": "target",
      "unit": "m7plus#53",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#53",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#53",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#53",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#53",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#53",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 80%, damaged 10%, sunk 0%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.3",
    "why": "Re-Attack: 5 ships still afloat and little chance of losing the boat (sunk 3%), though it may be damaged (27%). The TDC markers improve by one.",
    "actions": [
     {
      "type": "reattack",
      "label": "Conduct a Re-Attack round",
      "rule": "14.4"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.4",
    "why": "Stay in column A: no neighbouring column reaches more ships [14.4].",
    "actions": [
     {
      "type": "stay_column",
      "label": "Stay in column A",
      "rule": "14.4"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.12",
    "why": "Radar: turn the DD 1,000 t back face down. A face-down escort adds no ASW (0.5) to your targets' defence or to the counterattack; reveal another counter instead.",
    "actions": [
     {
      "type": "unflip",
      "unit": "dd1t#48",
      "rule": "14.12",
      "label": "Radar: turn it back face down (reveal another instead)"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.13",
    "why": "Place 2 firing solutions. The captain prefers cargo to escorts. The markers are face down: good or bad shows when they turn over.",
    "actions": [
     {
      "type": "tdc",
      "unit": "m7plus#53",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "dd1t#48",
      "label": "Place a TDC marker",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.14",
    "why": "Aim. The captain puts 6 on AO 10,000 t (hit 20%, sink 8%).",
    "actions": [
     {
      "type": "target",
      "unit": "m7plus#56",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#56",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#56",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#56",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#56",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#56",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 60%, damaged 27%, sunk 3%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.3",
    "why": "Re-Attack: 5 ships still afloat and little chance of losing the boat (sunk 3%), though it may be damaged (27%). The TDC markers improve by one.",
    "actions": [
     {
      "type": "reattack",
      "rule": "14.41",
      "label": "Try a second Re-Attack (Super Skipper roll: 1 or less)"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "12.0",
    "why": "Stay in Empire Pacific: nowhere in reach is busier (contact 80% here).",
    "actions": [
     {
      "type": "stay",
      "label": "Remain on station",
      "rule": "12.0"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "13.1",
    "why": "Search: a sub earns its keep by finding convoys. Contact chance here 80%.",
    "actions": [
     {
      "type": "search",
      "label": "Search for contacts",
      "rule": "13.2"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.11",
    "why": "Column A: it reaches 5 of the 5 counters (its own column and the ones beside it).",
    "actions": [
     {
      "type": "place",
      "column": "A",
      "label": "Place in column A",
      "rule": "14.11"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.12",
    "why": "Reveal 4 counters. Tactical 4 allows 4 this round. Seeing the ships shows what is worth a torpedo, though each escort revealed adds its ASW.",
    "actions": [
     {
      "type": "reveal",
      "unit": "m6minus#76",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "m6minus#74",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "m6minus#73",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "dd2t#30",
      "label": "Reveal a counter in B",
      "rule": "14.12"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.12",
    "why": "Radar: turn the DD 2,000 t back face down. A face-down escort adds no ASW (3) to your targets' defence or to the counterattack; reveal another counter instead.",
    "actions": [
     {
      "type": "unflip",
      "unit": "dd2t#30",
      "rule": "14.12",
      "label": "Radar: turn it back face down (reveal another instead)"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.13",
    "why": "Place 4 firing solutions. The captain prefers cargo to escorts. The markers are face down: good or bad shows when they turn over.",
    "actions": [
     {
      "type": "tdc",
      "unit": "m6minus#76",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m6minus#74",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m6minus#73",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "dd2t#30",
      "label": "Place a TDC marker",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.14",
    "why": "Aim. The captain puts 6 on maru 5,000 t (hit 80%, sink 40%).",
    "actions": [
     {
      "type": "target",
      "unit": "m6minus#76",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#76",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#76",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#76",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#76",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#76",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 100%, damaged 0%, sunk 0%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.3",
    "why": "Re-Attack: 4 ships still afloat and little chance of losing the boat (sunk 0%), though it may be damaged (0%). The TDC markers improve by one.",
    "actions": [
     {
      "type": "reattack",
      "label": "Conduct a Re-Attack round",
      "rule": "14.4"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.4",
    "why": "Stay in column A: no neighbouring column reaches more ships [14.4].",
    "actions": [
     {
      "type": "stay_column",
      "label": "Stay in column A",
      "rule": "14.4"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.12",
    "why": "Radar: turn the DD 2,000 t back face down. A face-down escort adds no ASW (3) to your targets' defence or to the counterattack; reveal another counter instead.",
    "actions": [
     {
      "type": "unflip",
      "unit": "dd2t#30",
      "rule": "14.12",
      "label": "Radar: turn it back face down (reveal another instead)"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.13",
    "why": "Place 3 firing solutions. The captain prefers cargo to escorts. The markers are face down: good or bad shows when they turn over.",
    "actions": [
     {
      "type": "tdc",
      "unit": "m6minus#74",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m6minus#73",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "dd2t#30",
      "label": "Place a TDC marker",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.14",
    "why": "Aim. The captain puts 6 on maru 5,000 t (hit 30%, sink 15%).",
    "actions": [
     {
      "type": "target",
      "unit": "m6minus#74",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#74",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#74",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#74",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#74",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#74",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 100%, damaged 0%, sunk 0%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.3",
    "why": "Re-Attack: 4 ships still afloat and little chance of losing the boat (sunk 0%), though it may be damaged (0%). The TDC markers improve by one.",
    "actions": [
     {
      "type": "reattack",
      "rule": "14.41",
      "label": "Try a second Re-Attack (Super Skipper roll: 1 or less)"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.4",
    "why": "Stay in column A: no neighbouring column reaches more ships [14.4].",
    "actions": [
     {
      "type": "stay_column",
      "label": "Stay in column A",
      "rule": "14.4"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.12",
    "why": "Radar: turn the DD 2,000 t back face down. A face-down escort adds no ASW (3) to your targets' defence or to the counterattack; reveal another counter instead.",
    "actions": [
     {
      "type": "unflip",
      "unit": "dd2t#30",
      "rule": "14.12",
      "label": "Radar: turn it back face down (reveal another instead)"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.13",
    "why": "Place 3 firing solutions. The captain prefers cargo to escorts. The markers are face down: good or bad shows when they turn over.",
    "actions": [
     {
      "type": "tdc",
      "unit": "m6minus#74",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m6minus#73",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "dd2t#30",
      "label": "Place a TDC marker",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.14",
    "why": "Aim. The captain puts 6 on maru 5,000 t (hit 50%, sink 25%).",
    "actions": [
     {
      "type": "target",
      "unit": "m6minus#74",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#74",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#74",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#74",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#74",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#74",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 100%, damaged 0%, sunk 0%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   },
   {
    "turn": 3,
    "phase": "12.0",
    "why": "Stay in Empire Pacific: nowhere in reach is busier (contact 80% here).",
    "actions": [
     {
      "type": "stay",
      "label": "Remain on station",
      "rule": "12.0"
     }
    ]
   },
   {
    "turn": 3,
    "phase": "13.1",
    "why": "Search: a sub earns its keep by finding convoys. Contact chance here 80%.",
    "actions": [
     {
      "type": "search",
      "label": "Search for contacts",
      "rule": "13.2"
     }
    ]
   },
   {
    "turn": 3,
    "phase": "14.11",
    "why": "Column A: it reaches 3 of the 3 counters (its own column and the ones beside it).",
    "actions": [
     {
      "type": "place",
      "column": "A",
      "label": "Place in column A",
      "rule": "14.11"
     }
    ]
   },
   {
    "turn": 3,
    "phase": "14.12",
    "why": "Reveal 3 counters. Tactical 4 allows 4 this round. Seeing the ships shows what is worth a torpedo, though each escort revealed adds its ASW.",
    "actions": [
     {
      "type": "reveal",
      "unit": "m6minus#69",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "m6minus#71",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "event#1",
      "label": "Reveal a counter in B",
      "rule": "14.12"
     }
    ]
   },
   {
    "turn": 3,
    "phase": "14.13",
    "why": "Place 1 firing solution. The captain prefers cargo to escorts. The markers are face down: good or bad shows when they turn over.",
    "actions": [
     {
      "type": "tdc",
      "unit": "m6minus#69",
      "label": "Place a TDC marker",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 3,
    "phase": "14.14",
    "why": "Surface gunnery: shell the biggest merchant in your column (maru 5,000 t). The boat will be Spotted [19.2].",
    "actions": [
     {
      "type": "gunnery",
      "unit": "m6minus#69",
      "label": "Surface and shell this ship",
      "rule": "19.2"
     }
    ]
   },
   {
    "turn": 3,
    "phase": "14.3",
    "why": "Re-Attack: 3 ships still afloat and little chance of losing the boat (sunk 0%), though it may be damaged (0%). The TDC markers improve by one.",
    "actions": [
     {
      "type": "reattack",
      "label": "Conduct a Re-Attack round",
      "rule": "14.4"
     }
    ]
   }
  ]
 },
 {
  "id": "subvssub",
  "title": "Enemy submarine!",
  "summary": "Two zeros on the activity chart: an enemy submarine. Who sees whom first decides who fires; one round, no escorts, no second chance.",
  "learn": [
   "When a search finds a submarine [13.2A]",
   "Detection: −1 spotted or damaged, +1 radar [14.6B]",
   "One attack round, the 1-4 line of the ART [14.6E-F]"
  ],
  "seed": 7,
  "start": 0,
  "tryAt": null,
  "steps": [
   {
    "turn": 1,
    "phase": "12.0",
    "why": "Move to Empire Pacific: a search there finds ships 90% of the time, against 80% in East China Sea.",
    "actions": [
     {
      "type": "move",
      "area": "empire_pacific",
      "label": "Move to empire_pacific",
      "rule": "12.0"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "13.1",
    "why": "Search: a sub earns its keep by finding convoys. Contact chance here 90%.",
    "actions": [
     {
      "type": "search",
      "label": "Search for contacts",
      "rule": "13.2"
     }
    ]
   }
  ]
 },
 {
  "id": "lost",
  "title": "When the escorts win",
  "summary": "Red boxes on the chart and revealed escorts add up. A fight that goes wrong, and why the odds allowed it.",
  "learn": [
   "Red boxes: every busy area bites back [14.2A2]",
   "How a boat is lost [14.2]",
   "Why concentrating escorts in reach is dangerous"
  ],
  "seed": 127,
  "start": 18,
  "tryAt": null,
  "steps": [
   {
    "turn": 1,
    "phase": "12.0",
    "why": "Move to Empire Pacific: a search there finds ships 90% of the time, against 80% in East China Sea.",
    "actions": [
     {
      "type": "move",
      "area": "empire_pacific",
      "label": "Move to empire_pacific",
      "rule": "12.0"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "13.1",
    "why": "Search: a sub earns its keep by finding convoys. Contact chance here 90%.",
    "actions": [
     {
      "type": "search",
      "label": "Search for contacts",
      "rule": "13.2"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.11",
    "why": "Column C: it reaches 6 of the 7 counters (its own column and the ones beside it).",
    "actions": [
     {
      "type": "place",
      "column": "C",
      "label": "Place in column C",
      "rule": "14.11"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.12",
    "why": "Reveal 4 counters. Tactical 4 allows 4 this round. Seeing the ships shows what is worth a torpedo, though each escort revealed adds its ASW.",
    "actions": [
     {
      "type": "reveal",
      "unit": "m6minus#84",
      "label": "Reveal a counter in B",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "m6minus#86",
      "label": "Reveal a counter in B",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "cl5t#22",
      "label": "Reveal a counter in C",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "dd2t#40",
      "label": "Reveal a counter in C",
      "rule": "14.12"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.12",
    "why": "Radar: turn the DD 2,000 t back face down. A face-down escort adds no ASW (1) to your targets' defence or to the counterattack; reveal another counter instead.",
    "actions": [
     {
      "type": "unflip",
      "unit": "dd2t#40",
      "rule": "14.12",
      "label": "Radar: turn it back face down (reveal another instead)"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.12",
    "why": "Reveal 1 counter. Tactical 4 allows 4 this round. Seeing the ships shows what is worth a torpedo, though each escort revealed adds its ASW.",
    "actions": [
     {
      "type": "reveal",
      "unit": "ca15t#18",
      "label": "Reveal a counter in D",
      "rule": "14.12"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.13",
    "why": "Place 4 firing solutions. The captain prefers cargo to escorts. The markers are face down: good or bad shows when they turn over.",
    "actions": [
     {
      "type": "tdc",
      "unit": "m6minus#84",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m6minus#86",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "dd2t#40",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "bb35t#14",
      "label": "Place a TDC marker",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.14",
    "why": "Aim. The captain puts 1 on a face-down ship (hit 40%) and 5 on maru 2,000 t (hit 30%, sink 18%).",
    "actions": [
     {
      "type": "target",
      "unit": "dd2t#40",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "target",
      "unit": "m6minus#84",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#84",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#84",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#84",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#84",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 100%, damaged 0%, sunk 0%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.3",
    "why": "Re-Attack: 4 ships still afloat and little chance of losing the boat (sunk 0%), though it may be damaged (10%). The TDC markers improve by one.",
    "actions": [
     {
      "type": "reattack",
      "label": "Conduct a Re-Attack round",
      "rule": "14.4"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.4",
    "why": "Stay in column C: no neighbouring column reaches more ships [14.4].",
    "actions": [
     {
      "type": "stay_column",
      "label": "Stay in column C",
      "rule": "14.4"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.12",
    "why": "Nothing left to reveal.",
    "actions": [
     {
      "type": "done_reveal",
      "label": "Proceed to TDC placement",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.13",
    "why": "Place 4 firing solutions. The captain prefers cargo to escorts. The markers are face down: good or bad shows when they turn over.",
    "actions": [
     {
      "type": "tdc",
      "unit": "m6minus#84",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m6minus#86",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "bb35t#14",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "cl5t#22",
      "label": "Place a TDC marker",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.14",
    "why": "Aim. The captain puts 6 on CL 5,000 t (hit 50%, sink 25%).",
    "actions": [
     {
      "type": "target",
      "unit": "cl5t#22",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "cl5t#22",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "cl5t#22",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "cl5t#22",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "cl5t#22",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "cl5t#22",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 80%, damaged 10%, sunk 0%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "14.3",
    "why": "Withdraw: going again risks too much (sunk 0%, damaged 20%, and the boat is already damaged).",
    "actions": [
     {
      "type": "withdraw",
      "label": "Withdraw from combat",
      "rule": "14.3"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "12.0",
    "why": "Stay in Empire Pacific: nowhere in reach is busier (contact 90% here).",
    "actions": [
     {
      "type": "stay",
      "label": "Remain on station",
      "rule": "12.0"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "13.1",
    "why": "Search: a sub earns its keep by finding convoys. Contact chance here 90%.",
    "actions": [
     {
      "type": "search",
      "label": "Search for contacts",
      "rule": "13.2"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.11",
    "why": "Column C: it reaches 8 of the 9 counters (its own column and the ones beside it).",
    "actions": [
     {
      "type": "place",
      "column": "C",
      "label": "Place in column C",
      "rule": "14.11"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.12",
    "why": "Reveal 1 counter. Tactical 4 allows 4 this round. Seeing the ships shows what is worth a torpedo, though each escort revealed adds its ASW.",
    "actions": [
     {
      "type": "reveal",
      "unit": "event#1",
      "label": "Reveal a counter in B",
      "rule": "14.12"
     }
    ]
   }
  ]
 },
 {
  "id": "port",
  "title": "Home, repair and ready",
  "summary": "A damaged boat makes for base, works through the Repair Boxes a week at a time, is readied and sails again.",
  "learn": [
   "Choosing a base to return to [15.2]",
   "Damage is fixed on arrival: the Damage Table [18.3]",
   "Repair Boxes 3, 2, 1: one die a week against the printed number [10.0]",
   "Readiness from the Broom Box [9.0]"
  ],
  "seed": 1,
  "career": "s38",
  "start": 11,
  "tryAt": null,
  "steps": [
   {
    "turn": 1,
    "phase": "base",
    "why": "Sail for Solomons, where Lt. Henry G. Munson went on the real patrol [32.11].",
    "actions": [
     {
      "type": "sail",
      "area": "solomons",
      "rule": "15.1",
      "label": "Sail for Solomons (on station next week)"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "12.0",
    "why": "Stay in Solomons: nowhere in reach is busier (contact 90% here).",
    "actions": [
     {
      "type": "stay",
      "label": "Remain on station",
      "rule": "12.0"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "13.1",
    "why": "Search: a sub earns its keep by finding convoys. Contact chance here 90%.",
    "actions": [
     {
      "type": "search",
      "label": "Search for contacts",
      "rule": "13.2"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.11",
    "why": "Column A: it reaches 5 of the 5 counters (its own column and the ones beside it).",
    "actions": [
     {
      "type": "place",
      "column": "A",
      "label": "Place in column A",
      "rule": "14.11"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.12",
    "why": "Reveal 2 counters. Tactical 2 allows 2 this round. Seeing the ships shows what is worth a torpedo, though each escort revealed adds its ASW.",
    "actions": [
     {
      "type": "reveal",
      "unit": "m6minus#78",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "m7plus#53",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.13",
    "why": "Place 2 firing solutions. The captain prefers cargo to escorts. The markers are face down: good or bad shows when they turn over.",
    "actions": [
     {
      "type": "tdc",
      "unit": "m6minus#78",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m7plus#53",
      "label": "Place a TDC marker",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.14",
    "why": "Aim. The captain puts 3 on maru 5,000 t (hit 30%, sink 15%).",
    "actions": [
     {
      "type": "target",
      "unit": "m6minus#78",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#78",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#78",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 80%, damaged 10%, sunk 0%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.3",
    "why": "Withdraw: going again risks too much (sunk 3%, damaged 27%, and the boat is already damaged).",
    "actions": [
     {
      "type": "withdraw",
      "label": "Withdraw from combat",
      "rule": "14.3"
     }
    ]
   },
   {
    "turn": 3,
    "phase": "12.0",
    "why": "Stay in Solomons: nowhere in reach is busier (contact 90% here).",
    "actions": [
     {
      "type": "stay",
      "label": "Remain on station",
      "rule": "12.0"
     }
    ]
   },
   {
    "turn": 3,
    "phase": "13.1",
    "why": "Search: a sub earns its keep by finding convoys. Contact chance here 90%.",
    "actions": [
     {
      "type": "search",
      "label": "Search for contacts",
      "rule": "13.2"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "15.0",
    "why": "Head for Pearl Harbor: the nearest base, and the best repair yard for a damaged boat [15.2].",
    "actions": [
     {
      "type": "rtb_to",
      "base": "pearl",
      "rule": "15.2",
      "label": "Return to Pearl Harbor (in port this week)"
     }
    ]
   },
   {
    "turn": 6,
    "phase": "base",
    "why": "Sail for Solomons: busy water (a search there finds ships 90% of the time) within a short run from Pearl Harbor.",
    "actions": [
     {
      "type": "sail",
      "area": "solomons",
      "rule": "15.1",
      "label": "Sail for Solomons (on station next week)"
     }
    ]
   }
  ]
 },
 {
  "id": "transit",
  "title": "Out and home: Transit Events",
  "summary": "Every trip across open water rolls once for a Transit Event on the most dangerous chart on the route. Watch one happen.",
  "learn": [
   "Sailing: up to Speed areas a week on the Transit side [15.1]",
   "The governing chart: where the red boxes start lowest [19.1]",
   "Rolling at or above that number: two dice on the Transit Event Table [19.1]"
  ],
  "seed": 4,
  "career": "s38",
  "start": 0,
  "tryAt": null,
  "steps": [
   {
    "turn": 1,
    "phase": "base",
    "why": "Sail for Solomons, where Lt. Henry G. Munson went on the real patrol [32.11].",
    "actions": [
     {
      "type": "sail",
      "area": "solomons",
      "rule": "15.1",
      "label": "Sail for Solomons (on station next week)"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "12.0",
    "why": "Stay in Solomons: nowhere in reach is busier (contact 100% here).",
    "actions": [
     {
      "type": "stay",
      "label": "Remain on station",
      "rule": "12.0"
     }
    ]
   }
  ]
 },
 {
  "id": "mission",
  "title": "Special Mission orders",
  "summary": "A War Event sends boats to an operation. Yours is in reach, so it goes: into the zone, with only the contacts the orders allow.",
  "learn": [
   "War Events and Special Missions [5.0]",
   "Entering a Special Mission Zone: +2 on the Transit Event check [20.3]",
   "One Activity Level higher in the zone; only TF (or C2 and TF) contacts count [20.4]",
   "No Endurance roll; then home [20.5]"
  ],
  "seed": 2,
  "career": "rasher",
  "start": 51,
  "tryAt": null,
  "steps": [
   {
    "turn": 1,
    "phase": "base",
    "why": "Form a wolfpack: three boats find more, and share the escorts' attention [24.0].",
    "actions": [
     {
      "type": "form_pack",
      "rule": "24.1",
      "label": "Form a wolfpack for this patrol: your boat and two more [24.1]"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "base",
    "why": "Sail for Yellow Sea: busy water (a search there finds ships 90% of the time) within a short run from Fremantle.",
    "actions": [
     {
      "type": "sail",
      "area": "yellow_sea",
      "rule": "15.1",
      "label": "Sail for Yellow Sea (3 weeks out)"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "15.0",
    "why": "Keep going at full Speed: every week in transit is a week not hunting [15.0].",
    "actions": [
     {
      "type": "transit_on",
      "rule": "15.11",
      "label": "Continue to Yellow Sea"
     }
    ]
   },
   {
    "turn": 3,
    "phase": "15.0",
    "why": "Keep going at full Speed: every week in transit is a week not hunting [15.0].",
    "actions": [
     {
      "type": "transit_on",
      "rule": "15.11",
      "label": "Continue to Yellow Sea (arrives this week)"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "12.0",
    "why": "Stay in Yellow Sea: nowhere in reach is busier (contact 90% here).",
    "actions": [
     {
      "type": "stay",
      "label": "Remain on station",
      "rule": "12.0"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "13.1",
    "why": "Group: contact is likely anyway (90%), and a group pack attacks with every boat [24.31].",
    "actions": [
     {
      "type": "search",
      "label": "Search as a Group pack: one roll [24.31]",
      "rule": "24.31"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.11",
    "why": "Column A: it reaches 5 of the 5 counters (its own column and the ones beside it).",
    "actions": [
     {
      "type": "place",
      "column": "A",
      "label": "Place USS Rasher (SS-269) in column A",
      "rule": "24.5"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.11",
    "why": "Column A: it reaches 5 of the 5 counters (its own column and the ones beside it).",
    "actions": [
     {
      "type": "place",
      "column": "A",
      "label": "Place USS Haddock in column A",
      "rule": "24.5"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.11",
    "why": "Column B: it reaches 5 of the 5 counters (its own column and the ones beside it).",
    "actions": [
     {
      "type": "place",
      "column": "B",
      "label": "Place USS Guavina in column B",
      "rule": "24.5"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.12",
    "why": "Reveal 4 counters. Tactical 4 allows 4 this round. Seeing the ships shows what is worth a torpedo, though each escort revealed adds its ASW.",
    "actions": [
     {
      "type": "reveal",
      "unit": "m6minus#71",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "m7plus#52",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "m6minus#68",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "cl5t#21",
      "label": "Reveal a counter in B",
      "rule": "14.12"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.12",
    "why": "Nothing left to reveal.",
    "actions": [
     {
      "type": "done_reveal",
      "label": "Proceed to TDC placement",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.13",
    "why": "Place 4 firing solutions. The captain prefers cargo to escorts. The markers are face down: good or bad shows when they turn over.",
    "actions": [
     {
      "type": "tdc",
      "unit": "m6minus#71",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m7plus#52",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m6minus#68",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "de1t#46",
      "label": "Place a TDC marker",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.14",
    "why": "Aim. The captain puts 7 on maru 10,000 t (hit 70%, sink 42%).",
    "actions": [
     {
      "type": "target",
      "unit": "m7plus#52",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#52",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#52",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#52",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#52",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#52",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#52",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 100%, damaged 0%, sunk 0%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.12",
    "why": "Radar: turn the DE 1,000 t back face down. A face-down escort adds no ASW (2) to your targets' defence or to the counterattack; reveal another counter instead.",
    "actions": [
     {
      "type": "unflip",
      "unit": "de1t#46",
      "rule": "14.12",
      "label": "Radar: turn it back face down (reveal another instead)"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.14",
    "why": "Aim. The captain puts 7 on maru 10,000 t (hit 70%, sink 42%).",
    "actions": [
     {
      "type": "target",
      "unit": "m7plus#52",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#52",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#52",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#52",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#52",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#52",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#52",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 100%, damaged 0%, sunk 0%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.14",
    "why": "Aim. The captain puts 7 on CL 5,000 t (hit 60%, sink 42%).",
    "actions": [
     {
      "type": "target",
      "unit": "cl5t#21",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "cl5t#21",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "cl5t#21",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "cl5t#21",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "cl5t#21",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "cl5t#21",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "cl5t#21",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 100%, damaged 0%, sunk 0%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.3",
    "why": "Re-Attack: 3 ships still afloat and little chance of losing the boat (sunk 0%), though it may be damaged (0%). The TDC markers improve by one.",
    "actions": [
     {
      "type": "reattack",
      "label": "Wolfpack Re-Attack: each boat rolls its Tactical or less [24.55]",
      "rule": "24.55"
     }
    ]
   },
   {
    "turn": 5,
    "phase": "12.0",
    "why": "Stay in Yellow Sea: nowhere in reach is busier (contact 90% here).",
    "actions": [
     {
      "type": "stay",
      "label": "Remain on station",
      "rule": "12.0"
     }
    ]
   },
   {
    "turn": 5,
    "phase": "13.1",
    "why": "Search: a sub earns its keep by finding convoys. Contact chance here 90%.",
    "actions": [
     {
      "type": "search",
      "label": "Search for contacts",
      "rule": "13.2"
     }
    ]
   },
   {
    "turn": 5,
    "phase": "14.11",
    "why": "Column A: it reaches 3 of the 3 counters (its own column and the ones beside it).",
    "actions": [
     {
      "type": "place",
      "column": "A",
      "label": "Place in column A",
      "rule": "14.11"
     }
    ]
   },
   {
    "turn": 5,
    "phase": "14.12",
    "why": "Reveal 1 counter. Tactical 4 allows 4 this round. Seeing the ships shows what is worth a torpedo, though each escort revealed adds its ASW.",
    "actions": [
     {
      "type": "reveal",
      "unit": "dd2t#27",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     }
    ]
   },
   {
    "turn": 5,
    "phase": "14.12",
    "why": "Radar: turn the DD 2,000 t back face down. A face-down escort adds no ASW (1) to your targets' defence or to the counterattack; reveal another counter instead.",
    "actions": [
     {
      "type": "unflip",
      "unit": "dd2t#27",
      "rule": "14.12",
      "label": "Radar: turn it back face down (reveal another instead)"
     }
    ]
   },
   {
    "turn": 5,
    "phase": "14.12",
    "why": "Reveal 1 counter. Tactical 4 allows 4 this round. Seeing the ships shows what is worth a torpedo, though each escort revealed adds its ASW.",
    "actions": [
     {
      "type": "reveal",
      "unit": "m6minus#67",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     }
    ]
   },
   {
    "turn": 5,
    "phase": "14.13",
    "why": "Place 2 firing solutions. The captain prefers cargo to escorts. The markers are face down: good or bad shows when they turn over.",
    "actions": [
     {
      "type": "tdc",
      "unit": "dd2t#27",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m6minus#67",
      "label": "Place a TDC marker",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 5,
    "phase": "14.14",
    "why": "Aim. The captain puts 7 on maru 2,000 t (hit 70%, sink 56%).",
    "actions": [
     {
      "type": "target",
      "unit": "m6minus#67",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#67",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#67",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#67",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#67",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#67",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#67",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 5,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 80%, damaged 10%, sunk 0%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   },
   {
    "turn": 5,
    "phase": "14.3",
    "why": "Re-Attack: 2 ships still afloat and little chance of losing the boat (sunk 0%), though it may be damaged (20%). The TDC markers improve by one.",
    "actions": [
     {
      "type": "reattack",
      "label": "Conduct a Re-Attack round",
      "rule": "14.4"
     }
    ]
   },
   {
    "turn": 5,
    "phase": "14.4",
    "why": "Stay in column A: no neighbouring column reaches more ships [14.4].",
    "actions": [
     {
      "type": "stay_column",
      "label": "Stay in column A",
      "rule": "14.4"
     }
    ]
   },
   {
    "turn": 5,
    "phase": "14.12",
    "why": "Radar: turn the DD 2,000 t back face down. A face-down escort adds no ASW (1) to your targets' defence or to the counterattack; reveal another counter instead.",
    "actions": [
     {
      "type": "unflip",
      "unit": "dd2t#27",
      "rule": "14.12",
      "label": "Radar: turn it back face down (reveal another instead)"
     }
    ]
   },
   {
    "turn": 5,
    "phase": "14.13",
    "why": "Place 2 firing solutions. The captain prefers cargo to escorts. The markers are face down: good or bad shows when they turn over.",
    "actions": [
     {
      "type": "tdc",
      "unit": "dd2t#27",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m6minus#67",
      "label": "Place a TDC marker",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 5,
    "phase": "14.14",
    "why": "Aim. The captain puts 7 on maru 2,000 t (hit 50%, sink 50%).",
    "actions": [
     {
      "type": "target",
      "unit": "m6minus#67",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#67",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#67",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#67",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#67",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#67",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#67",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 5,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 70%, damaged 20%, sunk 0%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   },
   {
    "turn": 6,
    "phase": "12.0",
    "why": "Stay in Yellow Sea: nowhere in reach is busier (contact 90% here).",
    "actions": [
     {
      "type": "stay",
      "label": "Remain on station",
      "rule": "12.0"
     }
    ]
   },
   {
    "turn": 6,
    "phase": "13.1",
    "why": "Search: a sub earns its keep by finding convoys. Contact chance here 90%.",
    "actions": [
     {
      "type": "search",
      "label": "Search for contacts",
      "rule": "13.2"
     }
    ]
   },
   {
    "turn": 6,
    "phase": "14.11",
    "why": "Column A: it reaches 5 of the 5 counters (its own column and the ones beside it).",
    "actions": [
     {
      "type": "place",
      "column": "A",
      "label": "Place in column A",
      "rule": "14.11"
     }
    ]
   },
   {
    "turn": 6,
    "phase": "14.12",
    "why": "Reveal 2 counters. Tactical 4 allows 4 this round. Seeing the ships shows what is worth a torpedo, though each escort revealed adds its ASW.",
    "actions": [
     {
      "type": "reveal",
      "unit": "m7plus#52",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "de1t#45",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     }
    ]
   },
   {
    "turn": 6,
    "phase": "14.12",
    "why": "Radar: turn the DE 1,000 t back face down. A face-down escort adds no ASW (2) to your targets' defence or to the counterattack; reveal another counter instead.",
    "actions": [
     {
      "type": "unflip",
      "unit": "de1t#45",
      "rule": "14.12",
      "label": "Radar: turn it back face down (reveal another instead)"
     }
    ]
   },
   {
    "turn": 6,
    "phase": "14.12",
    "why": "Reveal 2 counters. Tactical 4 allows 4 this round. Seeing the ships shows what is worth a torpedo, though each escort revealed adds its ASW.",
    "actions": [
     {
      "type": "reveal",
      "unit": "m6minus#65",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "m7plus#55",
      "label": "Reveal a counter in B",
      "rule": "14.12"
     }
    ]
   },
   {
    "turn": 6,
    "phase": "14.13",
    "why": "Place 4 firing solutions. The captain prefers cargo to escorts. The markers are face down: good or bad shows when they turn over.",
    "actions": [
     {
      "type": "tdc",
      "unit": "m7plus#52",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "de1t#45",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m6minus#65",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m7plus#55",
      "label": "Place a TDC marker",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 6,
    "phase": "14.14",
    "why": "Aim. The captain puts 1 on maru 3,000 t (hit 40%, sink 32%) and 6 on AF 9,000 t (hit 40%, sink 28%).",
    "actions": [
     {
      "type": "target",
      "unit": "m6minus#65",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "target",
      "unit": "m7plus#55",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#55",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#55",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#55",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#55",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m7plus#55",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 6,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 100%, damaged 0%, sunk 0%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   },
   {
    "turn": 6,
    "phase": "14.3",
    "why": "Withdraw: going again risks too much (sunk 0%, damaged 0%, and the boat is already damaged).",
    "actions": [
     {
      "type": "withdraw",
      "label": "Withdraw from combat",
      "rule": "14.3"
     }
    ]
   },
   {
    "turn": 7,
    "phase": "12.0",
    "why": "Stay in Yellow Sea: nowhere in reach is busier (contact 90% here).",
    "actions": [
     {
      "type": "stay",
      "label": "Remain on station",
      "rule": "12.0"
     }
    ]
   },
   {
    "turn": 7,
    "phase": "13.1",
    "why": "Search: a sub earns its keep by finding convoys. Contact chance here 90%.",
    "actions": [
     {
      "type": "search",
      "label": "Search for contacts",
      "rule": "13.2"
     }
    ]
   },
   {
    "turn": 8,
    "phase": "15.0",
    "why": "Head for Majuro: the nearest base [15.2].",
    "actions": [
     {
      "type": "rtb_to",
      "base": "majuro",
      "rule": "15.2",
      "label": "Return to Majuro (2 weeks)"
     }
    ]
   },
   {
    "turn": 26,
    "phase": "base",
    "why": "Form a wolfpack: three boats find more, and share the escorts' attention [24.0].",
    "actions": [
     {
      "type": "form_pack",
      "rule": "24.1",
      "label": "Form a wolfpack for this patrol: your boat and two more [24.1]"
     }
    ]
   },
   {
    "turn": 26,
    "phase": "base",
    "why": "Sail for Yellow Sea: busy water (a search there finds ships 80% of the time) within a short run from Pearl Harbor.",
    "actions": [
     {
      "type": "sail",
      "area": "yellow_sea",
      "rule": "15.1",
      "label": "Sail for Yellow Sea (3 weeks out)"
     }
    ]
   },
   {
    "turn": 27,
    "phase": "15.0",
    "why": "Keep going at full Speed: every week in transit is a week not hunting [15.0].",
    "actions": [
     {
      "type": "transit_on",
      "rule": "15.11",
      "label": "Continue to Yellow Sea"
     }
    ]
   },
   {
    "turn": 28,
    "phase": "12.0",
    "why": "Orders: Special Mission: Support B-29 raids on Japan. The boat goes where the War Event sends it [5.0].",
    "actions": [
     {
      "type": "enter_smz",
      "smz": "inland_sea",
      "via": "empire_pacific",
      "rule": "12.1",
      "label": "Special Mission: enter Inland Sea & Tokyo Bay by way of Empire Pacific"
     }
    ]
   },
   {
    "turn": 29,
    "phase": "15.0",
    "why": "Head for Midway Island: the nearest base [15.2].",
    "actions": [
     {
      "type": "rtb_to",
      "base": "midway",
      "rule": "15.2",
      "label": "Return to Midway Island (in port this week)"
     }
    ]
   }
  ]
 },
 {
  "id": "war",
  "title": "The war moves on",
  "summary": "The Master Reinforcement list sends the boat to California for overhaul. The war does not wait: months pass, then the boat is back at Pearl Harbor.",
  "learn": [
   "Withdrawal for overhaul, even from sea [8.0C]",
   "Return months later to Pearl Harbor [8.0D]",
   "Meanwhile: War Events, ULTRA, torpedo fixes and War Progress [5.0-7.0, 17.0]"
  ],
  "seed": 1,
  "career": "sculpin",
  "start": 44,
  "tryAt": 45,
  "steps": [
   {
    "turn": 1,
    "phase": "base",
    "why": "Sail for Solomons, where Lucius H. Chappell went on the real patrol [32.12].",
    "actions": [
     {
      "type": "sail",
      "area": "solomons",
      "rule": "15.1",
      "label": "Sail for Solomons (on station next week)"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "12.0",
    "why": "Stay in Solomons: nowhere in reach is busier (contact 90% here).",
    "actions": [
     {
      "type": "stay",
      "label": "Remain on station",
      "rule": "12.0"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "13.1",
    "why": "Search: a sub earns its keep by finding convoys. Contact chance here 90%.",
    "actions": [
     {
      "type": "search",
      "label": "Search for contacts",
      "rule": "13.2"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.11",
    "why": "Column A: it reaches 5 of the 5 counters (its own column and the ones beside it).",
    "actions": [
     {
      "type": "place",
      "column": "A",
      "label": "Place in column A",
      "rule": "14.11"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.12",
    "why": "Reveal 4 counters. Tactical 4 allows 4 this round. Seeing the ships shows what is worth a torpedo, though each escort revealed adds its ASW.",
    "actions": [
     {
      "type": "reveal",
      "unit": "m6minus#78",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "m7plus#53",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "m6minus#75",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "m6minus#79",
      "label": "Reveal a counter in B",
      "rule": "14.12"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.13",
    "why": "Place 4 firing solutions. The captain prefers cargo to escorts. The markers are face down: good or bad shows when they turn over.",
    "actions": [
     {
      "type": "tdc",
      "unit": "m6minus#78",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m7plus#53",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m6minus#75",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m6minus#79",
      "label": "Place a TDC marker",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.14",
    "why": "Aim. The captain puts 6 on maru 5,000 t (hit 60%, sink 30%).",
    "actions": [
     {
      "type": "target",
      "unit": "m6minus#78",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#78",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#78",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#78",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#78",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#78",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 90%, damaged 0%, sunk 0%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.3",
    "why": "Re-Attack: 5 ships still afloat and little chance of losing the boat (sunk 0%), though it may be damaged (10%). The TDC markers improve by one.",
    "actions": [
     {
      "type": "reattack",
      "label": "Conduct a Re-Attack round",
      "rule": "14.4"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.4",
    "why": "Stay in column A: no neighbouring column reaches more ships [14.4].",
    "actions": [
     {
      "type": "stay_column",
      "label": "Stay in column A",
      "rule": "14.4"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.13",
    "why": "Place 4 firing solutions. The captain prefers cargo to escorts. The markers are face down: good or bad shows when they turn over.",
    "actions": [
     {
      "type": "tdc",
      "unit": "m6minus#78",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m7plus#53",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m6minus#75",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m6minus#79",
      "label": "Place a TDC marker",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.14",
    "why": "Aim. The captain puts 1 on maru 2,000 t (hit 30%, sink 18%) and 5 on AO 5,000 t (hit 50%, sink 25%).",
    "actions": [
     {
      "type": "target",
      "unit": "m6minus#75",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "target",
      "unit": "m6minus#79",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#79",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#79",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#79",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#79",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 80%, damaged 10%, sunk 0%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   },
   {
    "turn": 3,
    "phase": "15.0",
    "why": "Head for Pearl Harbor: the nearest base [15.2].",
    "actions": [
     {
      "type": "rtb_to",
      "base": "pearl",
      "rule": "15.2",
      "label": "Return to Pearl Harbor (in port this week)"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "base",
    "why": "Sail for Sea of Japan: busy water (a search there finds ships 100% of the time) within a short run from Pearl Harbor.",
    "actions": [
     {
      "type": "sail",
      "area": "sea_of_japan",
      "rule": "15.1",
      "label": "Sail for Sea of Japan (2 weeks out)"
     }
    ]
   },
   {
    "turn": 5,
    "phase": "15.0",
    "why": "Keep going at full Speed: every week in transit is a week not hunting [15.0].",
    "actions": [
     {
      "type": "transit_on",
      "rule": "15.11",
      "label": "Continue to Sea of Japan (arrives this week)"
     }
    ]
   },
   {
    "turn": 6,
    "phase": "12.0",
    "why": "Stay in Sea of Japan: nowhere in reach is busier (contact 100% here).",
    "actions": [
     {
      "type": "stay",
      "label": "Remain on station",
      "rule": "12.0"
     }
    ]
   },
   {
    "turn": 6,
    "phase": "13.1",
    "why": "Search: a sub earns its keep by finding convoys. Contact chance here 100%.",
    "actions": [
     {
      "type": "search",
      "label": "Search for contacts",
      "rule": "13.2"
     }
    ]
   },
   {
    "turn": 6,
    "phase": "14.11",
    "why": "Column B: it reaches 12 of the 12 counters (its own column and the ones beside it).",
    "actions": [
     {
      "type": "place",
      "column": "B",
      "label": "Place in column B",
      "rule": "14.11"
     }
    ]
   },
   {
    "turn": 6,
    "phase": "14.12",
    "why": "Reveal 4 counters. Tactical 4 allows 4 this round. Seeing the ships shows what is worth a torpedo, though each escort revealed adds its ASW.",
    "actions": [
     {
      "type": "reveal",
      "unit": "m6minus#70",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "h6#5",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "m6minus#76",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "m6minus#63",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     }
    ]
   },
   {
    "turn": 6,
    "phase": "14.13",
    "why": "Place 4 firing solutions. The captain prefers cargo to escorts. The markers are face down: good or bad shows when they turn over.",
    "actions": [
     {
      "type": "tdc",
      "unit": "m6minus#70",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m6minus#76",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m6minus#63",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m6minus#75",
      "label": "Place a TDC marker",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 6,
    "phase": "14.14",
    "why": "Aim. The captain puts 6 on maru 1,000 t (hit 40%, sink 24%).",
    "actions": [
     {
      "type": "target",
      "unit": "m6minus#76",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#76",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#76",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#76",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#76",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#76",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 6,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 60%, damaged 20%, sunk 0%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   },
   {
    "turn": 6,
    "phase": "14.3",
    "why": "Withdraw: going again risks too much (sunk 13%, damaged 27%).",
    "actions": [
     {
      "type": "withdraw",
      "label": "Withdraw from combat",
      "rule": "14.3"
     }
    ]
   },
   {
    "turn": 7,
    "phase": "15.0",
    "why": "Head for Dutch Harbor: the nearest base [15.2].",
    "actions": [
     {
      "type": "rtb_to",
      "base": "dutch_harbor",
      "rule": "15.2",
      "label": "Return to Dutch Harbor (2 weeks)"
     }
    ]
   },
   {
    "turn": 8,
    "phase": "15.0",
    "why": "Keep going at full Speed: every week in transit is a week not hunting [15.0].",
    "actions": [
     {
      "type": "transit_on",
      "rule": "15.2",
      "label": "Continue home to Dutch Harbor (arrives this week)"
     }
    ]
   },
   {
    "turn": 10,
    "phase": "base",
    "why": "Sail for Sea of Japan: busy water (a search there finds ships 100% of the time) within a short run from Dutch Harbor.",
    "actions": [
     {
      "type": "sail",
      "area": "sea_of_japan",
      "rule": "15.1",
      "label": "Sail for Sea of Japan (2 weeks out)"
     }
    ]
   },
   {
    "turn": 11,
    "phase": "15.0",
    "why": "Keep going at full Speed: every week in transit is a week not hunting [15.0].",
    "actions": [
     {
      "type": "transit_on",
      "rule": "15.11",
      "label": "Continue to Sea of Japan (arrives this week)"
     }
    ]
   },
   {
    "turn": 12,
    "phase": "12.0",
    "why": "Stay in Sea of Japan: nowhere in reach is busier (contact 100% here).",
    "actions": [
     {
      "type": "stay",
      "label": "Remain on station",
      "rule": "12.0"
     }
    ]
   },
   {
    "turn": 12,
    "phase": "13.1",
    "why": "Search: a sub earns its keep by finding convoys. Contact chance here 100%.",
    "actions": [
     {
      "type": "search",
      "label": "Search for contacts",
      "rule": "13.2"
     }
    ]
   },
   {
    "turn": 12,
    "phase": "14.11",
    "why": "Column C: it reaches 10 of the 12 counters (its own column and the ones beside it).",
    "actions": [
     {
      "type": "place",
      "column": "C",
      "label": "Place in column C",
      "rule": "14.11"
     }
    ]
   },
   {
    "turn": 12,
    "phase": "14.12",
    "why": "Reveal 4 counters. Tactical 4 allows 4 this round. Seeing the ships shows what is worth a torpedo, though each escort revealed adds its ASW.",
    "actions": [
     {
      "type": "reveal",
      "unit": "m6minus#88",
      "label": "Reveal a counter in B",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "m6minus#82",
      "label": "Reveal a counter in B",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "m6minus#85",
      "label": "Reveal a counter in B",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "cl5t#22",
      "label": "Reveal a counter in C",
      "rule": "14.12"
     }
    ]
   },
   {
    "turn": 12,
    "phase": "14.13",
    "why": "Place 4 firing solutions. The captain prefers cargo to escorts. The markers are face down: good or bad shows when they turn over.",
    "actions": [
     {
      "type": "tdc",
      "unit": "m6minus#88",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m6minus#82",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m6minus#85",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m7plus#58",
      "label": "Place a TDC marker",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 12,
    "phase": "14.14",
    "why": "Aim. The captain puts 6 on maru 3,000 t (hit 70%, sink 42%).",
    "actions": [
     {
      "type": "target",
      "unit": "m6minus#88",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#88",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#88",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#88",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#88",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#88",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 12,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 80%, damaged 10%, sunk 0%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   },
   {
    "turn": 12,
    "phase": "14.3",
    "why": "Re-Attack: 10 ships still afloat and little chance of losing the boat (sunk 3%), though it may be damaged (27%). The TDC markers improve by one.",
    "actions": [
     {
      "type": "reattack",
      "label": "Conduct a Re-Attack round",
      "rule": "14.4"
     }
    ]
   },
   {
    "turn": 12,
    "phase": "14.4",
    "why": "Stay in column C: no neighbouring column reaches more ships [14.4].",
    "actions": [
     {
      "type": "stay_column",
      "label": "Stay in column C",
      "rule": "14.4"
     }
    ]
   },
   {
    "turn": 12,
    "phase": "14.12",
    "why": "Reveal 4 counters. Tactical 4 allows 4 this round. Seeing the ships shows what is worth a torpedo, though each escort revealed adds its ASW.",
    "actions": [
     {
      "type": "reveal",
      "unit": "cl5t#21",
      "label": "Reveal a counter in C",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "cl5t#26",
      "label": "Reveal a counter in D",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "dd2t#42",
      "label": "Reveal a counter in D",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "bb36t#13",
      "label": "Reveal a counter in D",
      "rule": "14.12"
     }
    ]
   },
   {
    "turn": 12,
    "phase": "14.13",
    "why": "Place 4 firing solutions. The captain prefers cargo to escorts. The markers are face down: good or bad shows when they turn over.",
    "actions": [
     {
      "type": "tdc",
      "unit": "m6minus#82",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m6minus#85",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "m7plus#58",
      "label": "Place a TDC marker",
      "rule": "14.13"
     },
     {
      "type": "tdc",
      "unit": "bb36t#13",
      "label": "Place a TDC marker",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 12,
    "phase": "14.14",
    "why": "Aim. The captain puts 6 on maru 2,000 t (hit 30%, sink 18%).",
    "actions": [
     {
      "type": "target",
      "unit": "m6minus#85",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#85",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#85",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#85",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#85",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#85",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 12,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 20%, damaged 41%, sunk 19%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   },
   {
    "turn": 13,
    "phase": "15.0",
    "why": "Head for Midway Island: the nearest base [15.2].",
    "actions": [
     {
      "type": "rtb_to",
      "base": "midway",
      "rule": "15.2",
      "label": "Return to Midway Island (in port this week)"
     }
    ]
   },
   {
    "turn": 14,
    "phase": "15.0",
    "why": "Keep going at full Speed: every week in transit is a week not hunting [15.0].",
    "actions": [
     {
      "type": "transit_on",
      "rule": "15.2",
      "label": "Continue home to Midway Island (arrives this week)"
     }
    ]
   },
   {
    "turn": 15,
    "phase": "15.0",
    "why": "Head for Pearl Harbor: the nearest base, and the best repair yard for a damaged boat [15.2].",
    "actions": [
     {
      "type": "rtb_to",
      "base": "pearl",
      "rule": "15.2",
      "label": "Return to Pearl Harbor (in port this week)"
     }
    ]
   },
   {
    "turn": 16,
    "phase": "base",
    "why": "Sail for Sea of Japan: busy water (a search there finds ships 100% of the time) within a short run from Pearl Harbor.",
    "actions": [
     {
      "type": "sail",
      "area": "sea_of_japan",
      "rule": "15.1",
      "label": "Sail for Sea of Japan (2 weeks out)"
     }
    ]
   },
   {
    "turn": 34,
    "phase": "base",
    "why": "Sail for Sea of Japan: busy water (a search there finds ships 90% of the time) within a short run from Pearl Harbor.",
    "actions": [
     {
      "type": "sail",
      "area": "sea_of_japan",
      "rule": "15.1",
      "label": "Sail for Sea of Japan (2 weeks out)"
     }
    ]
   }
  ]
 },
 {
  "id": "wolfpack",
  "title": "A wolfpack fight",
  "summary": "Three boats find a convoy together. Each takes its turn to reveal, aim and fire, and each takes its own counterattack; then the pack may go round once more.",
  "learn": [
   "Group or Barrier: how a pack searches [24.3]",
   "Placing the boats, no more than two to a column [24.5]",
   "One boat at a time, with its own escort level [24.53-24.54]",
   "The pack's Re-Attack: every boat rolls to join in [24.55]"
  ],
  "seed": 14,
  "career": "tang",
  "start": 6,
  "tryAt": null,
  "steps": [
   {
    "turn": 1,
    "phase": "base",
    "why": "Form a wolfpack: three boats find more, and share the escorts' attention [24.0].",
    "actions": [
     {
      "type": "form_pack",
      "rule": "24.1",
      "label": "Form a wolfpack for this patrol: your boat and two more [24.1]"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "base",
    "why": "Sail for East China Sea, where Richard H. O'Kane went on the real patrol [32.15].",
    "actions": [
     {
      "type": "sail",
      "area": "east_china_sea",
      "rule": "15.1",
      "label": "Sail for East China Sea (2 weeks out)"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "15.0",
    "why": "Keep going at full Speed: every week in transit is a week not hunting [15.0].",
    "actions": [
     {
      "type": "transit_on",
      "rule": "15.11",
      "label": "Continue to East China Sea (arrives this week)"
     }
    ]
   },
   {
    "turn": 3,
    "phase": "12.0",
    "why": "Move to Yellow Sea: a search there finds ships 90% of the time, against 70% in East China Sea.",
    "actions": [
     {
      "type": "move",
      "area": "yellow_sea",
      "label": "Move to yellow_sea",
      "rule": "12.0"
     }
    ]
   },
   {
    "turn": 3,
    "phase": "13.1",
    "why": "Group: contact is likely anyway (90%), and a group pack attacks with every boat [24.31].",
    "actions": [
     {
      "type": "search",
      "label": "Search as a Group pack: one roll [24.31]",
      "rule": "24.31"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "12.0",
    "why": "Stay in Yellow Sea: nowhere in reach is busier (contact 90% here).",
    "actions": [
     {
      "type": "stay",
      "label": "Remain on station",
      "rule": "12.0"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "13.1",
    "why": "Group: contact is likely anyway (90%), and a group pack attacks with every boat [24.31].",
    "actions": [
     {
      "type": "search",
      "label": "Search as a Group pack: one roll [24.31]",
      "rule": "24.31"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.11",
    "why": "Column A: it reaches 3 of the 3 counters (its own column and the ones beside it).",
    "actions": [
     {
      "type": "place",
      "column": "A",
      "label": "Place USS Tang (SS-306) in column A",
      "rule": "24.5"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.11",
    "why": "Column A: it reaches 3 of the 3 counters (its own column and the ones beside it).",
    "actions": [
     {
      "type": "place",
      "column": "A",
      "label": "Place USS Lapon in column A",
      "rule": "24.5"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.11",
    "why": "Column B: it reaches 3 of the 3 counters (its own column and the ones beside it).",
    "actions": [
     {
      "type": "place",
      "column": "B",
      "label": "Place USS Raton in column B",
      "rule": "24.5"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.12",
    "why": "Reveal 2 counters. Tactical 4 allows 4 this round. Seeing the ships shows what is worth a torpedo, though each escort revealed adds its ASW.",
    "actions": [
     {
      "type": "reveal",
      "unit": "m6minus#62",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     },
     {
      "type": "reveal",
      "unit": "dd1t#41",
      "label": "Reveal a counter in A",
      "rule": "14.12"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.12",
    "why": "Radar: turn the DD 1,000 t back face down. A face-down escort adds no ASW (0.5) to your targets' defence or to the counterattack; reveal another counter instead.",
    "actions": [
     {
      "type": "unflip",
      "unit": "dd1t#41",
      "rule": "14.12",
      "label": "Radar: turn it back face down (reveal another instead)"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.13",
    "why": "Place 1 firing solution. The captain prefers cargo to escorts. The markers are face down: good or bad shows when they turn over.",
    "actions": [
     {
      "type": "tdc",
      "unit": "m6minus#62",
      "label": "Place a TDC marker",
      "rule": "14.13"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.14",
    "why": "Aim. The captain puts 7 on maru 1,000 t (hit 50%, sink 40%).",
    "actions": [
     {
      "type": "target",
      "unit": "m6minus#62",
      "label": "Target this ship",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#62",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#62",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#62",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#62",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#62",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "m6minus#62",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 100%, damaged 0%, sunk 0%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.14",
    "why": "Aim. The captain puts 7 on a face-down ship (hit 50%).",
    "actions": [
     {
      "type": "points",
      "unit": "dd1t#41",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "dd1t#41",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "dd1t#41",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "dd1t#41",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "dd1t#41",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     },
     {
      "type": "points",
      "unit": "dd1t#41",
      "delta": 1,
      "label": "Add an attack point",
      "rule": "14.14"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.14",
    "why": "Fire. Each attack rolls against the need shown; a hit rolls again on the Attack Results Table. Then the escorts answer: no damage 100%, damaged 0%, sunk 0%.",
    "actions": [
     {
      "type": "fire",
      "label": "Fire",
      "rule": "14.15"
     }
    ]
   },
   {
    "turn": 4,
    "phase": "14.3",
    "why": "Re-Attack: 1 ships still afloat and little chance of losing the boat (sunk 0%), though it may be damaged (0%). The TDC markers improve by one.",
    "actions": [
     {
      "type": "reattack",
      "label": "Wolfpack Re-Attack: each boat rolls its Tactical or less [24.55]",
      "rule": "24.55"
     }
    ]
   }
  ]
 },
 {
  "id": "tender",
  "title": "The forward base",
  "summary": "A submarine tender in a mission zone is a base close to the hunting grounds: the boat puts in there, is readied, and sails again without the long run from Pearl Harbor.",
  "learn": [
   "Forward bases: tenders in Special Mission Zones [21.1-21.2]",
   "Leaving and entering one costs no Speed [15.1 note]",
   "Only Superficial damage is fixed there [21.23]",
   "Readied from the Broom Box, or a week at Ship Side [9.0]"
  ],
  "seed": 6,
  "career": "tang",
  "start": 4,
  "tryAt": 5,
  "steps": [
   {
    "turn": 1,
    "phase": "base",
    "why": "Form a wolfpack: three boats find more, and share the escorts' attention [24.0].",
    "actions": [
     {
      "type": "form_pack",
      "rule": "24.1",
      "label": "Form a wolfpack for this patrol: your boat and two more [24.1]"
     }
    ]
   },
   {
    "turn": 1,
    "phase": "base",
    "why": "Sail for East China Sea, where Richard H. O'Kane went on the real patrol [32.15].",
    "actions": [
     {
      "type": "sail",
      "area": "east_china_sea",
      "rule": "15.1",
      "label": "Sail for East China Sea (2 weeks out)"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "12.0",
    "why": "Orders: Special Mission: Invasion of Saipan. The boat goes where the War Event sends it [5.0].",
    "actions": [
     {
      "type": "enter_smz",
      "smz": "saipan",
      "via": "marianas",
      "rule": "12.1",
      "label": "Special Mission: enter Saipan by way of Marianas"
     }
    ]
   },
   {
    "turn": 2,
    "phase": "13.1",
    "why": "Group: contact is likely anyway (70%), and a group pack attacks with every boat [24.31].",
    "actions": [
     {
      "type": "search",
      "label": "Search as a Group pack: one roll [24.31]",
      "rule": "24.31"
     }
    ]
   },
   {
    "turn": 3,
    "phase": "15.0",
    "why": "Head for Saipan: the nearest base [15.2].",
    "actions": [
     {
      "type": "rtb_to",
      "base": "saipan",
      "rule": "15.2",
      "label": "Return to Saipan (in port this week)"
     }
    ]
   },
   {
    "turn": 5,
    "phase": "base",
    "why": "Sail for Empire Pacific: busy water (a search there finds ships 80% of the time) within a short run from Saipan.",
    "actions": [
     {
      "type": "sail",
      "area": "empire_pacific",
      "rule": "15.1",
      "label": "Sail for Empire Pacific (on station next week)"
     }
    ]
   }
  ]
 }
];
  root.SWDrills = [
 {
  "id": "column",
  "lesson": "attack",
  "title": "Drill: pick your column",
  "task": "A convoy is on the Combat Display, face down in four columns. Click the submarine box you attack from. You can only reach your own column and the ones beside it: count what each column reaches.",
  "types": [
   "place"
  ],
  "seed": 5001,
  "prefix": [
   {
    "type": "move",
    "area": "empire_pacific",
    "label": "Move to empire_pacific",
    "rule": "12.0"
   },
   {
    "type": "search",
    "label": "Search for contacts",
    "rule": "13.2"
   }
  ],
  "captain": {
   "action": {
    "type": "place",
    "column": "B",
    "label": "Place in column B",
    "rule": "14.11"
   },
   "why": "Column B: it reaches 12 of the 12 counters (its own column and the ones beside it)."
  }
 },
 {
  "id": "aim",
  "lesson": "attack",
  "title": "Drill: aim the torpedoes",
  "task": "Share your attack points among the TDC-marked ships and Fire. Hover each ship for its odds; one of them cannot be hit at all.",
  "types": [
   "fire"
  ],
  "seed": 5003,
  "prefix": [
   {
    "type": "move",
    "area": "empire_pacific",
    "label": "Move to empire_pacific",
    "rule": "12.0"
   },
   {
    "type": "search",
    "label": "Search for contacts",
    "rule": "13.2"
   },
   {
    "type": "place",
    "column": "B",
    "label": "Place in column B",
    "rule": "14.11"
   },
   {
    "type": "reveal",
    "unit": "m6minus#70",
    "label": "Reveal a counter in A",
    "rule": "14.12"
   },
   {
    "type": "reveal",
    "unit": "m7plus#53",
    "label": "Reveal a counter in A",
    "rule": "14.12"
   },
   {
    "type": "reveal",
    "unit": "m6minus#76",
    "label": "Reveal a counter in A",
    "rule": "14.12"
   },
   {
    "type": "reveal",
    "unit": "m6minus#77",
    "label": "Reveal a counter in A",
    "rule": "14.12"
   },
   {
    "type": "done_reveal",
    "label": "Proceed to TDC placement",
    "rule": "14.13"
   },
   {
    "type": "tdc",
    "unit": "m6minus#70",
    "label": "Place a TDC marker",
    "rule": "14.13"
   },
   {
    "type": "tdc",
    "unit": "m7plus#53",
    "label": "Place a TDC marker",
    "rule": "14.13"
   },
   {
    "type": "tdc",
    "unit": "m6minus#76",
    "label": "Place a TDC marker",
    "rule": "14.13"
   },
   {
    "type": "tdc",
    "unit": "m6minus#77",
    "label": "Place a TDC marker",
    "rule": "14.13"
   }
  ],
  "captain": {
   "action": {
    "type": "target",
    "unit": "m6minus#77",
    "label": "Target this ship",
    "rule": "14.14"
   },
   "why": "Fire: 6 on maru 3,000 t (hit 60%, sink 36%)."
  }
 },
 {
  "id": "reattack",
  "lesson": "reattack",
  "title": "Drill: go again, or break off?",
  "task": "The first round is over. Hover your submarine or the Re-Attack button to see what going again risks, then decide.",
  "types": [
   "reattack",
   "withdraw"
  ],
  "seed": 5004,
  "prefix": [
   {
    "type": "move",
    "area": "empire_pacific",
    "label": "Move to empire_pacific",
    "rule": "12.0"
   },
   {
    "type": "search",
    "label": "Search for contacts",
    "rule": "13.2"
   },
   {
    "type": "place",
    "column": "B",
    "label": "Place in column B",
    "rule": "14.11"
   },
   {
    "type": "reveal",
    "unit": "m6minus#69",
    "label": "Reveal a counter in A",
    "rule": "14.12"
   },
   {
    "type": "reveal",
    "unit": "m6minus#78",
    "label": "Reveal a counter in A",
    "rule": "14.12"
   },
   {
    "type": "reveal",
    "unit": "dd1t#47",
    "label": "Reveal a counter in A",
    "rule": "14.12"
   },
   {
    "type": "unflip",
    "unit": "dd1t#47",
    "rule": "14.12",
    "label": "Radar: turn it back face down (reveal another instead)"
   },
   {
    "type": "reveal",
    "unit": "m6minus#64",
    "label": "Reveal a counter in A",
    "rule": "14.12"
   },
   {
    "type": "reveal",
    "unit": "m6minus#80",
    "label": "Reveal a counter in B",
    "rule": "14.12"
   },
   {
    "type": "tdc",
    "unit": "m6minus#69",
    "label": "Place a TDC marker",
    "rule": "14.13"
   },
   {
    "type": "tdc",
    "unit": "m6minus#78",
    "label": "Place a TDC marker",
    "rule": "14.13"
   },
   {
    "type": "tdc",
    "unit": "dd1t#47",
    "label": "Place a TDC marker",
    "rule": "14.13"
   },
   {
    "type": "tdc",
    "unit": "m6minus#64",
    "label": "Place a TDC marker",
    "rule": "14.13"
   },
   {
    "type": "target",
    "unit": "m6minus#64",
    "label": "Target this ship",
    "rule": "14.14"
   },
   {
    "type": "target",
    "unit": "m6minus#69",
    "label": "Target this ship",
    "rule": "14.14"
   },
   {
    "type": "points",
    "unit": "m6minus#69",
    "delta": 1,
    "label": "Add an attack point",
    "rule": "14.14"
   },
   {
    "type": "points",
    "unit": "m6minus#69",
    "delta": 1,
    "label": "Add an attack point",
    "rule": "14.14"
   },
   {
    "type": "points",
    "unit": "m6minus#69",
    "delta": 1,
    "label": "Add an attack point",
    "rule": "14.14"
   },
   {
    "type": "points",
    "unit": "m6minus#69",
    "delta": 1,
    "label": "Add an attack point",
    "rule": "14.14"
   },
   {
    "type": "fire",
    "label": "Fire",
    "rule": "14.15"
   },
   {
    "type": "reattack",
    "label": "Conduct a Re-Attack round",
    "rule": "14.4"
   },
   {
    "type": "stay_column",
    "label": "Stay in column B",
    "rule": "14.4"
   },
   {
    "type": "reveal",
    "unit": "dd1t#47",
    "label": "Reveal a counter in A",
    "rule": "14.12"
   },
   {
    "type": "unflip",
    "unit": "dd1t#47",
    "rule": "14.12",
    "label": "Radar: turn it back face down (reveal another instead)"
   },
   {
    "type": "reveal",
    "unit": "dd2t#32",
    "label": "Reveal a counter in B",
    "rule": "14.12"
   },
   {
    "type": "tdc",
    "unit": "m6minus#78",
    "label": "Place a TDC marker",
    "rule": "14.13"
   },
   {
    "type": "tdc",
    "unit": "dd1t#47",
    "label": "Place a TDC marker",
    "rule": "14.13"
   },
   {
    "type": "tdc",
    "unit": "m6minus#64",
    "label": "Place a TDC marker",
    "rule": "14.13"
   },
   {
    "type": "tdc",
    "unit": "m6minus#80",
    "label": "Place a TDC marker",
    "rule": "14.13"
   },
   {
    "type": "target",
    "unit": "m6minus#80",
    "label": "Target this ship",
    "rule": "14.14"
   },
   {
    "type": "points",
    "unit": "m6minus#80",
    "delta": 1,
    "label": "Add an attack point",
    "rule": "14.14"
   },
   {
    "type": "points",
    "unit": "m6minus#80",
    "delta": 1,
    "label": "Add an attack point",
    "rule": "14.14"
   },
   {
    "type": "points",
    "unit": "m6minus#80",
    "delta": 1,
    "label": "Add an attack point",
    "rule": "14.14"
   },
   {
    "type": "points",
    "unit": "m6minus#80",
    "delta": 1,
    "label": "Add an attack point",
    "rule": "14.14"
   },
   {
    "type": "points",
    "unit": "m6minus#80",
    "delta": 1,
    "label": "Add an attack point",
    "rule": "14.14"
   },
   {
    "type": "fire",
    "label": "Fire",
    "rule": "14.15"
   }
  ],
  "captain": {
   "action": {
    "type": "withdraw",
    "label": "Withdraw from combat",
    "rule": "14.3"
   },
   "why": "Withdraw: going again risks too much (sunk 13%, damaged 27%, and the boat is already damaged)."
  }
 }
];
}(typeof module !== 'undefined' && module.exports ? module.exports : (this.window || this)));
