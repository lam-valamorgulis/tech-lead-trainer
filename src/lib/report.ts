import type { SupabaseClient } from "@supabase/supabase-js";

/** Where a learner can tap "Report wrong". Battles join later. */
export type ReportScreen = "catch-card" | "review";

/** Saves a "Report wrong" in one tap (design 12.3) and returns its id, for an optional note. */
export async function reportWrong(
  client: SupabaseClient,
  report: { itemId: string; contentHash: string; screen: ReportScreen },
): Promise<number> {
  const { data, error } = await client
    .from("content_reports")
    .insert({ item_id: report.itemId, content_hash: report.contentHash, screen: report.screen })
    .select("id")
    .single<{ id: number }>();
  if (error) throw error;
  return data.id;
}

/** Adds the optional short message to a report. */
export async function addReportNote(client: SupabaseClient, id: number, message: string): Promise<void> {
  const { error } = await client.from("content_reports").update({ message: message.trim() }).eq("id", id);
  if (error) throw error;
}
