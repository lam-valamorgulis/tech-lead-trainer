// Week rules (design 3): the week, minutes against the weekly goal, and the Sunday summary.
// Pure functions: no clock, no database. Days come from the learning-day rule in day.ts.

import type { BestMoveRate, TurnRecord } from "./battle.ts";
import {
  activeSecondsByDay,
  addDays,
  dayNumber,
  homeTimeToInstant,
  homeWallClock,
  learnedDays,
  type LearningDay,
  type SessionSnapshot,
} from "./day.ts";
import { cardCreatureId, type CardRecord, type ReviewRecord } from "./review.ts";

/** The weekly goal: 5 hours 15 minutes. */
export const WEEKLY_GOAL_MINUTES = 315;

/**
 * The Monday of the week of `day`. A learning day starts at the cutoff hour, so the week starts
 * on Monday at the cutoff hour too (design 3).
 */
export function weekStart(day: LearningDay): LearningDay {
  return addDays(day, -weekday(day));
}

/** The Sunday summary is made at 20:00 home time (design 3). */
export const SUMMARY_MINUTE_OF_DAY = 20 * 60;

/**
 * The week whose Sunday summary is the latest one due at `now`, and the moment it is due:
 * Sunday 20:00 in the home time zone. The summary counts what happened before that moment.
 * Until Sunday 20:00 this is last week; from then on it is the week that is ending.
 */
export function latestSummaryWeek(now: Date, timeZone: string): { weekStart: LearningDay; summaryAt: Date } {
  const wallClock = homeWallClock(now, timeZone);
  const date = new Date(wallClock).toISOString().slice(0, 10);
  const minute = Math.floor(wallClock / 60_000) % (24 * 60);
  const day = weekday(date);
  // Sunday after 20:00 is the summary day itself. Any other time goes back to the Sunday before.
  const sunday = day === 6 && minute >= SUMMARY_MINUTE_OF_DAY ? date : addDays(date, -(day + 1));
  return { weekStart: addDays(sunday, -6), summaryAt: summaryMoment(addDays(sunday, -6), timeZone) };
}

/** Sunday 20:00 home time of the week that starts on `monday`: its summary counts what came before. */
export function summaryMoment(monday: LearningDay, timeZone: string): Date {
  return homeTimeToInstant(addDays(monday, 6), SUMMARY_MINUTE_OF_DAY, timeZone);
}

/** 0 for Monday up to 6 for Sunday. Day number 0, 1970-01-01, was a Thursday. */
function weekday(day: LearningDay): number {
  return (dayNumber(day) + 3) % 7;
}

/** Whole minutes of active time on this week's learning days, up to and including `today`. */
export function weekMinutes(snapshots: SessionSnapshot[], today: LearningDay): number {
  const first = weekStart(today);
  let seconds = 0;
  for (const [day, active] of activeSecondsByDay(snapshots)) {
    if (day >= first && day <= today) seconds += active;
  }
  return Math.floor(seconds / 60);
}

/** A fixed list, so every browser shows the same text (some write "Sept"). */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** For example "12 Oct – 18 Oct": the Monday and the Sunday of the week. */
export function formatWeek(monday: LearningDay): string {
  const day = (date: LearningDay) => `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1]}`;
  return `${day(monday)} – ${day(addDays(monday, 6))}`;
}

