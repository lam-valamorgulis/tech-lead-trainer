import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { writeEvents, type CatchEvent } from "@/lib/events/write-events";
import { ensureProfile } from "@/lib/profile";
import { forgetEmail, signedInUser } from "./helpers";

function catchEvent(overrides: Partial<CatchEvent> = {}): CatchEvent {
  return {
    type: "catch",
    clientEventId: crypto.randomUUID(),
    sessionId: crypto.randomUUID(),
    occurredAt: "2026-10-18T17:30:00.000Z",
    itemId: "cache",
    itemKind: "creature",
    contentHash: "0123456789abcdef",
    answerText: "To load it faster next time",
    correct: true,
    confidence: 2,
    phase: "before-card",
    ...overrides,
  };
}

describe("catch events", () => {
  let user: { id: string; email: string; client: SupabaseClient };

  beforeAll(async () => {
    user = await signedInUser("catch");
    await ensureProfile(user.client);
  });

  afterAll(async () => {
    await forgetEmail(user.email);
  });

  it("store the item, content hash, answer, correct or not, and confidence", async () => {
    const event = catchEvent();
    await writeEvents(user.client, [event, event]);

    const { data } = await user.client
      .from("catch_events")
      .select("item_id, item_kind, content_hash, answer_text, correct, confidence, phase, learning_day")
      .eq("client_event_id", event.clientEventId);
    expect(data).toEqual([
      {
        item_id: "cache",
        item_kind: "creature",
        content_hash: "0123456789abcdef",
        answer_text: "To load it faster next time",
        correct: true,
        confidence: 2,
        phase: "before-card",
        learning_day: "2026-10-18",
      },
    ]);
  });

  it("refuses a confidence outside 1 to 3", async () => {
    await expect(writeEvents(user.client, [catchEvent({ confidence: 4 as 3 })])).rejects.toThrow();
  });
});
