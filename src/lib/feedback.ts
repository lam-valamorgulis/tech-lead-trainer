import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeedbackNote } from "../core/feedback.ts";
import { selectAll } from "./select-all.ts";

// The Feedback button (ticket #95, design 9 rule 15). A learner writes a note; the owner's weekly
// run reads every open note with the server key and marks it done after triage.

/** Saves a note about one screen. Throws on any error, so the screen keeps the text. */
export async function sendFeedback(client: SupabaseClient, note: { screen: string; message: string }): Promise<void> {
  const { error } = await client.from("feedback_notes").insert({ screen: note.screen, message: note.message.trim() });
  if (error) throw error;
}

/** Every open note of every learner, oldest first. Needs the server key. */
export async function loadOpenFeedback(admin: SupabaseClient): Promise<FeedbackNote[]> {
  const rows = await selectAll((from, to) =>
    admin
      .from("feedback_notes")
      .select("id, screen, message, created_at")
      .eq("status", "open")
      .order("created_at")
      .order("id")
      .range(from, to)
      .returns<{ id: number; screen: string; message: string; created_at: string }[]>(),
  );
  return rows.map((row) => ({ id: row.id, screen: row.screen, message: row.message, createdAt: row.created_at }));
}

/** Marks notes done after triage. Returns how many changed. Needs the server key. */
export async function markFeedbackDone(admin: SupabaseClient, ids: number[]): Promise<number> {
  const { data, error } = await admin.from("feedback_notes").update({ status: "done" }).in("id", ids).eq("status", "open").select("id");
  if (error) throw error;
  return data.length;
}
