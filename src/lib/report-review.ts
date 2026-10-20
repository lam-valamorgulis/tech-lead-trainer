import type { SupabaseClient } from "@supabase/supabase-js";

// The monthly content review (ticket #29, design 8 and 12.3): every open "Report wrong" as one
// Markdown list, grouped by item, and a way to mark reports done after the content is fixed.
// It runs with the server key, because a learner can only read and note their own reports.

export type OpenReport = {
  id: number;
  itemId: string;
  contentHash: string;
  screen: string;
  message: string | null;
  createdAt: string;
};

/** What the review needs from the content, by item id: the name and the current hash. */
export type ContentLookup = Map<string, { name: string; hash: string }>;

const SCREEN_LABEL: Record<string, string> = { "catch-card": "catch card", review: "review" };

/** Every open report of every learner, oldest first. */
export async function loadOpenReports(admin: SupabaseClient): Promise<OpenReport[]> {
  const { data, error } = await admin
    .from("content_reports")
    .select("id, item_id, content_hash, screen, message, created_at")
    .eq("status", "open")
    .order("created_at")
    .order("id")
    .returns<{ id: number; item_id: string; content_hash: string; screen: string; message: string | null; created_at: string }[]>();
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    itemId: row.item_id,
    contentHash: row.content_hash,
    screen: row.screen,
    message: row.message,
    createdAt: row.created_at,
  }));
}

/** Marks reports done after their content was fixed. Returns how many changed. */
export async function markReportsDone(admin: SupabaseClient, ids: number[]): Promise<number> {
  const { data, error } = await admin
    .from("content_reports")
    .update({ status: "done" })
    .in("id", ids)
    .eq("status", "open")
    .select("id");
  if (error) throw error;
  return data.length;
}

/**
 * The open reports as Markdown, grouped by item in content order. A report says "changed since"
 * when the item's content hash is no longer the one the learner saw, so it may be fixed already.
 */
export function formatOpenReports(
  reports: OpenReport[],
  content: ContentLookup,
  /** The command that runs this list, so the last line can be copied as is. */
  command = "npm run reports --",
): string {
  if (reports.length === 0) return "# Open reports: 0\n\nNothing to review.\n";
  const order = [...content.keys()];
  const rank = (itemId: string) => (order.includes(itemId) ? order.indexOf(itemId) : order.length);
  const itemIds = [...new Set(reports.map((r) => r.itemId))].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const byTime = (a: OpenReport, b: OpenReport) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id;

  const lines = [`# Open reports: ${reports.length}`, ""];
  const ids: number[] = [];
  for (const itemId of itemIds) {
    const item = content.get(itemId);
    const group = reports.filter((r) => r.itemId === itemId).sort(byTime);
    lines.push(`## ${item?.name ?? itemId} (\`${itemId}\`): ${group.length}`, "");
    for (const r of group) {
      ids.push(r.id);
      const parts = [
        `#${r.id}`,
        r.createdAt.slice(0, 10),
        SCREEN_LABEL[r.screen] ?? r.screen,
        r.message ? `"${r.message}"` : "no message",
      ];
      if (item && item.hash !== r.contentHash) parts.push("changed since");
      lines.push(`- ${parts.join(" · ")}`);
    }
    lines.push("");
  }
  lines.push(`Mark reports done: \`${command} --done ${ids.join(" ")}\``, "");
  return lines.join("\n");
}
