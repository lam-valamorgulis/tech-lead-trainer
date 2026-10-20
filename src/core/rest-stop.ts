// Rest Stop rule (design section 5, and section 14 rule 8). Pure functions: no clock, no database.
// Days come from the learning-day rule in day.ts. There is no second date rule here.

import { addDays, learnedDays, type LearningDay, type SessionSnapshot } from "./day.ts";

/** The Rest Stop opens when the last learned day is this many days ago, or more. */
export const REST_STOP_AFTER_DAYS = 3;

/** The latest learned day (3 minutes or more) up to today, or null when there is none. */
export function lastLearnedDay(snapshots: SessionSnapshot[], today: LearningDay): LearningDay | null {
  return learnedDays(snapshots, today).reduce<LearningDay | null>((last, day) => (last === null || day > last ? day : last), null);
}

/**
 * True when home should open on the Rest Stop.
 * With no learned day yet (a new learner), it never shows: there is nothing to come back to.
 */
export function showsRestStop(lastLearned: LearningDay | null, today: LearningDay): boolean {
  if (lastLearned === null) return false;
  return addDays(lastLearned, REST_STOP_AFTER_DAYS) <= today;
}
