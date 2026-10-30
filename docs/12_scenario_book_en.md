# Scenario book: the sections Phase 6 uses, in English

Source: `Source/AdditionalReference/Silent_War_ESCENARIOS.pdf`, the Spanish translation of the Silent War
scenario book (translator Felipe Santamaría; © 2005 Compass Games). Translated 2026-09-24 for Phase 6 only:
the Patrol Games [32.0]–[32.18] (the career starting points) and the Master Submarine Reinforcement list
[31.01] (overhaul withdrawals and returns). The rest of the book (the six campaigns, optional rules [33.0])
waits for Phase 8. Where the data file differs from the book, or the book is unclear, it is **flagged**.

## [32.0] Patrol Games

A Patrol Game lets one player take a single submarine on one historical patrol and try to improve on the real
result. It uses the same system as the Campaign Game but covers only one patrol, from departure to return to
base. Short, fast and furious, it gives a personal view of the submarine war against Imperial Japan.
**Super Skippers are not used in the Patrol Games: YOU are the captain, and you try to beat the named
captain's patrol. War Events are not used, and neither the War Period nor the Mk-XIV torpedo value changes.**

## [32.1] Victory in the Patrol Games

There are three "victory statistics": ships sunk, tonnage sunk, and the length of the patrol. Beat the ships
**or** the tonnage and you may call yourself a *good* captain. Beat both the ships **and** the tonnage and you
are a *great* captain. Beat both, and do it in less time, and you are a *legendary* captain. **Losing the boat
takes one level off the result.**

*(In a Phase 6 career this is the standard the first patrol is judged by: `SWCareer.patrolVerdict`.)*

## The patrols

| Rule | Boat | Skipper | Patrol | Departs from | Date (War Period) | Destination | Mk-XIV | Record: ships · tons · weeks |
|---|---|---|---|---|---|---|---|---|
| [32.11] | USS S-38 (SS-143), S-1 class | Lt. Henry G. Munson | 7th | Brisbane | July 1942 (W2) | the Solomons | −1 | 1 · 5,600 · 3 |
| [32.12] | USS Sculpin (SS-191), New S-2 class | Lucius H. Chappell | 5th | Brisbane | September 1942 (W2) | the Solomons | −1 | 2 · 6,600 · 7 |
| [32.13] | USS Wahoo, Gato class | Dudley W. "Mush" Morton | 4th | Pearl Harbor | February 1943 (W2) | East China Sea | −1 | 9 · 20,000 · 6 |
| [32.14] | USS Harder, Gato class | Samuel D. Dealey | 2nd | Pearl Harbor | August 1943 (W3) | Empire Pacific | 0 | 5 · 15,200 · 6 |
| [32.15] | USS Tang (SS-306), Balao class | Richard H. O'Kane | 3rd | Pearl Harbor | May 1944 (W3) | East China Sea | +1 | 10 · 39,100 · 5 |
| [32.16] | USS Rasher (SS-269), Gato class | Henry G. Munson | 5th | Fremantle | July 1944 (W3) | Pearl Harbor | +1 | 5 · 52,600 · 6 |
| [32.17] | USS Flasher (SS-249), Gato class | George W. Grider | 5th | Fremantle | November 1944 (W4) | South China Sea | +1 | 6 · 42,800 · 7 |
| [32.18] | USS Tirante (SS-420), Tench class | George L. Street III | 1st | Saipan | March 1945 (W4) | East China Sea | +2 | 6 · 12,600 · 7 |
| [32.19] | USS Cero, Shad, Grayback: the First Wolfpack | Charles "Swede" Momsen | — | Pearl Harbor | September 1943 (W3) | East China Sea | 0 | 3 · 23,500 · 7 |

**Flags:**
- **Hull numbers.** The book prints Wahoo as SS-212 and Harder as SS-238. The real boats were Wahoo SS-238 and
  Harder SS-257. The app uses the real numbers.
- **Rasher's tonnage.** The summary table on p. 17 says 52,000 t; the stat block and the story say 52,600 t. The
  app uses 52,600 t.
- **Wahoo's destination.** The stat block says the East China Sea; the story has Morton sweeping the northern
  Yellow Sea. The app follows the stat block. The Yellow Sea is one area further, and the teacher's first
  patrol goes where the stat block says.
