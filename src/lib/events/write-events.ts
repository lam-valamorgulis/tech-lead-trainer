import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { KEY_POINTS } from "@/content/schema";
import { REVIEW_STEPS } from "@/core/review";

// The one write path for learning events (spec: "Interfaces and contracts").
// Each event has a client event id, so sending a batch again is always safe.

const base = {
  clientEventId: z.uuid(),
  sessionId: z.uuid(),
  occurredAt: z.iso.datetime({ offset: true }),
};

export const sessionEventSchema = z.object({
  type: z.literal("session"),
  ...base,
  committedMinutes: z.union([z.literal(3), z.literal(15), z.literal(45)]),
  activeSeconds: z.int().min(0).max(86400),
  device: z.string().max(100),
});

export const catchEventSchema = z.object({
  type: z.literal("catch"),
  ...base,
  itemId: z.string().min(1).max(100),
  itemKind: z.enum(["creature", "move"]),
  contentHash: z.string().regex(/^[0-9a-f]{16}$/),
  answerText: z.string().max(500),
  correct: z.boolean(),
  /** 1 = guess, 2 = think so, 3 = sure. */
  confidence: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  phase: z.enum(["before-card", "after-card"]),
});

const reviewStep = z.literal(REVIEW_STEPS);

export const reviewEventSchema = z.object({
  type: z.literal("review"),
  ...base,
  itemId: z.string().min(1).max(100),
  itemKind: z.enum(["creature", "move"]),
  contentHash: z.string().regex(/^[0-9a-f]{16}$/),
  stepBefore: reviewStep,
  stepAfter: reviewStep,
  grade: z.enum(["again", "hard", "good", "easy"]),
  plannedDueDay: z.iso.date(),
  shownAt: z.iso.datetime({ offset: true }),
  revealedAt: z.iso.datetime({ offset: true }),
  gradedAt: z.iso.datetime({ offset: true }),
  typedAnswer: z.string().max(2000).nullable(),
  confidence: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
});

