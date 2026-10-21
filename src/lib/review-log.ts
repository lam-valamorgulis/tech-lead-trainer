import type { SupabaseClient } from "@supabase/supabase-js";
import type { CardRecord, ReviewRecord } from "@/core/review";
import { pendingEvents } from "./events/post-events";
import { CARD_KINDS, cardRecord, REVIEW_KINDS, type CardRow, type ReviewRow } from "./review-state";
import { selectAll } from "./select-all";

/**
 * Every review of a creature or move of the signed-in user, in time order, so a review synced
 * late replays in its real place. Reviews still waiting to be sent count as today's.
 */
export async function loadReviewRecords(client: SupabaseClient, today: string): Promise<ReviewRecord[]> {
  const waitingBefore = pendingEvents("review");
  const rows = await selectAll((from, to) =>
    client
      .from("review_events")
      .select("client_event_id, item_id, learning_day, grade, rules_version")
      .in("item_kind", REVIEW_KINDS)
      .order("occurred_at")
      .order("id")
      .range(from, to)
      .returns<(ReviewRow & { client_event_id: string })[]>(),
  );
  const savedIds = new Set(rows.map((row) => row.client_event_id));
  const saved = rows.map((row) => ({ itemId: row.item_id, learningDay: row.learning_day, grade: row.grade, rules: row.rules_version }));
  const waiting = waitingBefore.filter((event) => !savedIds.has(event.clientEventId)).map((event) => ({
    itemId: event.itemId,
    learningDay: today,
    grade: event.grade,
    rules: event.rulesVersion,
  }));
  return [...saved, ...waiting];
}

/**
 * Every answered Decision Card and trade-off question of the signed-in user (#109), in time order.
 * Cards still waiting to be sent count as today's.
 */
export async function loadCardRecords(client: SupabaseClient, today: string): Promise<CardRecord[]> {
  const waitingBefore = pendingEvents("review-card");
  const rows = await selectAll((from, to) =>
    client
      .from("review_events")
      .select("client_event_id, item_id, item_kind, learning_day, choice_correct, reason_correct")
      .in("item_kind", CARD_KINDS)
      .order("occurred_at")
      .order("id")
      .range(from, to)
      .returns<(CardRow & { client_event_id: string })[]>(),
  );
  const savedIds = new Set(rows.map((row) => row.client_event_id));
  const waiting = waitingBefore
    .filter((event) => !savedIds.has(event.clientEventId))
    .map((event) => ({
      item_id: event.itemId,
      item_kind: event.itemKind,
      learning_day: today,
      choice_correct: event.choiceCorrect,
      reason_correct: event.reasonCorrect,
    }));
  return [...rows, ...waiting].map(cardRecord);
}
