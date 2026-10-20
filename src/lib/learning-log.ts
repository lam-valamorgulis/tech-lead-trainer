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
export async function currentLearningDay(client: SupabaseClient): Promise<LearningDay> {
  const { data, error } = await client.rpc("current_learning_day");
  if (error) throw error;
  return data as LearningDay;
}

export async function loadThirtyDayRate(client: SupabaseClient): Promise<ThirtyDayRate> {
  const { today, recent } = await loadRecentSnapshots(client);
  return thirtyDayRate(recent, today);
}

/** What home needs to know about past learning: the 30-day rate, and whether to open on the Rest Stop. */
export type LearningStatus = { rate: ThirtyDayRate; restStop: boolean };

export async function loadLearningStatus(client: SupabaseClient): Promise<LearningStatus> {
  const { today, from, recent } = await loadRecentSnapshots(client);
  let last = lastLearnedDay(recent, today);
  if (last === null) {
    // Nothing learned in the window: look further back, so a long break also opens the Rest Stop.
    const older = await loadSnapshots(client, (query) => query.lt("learning_day", from));
    last = lastLearnedDay([...older, ...recent], today);
  }
  return { rate: thirtyDayRate(recent, today), restStop: showsRestStop(last, today) };
}

/** Today, and the snapshots of the 30-day window plus one day: a session counts for the day it started. */
async function loadRecentSnapshots(client: SupabaseClient) {
  const today = await currentLearningDay(client);
  const from = addDays(today, -RATE_WINDOW_DAYS);
  const recent = await loadSnapshots(client, (query) => query.gte("learning_day", from));
  return { today, from, recent };
}

type SnapshotQuery = ReturnType<ReturnType<SupabaseClient["from"]>["select"]>;

/** Every session snapshot that `filter` keeps, in the order they were saved. */
async function loadSnapshots(
  client: SupabaseClient,
  filter: (query: SnapshotQuery) => SnapshotQuery,
): Promise<SessionSnapshot[]> {
  const rows = await selectAll((start, end) =>
    filter(client.from("session_events").select("session_id, occurred_at, learning_day, active_seconds"))
      .order("id")
      .range(start, end)
      .returns<SnapshotRow[]>(),
  );
  return rows.map(toSnapshot);
}

export function formatRate(rate: ThirtyDayRate): string {
  return `${rate.learnedDays} of ${rate.windowDays} days`;
}
