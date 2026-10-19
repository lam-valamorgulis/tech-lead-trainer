import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

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

export const eventSchema = z.discriminatedUnion("type", [sessionEventSchema]);
export const eventBatchSchema = z.object({ events: z.array(eventSchema).min(1).max(100) });

export type SessionEvent = z.infer<typeof sessionEventSchema>;
export type LearningEvent = z.infer<typeof eventSchema>;

const TABLES = { session: "session_events" } as const satisfies Record<LearningEvent["type"], string>;

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
    if (error) throw new Error(`Could not write ${type} events: ${error.message}`);
  }
}
