# 09 — Newcomer playtest protocol

The bot proves the rules are right; only a person can show whether a newcomer understands them. This
is the one part of the 2026-09-21 plan that cannot be built, so here is how to run it.

## Who

One or two people who have **never played a hex/area wargame** (a board-game player is fine; a
wargame player is not). No briefing from you beyond "this is a submarine game; think aloud".

## Setup (5 minutes)

1. A browser profile with **no stored data** for the game (a private window, or clear site data), so
   the first-run briefing appears exactly as it will for anyone new.
2. Double-click `PLAY Silent War.command`. Default speed (animate), Simple view, coach on.
3. Screen recording with microphone (QuickTime: File > New Screen Recording, options: microphone).
4. Say only: *"Please think aloud as you go. I won't help unless you're completely stuck for two minutes."*

## Tasks

| # | Task | Stop when |
|---|---|---|
| 1 | Get ready to play (they choose what to do from the briefing) | they reach the end of boot camp, or 20 minutes |
| 2 | Play one patrol | the patrol report opens, or 20 minutes |
| 3 | Afterwards, ask the three questions below | |

## Afterwards: three questions

1. *"What were you trying to do in that patrol?"* (goal understood?)
2. *"Why did it end the way it did?"* (can they explain the outcome from the rules, or only "bad luck"?)
3. *"What does 6•3•4 on your submarine mean?"* (genre literacy)

## Measures

| Measure | How | Target |
|---|---|---|
| Time from first screen to first patrol finished unaided | recording timestamps | under 30 minutes |
| Stuck moments (no productive action for 30 s) | count in the recording | 3 or fewer |
| Coach holds overridden with "Do it anyway", and whether that was informed | recording | noted, not scored |
| Question 1 answered with the goal (tonnage and bringing the boat home) | answer | yes |
| Question 2 answered with a rule-based reason (odds, escorts, endurance) | answer | yes |
| Question 3: at least Attack and Defense correct | answer | yes |

## Processing the recording

Use the **code-feedback-processor** skill (`__SCAD/_CLAUDE/.claude/skills`): give Claude the video
file and say "process this playtest recording". It produces a Markdown report with the transcript and
extracted frames, offline. Then bring the report back into a Silent War session: each stuck moment,
misread label or wrong answer becomes a punch-list item.

## What to watch for (the known risks of the v0.8.0 first hour)

- Does the briefing's text get read, or skipped for the green button?
- Do the lessons feel too long, and is ▶ discovered without help?
- Is the palette too long to scan in combat (it grows with New: / Coach / Drill / Boot camp sections)?
- Does "Do it anyway" get used to skip the coach without reading it?
- Combat Events: does "(effect not in this build yet)" confuse more than it helps?
