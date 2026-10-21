// Review schedule (design 6, ticket #7). Pure functions: no clock, no database.
import type { CatchRecord } from "./catch.ts";
import { addDays, type LearningDay } from "./day.ts";

/** Days until the next review, step by step. The last one is "one review near day 180". */
export const REVIEW_STEPS = [1, 3, 7, 14, 30, 90, 180] as const;
export type ReviewStep = (typeof REVIEW_STEPS)[number];

/** At most 8 reviews a day, so a 3-minute day always fits. */
export const DAILY_REVIEW_LIMIT = 8;

export type Grade = "again" | "hard" | "good" | "easy";

/**
 * The review rules a review was graded under. v1.5 (design 6.5): passing the 30-day step gives
 * Stage 3 only with one right trade-off answer. A review from before v1.5 has none: passing the
 * 30-day step gave Stage 3 by itself, and it still does when the log is replayed.
 */
export const REVIEW_RULES = "v1.5";
export type ReviewRules = typeof REVIEW_RULES;

/** What the rules need from a saved review event. */
export type ReviewRecord = { itemId: string; learningDay: LearningDay; grade: Grade; rules?: ReviewRules | null };

/** A scored card in review: a Decision Card (design 6.4) or the Stage 3 trade-off question (design 6.5). */
export type CardKind = "decision" | "trade-off";

/**
 * One answered Decision Card or trade-off question. `right` means the right option and the right
 * Reason. The card id starts with its creature id, for example cache.decision.logo.
 */
export type CardRecord = { cardId: string; kind: CardKind; learningDay: LearningDay; right: boolean };

/** The creature a Decision Card or trade-off question belongs to: the first part of its id. */
export function cardCreatureId(cardId: string): string {
  return cardId.slice(0, cardId.indexOf("."));
}

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

/** Stage 2 comes after the 7-day step, Stage 3 after the 30-day step (design 6.5). */
const STAGE_2_STEP = 7;
const STAGE_3_STEP = 30;

type Graded = { step: ReviewStep; dueDay: LearningDay | null };

/** A Good or Easy that moves past the step, or ends the reviews. An early review keeps its step. */
function passes(step: ReviewStep, grade: Grade, next: Graded): boolean {
  return (grade === "good" || grade === "easy") && (next.dueDay === null || next.step > step);
}

/**
 * The stage after a review. Stages never go back, even after a later Again.
 * `needsTradeOff`: passing the 30-day step is not enough for Stage 3 (v1.5, no right trade-off answer yet).
 */
function stageAfter(stage: Stage, grade: Grade, next: Graded, needsTradeOff: boolean): Stage {
  let result = stage;
  if (passes(STAGE_2_STEP, grade, next) && result < 2) result = 2;
  if (passes(STAGE_3_STEP, grade, next) && !needsTradeOff && result < 3) result = 3;
  return result;
}

/**
 * The new stage when this grade evolves the creature, for the evolution moment on screen.
 * null when the stage stays the same. Uses the same v1.5 rule as the Field Guide: Stage 3 comes
 * from a right trade-off answer, see `asksTradeOff`.
 */
export function evolvesTo(state: ReviewState, grade: Grade, gradedDay: LearningDay): Stage | null {
  const graded = gradeReview({ step: state.step, gradedDay, grade, dueDay: state.dueDay });
  const stage = stageAfter(state.stage, grade, graded, true);
  return stage > state.stage ? stage : null;
}

/**
 * Whether the trade-off question follows this review of a creature (design 6.5): the learner knew it
 * (Good or Easy), and after this grade the creature is at Stage 2 and past the 30-day step. A wrong
 * answer keeps Stage 2, so the question comes again after the next such review.
 */
