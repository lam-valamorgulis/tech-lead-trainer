import type { SupabaseClient } from "@supabase/supabase-js";
import { placementCatches } from "../core/placement.ts";
import { reviewStates, type Grade } from "../core/review.ts";
import { selectAll } from "./select-all.ts";

// The review_state table is a cache of `reviewStates` over the event log (design 12.2).
// Relative imports with .ts let `scripts/rebuild-review-state.mjs` run this file in Node.

type CatchRow = { item_id: string; correct: boolean; learning_day: string; occurred_at: string };
type PlacementRow = CatchRow & { town_id: string };
type ReviewRow = { item_id: string; learning_day: string; grade: Grade };
type StateRow = {
  user_id: string;
  item_id: string;
  step: number;
  due_day: string | null;
  caught_day: string;
  stage: number;
  event_count: number;
  updated_at: string;
};

async function loadLog(client: SupabaseClient, userId: string, itemIds?: string[]) {
  const placements = await selectAll((from, to) => {
    let query = client
      .from("placement_events")
      .select("town_id, item_id, correct, learning_day, occurred_at")
      .eq("user_id", userId);
    if (itemIds) query = query.in("item_id", itemIds);
    return query.order("occurred_at").order("id").range(from, to).returns<PlacementRow[]>();
  });
  const catches = await selectAll((from, to) => {
    let query = client.from("catch_events").select("item_id, correct, learning_day, occurred_at").eq("user_id", userId);
    if (itemIds) query = query.in("item_id", itemIds);
    return query.order("occurred_at").order("id").range(from, to).returns<CatchRow[]>();
  });
  const reviews = await selectAll((from, to) => {
    let query = client.from("review_events").select("item_id, learning_day, grade").eq("user_id", userId);
    if (itemIds) query = query.in("item_id", itemIds);
    return query.order("occurred_at").order("id").range(from, to).returns<ReviewRow[]>();
  });
  return { catches, placements, reviews };
}

function toRows(userId: string, log: { catches: CatchRow[]; placements: PlacementRow[]; reviews: ReviewRow[] }): StateRow[] {
  // A right placement answer catches the creature too. Both lists go in time order.
  const caughtBy = [
    ...log.catches.map((row) => ({ at: row.occurred_at, record: { itemId: row.item_id, correct: row.correct, learningDay: row.learning_day } })),
    ...placementCatches(
      log.placements.map((row) => ({ townId: row.town_id, itemId: row.item_id, correct: row.correct, learningDay: row.learning_day })),
    ).map((record, i) => ({ at: log.placements.filter((row) => row.correct)[i].occurred_at, record })),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const states = reviewStates(
    caughtBy.map(({ record }) => record),
    log.reviews.map((row) => ({ itemId: row.item_id, learningDay: row.learning_day, grade: row.grade })),
  );
  const eventCount = new Map<string, number>();
  for (const row of [...log.catches, ...log.placements, ...log.reviews]) eventCount.set(row.item_id, (eventCount.get(row.item_id) ?? 0) + 1);
  const now = new Date().toISOString();
  return [...states.values()].map((state) => ({
    user_id: userId,
    item_id: state.itemId,
    step: state.step,
    due_day: state.dueDay,
    caught_day: state.caughtDay,
    stage: state.stage,
    event_count: eventCount.get(state.itemId)!,
    updated_at: now,
  }));
}

/**
 * Recomputes the cached state of some items from their full history. Runs as the user.
 * The database keeps a row that was built from more events, so a slow request cannot win.
 */
export async function refreshReviewState(client: SupabaseClient, userId: string, itemIds: string[]): Promise<void> {
  if (itemIds.length === 0) return;
  const rows = toRows(userId, await loadLog(client, userId, itemIds));
  if (rows.length === 0) return;
  const { error } = await client.rpc("save_review_state", { states: rows });
  if (error) throw error;
}

/**
 * Recomputes all of one user's cached state from the event log, and removes rows for items
 * the log does not know. It writes first and deletes after, so a failure never empties the cache.
 */
export async function rebuildReviewState(admin: SupabaseClient, userId: string): Promise<number> {
  const rows = toRows(userId, await loadLog(admin, userId));
  if (rows.length > 0) {
    const written = await admin.from("review_state").upsert(rows, { onConflict: "user_id,item_id" });
    if (written.error) throw written.error;
  }
  let extra = admin.from("review_state").delete().eq("user_id", userId);
  if (rows.length > 0) extra = extra.not("item_id", "in", `(${rows.map((row) => `"${row.item_id}"`).join(",")})`);
  const deleted = await extra;
  if (deleted.error) throw deleted.error;
  return rows.length;
}
