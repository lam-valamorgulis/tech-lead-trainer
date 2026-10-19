import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
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

export const eventSchema = z.discriminatedUnion("type", [sessionEventSchema, catchEventSchema, reviewEventSchema]);
export const eventBatchSchema = z.object({ events: z.array(eventSchema).min(1).max(100) });

export type SessionEvent = z.infer<typeof sessionEventSchema>;
export type CatchEvent = z.infer<typeof catchEventSchema>;
export type ReviewEvent = z.infer<typeof reviewEventSchema>;
export type LearningEvent = z.infer<typeof eventSchema>;

const TABLES = { session: "session_events", catch: "catch_events", review: "review_events" } as const satisfies Record<LearningEvent["type"], string>;

/** Every event table. The export and the backup read this list. */
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
  }
}

/** Postgres errors that mean the event itself is wrong, so sending it again cannot help. */
const REFUSED_CODES = new Set(["22023", "23514", "23502", "22P02", "23503", "42501"]);

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

/** The creatures and moves a batch is about. Their review state must be refreshed. */
export function touchedItemIds(events: LearningEvent[]): string[] {
  return [...new Set(events.flatMap((event) => ("itemId" in event ? [event.itemId] : [])))];
}
