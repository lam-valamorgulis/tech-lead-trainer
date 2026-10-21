import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { KEY_POINTS, REASONS, SCENARIO_KINDS } from "@/content/schema";
import { SKILLS } from "@/content/skills";
import { cardCreatureId, REVIEW_RULES, REVIEW_STEPS } from "@/core/review";

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
  /**
   * v1.4 asked first: before-card, then after-card. v1.5 teaches first (#97): after-lesson is the
   * first try, after-look-back the one more try. Old values stay valid for old clients.
   */
  phase: z.enum(["before-card", "after-card", "after-lesson", "after-look-back"]),
  /** Which try of the Lesson flow: 1 or 2. Old events have none. */
  attempt: z.union([z.literal(1), z.literal(2)]).optional(),
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
  /**
   * The review rules of the grade (design 6.5). The v1.5 app always sends it. Left out by an old
   * app: passing the 30-day step then gives Stage 3 by itself, as before v1.5.
   */
  rulesVersion: z.literal(REVIEW_RULES).optional(),
});

/** The Skills a Battle turn or a scored card trains: fixed ids, each listed once. */
const skillIdsSchema = z
  .array(z.int().min(1).max(SKILLS.length))
  .min(1)
  .max(SKILLS.length)
  .refine((ids) => new Set(ids).size === ids.length, "A Skill is listed once.");

const cardSegment = "[a-z0-9]+(-[a-z0-9]+)*";

/**
 * One answered scored card in review (#109): a Decision Card (design 6.4) or the Stage 3 trade-off
 * question (design 6.5). It goes into review_events with its own item kind. The option and the
 * Reason are logged by their index in the content file, with whether each was right at play time.
 */
