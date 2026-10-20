import type { SupabaseClient } from "@supabase/supabase-js";
import type { BattleEndRecord, BattleRecord, CheckRecord, TurnRecord } from "@/core/battle";
import { pendingEvents } from "./events/post-events";
import { selectAll } from "./select-all";

/** What the app needs from the battle log: the battles started, every turn, every loss and every self-check. */
export type BattleHistory = {
  battles: BattleRecord[];
  turns: TurnRecord[];
  ends: BattleEndRecord[];
  checks: CheckRecord[];
};

type TurnRow = {
  client_event_id: string;
  battle_id: string;
  scenario_id: string;
  turn_number: number;
  move_id: string | null;
  best_move: boolean;
  learning_day: string;
};
type EndRow = { client_event_id: string; battle_id: string; result: "won" | "lost"; learning_day: string };
type CheckRow = {
  client_event_id: string;
  battle_id: string;
  turn_number: number;
  best_move_id: string;
  ticked_points: number[];
  learning_day: string;
};

/** Saved rows first, then the events still waiting to reach the server, which count as today's. */
function withWaiting<Row extends { client_event_id: string }, Event extends { clientEventId: string }, Out>(
  rows: Row[],
  waiting: Event[],
  fromRow: (row: Row) => Out,
  fromEvent: (event: Event) => Out,
): Out[] {
  const savedIds = new Set(rows.map((row) => row.client_event_id));
  return [...rows.map(fromRow), ...waiting.filter((event) => !savedIds.has(event.clientEventId)).map(fromEvent)];
}

/**
 * The battle log of the signed-in user. Events still waiting to reach the server count as
 * today's, so a new session cannot offer a second battle, and a loss counts before it is sent.
 */
export async function loadBattleHistory(client: SupabaseClient, today: string): Promise<BattleHistory> {
  // Copies of the waiting events BEFORE the reads, so an event sent in between is never lost.
  const waitingTurns = pendingEvents("battle-turn");
  const waitingEnds = pendingEvents("battle");
  const waitingChecks = pendingEvents("battle-check");
  const [turnRows, endRows, checkRows] = await Promise.all([
    selectAll((from, to) =>
      client
        .from("battle_turn_events")
        .select("client_event_id, battle_id, scenario_id, turn_number, move_id, best_move, learning_day")
        .order("occurred_at")
        .order("id")
        .range(from, to)
        .returns<TurnRow[]>(),
    ),
    selectAll((from, to) =>
      client
        .from("battle_events")
        .select("client_event_id, battle_id, result, learning_day")
        .order("occurred_at")
        .order("id")
        .range(from, to)
        .returns<EndRow[]>(),
    ),
    selectAll((from, to) =>
      client
        .from("battle_check_events")
        .select("client_event_id, battle_id, turn_number, best_move_id, ticked_points, learning_day")
        .order("occurred_at")
        .order("id")
        .range(from, to)
        .returns<CheckRow[]>(),
    ),
  ]);
  const turns = withWaiting(
    turnRows,
    waitingTurns,
    (row): TurnRecord => ({
      battleId: row.battle_id,
      scenarioId: row.scenario_id,
      turnNumber: row.turn_number,
      moveId: row.move_id,
      bestMove: row.best_move,
      learningDay: row.learning_day,
    }),
    (event): TurnRecord => ({
      battleId: event.battleId,
      scenarioId: event.scenarioId,
      turnNumber: event.turnNumber,
      moveId: event.moveId,
      bestMove: event.bestMove,
      learningDay: today,
    }),
  );
  const ends = withWaiting(
    endRows,
    waitingEnds,
    (row): BattleEndRecord => ({ battleId: row.battle_id, result: row.result, learningDay: row.learning_day }),
    (event): BattleEndRecord => ({ battleId: event.battleId, result: event.result, learningDay: today }),
  );
  const checks = withWaiting(
    checkRows,
    waitingChecks,
    (row): CheckRecord => ({
      battleId: row.battle_id,
      turnNumber: row.turn_number,
      bestMoveId: row.best_move_id,
      tickedPoints: row.ticked_points,
      learningDay: row.learning_day,
    }),
    (event): CheckRecord => ({
      battleId: event.battleId,
      turnNumber: event.turnNumber,
      bestMoveId: event.bestMoveId,
      tickedPoints: event.tickedPoints,
      learningDay: today,
    }),
  );
  // One record per battle. The first turn of a battle tells its day.
  const battles = [
    ...new Map(
      [...turns].reverse().map((turn) => [turn.battleId, { battleId: turn.battleId, scenarioId: turn.scenarioId, learningDay: turn.learningDay }]),
    ).values(),
  ];
  return { battles, turns, ends, checks };
}
