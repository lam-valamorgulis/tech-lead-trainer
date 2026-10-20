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
import type { ReviewRecord } from "./review.ts";

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
  return { weekStart: addDays(sunday, -6), summaryAt: homeTimeToInstant(sunday, SUMMARY_MINUTE_OF_DAY, timeZone) };
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

/** The Sunday summary of one week, as it is saved and shown. */
export type WeeklySummary = {
  weekStart: LearningDay;
  daysLearned: number;
  minutes: number;
  goalMinutes: number;
  /** The week's best-move rate (#17): turns where the learner picked the best move. */
  bestMoves: BestMoveRate;
  weakest: Creature[];
};

/** A saved summary. `summaryAt` is Sunday 20:00 home time: the summary counts what came before. */
export type StoredWeeklySummary = WeeklySummary & { summaryAt: string };

/**
 * The summary of the week that starts on `weekStart`. Records on other learning days are left
 * out. The caller passes only what happened before the summary moment (see `latestSummaryWeek`).
 * Snapshots should start one day before the week: a session counts for the day it started.
 */
export function weeklySummary(input: {
  weekStart: LearningDay;
  snapshots: SessionSnapshot[];
  /** Only the best-move flag stored at play time and the day matter here. */
  turns: Pick<TurnRecord, "bestMove" | "learningDay">[];
  reviews: ReviewRecord[];
  creatureOf: CreatureOf;
}): WeeklySummary {
  const sunday = addDays(input.weekStart, 6);
  const inWeek = (record: { learningDay: LearningDay }) => record.learningDay >= input.weekStart && record.learningDay <= sunday;
  const turns = input.turns.filter(inWeek);
  return {
    weekStart: input.weekStart,
    daysLearned: learnedDays(input.snapshots, sunday).filter((day) => day >= input.weekStart).length,
    minutes: weekMinutes(input.snapshots, sunday),
    goalMinutes: WEEKLY_GOAL_MINUTES,
    bestMoves: { bestMoves: turns.filter((turn) => turn.bestMove).length, turns: turns.length },
    weakest: weakestCreatures(input.reviews.filter(inWeek), input.creatureOf),
  };
}