- **Flasher's destination.** "South China Sea" without a number; the story puts it west of Mindoro, which is
  South China Sea 1 on the map.
- **Tirante's base.** Saipan is a forward base (a tender in an SMZ, [21.1]). Forward bases are Phase 7, so the
  Phase 6 career sails from Pearl Harbor and the Career menu says so.
- **The First Wolfpack** needs the wolfpack rules [24.0] (Phase 7) and is not offered yet.

### The stories (abridged)

- **S-38, 7th patrol [32.11].** Patrols in the old S-boats were hard on their crews: cramped, dangerous, and
  frustrated by how few targets they sank. Near midnight on 8 August 1942, S-38 was patrolling the Solomons when
  it found a small convoy of troop transports hurriedly assembled to reinforce Guadalcanal after the American
  landings. Lt. Munson made a submerged approach, passed under a destroyer escort and fired by sonar from deep.
  As Munson admitted, it was a lucky shot: two torpedoes hit the *Meiyo Maru*, carrying heavy weapons and the
  relief force's headquarters. With the landing force "headless", the convoy turned back for Rabaul.
- **Sculpin, 5th patrol [32.12].** The war went against Sculpin. Sailing from Manila and then Surabaya, Chappell
  made many well-prepared attacks only to see his torpedoes run under their targets or hit without exploding.
  He complained in writing and was reprimanded for "undermining confidence" in the weapon. When the Guadalcanal
  campaign began, Sculpin moved to Brisbane to intercept Japanese transports around New Britain. In confined
  waters and under heavy ASW pressure, it sank two Marus and damaged the light cruiser *Yura*.
- **Wahoo, 4th patrol [32.13].** Before Mush Morton, Wahoo had a poor reputation; now it was the star boat of the
  Pacific war, and Morton a controversial captain. For the 4th patrol Wahoo went to the northern end of the
  Yellow Sea, where the average depth was only 120 feet. Pressing hard with torpedoes and the deck gun, Morton
  swept the Yellow Sea; intercepted ULTRA traffic showed the Japanese believed a wolfpack had arrived. Nine ships
  and 20,000 tons: a record at the time. *(The book also describes the machine-gunning of survivors on an
  earlier patrol; it is not part of this patrol and is not used in the app.)*
- **Harder, 2nd patrol [32.14].** Dealey nearly failed out of the Academy and did not stand out in the peacetime
  Navy; the shortage of captains gave him Harder. His diving officer said he pictured situations so vividly that
  he hardly needed a TDC solution. On the 2nd patrol he made one of the best records yet, in nine separate
  attacks. He pioneered wolfpack tactics and became famous for "down the throat" shots at charging destroyers.
  Harder was sunk by a Japanese minesweeper in August 1944; Dealey received the Medal of Honor posthumously.