export function asksTradeOff(state: ReviewState, grade: Grade, gradedDay: LearningDay): boolean {
  if (grade !== "good" && grade !== "easy") return false;
  const graded = gradeReview({ step: state.step, gradedDay, grade, dueDay: state.dueDay });
  const stage = stageAfter(state.stage, grade, graded, true);
  return stage === 2 && (graded.dueDay === null || graded.step > STAGE_3_STEP);
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
 * battle comes after its reviews. Scored cards count the same way, after the day's reviews:
 * - a wrong Decision Card is a recheck of its creature. A Decision Card never moves a step;
 * - a right trade-off answer gives Stage 3 to a creature past the 30-day step (design 6.5).
 */
export function reviewStates(
  catches: CatchRecord[],
  reviews: ReviewRecord[],
  rechecks: RecheckRecord[] = [],
  cards: CardRecord[] = [],
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
  // v1.5 Stage 3 (design 6.5): the creatures past the 30-day step, and those with a right trade-off answer.
  const pastThirty = new Set<string>();
  const tradeOffRight = new Set<string>();
  const applyCard = (card: CardRecord) => {
    const creatureId = cardCreatureId(card.cardId);
    if (card.kind === "decision") {
      if (!card.right) applyRecheck(states, { itemId: creatureId, learningDay: card.learningDay });
      return;
    }
    if (!card.right) return;
    tradeOffRight.add(creatureId);
    const state = states.get(creatureId);
    if (state && pastThirty.has(creatureId)) state.stage = 3;
  };
  // Rechecks and cards count after the reviews of their day. A stable sort keeps their order inside one day.
  const waiting = [
    ...rechecks.map((recheck) => ({ learningDay: recheck.learningDay, apply: () => applyRecheck(states, recheck) })),
    ...cards.map((card) => ({ learningDay: card.learningDay, apply: () => applyCard(card) })),
  ].sort((a, b) => a.learningDay.localeCompare(b.learningDay));
  let next = 0;
  const applyBefore = (day: LearningDay) => {
    while (next < waiting.length && waiting[next].learningDay < day) waiting[next++].apply();
  };
  for (const review of reviews) {
    applyBefore(review.learningDay);
    const state = states.get(review.itemId);
    if (!state) continue;
    const graded = gradeReview({ step: state.step, gradedDay: review.learningDay, grade: review.grade, dueDay: state.dueDay });
    // A review from before v1.5 keeps its rule: passing the 30-day step gave Stage 3 by itself.
    const v15 = review.rules === REVIEW_RULES;
    if (v15 && passes(STAGE_3_STEP, review.grade, graded)) pastThirty.add(review.itemId);
    state.stage = stageAfter(state.stage, review.grade, graded, v15 && !tradeOffRight.has(review.itemId));
    state.step = graded.step;
    state.dueDay = graded.dueDay;
  }
  // The rechecks and cards after the last review.
  while (next < waiting.length) waiting[next++].apply();
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
  placesTaken = 0,
}: {
  states: Map<string, ReviewState>;
  reviews: ReviewRecord[];
  today: LearningDay;
  isReviewable?: (itemId: string) => boolean;
  /** Confusable pairs from the content of every town. */
  pairs?: ConfusablePair[];
  /** Today's places already taken by other reviews: the Decision Cards answered today. */
  placesTaken?: number;
}): TodayReview[] {
  const todays = reviews.filter((review) => review.learningDay === today);
  const reviewedToday = new Set(todays.map((review) => review.itemId));
  const places = Math.max(0, DAILY_REVIEW_LIMIT - todays.length - placesTaken);
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

/** About 1 review in 4 is a Decision Card (design 6.4): every 4th place of the day. */
export const DECISION_CARD_EVERY = 4;

/** One place in today's reviews: a normal review card, or a Decision Card of a caught creature. */
export type TodayPlace = { kind: "review"; review: TodayReview } | { kind: "decision"; cardId: string };

/**
 * Today's reviews with the Decision Cards mixed in (design 6.4). The places of the day count from 1,
 * across all of today's sessions, up to 8. Every 4th place is a Decision Card while a normal review
 * still waits, so a short queue gets none: 4 due reviews give 3 reviews, 1 Decision Card, 1 review.
 * A Decision Card takes a place, so on a full day 2 due reviews wait until tomorrow.
 *
 * The Decision Card is one of a caught creature. A card answered today does not come back today.
 * The card answered longest ago comes first, and a card never answered before all others.
 */
export function todaysReviews({
  states,
  reviews,
  cards = [],
  decisionCardIds = [],
  today,
  isReviewable,
  pairs,
}: {
  states: Map<string, ReviewState>;
  reviews: ReviewRecord[];
  /** The scored cards answered so far. */
  cards?: CardRecord[];
  /** Every Decision Card in the content that can be shown, retired ones left out. */
  decisionCardIds?: string[];
  today: LearningDay;
  isReviewable?: (itemId: string) => boolean;
  pairs?: ConfusablePair[];
}): TodayPlace[] {
  const decisions = cards.filter((card) => card.kind === "decision");
  const decisionsToday = decisions.filter((card) => card.learningDay === today);
  const due = dueReviews({ states, reviews, today, isReviewable, pairs, placesTaken: decisionsToday.length });
  const lastAnswered = new Map<string, LearningDay>();
  for (const card of decisions) {
    const last = lastAnswered.get(card.cardId);
    if (!last || card.learningDay > last) lastAnswered.set(card.cardId, card.learningDay);
  }
  const waiting = decisionCardIds
    .filter((id) => states.has(cardCreatureId(id)) && lastAnswered.get(id) !== today)
    .sort((a, b) => (lastAnswered.get(a) ?? "").localeCompare(lastAnswered.get(b) ?? "") || a.localeCompare(b));

  const places: TodayPlace[] = [];
  let place = reviews.filter((review) => review.learningDay === today).length + decisionsToday.length;
  let next = 0;
  while (next < due.length && place < DAILY_REVIEW_LIMIT) {
    place += 1;
    if (place % DECISION_CARD_EVERY === 0 && waiting.length > 0) places.push({ kind: "decision", cardId: waiting.shift()! });
    else places.push({ kind: "review", review: due[next++] });
  }
  return places;
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
  cards: CardRecord[] = [],
): boolean {
  for (let back = 0; back < BACKLOG_DAYS; back += 1) {
    const day = addDays(today, -back);
    const states = reviewStates(
      catches.filter((c) => c.learningDay < day),
      reviews.filter((r) => r.learningDay < day),
      rechecks.filter((r) => r.learningDay < day),
      cards.filter((c) => c.learningDay < day),
    );
    const due = allDue(states, day).filter((state) => isReviewable(state.itemId));
    if (due.length <= DAILY_REVIEW_LIMIT) return false;
  }
  return true;
}
