import type { SupabaseClient } from "@supabase/supabase-js";
import type { BattleRecord } from "@/core/battle";
import { pendingEvents } from "./events/post-events";
import { selectAll } from "./select-all";

/**
 * Every battle the signed-in user started, one record per battle, from its turns. Turns still
 * waiting to reach the server count as today's, so a new session cannot offer a second battle.
 */
export async function loadBattleRecords(client: SupabaseClient, today: string): Promise<BattleRecord[]> {
  const waitingBefore = pendingEvents("battle-turn");
  const rows = await selectAll((from, to) =>
    client
      .from("battle_turn_events")
      .select("client_event_id, battle_id, scenario_id, learning_day")
      .order("occurred_at")
      .order("id")
      .range(from, to)
      .returns<{ client_event_id: string; battle_id: string; scenario_id: string; learning_day: string }[]>(),
  );
  const savedIds = new Set(rows.map((row) => row.client_event_id));
  const turns = [
    ...rows.map((row) => ({ battleId: row.battle_id, scenarioId: row.scenario_id, learningDay: row.learning_day })),
    ...waitingBefore
      .filter((event) => !savedIds.has(event.clientEventId))
      .map((event) => ({ battleId: event.battleId, scenarioId: event.scenarioId, learningDay: today })),
  ];
  // The first turn of a battle tells its day.
  return [...new Map(turns.reverse().map((turn) => [turn.battleId, turn])).values()];
}
