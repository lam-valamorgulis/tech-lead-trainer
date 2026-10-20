import type { SupabaseClient } from "@supabase/supabase-js";
import type { CatchRecord } from "@/core/catch";
import { placementCatches } from "@/core/placement";
import { pendingEvents } from "./events/post-events";
import { loadPlacementRecords } from "./placement-log";
import { selectAll } from "./select-all";

/**
 * Every catch answer of the signed-in user, in day order, plus the creatures a placement test
 * caught. Answers still waiting to reach the server count as today's, so a new session cannot
 * offer a second catch on the same day.
 */
export async function loadCatchRecords(client: SupabaseClient, today: string): Promise<CatchRecord[]> {
  const placements = loadPlacementRecords(client, today);
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
  const placed = placementCatches(await placements);
  // A stable sort keeps the time order inside each day.
  return [...saved, ...waiting, ...placed].sort((a, b) => a.learningDay.localeCompare(b.learningDay));
}
