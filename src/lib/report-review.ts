import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReportScreen } from "./report.ts";
import { selectAll } from "./select-all.ts";

// The monthly content review (ticket #29, design 8 and 12.3): every open "Report wrong" as one
// Markdown list, grouped by item, and a way to mark reports done after the content is fixed.
// It runs with the server key, because a learner can only read and note their own reports.

export type OpenReport = {
  id: number;
  itemId: string;
  contentHash: string;
  screen: ReportScreen;
  message: string | null;
  createdAt: string;
};

/** What the review needs from the content, by item id: the name and the current hash. */
export type ContentLookup = Map<string, { name: string; hash: string }>;

const SCREEN_LABEL: Record<ReportScreen, string> = { "catch-card": "catch card", review: "review" };

/** Every open report of every learner, oldest first. */
export async function loadOpenReports(admin: SupabaseClient): Promise<OpenReport[]> {
  const rows = await selectAll((from, to) =>
    admin
      .from("content_reports")
      .select("id, item_id, content_hash, screen, message, created_at")
      .eq("status", "open")
      .order("created_at")
      .order("id")
      .range(from, to)
      .returns<
        { id: number; item_id: string; content_hash: string; screen: ReportScreen; message: string | null; created_at: string }[]
      >(),
  );
  return rows.map((row) => ({
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
  const ranks = new Map([...content.keys()].map((id, index) => [id, index]));
  const rank = (itemId: string) => ranks.get(itemId) ?? ranks.size;
  const itemIds = [...new Set(reports.map((r) => r.itemId))].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const byTime = (a: OpenReport, b: OpenReport) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id;

  const lines = [`# Open reports: ${reports.length}`, ""];
  for (const itemId of itemIds) {
    const item = content.get(itemId);
    const group = reports.filter((r) => r.itemId === itemId).sort(byTime);
    lines.push(`## ${item?.name ?? itemId} (\`${itemId}\`): ${group.length}`, "");
    for (const r of group) {
      const parts = [
        `#${r.id}`,
        r.createdAt.slice(0, 10),
        SCREEN_LABEL[r.screen] ?? r.screen,
        // A line break would end the list item, so the message stays on one line.
        r.message ? `"${r.message.replace(/\s+/g, " ").trim()}"` : "no message",
      ];
      if (item && item.hash !== r.contentHash) parts.push("changed since");
      lines.push(`- ${parts.join(" · ")}`);
    }
    lines.push("");
  }
  // No ready-made list of numbers: mark only the reports whose content you fixed.
  lines.push(`After a fix, mark its reports done: \`${command} --done <numbers>\``, "");
  return lines.join("\n");
}