- **Tang, 3rd patrol [32.15].** By any measure the finest patrol ever made by an American submarine, barely
  tarnished by the loss of the boat. *(The book's paragraph mixes in Tang's last patrol, off Nagasaki, where she
  was sunk by her own circular-running torpedo; eight men including O'Kane survived the war.)*
- **Rasher, 5th patrol [32.16].** Munson, moved from the retired S-38, used a contact report to intercept convoy
  HI-71: fifteen ships escorted by the escort carrier *Taiyo*. On a rainy, pitch-black night he fired two
  torpedoes and saw "a frightful explosion" he took for a tanker. It was *Taiyo*, loaded with aviation fuel. He
  finished the night with a Re-Attack that used every torpedo: five ships, 52,600 tons.
- **Flasher, 5th patrol [32.17].** Grider's first command patrol, from Australia in November 1944 to a point
  west of Mindoro as part of a wolfpack. In the rain he sank two 2,000-ton destroyers and a tanker; two weeks
  later, between the shore and another convoy, he sank three tankers. The third best patrol of the war.
- **Tirante, 1st patrol [32.18].** Targets were scarce by 1945. After a small freighter and a tanker, Tirante
  sank a troop transport; then Street took her into Cheju Do harbour at night in 60 feet of water, fired six
  torpedoes and sank a transport and two ASW frigates. Street received the Medal of Honor; his XO, Ned Beach,
  the Navy Cross.

## [31.01] The Master Submarine Reinforcement list

This list is used for every campaign except MacArthur's Navy [31.5], which has its own. It lists the
submarines that enter the war from January 1942 and their arrival bases. It is consulted at the beginning of
each month after the campaign's first. If an arrival base is not yet active, or has fallen, the boats are
received at Pearl Harbor (exception: Brisbane boats go to Fremantle if Fremantle is active). Arriving boats go
into the receiving base's Broom Box.

The list also names the submarines **withdrawn for overhaul in California**, preceded by "Withdraw". They are
removed from play **at once, even if at sea and/or damaged**, and placed in the "West Coast" box on the map.
Any Super Skipper stays with the boat and any Damage marker is removed. If the boat has been sunk (or is marked
sunk at the start of the campaign), no other boat takes its place. **While under overhaul a submarine cannot be
removed by the War Event "Relegation to Training Duty".**

After some months the overhauled boats return to service, preceded by "Return". **All returning submarines go
into Pearl Harbor's Broom Box, except S-boats, which go to Dutch Harbor's.**

The full withdrawal and return lists, month by month from February 1942 to September 1945, are transcribed in
`apps/game/data/sw_campaign.js` (`WITHDRAW`, `RETURN`); arrivals are not used by a one-boat career and are left
for the fleet phase. For the career boats: Sculpin out January 1943, back May 1943; Wahoo out June 1943, back
August 1943; Harder out December 1943, back March 1944; Rasher out September 1944, back January 1945; Flasher
out April 1945, back August 1945. S-38, Tang and Tirante are never withdrawn.

## [31.4 D] A precedent used in the design

Campaign 5 (MacArthur's Navy) does not use the Torpedo Improvement or War Progress tables, "since they are under
the effective control of the Pearl Harbor command. Instead, the Torpedo status and the War Periods advance as
given in the Submarine Reinforcement list." This is the book's own answer to a part of the war the player does
not command. Phase 6 took the other route Wan chose (an off-screen fleet whose sinkings feed the printed tables),
but the precedent shows the book allows the war clock to run outside the player's hands.

## The Campaign Games [31.1]-[31.5] (added 2026-09-25)

Translated for fleet command. The orders of battle, the reinforcement lists and the schedules are data in
`apps/game/data/sw_campaign.js` (`CAMPAIGNS`, `ARRIVE`, `WITHDRAW`, `RETURN`). The rules in brief:

- **[31.1] Campaign 1: The Submarine Campaign against Japan.** From December 1941, second week, until the war ends.
  - The first turn skips the Strategic Segment.
  - **Career longevity [31.12]:** your tonnage must reach 90,000 t by the end of February 1942, then 220,000 (May), 360,000 (August),
    620,000 (November), 720,000 (February 1943) and 980,000 (May 1943), or you are relieved of command.
  - **Order of battle [31.13]:** 26 boats at Manila plus Sealion and Seadragon in Repair Box 1; S-36 in the Lingayen Gulf zone
    (no Patrol Movement, RTB to Manila in the first turn, TF contacts only); Dolphin and Tautog at Pearl Harbor, Narwhal and Cachalot
    in Repair Box 3; Gudgeon, Plunger, Pollack, Pompano and Thresher in the Hawaiian Islands (as S-36, to Pearl Harbor); Argonaut and
    Trout at Midway, Tambor and Triton at Wake, both for two turns, no Endurance roll, TF contacts only, then RTB to Pearl Harbor.
  - **Victory [31.14]:** the war ends when tonnage passes 5,500,000 t. The level is set by the date:

    | War ends | Level |
    |---|---|
    | before 1945 | Total Victory |
    | January-March 1945 | Decisive |
    | April-June 1945 | Improved |
    | July-August 1945 | Historical |
    | September 1945 | Draw |
    | October-December 1945 | Failure |

    Then modify by US submarines lost: 0-20 up two levels, 21-40 up one, 41-60 no change (historical 49), 61-80 down one, 81+ down two.
- **[31.2] Campaign 2: The Rising Sun.** As in `docs/16_phase8_brief.md`.
- **[31.3] Campaign 3: The Turning Tide.**
  - **Start:** April 1943, first week, War Period 3; 233 ships and 977,000 t sunk; Mk-XIV −1; 12 boats lost.
  - **No career longevity.**
  - **Order of battle [31.33]:**
    - at sea and in port as listed; the tender Sperry at Midway, with Trigger and Wahoo (Morton +1);
    - 17 boats in the West Coast box;
    - Gato, S-31 and Drum on the Transfer Route, on RTB;
    - Finback and Porpoise in the Truk zone, RTB in the first turn.
  - **Reinforcements** from May 1943. Boats already lost are ignored in the list.
  - **Victory [31.34]**, if the game ends at the move into War Period 4:

    | War Period 4 begins | Level |
    |---|---|
    | June 1944 | Decisive Victory |
    | July-August 1944 | Dramatic Victory |
    | September 1944 | Historical (Draw) |
    | October-November 1944 | Marginal Failure |
    | December 1944-January 1945 | Dramatic Failure |

    More than 4,300,000 t sunk raises it one level. Subs lost: 0-23 up two, 24-29 up one, 30-36 no change (historical 33), 37-42 down one, 43+ down two.
  - If played on to the end of the war, [31.14] applies. This build ends at War Period 4.
- **[31.4] Campaign 4: The Setting Sun.**
  - **Start:** September 1944, first week, War Period 4; 918 ships and 3,986,000 t sunk; Mk-XIV +1; 34 boats lost and 27 retired;
    Wolfpack Experience 10.
  - **The War Mix:** Taiho and Shokaku are sunk and are not in it.
  - **Tenders:** Bushnell at Midway, Sperry at Majuro, Orion at Mios Woendi, Holland at Guam, Fulton at Saipan.
  - **Order of battle [31.42]:** 137 boats, with named Super Skippers (Coye, Barr, Whitaker, Underwood, Cutter, Fluckey,
    O'Kane, Munson) and four wolfpacks.
  - **Reinforcements** from October 1944.
  - **The end [31.41]:** the campaign ends when tonnage passes 5,000,000 t; **victory [31.43]** as [31.14].
  - **Flags:**
    - Snapper is listed both at Pearl Harbor and in the North Pacific; the app keeps it at Pearl Harbor.
    - With [31.14]'s dates, passing 5,000,000 t before 1945 is a Total Victory. That is how the book prints it.
    - Steelhead starts in the West Coast box, and the list never returns it.
- **[31.5] Campaign 5: MacArthur's Navy.** The whole war in the Southwest Pacific only.
  - **Operating areas [31.5 A]:** South China Sea 1 and 2, the Java, North and South Philippine, Banda and Bismarck Seas, the
    Solomons and the Coral Sea, and the zones next to them except Guam.
  - **Forward bases:** only Surabaya and Mios Woendi; Subic Bay when it opens.
  - **War Events [31.5 B]:** events elsewhere are No Event; Relegation removes a single boat.
  - **ULTRA** is rolled as normal.
  - **Torpedo and War Period [31.5 D]:** they advance on the list's dates, not by the tables:
    - War Period 2 in July 1942, 3 in April 1943, 4 in September 1944;
    - Mk-XIV −1 in August 1942, 0 in August 1943, +1 in January 1944, +2 in January 1945.
  - **Reinforcements:** its own list [31.54]. Arrivals go to Fremantle if their base is not open. A withdrawn boat returns
    only if the list receives it again.
  - **Career longevity [31.52]:** 40,000 / 100,000 / 160,000 / 200,000 t by the end of February, May, August and November 1942,
    then 300,000 (February 1943) and 410,000 (May 1943).
  - **Victory [31.55]:** the war ends when tonnage passes 1,900,000 t in 1945, or 2,000,000 t in 1944, with the dates of [31.14]
    (April-June 1945 reads "Dramatic"). Subs lost: 0-12 up two, 13-20 up one, 21-25 no change (historical 23), 26-34 down one, 35+ down two.
  - **Not in this build:**
    - the exception for a boat due to be withdrawn next month (it may patrol the Gilberts, Carolines or Marianas and is then
      transferred to Pearl Harbor);
    - fleet wolfpacks, which apply in every campaign.
