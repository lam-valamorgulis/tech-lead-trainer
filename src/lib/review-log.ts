import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReviewRecord } from "@/core/review";
import { pendingEvents } from "./events/post-events";
import { selectAll } from "./select-all";

/** Every review of the signed-in user, in time order, plus reviews still waiting to be sent. */
export async function loadReviewRecords(client: SupabaseClient, today: string): Promise<ReviewRecord[]> {
  const rows = await selectAll((from, to) =>
    client
      .from("review_events")
      .select("item_id, learning_day, grade")
      .order("id")
      .range(from, to)
      .returns<{ item_id: string; learning_day: string; grade: ReviewRecord["grade"] }[]>(),
  );
  const saved = rows.map((row) => ({ itemId: row.item_id, learningDay: row.learning_day, grade: row.grade }));
  const waiting = pendingEvents()
    .filter((event) => event.type === "review")
    .map((event) => ({ itemId: event.itemId, learningDay: today, grade: event.grade }));
  return [...saved, ...waiting];
}