export const placementEventSchema = z.object({
  type: z.literal("placement"),
  ...base,
  townId: z.string().regex(/^t\d{2}$/),
  itemId: z.string().min(1).max(100),
  contentHash: z.string().regex(/^[0-9a-f]{16}$/),
  answerText: z.string().max(2000),
  correct: z.boolean(),
  /** 1 = guess, 2 = think so, 3 = sure. */
  confidence: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

const scenarioId = z.string().regex(/^t\d{2}-[a-z0-9]+(-[a-z0-9]+)*$/);

/** One played battle turn. `bestMove` is decided at play time and never recomputed. */
export const battleTurnEventSchema = z.object({
  type: z.literal("battle-turn"),
  ...base,
  battleId: z.uuid(),
  scenarioId,
  contentHash: z.string().regex(/^[0-9a-f]{16}$/),
  turnNumber: z.int().min(1).max(3),
  /** Null when the team had no move for this threat. */
  moveId: z.string().min(1).max(100).nullable(),
  damage: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  bestMove: z.boolean(),
  whyText: z.string().trim().min(1).max(1000),
});

/** The end of a battle. */
export const battleEventSchema = z.object({
  type: z.literal("battle"),
  ...base,
  battleId: z.uuid(),
  scenarioId,
  contentHash: z.string().regex(/^[0-9a-f]{16}$/),
  team: z.array(z.string().min(1).max(100)).min(1).max(3),
  result: z.enum(["won", "lost"]),
  turnsUsed: z.int().min(1).max(3),
});

/**
 * The self-check of one turn: the key points (1 to 3) of the model answer that the learner said.
 * `bestMoveId` is the turn's best move at play time. The ticks change only the review schedule.
 */
export const battleCheckEventSchema = z.object({
  type: z.literal("battle-check"),
  ...base,
  battleId: z.uuid(),
  scenarioId,
  contentHash: z.string().regex(/^[0-9a-f]{16}$/),
  turnNumber: z.int().min(1).max(3),
  bestMoveId: z.string().min(1).max(100),
  tickedPoints: z
    .array(z.int().min(1).max(KEY_POINTS))
    .max(KEY_POINTS)
    .refine((points) => new Set(points).size === points.length, "A key point is ticked once."),
});

/** One tap on "Discuss in Claude". `copied` is false when the app showed the text box instead. */
export const battleDiscussEventSchema = z.object({
  type: z.literal("battle-discuss"),
  ...base,
  battleId: z.uuid(),
  scenarioId,
  contentHash: z.string().regex(/^[0-9a-f]{16}$/),
  copied: z.boolean(),
});

const teachBackSentence = z.string().trim().min(1).max(500);

/**
 * The 2 sentences the learner wrote from memory after the chat. `itemIds` are the review items
 * they come back at, fixed when they are saved: the best move of each turn and its creature.
 */
export const battleTeachBackEventSchema = z.object({
  type: z.literal("battle-teach-back"),
  ...base,
  battleId: z.uuid(),
  scenarioId,
  contentHash: z.string().regex(/^[0-9a-f]{16}$/),
  itemIds: z.array(z.string().min(1).max(100)).min(1).max(6),
  firstSentence: teachBackSentence,
  secondSentence: teachBackSentence,
});

export const eventSchema = z.discriminatedUnion("type", [
  sessionEventSchema,
  catchEventSchema,
  reviewEventSchema,
  placementEventSchema,
  battleTurnEventSchema,
  battleEventSchema,
  battleCheckEventSchema,
  battleDiscussEventSchema,
  battleTeachBackEventSchema,
]);
export const eventBatchSchema = z.object({ events: z.array(eventSchema).min(1).max(100) });

export type SessionEvent = z.infer<typeof sessionEventSchema>;
export type CatchEvent = z.infer<typeof catchEventSchema>;
export type ReviewEvent = z.infer<typeof reviewEventSchema>;
export type PlacementEvent = z.infer<typeof placementEventSchema>;
export type BattleTurnEvent = z.infer<typeof battleTurnEventSchema>;
export type BattleEvent = z.infer<typeof battleEventSchema>;
export type BattleCheckEvent = z.infer<typeof battleCheckEventSchema>;
export type BattleDiscussEvent = z.infer<typeof battleDiscussEventSchema>;
/** The fields every event of one battle shares. */
export type BattleEventFields = Pick<BattleTurnEvent, "sessionId" | "occurredAt" | "battleId" | "scenarioId" | "contentHash">;
export type BattleTeachBackEvent = z.infer<typeof battleTeachBackEventSchema>;
export type LearningEvent = z.infer<typeof eventSchema>;

const TABLES = {
  session: "session_events",
  catch: "catch_events",
  review: "review_events",
  placement: "placement_events",
  "battle-turn": "battle_turn_events",
  battle: "battle_events",
  "battle-check": "battle_check_events",
  "battle-discuss": "battle_discuss_events",
  "battle-teach-back": "battle_teach_back_events",
} as const satisfies Record<LearningEvent["type"], string>;

/** Every event table. "Download my data" exports each one. */
export const EVENT_TABLES = Object.values(TABLES);

function toRow(event: LearningEvent) {
  switch (event.type) {
    case "session":
      return {
        client_event_id: event.clientEventId,
        session_id: event.sessionId,
        occurred_at: event.occurredAt,
        committed_minutes: event.committedMinutes,
        active_seconds: event.activeSeconds,
        device: event.device,
      };
    case "catch":
      return {
        client_event_id: event.clientEventId,
        session_id: event.sessionId,
        occurred_at: event.occurredAt,
        item_id: event.itemId,
        item_kind: event.itemKind,
        content_hash: event.contentHash,
        answer_text: event.answerText,
        correct: event.correct,
        confidence: event.confidence,
        phase: event.phase,
      };
    case "review":
      return {
        client_event_id: event.clientEventId,
        session_id: event.sessionId,
        occurred_at: event.occurredAt,
        item_id: event.itemId,
        item_kind: event.itemKind,
        content_hash: event.contentHash,
        step_before: event.stepBefore,
        step_after: event.stepAfter,
        grade: event.grade,
        planned_due_day: event.plannedDueDay,
        shown_at: event.shownAt,
        revealed_at: event.revealedAt,
        graded_at: event.gradedAt,
        typed_answer: event.typedAnswer,
        confidence: event.confidence,
      };
    case "placement":
      return {
        client_event_id: event.clientEventId,
        session_id: event.sessionId,
        occurred_at: event.occurredAt,
        town_id: event.townId,
        item_id: event.itemId,
        content_hash: event.contentHash,
        answer_text: event.answerText,
        correct: event.correct,
        confidence: event.confidence,
      };
    case "battle-turn":
      return {
        client_event_id: event.clientEventId,
        session_id: event.sessionId,
        occurred_at: event.occurredAt,
        battle_id: event.battleId,
        scenario_id: event.scenarioId,
        content_hash: event.contentHash,
        turn_number: event.turnNumber,
        move_id: event.moveId,
        damage: event.damage,
        best_move: event.bestMove,
        why_text: event.whyText,
      };
    case "battle":
      return {
        client_event_id: event.clientEventId,
        session_id: event.sessionId,
        occurred_at: event.occurredAt,
        battle_id: event.battleId,
        scenario_id: event.scenarioId,
        content_hash: event.contentHash,
        team: event.team,
        result: event.result,
        turns_used: event.turnsUsed,
      };
    case "battle-check":
      return {
        client_event_id: event.clientEventId,
        session_id: event.sessionId,
        occurred_at: event.occurredAt,
        battle_id: event.battleId,
        scenario_id: event.scenarioId,
        content_hash: event.contentHash,
        turn_number: event.turnNumber,
        best_move_id: event.bestMoveId,
        ticked_points: event.tickedPoints,
      };
    case "battle-discuss":
      return {
        client_event_id: event.clientEventId,
        session_id: event.sessionId,
        occurred_at: event.occurredAt,
        battle_id: event.battleId,
        scenario_id: event.scenarioId,
        content_hash: event.contentHash,
        copied: event.copied,
      };
    case "battle-teach-back":
      return {
        client_event_id: event.clientEventId,
        session_id: event.sessionId,
        occurred_at: event.occurredAt,
        battle_id: event.battleId,
        scenario_id: event.scenarioId,
        content_hash: event.contentHash,
        item_ids: event.itemIds,
        first_sentence: event.firstSentence,
        second_sentence: event.secondSentence,
      };
  }
}

/** Postgres errors that mean the event itself is wrong, so sending it again cannot help. */
const REFUSED_CODES = new Set(["22023", "23514", "23502", "22P02", "23503", "23505", "42501"]);

export class EventWriteError extends Error {
  constructor(
    message: string,
    /** True when the server will never accept these events. */
    readonly refused: boolean,
  ) {
    super(message);
  }
}

/**
 * Writes a batch as the signed-in user. Row-level security keeps each row to its owner,
 * and an event that was already written is skipped.
 */
export async function writeEvents(client: SupabaseClient, events: LearningEvent[]): Promise<void> {
  for (const type of Object.keys(TABLES) as LearningEvent["type"][]) {
    const rows = events.filter((event) => event.type === type).map(toRow);
    if (rows.length === 0) continue;
    // A batch may hold the same event twice, for example after a retry.
    const unique = [...new Map(rows.map((row) => [row.client_event_id, row])).values()];
    const { error } = await client
      .from(TABLES[type])
      .upsert(unique, { onConflict: "user_id,client_event_id", ignoreDuplicates: true });
    if (error) throw new EventWriteError(`Could not write ${type} events: ${error.message}`, REFUSED_CODES.has(error.code));
  }
}

/**
 * The creatures and moves a batch is about. Their review state must be refreshed.
 * A self-check is about its turn's best move. The moves of a lost battle: see `lostBattleIds`.
 */
export function touchedItemIds(events: LearningEvent[]): string[] {
  return [
    ...new Set(
      events.flatMap((event) => {
        if ("itemId" in event) return [event.itemId];
        if (event.type === "battle-check") return [event.bestMoveId];
        return [];
      }),
    ),
  ];
}

/** The battles a batch ends with a loss. Their used moves come back tomorrow. */
export function lostBattleIds(events: LearningEvent[]): string[] {
  return events.flatMap((event) => (event.type === "battle" && event.result === "lost" ? [event.battleId] : []));
}
