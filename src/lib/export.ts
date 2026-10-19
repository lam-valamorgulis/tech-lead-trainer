import type { SupabaseClient } from "@supabase/supabase-js";
import { LEARNED_DAY_SECONDS, thirtyDayRate, type ThirtyDayRate } from "@/core/day";
import { EVENT_TABLES } from "./events/write-events";
import { currentLearningDay, toSnapshot, type SnapshotRow } from "./learning-log";
import { selectAll } from "./select-all";

/** Raise this when the shape of the file changes, so a restore knows how to read an old file. */
export const EXPORT_SCHEMA_VERSION = 1;

type Row = Record<string, unknown>;

export type DataExport = {
  schemaVersion: number;
  exportedAt: string;
  userId: string;
  /** The learning day of the export, in the home time zone. */
  today: string;
  profile: Row | null;
  /** Every row of every event table, as stored, keyed by table name. */
  events: Record<string, Row[]>;
  /** The same 3-minute rule as the owner's other habit app (design 12.7). */
  daysLearnedLast30: ThirtyDayRate & { ruleSeconds: number };
};

/**
 * Everything one user owns. Every read is filtered by `userId`, so a server client can export
 * any user, and a user's own client can never read another user's rows (row-level security).
 */
export async function buildExport(client: SupabaseClient, userId: string, now = new Date()): Promise<DataExport> {
  const [profile, today, ...tables] = await Promise.all([
    client.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    currentLearningDay(client),
    ...EVENT_TABLES.map((table) =>
      selectAll((from, to) =>
        client.from(table).select("*").eq("user_id", userId).order("id").range(from, to).returns<Row[]>(),
      ),
    ),
  ]);
  if (profile.error) throw profile.error;

  const events = Object.fromEntries(EVENT_TABLES.map((table, i) => [table, tables[i]]));
  const rate = thirtyDayRate((events.session_events as SnapshotRow[]).map(toSnapshot), today);

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    userId,
    today,
    profile: profile.data,
    events,
    daysLearnedLast30: { ...rate, ruleSeconds: LEARNED_DAY_SECONDS },
  };
}
