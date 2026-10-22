import type { SupabaseClient } from "@supabase/supabase-js";
import { pendingEvents } from "./events/post-events";

/** An answer to the work question of one Sunday summary (#114). `met` false is "Not this week". */
export type WorkAnswer = { met: boolean; note: string | null };

/**
 * The learner's latest answer to the work question of the week that starts on `weekStart`, or
 * null when there is none yet. The log keeps every answer, so the latest one is the one to show.
 * An answer still waiting to be sent is newer than every saved one, unless it was saved meanwhile.
 */
export async function loadWorkAnswer(client: SupabaseClient, weekStart: string): Promise<WorkAnswer | null> {
  // Taken before the read, as `pendingEvents` asks.
  const waiting = pendingEvents("work-question").filter((event) => event.weekStart === weekStart);
  const { data, error } = await client
    .from("work_question_events")
    .select("client_event_id, met, note")
    .eq("week_start", weekStart)
    .order("occurred_at")
    .order("id")
    .returns<(WorkAnswer & { client_event_id: string })[]>();
  // Offline, the answer waiting to be sent still shows.
  if (error && waiting.length === 0) throw error;
  const rows = data ?? [];
  const saved = new Set(rows.map((row) => row.client_event_id));
  const latestWaiting = waiting.filter((event) => !saved.has(event.clientEventId)).at(-1);
  if (latestWaiting) return { met: latestWaiting.met, note: latestWaiting.note ?? null };
  const latestSaved = rows.at(-1);
  return latestSaved ? { met: latestSaved.met, note: latestSaved.note } : null;
}
