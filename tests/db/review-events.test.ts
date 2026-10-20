import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { writeEvents, type ReviewEvent } from "@/lib/events/write-events";
import { ensureProfile } from "@/lib/profile";
import { forgetEmail, signedInUser } from "./helpers";

function reviewEvent(overrides: Partial<ReviewEvent> = {}): ReviewEvent {
  return {
    type: "review",
    clientEventId: crypto.randomUUID(),
    sessionId: crypto.randomUUID(),
    occurredAt: "2026-10-18T02:00:10.000Z",
    itemId: "cache",
    itemKind: "creature",
    contentHash: "0123456789abcdef",
    stepBefore: 3,
    stepAfter: 7,
    grade: "good",
    plannedDueDay: "2026-10-17",
    shownAt: "2026-10-18T02:00:00.000Z",
    revealedAt: "2026-10-18T02:00:06.000Z",
    gradedAt: "2026-10-18T02:00:10.000Z",
    typedAnswer: "A saved copy",
    confidence: null,
    ...overrides,
  };
}

describe("review events", () => {
  let user: { id: string; email: string; client: SupabaseClient };

  beforeAll(async () => {
    user = await signedInUser("review");
    await ensureProfile(user.client);
  });

  afterAll(async () => {
    await forgetEmail(user.email);
  });

  it("store every field the month-3 schedule check needs, once", async () => {
    const event = reviewEvent();
    await writeEvents(user.client, [event, event]);

    const { data } = await user.client
      .from("review_events")
      .select(
        "item_id, item_kind, content_hash, step_before, step_after, grade, planned_due_day, shown_at, revealed_at, graded_at, typed_answer, confidence, learning_day",
      )
      .eq("client_event_id", event.clientEventId);
    expect(data).toEqual([
      {
        item_id: "cache",
        item_kind: "creature",
        content_hash: "0123456789abcdef",
        step_before: 3,
        step_after: 7,
        grade: "good",
        planned_due_day: "2026-10-17",
        shown_at: "2026-10-18T02:00:00+00:00",
        revealed_at: "2026-10-18T02:00:06+00:00",
        graded_at: "2026-10-18T02:00:10+00:00",
        typed_answer: "A saved copy",
        confidence: null,
        learning_day: "2026-10-18",
      },
    ]);
  });

  it("refuses a grade that does not exist", async () => {
    await expect(writeEvents(user.client, [reviewEvent({ grade: "perfect" as "good" })])).rejects.toThrow();
  });

  it("refuses a step that is not on the schedule", async () => {
    await expect(writeEvents(user.client, [reviewEvent({ stepAfter: 5 as 7 })])).rejects.toThrow();
  });
});
