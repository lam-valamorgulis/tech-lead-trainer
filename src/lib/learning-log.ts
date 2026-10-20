import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addDays,
  RATE_WINDOW_DAYS,
  thirtyDayRate,
  type LearningDay,
  type SessionSnapshot,
  type ThirtyDayRate,
} from "@/core/day";
import { lastLearnedDay, showsRestStop } from "@/core/rest-stop";
import { selectAll } from "./select-all";

export type SnapshotRow = { session_id: string; occurred_at: string; learning_day: string; active_seconds: number };

export function toSnapshot(row: SnapshotRow): SessionSnapshot {
  return {
    sessionId: row.session_id,
    occurredAt: new Date(row.occurred_at),
    learningDay: row.learning_day,
    activeSeconds: row.active_seconds,
  };
}

/** Today in the home time zone, from the database clock (design 12.4). */
export async function currentLearningDay(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.rpc("current_learning_day");
  if (error) throw error;
  return data as string;
}

export async function loadThirtyDayRate(client: SupabaseClient): Promise<ThirtyDayRate> {
  return (await loadLearningStatus(client)).rate;
}

/** What home needs to know about past learning: the 30-day rate, and whether to open on the Rest Stop. */
export type LearningStatus = { rate: ThirtyDayRate; restStop: boolean };

export async function loadLearningStatus(client: SupabaseClient): Promise<LearningStatus> {
  const today = await currentLearningDay(client);
  // One day more than the window: a session counts for the day it started.
  const from = addDays(today, -RATE_WINDOW_DAYS);
  const recent = (await loadSnapshots(client, { from })).map(toSnapshot);
  let last = lastLearnedDay(recent, today);
  if (last === null) {
    // Nothing learned in the window: look further back, so a long break also opens the Rest Stop.
    const older = (await loadSnapshots(client, { before: from })).map(toSnapshot);
    last = lastLearnedDay([...older, ...recent], today);
  }
  return { rate: thirtyDayRate(recent, today), restStop: showsRestStop(last, today) };
}

function loadSnapshots(client: SupabaseClient, days: { from: LearningDay } | { before: LearningDay }) {
  return selectAll((start, end) => {
    const query = client.from("session_events").select("session_id, occurred_at, learning_day, active_seconds");
    const inDays = "from" in days ? query.gte("learning_day", days.from) : query.lt("learning_day", days.before);
    return inDays.order("id").range(start, end).returns<SnapshotRow[]>();
  });
}

export function formatRate(rate: ThirtyDayRate): string {
  return `${rate.learnedDays} of ${rate.windowDays} days`;
}
