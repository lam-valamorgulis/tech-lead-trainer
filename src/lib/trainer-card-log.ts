import type { SupabaseClient } from "@supabase/supabase-js";
import { cardPick, turnPick, type SkillPick } from "@/core/trainer-card";
import { pendingEvents } from "./events/post-events";
import { selectAll } from "./select-all";

/** The review rows that are scored cards: a Decision Card and the Stage 3 trade-off question (#109). */
const SCORED_KINDS = ["decision", "trade-off"];

type TurnRow = { client_event_id: string; skill_ids: number[]; best_move: boolean };
type CardRow = { client_event_id: string; skill_ids: number[]; choice_correct: boolean; reason_correct: boolean };

/**
 * Every pick of the signed-in user that trains a Skill (#110, design 7.7): the battle turns of
 * every kind with Skills logged, and every answered Decision Card and trade-off question (design 6.5:
 * the trade-off question is a harder Decision Card). Events still waiting to reach the server count
 * too, so a Battle just played shows on the Trainer Card at once.
 */
export async function loadSkillPicks(client: SupabaseClient): Promise<SkillPick[]> {
  // Copies of the waiting events BEFORE the reads, so an event sent in between is never lost.
  const waitingTurns = pendingEvents("battle-turn");
  const waitingCards = pendingEvents("review-card"); // Every review-card event is a scored card.
  const [turnRows, cardRows] = await Promise.all([
    selectAll((from, to) =>
      client
        .from("battle_turn_events")
        .select("client_event_id, skill_ids, best_move")
        .not("skill_ids", "is", null)
        .order("occurred_at")
        .order("id")
        .range(from, to)
        .returns<TurnRow[]>(),
    ),
    selectAll((from, to) =>
      client
        .from("review_events")
        .select("client_event_id, skill_ids, choice_correct, reason_correct")
        .in("item_kind", SCORED_KINDS)
        .order("occurred_at")
        .order("id")
        .range(from, to)
        .returns<CardRow[]>(),
    ),
  ]);
  const savedTurns = new Set(turnRows.map((row) => row.client_event_id));
  const savedCards = new Set(cardRows.map((row) => row.client_event_id));
  const turns = [
    ...turnRows.map((row) => ({ skillIds: row.skill_ids, bestMove: row.best_move })),
    ...waitingTurns
      .filter((event) => !savedTurns.has(event.clientEventId))
      .map((event) => ({ skillIds: event.skillIds ?? null, bestMove: event.bestMove })),
  ];
  const cards = [
    ...cardRows.map((row) => ({ skillIds: row.skill_ids, choiceCorrect: row.choice_correct, reasonCorrect: row.reason_correct })),
    ...waitingCards
      .filter((event) => !savedCards.has(event.clientEventId))
      .map((event) => ({ skillIds: event.skillIds, choiceCorrect: event.choiceCorrect, reasonCorrect: event.reasonCorrect })),
  ];
  return [...turns.map(turnPick).filter((pick) => pick !== null), ...cards.map(cardPick)];
}
