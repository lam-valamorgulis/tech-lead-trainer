import type { SupabaseClient } from "@supabase/supabase-js";
import { reviewStates, type Grade } from "../core/review.ts";
import { selectAll } from "./select-all.ts";

// The review_state table is a cache of `reviewStates` over the event log (design 12.2).
// Relative imports with .ts let `scripts/rebuild-review-state.mjs` run this file in Node.

type CatchRow = { item_id: string; correct: boolean; learning_day: string };
type ReviewRow = { item_id: string; learning_day: string; grade: Grade };
type StateRow = { user_id: string; item_id: string; step: number; due_day: string | null; caught_day: string; stage: number };

async function loadLog(client: SupabaseClient, userId: string, itemIds?: string[]) {
  const catches = await selectAll((from, to) => {
    let query = client.from("catch_events").select("item_id, correct, learning_day").eq("user_id", userId);
    if (itemIds) query = query.in("item_id", itemIds);
    return query.order("occurred_at").order("id").range(from, to).returns<CatchRow[]>();
  });
  const reviews = await selectAll((from, to) => {
    let query = client.from("review_events").select("item_id, learning_day, grade").eq("user_id", userId);
    if (itemIds) query = query.in("item_id", itemIds);
    return query.order("occurred_at").order("id").range(from, to).returns<ReviewRow[]>();
  });
  return { catches, reviews };
}

function toRows(userId: string, log: { catches: CatchRow[]; reviews: ReviewRow[] }): StateRow[] {
  const states = reviewStates(
    log.catches.map((row) => ({ itemId: row.item_id, correct: row.correct, learningDay: row.learning_day })),
    log.reviews.map((row) => ({ itemId: row.item_id, learningDay: row.learning_day, grade: row.grade })),
  );
  return [...states.values()].map((state) => ({
    user_id: userId,
    item_id: state.itemId,
    step: state.step,
    due_day: state.dueDay,
    caught_day: state.caughtDay,
    stage: state.stage,
  }));
}

/** Recomputes the cached state of some items from their full history. Runs as the user. */
export async function refreshReviewState(client: SupabaseClient, userId: string, itemIds: string[]): Promise<void> {
  if (itemIds.length === 0) return;
  const rows = toRows(userId, await loadLog(client, userId, itemIds));
  if (rows.length === 0) return;
  const { error } = await client.from("review_state").upsert(rows, { onConflict: "user_id,item_id" });
  if (error) throw error;
}

/** Throws away one user's cached state and recomputes all of it from the event log. */
export async function rebuildReviewState(admin: SupabaseClient, userId: string): Promise<number> {
  const rows = toRows(userId, await loadLog(admin, userId));
  const deleted = await admin.from("review_state").delete().eq("user_id", userId);
  if (deleted.error) throw deleted.error;
  if (rows.length > 0) {
    const inserted = await admin.from("review_state").insert(rows);
    if (inserted.error) throw inserted.error;
  }
  return rows.length;
}
