import type { SupabaseClient } from "@supabase/supabase-js";
import type { GymRecord } from "@/core/gym";
import { pendingEvents } from "./events/post-events";
import { selectAll } from "./select-all";

/** Every finished Gym of the signed-in user, plus ends still waiting to reach the server. */
export async function loadGymRecords(client: SupabaseClient, today: string): Promise<GymRecord[]> {
  const waitingBefore = pendingEvents("gym");
  const rows = await selectAll((from, to) =>
    client
      .from("gym_events")
      .select("client_event_id, town_id, passed, learning_day")
      .order("occurred_at")
      .order("id")
      .range(from, to)
      .returns<{ client_event_id: string; town_id: string; passed: boolean; learning_day: string }[]>(),
  );
  const savedIds = new Set(rows.map((row) => row.client_event_id));
  return [
    ...rows.map((row) => ({ townId: row.town_id, passed: row.passed, learningDay: row.learning_day })),
    ...waitingBefore
      .filter((event) => !savedIds.has(event.clientEventId))
      .map((event) => ({ townId: event.townId, passed: event.passed, learningDay: today })),
  ];
}