/** For example "1 h 20 min of 5 h 15 min". */
export function formatWeekMinutes(minutes: number, goalMinutes: number = WEEKLY_GOAL_MINUTES): string {
  return `${formatDuration(minutes)} of ${formatDuration(goalMinutes)}`;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** A creature as the summary shows it. The name is saved too, so a later rename never changes an old summary. */
export type Creature = { id: string; name: string };

/** The creature a reviewed item belongs to: the creature itself, or the creature of a move. */
export type CreatureOf = (itemId: string) => Creature | undefined;

/** How many weakest creatures the summary shows (design 2). */
export const WEAKEST_COUNT = 3;

/**
 * The weakest creatures in `reviews`, at most 3. A review of a move counts for its creature.
 * Only Again and Hard are weak answers: a creature with neither is never called weak.
 * Order: more Again answers first, then more Hard answers, then the creature id.
 */
export function weakestCreatures(reviews: ReviewRecord[], creatureOf: CreatureOf): Creature[] {
  const counts = new Map<string, { creature: Creature; again: number; hard: number }>();
  for (const { itemId, grade } of reviews) {
    if (grade !== "again" && grade !== "hard") continue;
    const creature = creatureOf(itemId);
    if (!creature) continue;
    const count = counts.get(creature.id) ?? { creature, again: 0, hard: 0 };
    count[grade] += 1;
    counts.set(creature.id, count);
  }
  return [...counts.values()]
    .sort((a, b) => b.again - a.again || b.hard - a.hard || (a.creature.id < b.creature.id ? -1 : 1))
    .slice(0, WEAKEST_COUNT)
    .map((count) => count.creature);
}

/** A share of right picks: `right` of `total`. */
export type Rate = { right: number; total: number };

/** A rate of the summary's week next to the same rate of the week before (design 3). */
export type WeekRate = { thisWeek: Rate; lastWeek: Rate };

/**
 * How this week's rate compares with last week's. Both become whole percentages first, so the
 * words always match the numbers the learner sees.
 */
export type RateChange =
  | { kind: "none"; lastPercent: number | null }
  | { kind: "no-last-week"; percent: number }
  | { kind: "up" | "down" | "same"; percent: number; lastPercent: number; points: number };

function percentOf(rate: Rate): number | null {
  return rate.total === 0 ? null : Math.round((rate.right / rate.total) * 100);
}

export function compareWithLastWeek({ thisWeek, lastWeek }: WeekRate): RateChange {
  const percent = percentOf(thisWeek);
  const lastPercent = percentOf(lastWeek);
  if (percent === null) return { kind: "none", lastPercent };
  if (lastPercent === null) return { kind: "no-last-week", percent };
  const points = percent - lastPercent;
  return { kind: points > 0 ? "up" : points < 0 ? "down" : "same", percent, lastPercent, points };
}

/** For example "67% (2 of 3 turns), up 17 points from 50% last week". */
export function formatWeekRate(rate: WeekRate, unit: "turn" | "card"): string {
  const change = compareWithLastWeek(rate);
  const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  if (change.kind === "none") {
    return `no ${unit}s this week${change.lastPercent === null ? "" : ` (${change.lastPercent}% last week)`}`;
  }
  const now = `${change.percent}% (${rate.thisWeek.right} of ${count(rate.thisWeek.total, unit)})`;
  switch (change.kind) {
    case "no-last-week":
      return `${now}, none last week`;
    case "same":
      return `${now}, the same as last week`;
    default:
      return `${now}, ${change.kind} ${count(Math.abs(change.points), "point")} from ${change.lastPercent}% last week`;
  }
}

/** A battle turn as the summary counts it. `constraintVariant` is null when the turn showed no Constraint. */
export type SummaryTurn = Pick<TurnRecord, "scenarioId" | "turnNumber" | "bestMove" | "learningDay"> & {
  constraintVariant: string | null;
};

/** The concept a battle turn tests: the creature of its best move. Undefined for a Meeting answer or a verdict. */
export type ConceptOfTurn = (scenarioId: string, turnNumber: number) => Creature | undefined;

/** How many most-missed concepts the summary shows (design 3). */
export const MOST_MISSED_COUNT = 3;

/**
 * The concepts the learner picked wrong most often, at most 3. A battle turn without the best
 * move counts for the turn's concept. A wrong Decision Card or trade-off answer counts for its
 * creature. A concept with no wrong pick is never named. Ties go by the concept id.
 */
export function mostMissedConcepts(
  turns: SummaryTurn[],
  cards: CardRecord[],
  conceptOfTurn: ConceptOfTurn,
  creatureOf: CreatureOf,
): Creature[] {
  const misses = new Map<string, { creature: Creature; count: number }>();
  const miss = (creature: Creature | undefined) => {
    if (!creature) return;
    const entry = misses.get(creature.id) ?? { creature, count: 0 };
    entry.count += 1;
    misses.set(creature.id, entry);
  };
  for (const turn of turns) if (!turn.bestMove) miss(conceptOfTurn(turn.scenarioId, turn.turnNumber));
  for (const card of cards) if (!card.right) miss(creatureOf(cardCreatureId(card.cardId)));
  return [...misses.values()]
    .sort((a, b) => b.count - a.count || (a.creature.id < b.creature.id ? -1 : 1))
    .slice(0, MOST_MISSED_COUNT)
    .map((entry) => entry.creature);
}

/**
 * The concept of the work question "Where did you meet <concept> at work this week?": the most
 * missed one, else the weakest creature in review. With neither, the summary asks nothing.
 */
export function workQuestionConcept(mostMissed: Creature[], weakest: Creature[]): Creature | null {
  return mostMissed[0] ?? weakest[0] ?? null;
}

/** The v1.5 part of the Sunday summary (design 3 and 7.7, ticket #114). */
export type WeekPicks = {
  /** Battle turns that showed a Constraint, where the learner picked the best move. */
  constraintBestMoves: WeekRate;
  /** Decision Cards with the right option and the right Reason. */
  decisionCards: WeekRate;
  mostMissed: Creature[];
  /** The concept of the work question, or null when the summary asks none. */
  workConcept: Creature | null;
};

/** The Sunday summary of one week, as it is saved and shown. */
export type WeeklySummary = {
  weekStart: LearningDay;
  daysLearned: number;
  minutes: number;
  goalMinutes: number;
  /** The week's best-move rate (#17): turns where the learner picked the best move. */
  bestMoves: BestMoveRate;
  weakest: Creature[];
  /** Null only in a summary saved before v1.5 (#114): an old week stays as it was shown. */
  picks: WeekPicks | null;
};

/** A saved summary. `summaryAt` is Sunday 20:00 home time: the summary counts what came before. */
export type StoredWeeklySummary = WeeklySummary & { summaryAt: string };

/**
 * The summary of the week that starts on `weekStart`. Records on other learning days are left
 * out, but turns and cards of the week before give last week's rates. The caller passes only
 * what each week's summary moment counts (see `summaryMoment`).
 * Snapshots should start one day before the week: a session counts for the day it started.
 */
export function weeklySummary(input: {
  weekStart: LearningDay;
  snapshots: SessionSnapshot[];
  /** Only the flags stored at play time, the turn and the day matter here. */
  turns: SummaryTurn[];
  reviews: ReviewRecord[];
  /** Answered Decision Cards and trade-off questions (#109). */
  cards: CardRecord[];
  creatureOf: CreatureOf;
  conceptOfTurn: ConceptOfTurn;
}): WeeklySummary {
  const sunday = addDays(input.weekStart, 6);
  const lastMonday = addDays(input.weekStart, -7);
  const inWeek = (record: { learningDay: LearningDay }) => record.learningDay >= input.weekStart && record.learningDay <= sunday;
  const inLastWeek = (record: { learningDay: LearningDay }) => record.learningDay >= lastMonday && record.learningDay < input.weekStart;
  const turns = input.turns.filter(inWeek);
  const cards = input.cards.filter(inWeek);
  const weakest = weakestCreatures(input.reviews.filter(inWeek), input.creatureOf);
  const mostMissed = mostMissedConcepts(turns, cards, input.conceptOfTurn, input.creatureOf);

  return {
    weekStart: input.weekStart,
    daysLearned: learnedDays(input.snapshots, sunday).filter((day) => day >= input.weekStart).length,
    minutes: weekMinutes(input.snapshots, sunday),
    goalMinutes: WEEKLY_GOAL_MINUTES,
    bestMoves: { bestMoves: turns.filter((turn) => turn.bestMove).length, turns: turns.length },
    weakest,
    picks: {
      constraintBestMoves: { thisWeek: constraintRate(turns), lastWeek: constraintRate(input.turns.filter(inLastWeek)) },
      decisionCards: { thisWeek: decisionRate(cards), lastWeek: decisionRate(input.cards.filter(inLastWeek)) },
      mostMissed,
      workConcept: workQuestionConcept(mostMissed, weakest),
    },
  };
}

/** The best-move rate of the turns that showed a Constraint (design 7.7). */
function constraintRate(turns: SummaryTurn[]): Rate {
  const shown = turns.filter((turn) => turn.constraintVariant !== null);
  return { right: shown.filter((turn) => turn.bestMove).length, total: shown.length };
}

/** The rate of Decision Cards with the right option and the right Reason, as review counts them. */
function decisionRate(cards: CardRecord[]): Rate {
  const decisions = cards.filter((card) => card.kind === "decision");
  return { right: decisions.filter((card) => card.right).length, total: decisions.length };
}
