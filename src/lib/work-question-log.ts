import type { SupabaseClient } from "@supabase/supabase-js";
import { pendingEvents } from "./events/post-events";

/** An answer to the work question of one Sunday summary (#114). `met` false is "Not this week". */
export type WorkAnswer = { met: boolean; note: string | null };

/**
 * The learner's latest answer to the work question of the week that starts on `weekStart`, or
 * null when there is none yet. An answer still waiting to be sent counts too. The log keeps
 * every answer, so the latest one is the one to show.
 */
export async function loadWorkAnswer(client: SupabaseClient, weekStart: string): Promise<WorkAnswer | null> {
  const waiting = pendingEvents("work-question").filter((event) => event.weekStart === weekStart);
  const latestWaiting = waiting.at(-1);
  if (latestWaiting) return { met: latestWaiting.met, note: latestWaiting.note ?? null };
  const { data, error } = await client
    .from("work_question_events")
    .select("met, note")
    .eq("week_start", weekStart)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .returns<WorkAnswer[]>();
  if (error) throw error;
  return data[0] ?? null;
}
