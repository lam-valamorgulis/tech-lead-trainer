import { browserClient } from "@/lib/supabase/browser";
import type { StoredWeeklySummary } from "@/core/week";

/**
 * The Sunday summary of the last finished week, from POST /api/weekly-summary. The server
 * makes it first when it is missing. Null when that week had no learning.
 */
export async function loadWeeklySummary(): Promise<StoredWeeklySummary | null> {
  const { data } = await browserClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in.");
  const response = await fetch("/api/weekly-summary", { method: "POST", headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`POST /api/weekly-summary answered ${response.status}`);
  const body = (await response.json()) as { summary: StoredWeeklySummary | null };
  return body.summary;
}
