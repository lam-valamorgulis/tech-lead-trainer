---
status: accepted
---

# Battle rules v2: HP on both sides, Constraint decides the best move, Reason replaces typed why

Date: 2026-10-21. Design: `docs/design-v1.5.md`, section 7.

The owner played the v1.4 Battle on the iPhone. It felt like a text quiz, not a game. Typing one or two English sentences of "why" each turn was the heaviest part. Also, the best move never depended on the situation, so a turn tested "which concept fits", not a tech lead trade-off.

We decided:

- Every turn shows one **Constraint** line (budget, team size, deadline, data). The Constraint decides which move is best. The same threat can have a different best move under a different Constraint.
- The learner picks **one of three Reasons** before the result. A wrong Reason makes the hit 1 weaker (2 → 1, 1 → 0). Typing is optional.
- The learner's creatures have **HP 3** each. Best move: no damage back. Move with damage 1: lose 1. Move with damage 0: lose 2. A creature at 0 HP **Faints** and the next one comes in.
- The model answer and the 3 key points move to **one screen at the end** of the Battle.

## What stays

- Exactly **one best move** per turn, no ties. The content check enforces it.
- Opponent HP 4, at most 3 turns.
- `battle_turns` still records `is_best_move` at play time, so later content edits do not change history. Old typed "why" text stays in the log; new columns are added, nothing is dropped.

## What we gave up

- The typed "why". It forced the learner to put a reason in their own words. Now that only happens in the optional text box, the end-of-battle self-check and "Discuss in Claude".
- The guess-win numbers in design v1.4, section 7, no longer hold. New numbers below.

## Random-guess win rate

Model: a guesser picks a move and a Reason at random each turn. A win needs a total of 4 damage in 3 turns.

| Move table | v1.4 (no Reason) | v2 (Reason 1 of 3) |
|---|---|---|
| 3 moves: damage 2, 1, 0 | 10/27 = 37.0% | 52/729 = **7.1%** |
| 4 moves: damage 2, 1, 0, 0 | 13/64 = 20.3% | 61/1728 = **3.5%** |

## Consequences

- With HP 3 for each of 3 creatures and at most 2 damage per turn, a 3-turn Battle can make at most 2 creatures Faint. So "all 3 Faint" cannot end a normal Battle. A loss comes from the 3-turn limit. Faint gives the feeling of being hit, not a second way to lose. If a future Battle has more turns, this changes.
- A learner who knows the move but not the reason now often fails to win. The win target (70–80% when the topic is known) must be checked against real play data after the first town.
- Content cost grows: each turn needs a Constraint and three Reasons, and the wrong Reasons must sound plausible.

## Considered options

- Keep a fixed best move (v1.4): rejected, it does not train decisions that depend on context.
- No single best move, grade only the Reason: rejected, the app cannot grade without AI, and the best-move rate is the main learning metric.
- Reason does not change damage: rejected, the learner would tap any Reason, so it stops guarding against guessing.
