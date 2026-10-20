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
 *
 * A review before the due day (a confusable partner mixed in early, design 6) keeps the step and
 * the due day, unless the grade is Again: seeing an item early never skips spacing, but a real
 * mistake still counts.
 */
export function gradeReview({
  step,
  gradedDay,
  grade,
  dueDay,
}: {
  step: ReviewStep;
  gradedDay: LearningDay;
  grade: Grade;
  /** The due day before this review. Leave it out for a review that is due. */
  dueDay?: LearningDay | null;
}): { step: ReviewStep; dueDay: LearningDay | null } {
  if (dueDay && gradedDay < dueDay && grade !== "again") return { step, dueDay };
  const index = REVIEW_STEPS.indexOf(step);
  if (index === LAST && MOVE[grade] > 0) return { step, dueDay: null };
  const next = REVIEW_STEPS[Math.min(LAST, Math.max(0, index + MOVE[grade]))];
  return { step: next, dueDay: addDays(gradedDay, next) };
}

/**
 * A battle asks to see an item again soon (design 7): a lost battle, or a model answer whose key
 * points the learner did not all say. See `battleRechecks` in battle.ts.
 */
export type RecheckRecord = { itemId: string; learningDay: LearningDay };

/**
 * A recheck makes the item due on the first review step after the battle day, that is tomorrow.
 * It keeps the step and the stage, and it never moves a due day later. It does nothing for an
 * item that was not caught yet on that day.
 */
function applyRecheck(states: Map<string, ReviewState>, recheck: RecheckRecord) {
  const state = states.get(recheck.itemId);
  if (!state || recheck.learningDay < state.caughtDay) return;
  const due = addDays(recheck.learningDay, REVIEW_STEPS[0]);
  if (state.dueDay === null || state.dueDay > due) state.dueDay = due;
}

/**
 * The review state of every caught item, replayed from the event log. Records must be in time order.
 * Rechecks count in day order with the reviews, after the reviews of the same day: a day's
 * battle comes after its reviews.
 */
export function reviewStates(
  catches: CatchRecord[],
  reviews: ReviewRecord[],
  rechecks: RecheckRecord[] = [],
): Map<string, ReviewState> {
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
  // A stable sort keeps the order of the rechecks inside one day.
  const waiting = [...rechecks].sort((a, b) => a.learningDay.localeCompare(b.learningDay));
  let next = 0;
  const recheckBefore = (day: LearningDay) => {
    while (next < waiting.length && waiting[next].learningDay < day) applyRecheck(states, waiting[next++]);
  };
  for (const review of reviews) {
    recheckBefore(review.learningDay);
    const state = states.get(review.itemId);
    if (!state) continue;
    const graded = gradeReview({ step: state.step, gradedDay: review.learningDay, grade: review.grade, dueDay: state.dueDay });
    state.stage = stageAfter(state.stage, review.grade, graded);
    state.step = graded.step;
    state.dueDay = graded.dueDay;
  }
  // The rechecks after the last review.
  while (next < waiting.length) applyRecheck(states, waiting[next++]);
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

/** Two creatures or moves that are easy to mix up (content `confusablePairs`). */
export type ConfusablePair = [string, string];

/** A review for today. `mixedWith` names the due item it was mixed in next to, before its own due day. */
export type TodayReview = DueState & { mixedWith?: string };

/** A state with a due day, so it can be reviewed early. A state whose reviews ended has none. */
function hasDueDay(state: ReviewState | undefined): state is DueState {
  return state !== undefined && state.dueDay !== null;
}

/**
 * Today's reviews: at most 8 a day, across all of today's sessions, oldest overdue first.
 * Items that can no longer be reviewed, for example retired content, never take a place.
 *
 * Interleaving (design 6, from Sprint 3): the places go to due items first. Inside them, a due
 * confusable partner moves right after its pair. A caught partner that is not due yet fills a place
 * only when one is left over, right after its pair. So a partner never pushes out a due item.
 */
export function dueReviews({
  states,
  reviews,
  today,
  isReviewable = () => true,
  pairs = [],
}: {
  states: Map<string, ReviewState>;
  reviews: ReviewRecord[];
  today: LearningDay;
  isReviewable?: (itemId: string) => boolean;
  /** Confusable pairs from the content of every town. */
  pairs?: ConfusablePair[];
}): TodayReview[] {
  const todays = reviews.filter((review) => review.learningDay === today);
  const reviewedToday = new Set(todays.map((review) => review.itemId));
  const places = Math.max(0, DAILY_REVIEW_LIMIT - todays.length);
  const due = allDue(states, today)
    .filter((state) => isReviewable(state.itemId))
    .slice(0, places);
  const dueIds = new Set(due.map((state) => state.itemId));
  let spare = places - due.length;

  const partnersOf = (id: string) => pairs.flatMap(([a, b]) => (a === id ? [b] : b === id ? [a] : []));
  const result: TodayReview[] = [];
  const taken = new Set<string>();
  const take = (review: TodayReview) => {
    result.push(review);
    taken.add(review.itemId);
  };
  for (const state of due) {
    if (taken.has(state.itemId)) continue;
    take(state);
    for (const partner of partnersOf(state.itemId)) {
      if (taken.has(partner)) continue;
      if (dueIds.has(partner)) {
        take(due.find((s) => s.itemId === partner)!);
        continue;
      }
      const other = states.get(partner);
      if (spare === 0 || !hasDueDay(other) || other.dueDay <= today) continue;
      if (reviewedToday.has(partner) || !isReviewable(partner)) continue;
      take({ ...other, mixedWith: state.itemId });
      spare -= 1;
    }
  }
  return result;
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
  rechecks: RecheckRecord[] = [],
): boolean {
  for (let back = 0; back < BACKLOG_DAYS; back += 1) {
    const day = addDays(today, -back);
    const states = reviewStates(
      catches.filter((c) => c.learningDay < day),
      reviews.filter((r) => r.learningDay < day),
      rechecks.filter((r) => r.learningDay < day),
    );
    const due = allDue(states, day).filter((state) => isReviewable(state.itemId));
    if (due.length <= DAILY_REVIEW_LIMIT) return false;
  }
  return true;
}
