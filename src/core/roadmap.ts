// The 12-town year (design 4, ticket #25). Pure functions: no clock, no database.
// A "month" is the learner's own month, counted from their program start date.
import type { LearningDay } from "./day.ts";

/** One town per month, in order (research/roadmap-sources.md, table 2b). */
export const ROADMAP = [
  { number: 1, name: "Web and HTTP in depth" },
  { number: 2, name: "API design" },
  { number: 3, name: "Databases, SQL, indexes and transactions" },
  { number: 4, name: "Testing and CI" },
  { number: 5, name: "Cache and CDN" },
  { number: 6, name: "Queues and async work" },
  { number: 7, name: "Distributed systems" },
  { number: 8, name: "Reliability" },
  { number: 9, name: "Security" },
  { number: 10, name: "Code architecture and system design" },
  { number: 11, name: "Tech lead decisions" },
  { number: 12, name: "Leading AI agents and the final project" },
] as const;

export type TownNumber = (typeof ROADMAP)[number]["number"];

/**
 * The first day of a town for this learner: the same date `townNumber - 1` months after day 1.
 * When that date does not exist, for example 31 February, it is the last day of that month.
 */
export function townStartDay(programStartDate: LearningDay, townNumber: number): LearningDay {
  const [year, month, day] = programStartDate.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + townNumber - 1, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

/** The learner's town today. Town 1 before day 1, and town 12 after the year ends. */
export function currentTownNumber(programStartDate: LearningDay, today: LearningDay): TownNumber {
  let current: TownNumber = 1;
  for (const { number } of ROADMAP) {
    if (townStartDay(programStartDate, number) <= today) current = number;
  }
  return current;
}

/**
 * The town whose content the learner plays: their own town, or the last earlier town with
 * content when theirs is not ready yet. A day is never empty, and no one skips ahead.
 */
export function townToPlay<T extends { number: number; retired?: boolean }>(towns: T[], townNumber: number): T | undefined {
  return towns
    .filter((town) => !town.retired && town.number <= townNumber)
    .reduce<T | undefined>((best, town) => (best && best.number >= town.number ? best : town), undefined);
}

/**
 * True when home shows the "new town" screen, the Town Intro (design 4 and 6.1): the learner
 * started no session since the town's first day. Their first session in the town starts on the
 * same day, so the screen shows once. Town 1 is not a new town, so it shows there only when its
 * content has a Town Intro to teach. `lastSessionDay` is the learning day of their latest session
 * of any length, or null.
 */
export function showsNewTown({
  programStartDate,
  townNumber,
  lastSessionDay,
  hasIntro = false,
}: {
  programStartDate: LearningDay;
  /** The town the learner plays today (townToPlay), so it has already started. */
  townNumber: number;
  lastSessionDay: LearningDay | null;
  /** The town's content has a Town Intro (#98). */
  hasIntro?: boolean;
}): boolean {
  if (townNumber < 2 && !hasIntro) return false;
  const firstDay = townStartDay(programStartDate, townNumber);
  return lastSessionDay === null || lastSessionDay < firstDay;
}
