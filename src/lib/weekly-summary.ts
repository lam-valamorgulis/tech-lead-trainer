import type { SupabaseClient } from "@supabase/supabase-js";
import { creatureOf, turnConcept } from "@/content";
import { addDays, type LearningDay } from "@/core/day";
import type { ReviewRecord } from "@/core/review";
import {
  latestSummaryWeek,
  summaryMoment,
  weeklySummary,
  type Creature,
  type StoredWeeklySummary,
  type SummaryTurn,
} from "@/core/week";
import { toSnapshot, type SnapshotRow } from "@/lib/learning-log";
import { CARD_KINDS, cardRecord, type CardRow } from "@/lib/review-state";
import { selectAll } from "@/lib/select-all";

// The Sunday summary (ticket #23, design 3): made once for the week that ended on Sunday at
// 20:00 home time, then saved as it was shown. Server code only: it writes with the secret key.

type SummaryRow = {
  week_start: string;
  summary_at: string;
  days_learned: number;
  minutes: number;
  goal_minutes: number;
  best_moves: number;
  best_move_turns: number;
  weakest_creatures: Creature[];
  // The v1.5 numbers (#114). All null in a row saved before them.
  constraint_best_moves: number | null;
  constraint_turns: number | null;
  last_week_constraint_best_moves: number | null;
  last_week_constraint_turns: number | null;
  decision_cards_right: number | null;
  decision_cards: number | null;
  last_week_decision_cards_right: number | null;
  last_week_decision_cards: number | null;
  most_missed_concepts: Creature[] | null;
  work_question_concept: Creature | null;
};

const SUMMARY_COLUMNS = [
  "week_start, summary_at, days_learned, minutes, goal_minutes, best_moves, best_move_turns, weakest_creatures",
  "constraint_best_moves, constraint_turns, last_week_constraint_best_moves, last_week_constraint_turns",
  "decision_cards_right, decision_cards, last_week_decision_cards_right, last_week_decision_cards",
  "most_missed_concepts, work_question_concept",
].join(", ");

/**
 * The summary of the latest week whose Sunday 20:00 has passed, for one learner. It is made
 * when it does not exist yet. A week with no learning at all gets no summary: the answer is null.
 * `admin` must use the secret key, because only the server writes summaries.
 */
export async function ensureWeeklySummary(admin: SupabaseClient, userId: string, now: Date): Promise<StoredWeeklySummary | null> {
  return ensureSummaryIn(admin, userId, await homeTimeZone(admin, userId), now);
}

async function ensureSummaryIn(
  admin: SupabaseClient,
  userId: string,
  timeZone: string,
  now: Date,
): Promise<StoredWeeklySummary | null> {
  const week = latestSummaryWeek(now, timeZone);
  const saved = await savedSummary(admin, userId, week.weekStart);
  if (saved) return saved;

  const summary = await summaryOfWeek(admin, userId, week.weekStart, timeZone);
  if (summary === null) return null;
  // Another run may save the same week at the same moment: the first row wins, and both runs
  // read it back, so they answer with the same numbers.
  const { error } = await admin.from("weekly_summaries").upsert(toRow(userId, summary), {
    onConflict: "user_id,week_start",
    ignoreDuplicates: true,
  });
  if (error) throw error;
  return savedSummary(admin, userId, week.weekStart);
}

/**
 * One run of the 5-minute timer: makes the latest due summary of every learner who does not
 * have it yet. Returns how many learners it checked without an error. One learner's error
 * does not stop the others.
 */
export async function createDueWeeklySummaries(admin: SupabaseClient, now: Date): Promise<number> {
  const profiles = await selectAll((from, to) =>
    admin
      .from("profiles")
      .select("user_id, home_time_zone")
      .order("user_id")
      .range(from, to)
      .returns<{ user_id: string; home_time_zone: string }[]>(),
  );
  let checked = 0;
  for (const profile of profiles) {
    try {
      await ensureSummaryIn(admin, profile.user_id, profile.home_time_zone, now);
      checked += 1;
    } catch (error) {
      console.error("weekly summary failed for one user", error);
    }
  }
  return checked;
}

async function homeTimeZone(admin: SupabaseClient, userId: string): Promise<string> {
  const { data, error } = await admin.from("profiles").select("home_time_zone").eq("user_id", userId).single<{ home_time_zone: string }>();
  if (error) throw error;
  return data.home_time_zone;
}

async function savedSummary(admin: SupabaseClient, userId: string, weekStart: LearningDay): Promise<StoredWeeklySummary | null> {
  const { data, error } = await admin
    .from("weekly_summaries")
    .select(SUMMARY_COLUMNS)
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle<SummaryRow>();
  if (error) throw error;
  return data ? fromRow(data) : null;
}

/**
 * The numbers of one week from the learning log, or null when the week has no session at all.
 * Each week counts what happened before its own Sunday 20:00, so last week's rates are the
 * numbers last week's summary would count.
 */
