import type { SupabaseClient } from "@supabase/supabase-js";
import type { CatchRecord } from "@/core/catch";
import { pendingEvents } from "./events/post-events";
import { selectAll } from "./select-all";

/**
 * Every catch answer of the signed-in user. Answers still waiting to reach the server count
 * as today's, so a new session cannot offer a second catch on the same day.
 */
export async function loadCatchRecords(client: SupabaseClient, today: string): Promise<CatchRecord[]> {
  const rows = await selectAll((from, to) =>
    client
      .from("catch_events")
      .select("item_id, correct, learning_day")
      .order("id")
      .range(from, to)
      .returns<{ item_id: string; correct: boolean; learning_day: string }[]>(),
  );
  const saved = rows.map((row) => ({ itemId: row.item_id, correct: row.correct, learningDay: row.learning_day }));
  const waiting = pendingEvents()
    .filter((event) => event.type === "catch")
    .map((event) => ({ itemId: event.itemId, correct: event.correct, learningDay: today }));
  return [...saved, ...waiting];
}
