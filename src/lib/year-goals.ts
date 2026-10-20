import type { SupabaseClient } from "@supabase/supabase-js";
import { HAND_GOALS, type HandGoal } from "@/core/tracking";

/** The year goals the signed-in user has checked by hand (spec story 71). */
export async function loadCheckedYearGoals(client: SupabaseClient): Promise<HandGoal[]> {
  const { data, error } = await client.from("year_goals").select("goal").eq("checked", true).returns<{ goal: HandGoal }[]>();
  if (error) throw error;
  const checked = new Set(data.map((row) => row.goal));
  return HAND_GOALS.filter((goal) => checked.has(goal));
}

/** Ticks or unticks one hand-checked year goal. The row stays, so an untick is kept too. */
export async function saveYearGoal(client: SupabaseClient, goal: HandGoal, checked: boolean): Promise<void> {
  const { error } = await client
    .from("year_goals")
    .upsert({ goal, checked, changed_at: new Date().toISOString() }, { onConflict: "user_id,goal" });
  if (error) throw error;
}
