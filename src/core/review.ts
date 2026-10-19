// Review schedule (design 6, ticket #7). Pure functions: no clock, no database.
import type { CatchRecord } from "./catch.ts";
import { addDays, type LearningDay } from "./day.ts";

/** Days until the next review, step by step. The last one is "one review near day 180". */
export const REVIEW_STEPS = [1, 3, 7, 14, 30, 90, 180] as const;
export type ReviewStep = (typeof REVIEW_STEPS)[number];

/** At most 8 reviews a day, so a 3-minute day always fits. */
export const DAILY_REVIEW_LIMIT = 8;

export type Grade = "again" | "hard" | "good" | "easy";

/** What the rules need from a saved review event. */
export type ReviewRecord = { itemId: string; learningDay: LearningDay; grade: Grade };

export type ReviewState = {
  itemId: string;
  step: ReviewStep;
  /** null when the reviews of this item have ended. */
  dueDay: LearningDay | null;
  caughtDay: LearningDay;
};

const MOVE: Record<Grade, number> = { again: -1, hard: 0, good: 1, easy: 2 };
const LAST = REVIEW_STEPS.length - 1;

/**
 * Again goes back one step, Hard repeats the step, Good goes to the next step, Easy skips one.
 * Good or Easy on the last step ends the reviews.
 */
export function gradeReview({
  step,
  gradedDay,
  grade,
}: {
  step: ReviewStep;
  gradedDay: LearningDay;
  grade: Grade;
}): { step: ReviewStep; dueDay: LearningDay | null } {
  const index = REVIEW_STEPS.indexOf(step);
  if (index === LAST && MOVE[grade] > 0) return { step, dueDay: null };
  const next = REVIEW_STEPS[Math.min(LAST, Math.max(0, index + MOVE[grade]))];
  return { step: next, dueDay: addDays(gradedDay, next) };
}

/** The review state of every caught item, replayed from the event log. Records must be in time order. */
export function reviewStates(catches: CatchRecord[], reviews: ReviewRecord[]): Map<string, ReviewState> {
  const states = new Map<string, ReviewState>();
  for (const record of catches) {
    if (!record.correct || states.has(record.itemId)) continue;
    const step = REVIEW_STEPS[0];
    states.set(record.itemId, {
      itemId: record.itemId,
      step,
      dueDay: addDays(record.learningDay, step),
      caughtDay: record.learningDay,
    });
  }
  for (const review of reviews) {
    const state = states.get(review.itemId);
    if (!state) continue;
    Object.assign(state, gradeReview({ step: state.step, gradedDay: review.learningDay, grade: review.grade }));
  }
  return states;
}

/** A review state that is due on a day, so its due day is never null. */
export type DueState = ReviewState & { dueDay: LearningDay };

/** All items due today or earlier, oldest overdue first. */
export function allDue(states: Map<string, ReviewState>, today: LearningDay): DueState[] {
  return [...states.values()]
    .filter((state): state is DueState => state.dueDay !== null && state.dueDay <= today)
    .sort(
      (a, b) =>
        a.dueDay.localeCompare(b.dueDay) || a.caughtDay.localeCompare(b.caughtDay) || a.itemId.localeCompare(b.itemId),
    );
}

/**
 * Today's reviews: at most 8 a day, across all of today's sessions, oldest overdue first.
 * Items that can no longer be reviewed, for example retired content, never take a place.
 */
export function dueReviews({
  states,
  reviews,
  today,
  isReviewable = () => true,
}: {
  states: Map<string, ReviewState>;
  reviews: ReviewRecord[];
  today: LearningDay;
  isReviewable?: (itemId: string) => boolean;
}): DueState[] {
  const doneToday = reviews.filter((review) => review.learningDay === today).length;
  const places = Math.max(0, DAILY_REVIEW_LIMIT - doneToday);
  return allDue(states, today)
    .filter((state) => isReviewable(state.itemId))
    .slice(0, places);
}
