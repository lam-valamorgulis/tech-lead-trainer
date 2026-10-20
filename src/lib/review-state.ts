import type { SupabaseClient } from "@supabase/supabase-js";
import { battleRechecks } from "../core/battle.ts";
import { placementCatches } from "../core/placement.ts";
import { reviewStates, type Grade } from "../core/review.ts";
import { selectAll } from "./select-all.ts";

// The review_state table is a cache of `reviewStates` over the event log (design 12.2).
// Relative imports with .ts let `scripts/rebuild-review-state.mjs` run this file in Node.

export type CatchRow = { item_id: string; correct: boolean; learning_day: string; occurred_at: string };
export type PlacementRow = CatchRow & { town_id: string };
export type ReviewRow = { item_id: string; learning_day: string; grade: Grade };
export type BattleTurnRow = { battle_id: string; move_id: string | null };
export type BattleEndRow = { battle_id: string; result: "won" | "lost"; learning_day: string };
export type BattleCheckRow = { battle_id: string; turn_number: number; best_move_id: string; ticked_points: number[]; learning_day: string };

/** What the replay reads. The battle rows are optional: a log with no battles has none. */
export type LearningLog = {
  catches: CatchRow[];
  placements: PlacementRow[];
  reviews: ReviewRow[];
  battleTurns?: BattleTurnRow[];
  battleEnds?: BattleEndRow[];
  battleChecks?: BattleCheckRow[];
};
export type StateRow = {
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
  // Only the battle rows that can bring back one of these items: its turns, and its self-checks.
  const battleTurns = await selectAll((from, to) => {
    let query = client.from("battle_turn_events").select("battle_id, move_id").eq("user_id", userId);
    if (itemIds) query = query.in("move_id", itemIds);
    return query.order("id").range(from, to).returns<BattleTurnRow[]>();
  });
  // Only the losses of those turns' battles. A refresh with no battle turn needs none.
  const turnBattles = [...new Set(battleTurns.map((row) => row.battle_id))];
  const battleEnds =
    itemIds && turnBattles.length === 0
      ? []
      : await selectAll((from, to) => {
          let query = client
            .from("battle_events")
            .select("battle_id, result, learning_day")
            .eq("user_id", userId)
            .eq("result", "lost");
          if (itemIds) query = query.in("battle_id", turnBattles);
          return query.order("id").range(from, to).returns<BattleEndRow[]>();
        });
  const battleChecks = await selectAll((from, to) => {
    let query = client
      .from("battle_check_events")
      .select("battle_id, turn_number, best_move_id, ticked_points, learning_day")
      .eq("user_id", userId);
    if (itemIds) query = query.in("best_move_id", itemIds);
    return query.order("id").range(from, to).returns<BattleCheckRow[]>();
  });
  return { catches, placements, reviews, battleTurns, battleEnds, battleChecks };
}

/** The moves used in these battles. A lost battle brings them back, so their state must be refreshed. */
export async function movesOfBattles(client: SupabaseClient, battleIds: string[]): Promise<string[]> {
  if (battleIds.length === 0) return [];
  const { data, error } = await client
    .from("battle_turn_events")
    .select("move_id")
    .in("battle_id", battleIds)
    .not("move_id", "is", null)
    .returns<{ move_id: string }[]>();
  if (error) throw error;
  return [...new Set(data.map((row) => row.move_id))];
}

/** The review state rows of one user, from their log in time order (oldest first). Pure. */
export function reviewStateRows(userId: string, log: LearningLog): StateRow[] {
  // A right placement answer catches the creature too. Both lists go in time order.
  const placed = log.placements.filter((row) => row.correct);
  const caughtBy = [
    ...log.catches.map((row) => ({
      at: row.occurred_at,
      record: { itemId: row.item_id, correct: row.correct, learningDay: row.learning_day },
    })),
    ...placed.map((row) => ({
      at: row.occurred_at,
      record: placementCatches([
        { townId: row.town_id, itemId: row.item_id, correct: true, learningDay: row.learning_day },
      ])[0],
    })),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const rechecks = battleRechecks({
    turns: (log.battleTurns ?? []).map((row) => ({ battleId: row.battle_id, moveId: row.move_id })),
    ends: (log.battleEnds ?? []).map((row) => ({ battleId: row.battle_id, result: row.result, learningDay: row.learning_day })),
    checks: (log.battleChecks ?? []).map((row) => ({
      battleId: row.battle_id,
      turnNumber: row.turn_number,
      bestMoveId: row.best_move_id,
      tickedPoints: row.ticked_points,
      learningDay: row.learning_day,
    })),
  });
  const states = reviewStates(
    caughtBy.map(({ record }) => record),
    log.reviews.map((row) => ({ itemId: row.item_id, learningDay: row.learning_day, grade: row.grade })),
    rechecks,
  );
  // A recheck counts as an event too, so a result read before it can never overwrite the newer one.
  const eventCount = new Map<string, number>();
  for (const { itemId } of [
    ...log.catches.map((row) => ({ itemId: row.item_id })),
    ...log.placements.map((row) => ({ itemId: row.item_id })),
    ...log.reviews.map((row) => ({ itemId: row.item_id })),
    ...rechecks,
  ]) {
    eventCount.set(itemId, (eventCount.get(itemId) ?? 0) + 1);
  }
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
  const rows = reviewStateRows(userId, await loadLog(client, userId, itemIds));
  if (rows.length === 0) return;
  const { error } = await client.rpc("save_review_state", { states: rows });
  if (error) throw error;
}

/**
 * Recomputes all of one user's cached state from the event log, and removes rows for items
 * the log does not know. It writes first and deletes after, so a failure never empties the cache.
 */
export async function rebuildReviewState(admin: SupabaseClient, userId: string): Promise<number> {
  const rows = reviewStateRows(userId, await loadLog(admin, userId));
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
