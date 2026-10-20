// Tracking (ticket #30, design 2 and 14). Pure functions: no clock, no database.
// Each number comes from a rule that already exists: the day rule (day.ts), the week rules
// (week.ts), the Field Guide (catch.ts) and the badges (gym.ts). There is no second version here.
// Guard rules (design 14): no streak, and no "days learned this week" number (rule 7).

import type { BundledTown } from "@/content/bundle";
import { bestMoveRates, type BestMoveRate, type TurnRecord } from "./battle.ts";
import { fieldGuideProgress, type CatchRecord } from "./catch.ts";
import { addDays, learnedDays, RATE_WINDOW_DAYS, type LearningDay, type SessionSnapshot } from "./day.ts";
import type { ReviewRecord } from "./review.ts";
import { ROADMAP } from "./roadmap.ts";
import { weakestCreatures, weekStart, type Creature, type CreatureOf } from "./week.ts";

/** "outside" is a blank cell: before the 30 days, or after today. */
export type CalendarDay = { day: LearningDay; status: "learned" | "not-learned" | "outside" };

/**
 * The learning calendar: the same 30 days as the 30-day rate, laid out in weeks from Monday
 * to Sunday. A day is learned at 3 minutes, the rule of `learnedDays`.
 */
export function learningCalendar(snapshots: SessionSnapshot[], today: LearningDay): CalendarDay[][] {
  const first = addDays(today, -(RATE_WINDOW_DAYS - 1));
  const learned = new Set(learnedDays(snapshots, today));
  const weeks: CalendarDay[][] = [];
  for (let monday = weekStart(first); monday <= today; monday = addDays(monday, 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, i) => {
        const day = addDays(monday, i);
        if (day < first || day > today) return { day, status: "outside" as const };
        return { day, status: learned.has(day) ? ("learned" as const) : ("not-learned" as const) };
      }),
    );
  }
  return weeks;
}

/** The 3 weakest creatures of this week so far, by the Sunday summary's rule (`weakestCreatures`). */
export function weakestThisWeek(reviews: ReviewRecord[], today: LearningDay, creatureOf: CreatureOf): Creature[] {
  const monday = weekStart(today);
  return weakestCreatures(
    reviews.filter((review) => review.learningDay >= monday && review.learningDay <= today),
    creatureOf,
  );
}

export type TownBestMoves = { townId: string; name: string; rate: BestMoveRate };

/**
 * The best-move rate of each town with battle turns (`bestMoveRates`), in town order.
 * A town's name comes from its content, or from the year plan when the app has no content for it.
 */
export function bestMovesByTown(turns: TurnRecord[], towns: BundledTown[]): TownBestMoves[] {
  const numbered = [...bestMoveRates(turns)].map(([townId, rate]) => {
    const town = towns.find((t) => t.id === townId);
    const number = town?.number ?? Number(townId.slice(1));
    const name = town?.name ?? ROADMAP.find((t) => t.number === number)?.name;
    return { number, entry: { townId, name: name ? `Town ${number}: ${name}` : townId, rate } };
  });
  return numbered.sort((a, b) => a.number - b.number || a.entry.townId.localeCompare(b.entry.townId)).map(({ entry }) => entry);
}

/** The year goal the app checks: one badge per town, 12 towns (design 4). */
export const BADGES_GOAL = 12;

/** The 2 year goals the learner checks by hand. These ids are stored, so they never change. */
export const HAND_GOALS = ["interview-tower", "champion-project"] as const;
export type HandGoal = (typeof HAND_GOALS)[number];

const HAND_GOAL_LABELS: Record<HandGoal, string> = {
  "interview-tower": "Interview Tower passed",
  "champion-project": "Champion project done",
};

export type YearGoal = { id: "twelve-badges" | HandGoal; label: string; checked: boolean; byHand: boolean };

/**
 * The 3 year goals (spec story 71): a check box each, with no made-up score.
 * "12 badges" is checked from the badges themselves, so it can never disagree with them.
 */
export function yearGoals(badges: { townId: string }[], handChecked: readonly HandGoal[]): YearGoal[] {
  return [
    {
      id: "twelve-badges",
      label: `${BADGES_GOAL} badges (${badges.length} of ${BADGES_GOAL})`,
      checked: badges.length >= BADGES_GOAL,
      byHand: false,
    },
    ...HAND_GOALS.map((id) => ({ id, label: HAND_GOAL_LABELS[id], checked: handChecked.includes(id), byHand: true })),
  ];
}

/** The Field Guide numbers (design 5). Seen counts every creature met, caught or not. */
export type FieldGuideCounts = { seen: number; caught: number; fullyEvolved: number };

/** The Field Guide numbers over every town with content, from each town's Field Guide. */
export function fieldGuideCounts(towns: BundledTown[], catches: CatchRecord[], reviews: ReviewRecord[]): FieldGuideCounts {
  const creatures = towns.flatMap((town) => fieldGuideProgress(town, catches, reviews).creatures);
  return {
    seen: creatures.filter((creature) => creature.status !== "not-met").length,
    caught: creatures.filter((creature) => creature.status === "caught").length,
    fullyEvolved: creatures.filter((creature) => creature.stage === 3).length,
  };
}
