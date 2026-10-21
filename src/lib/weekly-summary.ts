import type { SupabaseClient } from "@supabase/supabase-js";
import { creatureOf } from "@/content";
import { addDays, type LearningDay } from "@/core/day";
import type { ReviewRecord } from "@/core/review";
import { latestSummaryWeek, weeklySummary, type Creature, type StoredWeeklySummary } from "@/core/week";
import { toSnapshot, type SnapshotRow } from "@/lib/learning-log";
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
};

const SUMMARY_COLUMNS =
  "week_start, summary_at, days_learned, minutes, goal_minutes, best_moves, best_move_turns, weakest_creatures";

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

  const summary = await summaryOfWeek(admin, userId, week.weekStart, week.summaryAt);
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

/** The numbers of one week from the learning log, or null when the week has no session at all. */
async function summaryOfWeek(
  admin: SupabaseClient,
  userId: string,
  weekStart: LearningDay,
  summaryAt: Date,
): Promise<StoredWeeklySummary | null> {
  const sunday = addDays(weekStart, 6);
  const before = summaryAt.toISOString();
  // One day more for sessions: a session counts for the day it started.
  const logOf = <Row>(table: string, columns: string, from: LearningDay) =>
    selectAll((start, end) =>
      admin
        .from(table)
        .select(columns)
        .eq("user_id", userId)
        .gte("learning_day", from)
        .lte("learning_day", sunday)
        .lt("occurred_at", before)
        .order("id")
        .range(start, end)
        .returns<Row[]>(),
    );
  // Sessions first: an empty week, which every timer run checks again, then costs one read.
  const sessions = await logOf<SnapshotRow>("session_events", "session_id, occurred_at, learning_day, active_seconds", addDays(weekStart, -1));
  if (!sessions.some((row) => row.learning_day >= weekStart)) return null;
  const [reviews, turns] = await Promise.all([
    // A Decision Card or trade-off row (#109) has no grade.
    logOf<{ item_id: string; learning_day: string; grade: ReviewRecord["grade"] | null }>("review_events", "item_id, learning_day, grade", weekStart),
    logOf<{ best_move: boolean; learning_day: string }>("battle_turn_events", "best_move, learning_day", weekStart),
  ]);

  const summary = weeklySummary({
    weekStart,
    snapshots: sessions.map(toSnapshot),
    reviews: reviews.flatMap((row) => (row.grade ? [{ itemId: row.item_id, learningDay: row.learning_day, grade: row.grade }] : [])),
    turns: turns.map((row) => ({ bestMove: row.best_move, learningDay: row.learning_day })),
    creatureOf,
  });
  return { ...summary, summaryAt: before };
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
  };
}
