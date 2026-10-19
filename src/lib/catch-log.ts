import type { SupabaseClient } from "@supabase/supabase-js";
import type { CatchRecord } from "@/core/catch";
import { pendingEvents } from "./events/post-events";
import { selectAll } from "./select-all";

/**
 * Every catch answer of the signed-in user, in time order. Answers still waiting to reach the
 * server count as today's, so a new session cannot offer a second catch on the same day.
 */
export async function loadCatchRecords(client: SupabaseClient, today: string): Promise<CatchRecord[]> {
  const rows = await selectAll((from, to) =>
    client
      .from("catch_events")
      .select("client_event_id, item_id, correct, learning_day")
      .order("occurred_at")
      .order("id")
      .range(from, to)
      .returns<{ client_event_id: string; item_id: string; correct: boolean; learning_day: string }[]>(),
  );
  const saved = rows.map((row) => ({ itemId: row.item_id, correct: row.correct, learningDay: row.learning_day }));
  const waiting = pendingEvents("catch", new Set(rows.map((row) => row.client_event_id))).map((event) => ({
    itemId: event.itemId,
    correct: event.correct,
    learningDay: today,
  }));
  return [...saved, ...waiting];
}
