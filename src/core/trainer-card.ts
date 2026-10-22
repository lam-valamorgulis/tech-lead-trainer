// Trainer Card (ticket #110, design 2 and 7.7). Pure functions: no clock, no database.
// A Skill's rate = right picks / times met. It is computed from the logs each time, so nothing
// new is stored. Every Battle turn (any kind of battle) and every Decision Card or trade-off question logs the Skills it
// trains at play time (design 12.2). No XP and no level (design 2, guard rules in design 14).

import { SKILLS, type SkillId } from "../content/skills.ts";

/** One logged turn or card, as the Trainer Card counts it: the Skills it trains, and whether the pick was right. */
export type SkillPick = { skillIds: readonly number[]; right: boolean };

/** What the Trainer Card needs from a battle turn row. The kind of battle does not matter. */
export type SkillTurn = { skillIds: readonly number[] | null; bestMove: boolean };

/** What the Trainer Card needs from a Decision Card or trade-off question row (#109). */
export type SkillCard = { skillIds: readonly number[]; choiceCorrect: boolean; reasonCorrect: boolean };

/**
 * A battle turn is a right pick when the best move was picked, the same rule as the best-move rate
 * (design 7.7). The Reason does not count here. The log keeps it, so this rule can change later.
 * A turn with no Skills logged (played before v2, or content with no Skills) is left out.
 */
export function turnPick(turn: SkillTurn): SkillPick | null {
  if (!turn.skillIds || turn.skillIds.length === 0) return null;
  return { skillIds: turn.skillIds, right: turn.bestMove };
}

/**
 * A Decision Card, or a trade-off question (a harder Decision Card, design 6.5), is a right pick when
 * the option and the Reason are both right, as review grades it (#109).
 */
export function cardPick(card: SkillCard): SkillPick {
  return { skillIds: card.skillIds, right: card.choiceCorrect && card.reasonCorrect };
}

export type SkillRate = { id: SkillId; name: string; right: number; met: number };

/** The rate of each of the 26 Skills, in their fixed id order. A Skill never met has 0 of 0. */
export function skillRates(picks: SkillPick[]): SkillRate[] {
  const rates = new Map<number, SkillRate>(SKILLS.map(({ id, name }) => [id, { id, name, right: 0, met: 0 }]));
  for (const pick of picks) {
    // A Skill counts once per turn or card. An unknown id is ignored: the database refuses it anyway.
    for (const id of new Set(pick.skillIds)) {
      const rate = rates.get(id);
      if (!rate) continue;
      rate.met += 1;
      if (pick.right) rate.right += 1;
    }
  }
  return [...rates.values()];
}

/** How many of the 26 Skills were met at least once. */
export function skillsMet(rates: SkillRate[]): number {
  return rates.filter((rate) => rate.met > 0).length;
}

/** For example "2 of 3 right · 67%". A Skill never met says so in words, not only in grey. */
export function formatSkillRate({ right, met }: Pick<SkillRate, "right" | "met">): string {
  if (met === 0) return "Not met yet";
  return `${right} of ${met} right · ${Math.round((right / met) * 100)}%`;
}
