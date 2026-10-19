import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, RATE_WINDOW_DAYS, thirtyDayRate, type ThirtyDayRate } from "@/core/day";
import { selectAll } from "./select-all";

type SnapshotRow = { session_id: string; occurred_at: string; learning_day: string; active_seconds: number };

/** Today in the home time zone, from the database clock (design 12.4). */
export async function currentLearningDay(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.rpc("current_learning_day");
  if (error) throw error;
  return data as string;
}

export async function loadThirtyDayRate(client: SupabaseClient): Promise<ThirtyDayRate> {
  const today = await currentLearningDay(client);
  // One day more than the window: a session counts for the day it started.
  const from = addDays(today, -RATE_WINDOW_DAYS);
  const rows = await selectAll((start, end) =>
    client
      .from("session_events")
      .select("session_id, occurred_at, learning_day, active_seconds")
      .gte("learning_day", from)
      .order("id")
      .range(start, end)
      .returns<SnapshotRow[]>(),
  );
  const snapshots = rows.map((row) => ({
    sessionId: row.session_id,
    occurredAt: new Date(row.occurred_at),
    learningDay: row.learning_day,
    activeSeconds: row.active_seconds,
  }));
  return thirtyDayRate(snapshots, today);
}

export function formatRate(rate: ThirtyDayRate): string {
  return `${rate.learnedDays} of ${rate.windowDays} days`;
}
