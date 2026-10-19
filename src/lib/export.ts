import type { SupabaseClient } from "@supabase/supabase-js";
import { LEARNED_DAY_SECONDS, thirtyDayRate } from "@/core/day";
import { EVENT_TABLES } from "./events/write-events";
import { currentLearningDay } from "./learning-log";
import { selectAll } from "./select-all";

/** Raise this when the shape of the file changes, so a restore knows how to read an old file. */
export const EXPORT_SCHEMA_VERSION = 1;

export type DataExport = {
  schemaVersion: number;
  exportedAt: string;
  profile: Record<string, unknown> | null;
  /** Every row of every event table, as stored. */
  events: Record<string, Record<string, unknown>[]>;
  /** The same 3-minute rule as the owner's other habit app (design 12.7). */
  daysLearnedLast30: { learnedDays: number; windowDays: number; today: string; ruleSeconds: number };
};

/** Everything the signed-in user owns. Row-level security keeps other users' rows out. */
export async function buildExport(client: SupabaseClient, now = new Date()): Promise<DataExport> {
  const profile = await client.from("profiles").select("*").maybeSingle();
  if (profile.error) throw profile.error;

  const events: DataExport["events"] = {};
  for (const table of EVENT_TABLES) {
    events[table] = await selectAll((from, to) =>
      client.from(table).select("*").order("id").range(from, to).returns<Record<string, unknown>[]>(),
    );
  }

  const today = await currentLearningDay(client);
  const rate = thirtyDayRate(
    events.session_events.map((row) => ({
      sessionId: String(row.session_id),
      occurredAt: new Date(String(row.occurred_at)),
      learningDay: String(row.learning_day),
      activeSeconds: Number(row.active_seconds),
    })),
    today,
  );

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    profile: profile.data,
    events,
    daysLearnedLast30: { ...rate, today, ruleSeconds: LEARNED_DAY_SECONDS },
  };
}
