import type { SupabaseClient } from "@supabase/supabase-js";

// "Last backup: <date>" in Settings (ticket #22, design 12.6 point 4).

/** A weekly job that missed one Monday is late after 8 days. */
const STALE_AFTER_MS = 8 * 24 * 60 * 60 * 1000;

/** When the newest backup that holds the signed-in learner was made. Null before the first one. */
export async function fetchLastBackupAt(client: SupabaseClient): Promise<Date | null> {
  // Row-level security keeps this to the signed-in learner's own rows.
  const { data, error } = await client
    .from("backups")
    .select("finished_at")
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ finished_at: string }>();
  if (error) throw error;
  return data ? new Date(data.finished_at) : null;
}

/** The Settings line, with the date in the home time zone. */
export function lastBackupLine(at: Date | null, now: Date, homeTimeZone: string): { text: string; stale: boolean } {
  if (!at) return { text: "Last backup: none yet", stale: false };
  const day = at.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: homeTimeZone });
  return { text: `Last backup: ${day}`, stale: now.getTime() - at.getTime() > STALE_AFTER_MS };
}
