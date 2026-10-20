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
  /** Evolution: 1 when caught, 2 after passing the 7-day step, 3 after passing the 30-day step. */
  stage: Stage;
};

export type Stage = 1 | 2 | 3;

/** A Good or Easy that moves past one of these steps evolves the creature (design 5). */
const EVOLVE_AFTER: [step: ReviewStep, stage: Stage][] = [
  [7, 2],
  [30, 3],
];

/** The stage after a review. Stages never go back, even after a later Again. */
function stageAfter(stage: Stage, grade: Grade, next: { step: ReviewStep; dueDay: LearningDay | null }): Stage {
  if (grade !== "good" && grade !== "easy") return stage;
  let result = stage;
  for (const [step, evolved] of EVOLVE_AFTER) {
    if ((next.dueDay === null || next.step > step) && evolved > result) result = evolved;
  }
  return result;
}

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
      stage: 1,
    });
  }
  for (const review of reviews) {
    const state = states.get(review.itemId);
    if (!state) continue;
    const next = gradeReview({ step: state.step, gradedDay: review.learningDay, grade: review.grade });
    state.stage = stageAfter(state.stage, review.grade, next);
    state.step = next.step;
    state.dueDay = next.dueDay;
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

/** The backlog guard looks at this many days in a row. */
export const BACKLOG_DAYS = 3;

/**
 * Backlog guard (design 6): when more than 8 reviews were due on each of the last 3 days,
 * new catches pause. They start again on a day with 8 or fewer due. Each day counts its queue
 * at the start of the day, before that day's reviews.
 */
export function backlogPaused(
  catches: CatchRecord[],
  reviews: ReviewRecord[],
  today: LearningDay,
  isReviewable: (itemId: string) => boolean = () => true,
): boolean {
  for (let back = 0; back < BACKLOG_DAYS; back += 1) {
    const day = addDays(today, -back);
    const states = reviewStates(
      catches.filter((c) => c.learningDay < day),
      reviews.filter((r) => r.learningDay < day),
    );
    const due = allDue(states, day).filter((state) => isReviewable(state.itemId));
    if (due.length <= DAILY_REVIEW_LIMIT) return false;
  }
  return true;
}
