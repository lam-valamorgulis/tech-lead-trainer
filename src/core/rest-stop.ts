// Rest Stop rule (design 5 and 14.8). Pure functions: no clock, no database.
// Days come from the learning-day rule in day.ts. There is no second date rule here.

import { activeSecondsByDay, addDays, isLearnedDay, type LearningDay, type SessionSnapshot } from "./day.ts";

/** The Rest Stop opens when the last learned day is this many days ago, or more. */
export const REST_STOP_AFTER_DAYS = 3;

/**
 * True when home should open on the Rest Stop.
 * With no learned day yet (a new learner), it never shows: there is nothing to come back to.
 */
export function showsRestStop(lastLearned: LearningDay | null, today: LearningDay): boolean {
  if (lastLearned === null) return false;
  return addDays(lastLearned, REST_STOP_AFTER_DAYS) <= today;
}

/** The latest learned day (3 minutes or more) up to today, or null when there is none. */
export function lastLearnedDay(snapshots: SessionSnapshot[], today: LearningDay): LearningDay | null {
  let last: LearningDay | null = null;
  for (const [day, seconds] of activeSecondsByDay(snapshots)) {
    if (day <= today && isLearnedDay(seconds) && (last === null || day > last)) last = day;
  }
  return last;
}