export const reviewCardEventSchema = z
  .object({
    type: z.literal("review-card"),
    ...base,
    itemId: z.string().max(100).regex(new RegExp(`^${cardSegment}\\.(decision|trade-off)\\.${cardSegment}$`)),
    itemKind: z.enum(["decision", "trade-off"]),
    contentHash: z.string().regex(/^[0-9a-f]{16}$/),
    choiceIndex: z.int().min(0).max(2),
    choiceCorrect: z.boolean(),
    reasonIndex: z.int().min(0).max(REASONS - 1),
    reasonCorrect: z.boolean(),
    skillIds: skillIdsSchema,
    shownAt: z.iso.datetime({ offset: true }),
    gradedAt: z.iso.datetime({ offset: true }),
    rulesVersion: z.literal(REVIEW_RULES),
  })
  .refine((card) => card.itemId.includes(`.${card.itemKind}.`), {
    message: "The item kind is the middle part of the card id.",
  })
  .refine((card) => card.itemKind === "trade-off" || card.choiceIndex <= 1, {
    message: "A Decision Card has 2 options.",
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

const damageValue = z.union([z.literal(0), z.literal(1), z.literal(2)]);

/**
 * One played battle turn. `bestMove` and `reasonCorrect` are decided at play time and never
 * recomputed. The v2 fields (ADR 0001) are optional, so the v1 screen and events still waiting
 * in an old outbox keep the old shape: a move, its damage and a typed why.
 */
export const battleTurnEventSchema = z
  .object({
    type: z.literal("battle-turn"),
    ...base,
    battleId: z.uuid(),
    scenarioId,
    contentHash: z.string().regex(/^[0-9a-f]{16}$/),
    turnNumber: z.int().min(1).max(3),
    /** Null when the team had no move for this threat. */
    moveId: z.string().min(1).max(100).nullable(),
    /** The hit on the opponent. In v2 a wrong Reason has already made it 1 weaker. */
    damage: damageValue,
    bestMove: z.boolean(),
    /** Optional from v2 on. When given, it has words in it. */
    whyText: z.string().trim().min(1).max(1000).optional(),
    battleKind: z.enum(SCENARIO_KINDS).optional(),
    /** The damage in the move table, before a wrong Reason weakened the hit. */
    moveDamage: damageValue.optional(),
    /** The Reason picked, by its index in the content file. */
    reasonIndex: z.int().min(0).max(REASONS - 1).optional(),
    reasonCorrect: z.boolean().optional(),
    /** The HP the learner's side lost this turn. */
    hpLost: damageValue.optional(),
    skillIds: skillIdsSchema.optional(),
    /** Which Constraint the turn showed: "main" is the turn's own line. */
    constraintVariant: z.string().max(50).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).optional(),
  })
  .refine((turn) => (turn.reasonIndex === undefined) === (turn.reasonCorrect === undefined), {
    message: "A Reason and whether it was right come together.",
  });

/** The end of a battle. The v2 fields are optional, like those of a turn. */
export const battleEventSchema = z.object({
  type: z.literal("battle"),
  ...base,
  battleId: z.uuid(),
  scenarioId,
  contentHash: z.string().regex(/^[0-9a-f]{16}$/),
  team: z.array(z.string().min(1).max(100)).min(1).max(3),
  result: z.enum(["won", "lost"]),
  turnsUsed: z.int().min(1).max(3),
  battleKind: z.enum(SCENARIO_KINDS).optional(),
  /** How many team members Fainted. */
  faints: z.int().min(0).max(3).optional(),
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

/** The end of a Gym: its town, its battles, the wins, and whether it gave the badge. */
export const gymEventSchema = z
  .object({
    type: z.literal("gym"),
    ...base,
    gymId: z.uuid(),
    townId: z.string().regex(/^t\d{2}$/),
    battleIds: z.array(z.uuid()).min(1).max(5),
    wins: z.int().min(0).max(5),
    passed: z.boolean(),
  })
  .refine((gym) => gym.wins <= gym.battleIds.length && gym.passed === gym.wins >= 4, {
    message: "A Gym gives the badge exactly when it has 4 wins.",
  });

/** Read-close-write (#34): the 3 points recalled after closing a primary source. */
export const readingEventSchema = z.object({
  type: z.literal("reading"),
  ...base,
  itemId: z.string().min(1).max(100),
  sourceUrl: z.url({ protocol: /^https$/ }).max(2000),
  points: z.array(z.string().trim().min(1).max(500)).length(3),
});

export const eventSchema = z.discriminatedUnion("type", [
  sessionEventSchema,
  catchEventSchema,
  reviewEventSchema,
  reviewCardEventSchema,
  placementEventSchema,
  battleTurnEventSchema,
  battleEventSchema,
  battleCheckEventSchema,
  battleDiscussEventSchema,
  battleTeachBackEventSchema,
  gymEventSchema,
  readingEventSchema,
]);
export const eventBatchSchema = z.object({ events: z.array(eventSchema).min(1).max(100) });

export type SessionEvent = z.infer<typeof sessionEventSchema>;
export type CatchEvent = z.infer<typeof catchEventSchema>;
export type ReviewEvent = z.infer<typeof reviewEventSchema>;
export type ReviewCardEvent = z.infer<typeof reviewCardEventSchema>;
export type PlacementEvent = z.infer<typeof placementEventSchema>;
export type BattleTurnEvent = z.infer<typeof battleTurnEventSchema>;
export type BattleEvent = z.infer<typeof battleEventSchema>;
export type BattleCheckEvent = z.infer<typeof battleCheckEventSchema>;
export type BattleDiscussEvent = z.infer<typeof battleDiscussEventSchema>;
/** The fields every event of one battle shares. */
export type BattleEventFields = Pick<BattleTurnEvent, "sessionId" | "occurredAt" | "battleId" | "scenarioId" | "contentHash">;
export type BattleTeachBackEvent = z.infer<typeof battleTeachBackEventSchema>;
export type GymEvent = z.infer<typeof gymEventSchema>;
export type ReadingEvent = z.infer<typeof readingEventSchema>;
export type LearningEvent = z.infer<typeof eventSchema>;

const TABLES = {
  session: "session_events",
  catch: "catch_events",
  review: "review_events",
  "review-card": "review_events",
  placement: "placement_events",
  "battle-turn": "battle_turn_events",
  battle: "battle_events",
  "battle-check": "battle_check_events",
  "battle-discuss": "battle_discuss_events",
  "battle-teach-back": "battle_teach_back_events",
  gym: "gym_events",
  reading: "reading_events",
} as const satisfies Record<LearningEvent["type"], string>;

/** Every event table. "Download my data" exports each one. */
export const EVENT_TABLES = [...new Set(Object.values(TABLES))];

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
        attempt: event.attempt ?? null,
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
        rules_version: event.rulesVersion ?? null,
      };
    case "review-card":
      return {
        client_event_id: event.clientEventId,
        session_id: event.sessionId,
        occurred_at: event.occurredAt,
        item_id: event.itemId,
        item_kind: event.itemKind,
        content_hash: event.contentHash,
        choice_index: event.choiceIndex,
        choice_correct: event.choiceCorrect,
        reason_index: event.reasonIndex,
        reason_correct: event.reasonCorrect,
        skill_ids: event.skillIds,
        shown_at: event.shownAt,
        graded_at: event.gradedAt,
        rules_version: event.rulesVersion,
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
        why_text: event.whyText ?? null,
        battle_kind: event.battleKind ?? null,
        move_damage: event.moveDamage ?? null,
        reason_index: event.reasonIndex ?? null,
        reason_correct: event.reasonCorrect ?? null,
        hp_lost: event.hpLost ?? null,
        skill_ids: event.skillIds ?? null,
        constraint_variant: event.constraintVariant ?? null,
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
        battle_kind: event.battleKind ?? null,
        faints: event.faints ?? null,
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
    case "gym":
      return {
        client_event_id: event.clientEventId,
        session_id: event.sessionId,
        occurred_at: event.occurredAt,
        gym_id: event.gymId,
        town_id: event.townId,
        battle_ids: event.battleIds,
        wins: event.wins,
        passed: event.passed,
      };
    case "reading":
      return {
        client_event_id: event.clientEventId,
        session_id: event.sessionId,
        occurred_at: event.occurredAt,
        item_id: event.itemId,
        source_url: event.sourceUrl,
        points: event.points,
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
 * A scored card is about its creature: a wrong Decision Card brings it back, a right trade-off
 * answer evolves it.
 */
export function touchedItemIds(events: LearningEvent[]): string[] {
  return [
    ...new Set(
      events.flatMap((event) => {
        if (event.type === "review-card") return [cardCreatureId(event.itemId)];
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
