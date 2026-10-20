import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlacementRecord } from "@/core/placement";
import { pendingEvents } from "./events/post-events";
import { selectAll } from "./select-all";

/** Every placement answer of the signed-in user, plus answers still waiting to be sent. */
export async function loadPlacementRecords(client: SupabaseClient, today: string): Promise<PlacementRecord[]> {
  const rows = await selectAll((from, to) =>
    client
      .from("placement_events")
      .select("client_event_id, town_id, item_id, correct, learning_day")
      .order("occurred_at")
      .order("id")
      .range(from, to)
      .returns<{ client_event_id: string; town_id: string; item_id: string; correct: boolean; learning_day: string }[]>(),
  );
  const saved = rows.map((row) => ({
    townId: row.town_id,
    itemId: row.item_id,
    correct: row.correct,
    learningDay: row.learning_day,
  }));
  const waiting = pendingEvents("placement", new Set(rows.map((row) => row.client_event_id))).map((event) => ({
    townId: event.townId,
    itemId: event.itemId,
    correct: event.correct,
    learningDay: today,
  }));
  return [...saved, ...waiting];
}
