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

  it("store the try of the Lesson flow (#97): the first try after the Lesson, then one more after the look-back", async () => {
    const first = catchEvent({ phase: "after-lesson", attempt: 1, correct: false });
    const second = catchEvent({ phase: "after-look-back", attempt: 2 });
    await writeEvents(user.client, [first, second]);
    const { data } = await user.client
      .from("catch_events")
      .select("phase, attempt, correct")
      .in("client_event_id", [first.clientEventId, second.clientEventId])
      .order("id");
    expect(data).toEqual([
      { phase: "after-lesson", attempt: 1, correct: false },
      { phase: "after-look-back", attempt: 2, correct: true },
    ]);
  });

  it("still takes an old-shaped event, with no try number", async () => {
    const old = catchEvent({ phase: "after-card" });
    await writeEvents(user.client, [old]);
    const { data } = await user.client.from("catch_events").select("phase, attempt").eq("client_event_id", old.clientEventId);
    expect(data).toEqual([{ phase: "after-card", attempt: null }]);
  });

  it("refuses a third try, or a try that does not match its phase", async () => {
    const row = (phase: string, attempt: number | null) => ({
      client_event_id: crypto.randomUUID(),
      session_id: crypto.randomUUID(),
      occurred_at: "2026-10-18T17:30:00.000Z",
      item_id: "cache",
      item_kind: "creature",
      content_hash: "0123456789abcdef",
      answer_text: "x",
      correct: false,
      confidence: 1,
      phase,
      attempt,
    });
    for (const bad of [row("after-look-back", 3), row("after-lesson", 2), row("after-look-back", null), row("after-lesson", null)]) {
      const { error } = await user.client.from("catch_events").insert(bad);
      expect(error?.code, JSON.stringify(bad)).toBe("23514");
    }
  });
});
