import type { SupabaseClient } from "@supabase/supabase-js";

/** A goal parked for later (spec story 22, design 14 rule 5). */
export type LaterGoal = { id: number; text: string };

/** The database allows the same length. */
export const LATER_GOAL_MAX_LENGTH = 200;

/** The signed-in user's Later list, oldest first. Removed goals are left out. */
export async function loadLaterGoals(client: SupabaseClient): Promise<LaterGoal[]> {
  const { data, error } = await client
    .from("later_goals")
    .select("id, text")
    .is("removed_at", null)
    .order("created_at")
    .order("id")
    .returns<LaterGoal[]>();
  if (error) throw error;
  return data;
}

/** Parks a new goal. Spaces at the start and end are dropped. */
export async function addLaterGoal(client: SupabaseClient, text: string): Promise<LaterGoal> {
  const { data, error } = await client.from("later_goals").insert({ text: text.trim() }).select("id, text").single<LaterGoal>();
  if (error) throw error;
  return data;
}

/** Takes a goal off the list. The row stays with its removal time, so a wrong tap loses nothing. */
export async function removeLaterGoal(client: SupabaseClient, id: number): Promise<void> {
  const { error } = await client.from("later_goals").update({ removed_at: new Date().toISOString() }).eq("id", id).is("removed_at", null);
  if (error) throw error;
}
