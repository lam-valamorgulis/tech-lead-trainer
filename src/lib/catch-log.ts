import type { SupabaseClient } from "@supabase/supabase-js";
import type { CatchRecord } from "@/core/catch";

/** Every catch answer of the signed-in user. About 2 rows per item, so one page is enough for a year. */
export async function loadCatchRecords(client: SupabaseClient): Promise<CatchRecord[]> {
  const { data, error } = await client
    .from("catch_events")
    .select("item_id, correct, learning_day")
    .order("id")
    .limit(1000)
    .returns<{ item_id: string; correct: boolean; learning_day: string }[]>();
  if (error) throw error;
  return data.map((row) => ({ itemId: row.item_id, correct: row.correct, learningDay: row.learning_day }));
}
