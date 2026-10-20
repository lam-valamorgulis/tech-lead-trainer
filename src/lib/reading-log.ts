import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReadingRecord } from "@/core/extra-time";
import { pendingEvents } from "./events/post-events";
import { selectAll } from "./select-all";

/** Every read-close-write task of the signed-in user, plus tasks still waiting to be sent. */
export async function loadReadingRecords(client: SupabaseClient, today: string): Promise<ReadingRecord[]> {
  const waitingBefore = pendingEvents("reading");
  const rows = await selectAll((from, to) =>
    client
      .from("reading_events")
      .select("client_event_id, item_id, learning_day")
      .order("occurred_at")
      .order("id")
      .range(from, to)
      .returns<{ client_event_id: string; item_id: string; learning_day: string }[]>(),
  );
  const savedIds = new Set(rows.map((row) => row.client_event_id));
  return [
    ...rows.map((row) => ({ itemId: row.item_id, learningDay: row.learning_day })),
    ...waitingBefore
      .filter((event) => !savedIds.has(event.clientEventId))
      .map((event) => ({ itemId: event.itemId, learningDay: today })),
  ];
}