async function summaryOfWeek(
  admin: SupabaseClient,
  userId: string,
  weekStart: LearningDay,
  timeZone: string,
): Promise<StoredWeeklySummary | null> {
  const thisWeek = logWindow(weekStart, timeZone);
  const lastWeek = logWindow(addDays(weekStart, -7), timeZone);
  const logOf = <Row>(table: string, columns: string, window: LogWindow, kinds?: readonly string[]) =>
    selectAll((start, end) => {
      let query = admin
        .from(table)
        .select(columns)
        .eq("user_id", userId)
        .gte("learning_day", window.from)
        .lte("learning_day", window.to)
        .lt("occurred_at", window.before);
      if (kinds) query = query.in("item_kind", kinds);
      return query.order("id").range(start, end).returns<Row[]>();
    });
  // Sessions first: an empty week, which every timer run checks again, then costs one read.
  // One day more for sessions: a session counts for the day it started.
  const sessions = await logOf<SnapshotRow>("session_events", "session_id, occurred_at, learning_day, active_seconds", {
    ...thisWeek,
    from: addDays(weekStart, -1),
  });
  if (!sessions.some((row) => row.learning_day >= weekStart)) return null;

  const turnColumns = "scenario_id, turn_number, best_move, constraint_variant, learning_day";
  const cardColumns = "item_id, item_kind, learning_day, choice_correct, reason_correct";
  const [reviews, turns, lastWeekTurns, cards, lastWeekCards] = await Promise.all([
    // A Decision Card or trade-off row (#109) has no grade.
    logOf<{ item_id: string; learning_day: string; grade: ReviewRecord["grade"] | null }>("review_events", "item_id, learning_day, grade", thisWeek),
    logOf<TurnRow>("battle_turn_events", turnColumns, thisWeek),
    logOf<TurnRow>("battle_turn_events", turnColumns, lastWeek),
    logOf<CardRow>("review_events", cardColumns, thisWeek, CARD_KINDS),
    logOf<CardRow>("review_events", cardColumns, lastWeek, CARD_KINDS),
  ]);

  const summary = weeklySummary({
    weekStart,
    snapshots: sessions.map(toSnapshot),
    reviews: reviews.flatMap((row) => (row.grade ? [{ itemId: row.item_id, learningDay: row.learning_day, grade: row.grade }] : [])),
    turns: [...lastWeekTurns, ...turns].map(toSummaryTurn),
    cards: [...lastWeekCards, ...cards].map(cardRecord),
    creatureOf,
    conceptOfTurn: turnConcept,
  });
  return { ...summary, summaryAt: thisWeek.before };
}

/** The log rows one week's summary counts: its learning days, before its Sunday 20:00 home time. */
type LogWindow = { from: LearningDay; to: LearningDay; before: string };

function logWindow(monday: LearningDay, timeZone: string): LogWindow {
  return { from: monday, to: addDays(monday, 6), before: summaryMoment(monday, timeZone).toISOString() };
}

type TurnRow = { scenario_id: string; turn_number: number; best_move: boolean; constraint_variant: string | null; learning_day: string };

function toSummaryTurn(row: TurnRow): SummaryTurn {
  return {
    scenarioId: row.scenario_id,
    turnNumber: row.turn_number,
    bestMove: row.best_move,
    constraintVariant: row.constraint_variant,
    learningDay: row.learning_day,
  };
}

function toRow(userId: string, summary: StoredWeeklySummary) {
  return {
    user_id: userId,
    week_start: summary.weekStart,
    summary_at: summary.summaryAt,
    days_learned: summary.daysLearned,
    minutes: summary.minutes,
    goal_minutes: summary.goalMinutes,
    best_moves: summary.bestMoves.bestMoves,
    best_move_turns: summary.bestMoves.turns,
    weakest_creatures: summary.weakest,
    constraint_best_moves: summary.picks?.constraintBestMoves.thisWeek.right ?? null,
    constraint_turns: summary.picks?.constraintBestMoves.thisWeek.total ?? null,
    last_week_constraint_best_moves: summary.picks?.constraintBestMoves.lastWeek.right ?? null,
    last_week_constraint_turns: summary.picks?.constraintBestMoves.lastWeek.total ?? null,
    decision_cards_right: summary.picks?.decisionCards.thisWeek.right ?? null,
    decision_cards: summary.picks?.decisionCards.thisWeek.total ?? null,
    last_week_decision_cards_right: summary.picks?.decisionCards.lastWeek.right ?? null,
    last_week_decision_cards: summary.picks?.decisionCards.lastWeek.total ?? null,
    most_missed_concepts: summary.picks?.mostMissed ?? null,
    work_question_concept: summary.picks?.workConcept ?? null,
  };
}

function fromRow(row: SummaryRow): StoredWeeklySummary {
  return {
    weekStart: row.week_start,
    summaryAt: new Date(row.summary_at).toISOString(),
    daysLearned: row.days_learned,
    minutes: row.minutes,
    goalMinutes: row.goal_minutes,
    bestMoves: { bestMoves: row.best_moves, turns: row.best_move_turns },
    weakest: row.weakest_creatures,
    picks: picksOf(row),
  };
}

/** The v1.5 numbers of a row, or null for a row saved before them: it stays as it was shown. */
function picksOf(row: SummaryRow): StoredWeeklySummary["picks"] {
  const rate = (right: number | null, total: number | null) => ({ right: right ?? 0, total: total ?? 0 });
  if (row.most_missed_concepts === null) return null;
  return {
    constraintBestMoves: {
      thisWeek: rate(row.constraint_best_moves, row.constraint_turns),
      lastWeek: rate(row.last_week_constraint_best_moves, row.last_week_constraint_turns),
    },
    decisionCards: {
      thisWeek: rate(row.decision_cards_right, row.decision_cards),
      lastWeek: rate(row.last_week_decision_cards_right, row.last_week_decision_cards),
    },
    mostMissed: row.most_missed_concepts,
    workConcept: row.work_question_concept,
  };
}
