import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReviewRecord } from "@/core/review";
import { pendingEvents } from "./events/post-events";
import { selectAll } from "./select-all";

/**
 * Every review of the signed-in user, in time order, so a review synced late replays in its
 * real place. Reviews still waiting to be sent count as today's.
 */
export async function loadReviewRecords(client: SupabaseClient, today: string): Promise<ReviewRecord[]> {
  const waitingBefore = pendingEvents("review");
  const rows = await selectAll((from, to) =>
    client
      .from("review_events")
      .select("client_event_id, item_id, learning_day, grade")
      .order("occurred_at")
      .order("id")
      .range(from, to)
      .returns<{ client_event_id: string; item_id: string; learning_day: string; grade: ReviewRecord["grade"] }[]>(),
  );
  const savedIds = new Set(rows.map((row) => row.client_event_id));
  const saved = rows.map((row) => ({ itemId: row.item_id, learningDay: row.learning_day, grade: row.grade }));
  const waiting = waitingBefore.filter((event) => !savedIds.has(event.clientEventId)).map((event) => ({
    itemId: event.itemId,
    learningDay: today,
    grade: event.grade,
  }));
  return [...saved, ...waiting];
}
