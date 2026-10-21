import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { eventSchema, writeEvents, type ReviewCardEvent, type ReviewEvent } from "@/lib/events/write-events";
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

function cardEvent(overrides: Partial<ReviewCardEvent> = {}): ReviewCardEvent {
  return {
    type: "review-card",
    clientEventId: crypto.randomUUID(),
    sessionId: crypto.randomUUID(),
    occurredAt: "2026-10-18T02:01:10.000Z",
    itemId: "cache.decision.logo",
    itemKind: "decision",
    contentHash: "fedcba9876543210",
    choiceIndex: 1,
    choiceCorrect: false,
    reasonIndex: 0,
    reasonCorrect: true,
    skillIds: [3],
    shownAt: "2026-10-18T02:01:00.000Z",
    gradedAt: "2026-10-18T02:01:10.000Z",
    rulesVersion: "v1.5",
    ...overrides,
  };
}

const CARD_COLUMNS =
  "item_id, item_kind, content_hash, step_before, step_after, grade, planned_due_day, shown_at, revealed_at, graded_at, " +
  "typed_answer, choice_index, choice_correct, reason_index, reason_correct, skill_ids, rules_version";

describe("review events with Decision Cards and trade-off questions (#109)", () => {
  let user: { id: string; email: string; client: SupabaseClient };

  beforeAll(async () => {
    user = await signedInUser("review-cards");
    await ensureProfile(user.client);
  });

  afterAll(async () => {
    await forgetEmail(user.email);
  });

  const rowOf = async (clientEventId: string) =>
    (await user.client.from("review_events").select(CARD_COLUMNS).eq("client_event_id", clientEventId)).data;

  it("store a Decision Card once: the option and the Reason by file index, whether each was right, and the Skills", async () => {
    const event = cardEvent();
    await writeEvents(user.client, [event, event]);
    expect(await rowOf(event.clientEventId)).toEqual([
      {
        item_id: "cache.decision.logo",
        item_kind: "decision",
        content_hash: "fedcba9876543210",
        // The app grades the card, so it has no grade, step, planned due day or Reveal.
        step_before: null,
        step_after: null,
        grade: null,
        planned_due_day: null,
        shown_at: "2026-10-18T02:01:00+00:00",
        revealed_at: null,
        graded_at: "2026-10-18T02:01:10+00:00",
        typed_answer: null,
        choice_index: 1,
        choice_correct: false,
        reason_index: 0,
        reason_correct: true,
        skill_ids: [3],
        rules_version: "v1.5",
      },
    ]);
  });

  it("store a trade-off answer with its 3rd option", async () => {
    const event = cardEvent({ itemId: "cache.trade-off.fresh-prices", itemKind: "trade-off", choiceIndex: 2, skillIds: [3, 10] });
    await writeEvents(user.client, [event]);
    expect(await rowOf(event.clientEventId)).toMatchObject([{ item_kind: "trade-off", choice_index: 2, skill_ids: [3, 10] }]);
  });

  it("still store an old-shaped review with every new field empty, and a v1.5 review with its rules", async () => {
    const old = reviewEvent();
    const v15 = reviewEvent({ rulesVersion: "v1.5" });
    await writeEvents(user.client, [old, v15]);
    const empty = { choice_index: null, choice_correct: null, reason_index: null, reason_correct: null, skill_ids: null };
    expect(await rowOf(old.clientEventId)).toMatchObject([{ item_kind: "creature", grade: "good", step_before: 3, ...empty, rules_version: null }]);
    expect(await rowOf(v15.clientEventId)).toMatchObject([{ item_kind: "creature", grade: "good", ...empty, rules_version: "v1.5" }]);
  });

  it("refuse a Decision Card with a 3rd option, a 4th Reason or an unknown Skill", async () => {
    // The endpoint schema refuses them first, so these rows go straight to the table.
    const row = (fields: Record<string, unknown>) => ({
      client_event_id: crypto.randomUUID(),
      session_id: crypto.randomUUID(),
      occurred_at: "2026-10-18T02:01:10Z",
      item_id: "cache.decision.logo",
      item_kind: "decision",
      content_hash: "fedcba9876543210",
      choice_index: 0,
      choice_correct: true,
      reason_index: 0,
      reason_correct: true,
      skill_ids: [3],
      shown_at: "2026-10-18T02:01:00Z",
      graded_at: "2026-10-18T02:01:10Z",
      ...fields,
    });
    const insert = (fields: Record<string, unknown>) => user.client.from("review_events").insert(row(fields));
    expect((await insert({})).error).toBeNull();
    for (const bad of [
      { choice_index: 2 },
      { reason_index: 3 },
      { skill_ids: [27] },
      { skill_ids: [3, 3] },
      // A scored card has no grade, no step and no typed answer, and it needs every scored field.
      { grade: "good" },
      { step_before: 3 },
      { typed_answer: "a guess" },
      { reason_correct: null },
      { skill_ids: null },
      { graded_at: "2026-10-18T02:00:00Z" },
      { item_kind: "quiz" },
    ]) {
      expect((await insert(bad)).error?.code, JSON.stringify(bad)).toBe("23514");
    }
  });

  it("refuse a creature review with a scored-card field, or without its grade", async () => {
    const insert = (fields: Record<string, unknown>) =>
      user.client.from("review_events").insert({
        client_event_id: crypto.randomUUID(),
        session_id: crypto.randomUUID(),
        occurred_at: "2026-10-18T02:00:10Z",
        item_id: "cache",
        item_kind: "creature",
        content_hash: "0123456789abcdef",
        step_before: 3,
        step_after: 7,
        grade: "good",
        planned_due_day: "2026-10-17",
        shown_at: "2026-10-18T02:00:00Z",
        revealed_at: "2026-10-18T02:00:06Z",
        graded_at: "2026-10-18T02:00:10Z",
        ...fields,
      });
    expect((await insert({ choice_index: 0 })).error?.code).toBe("23514");
    expect((await insert({ grade: null })).error?.code).toBe("23514");
    expect((await insert({ revealed_at: null })).error?.code).toBe("23514");
  });

  it("let the endpoint schema accept both shapes and refuse a card whose kind does not match its id", () => {
    expect(eventSchema.safeParse(reviewEvent()).success).toBe(true);
    expect(eventSchema.safeParse(reviewEvent({ rulesVersion: "v1.5" })).success).toBe(true);
    expect(eventSchema.safeParse(cardEvent()).success).toBe(true);
    expect(eventSchema.safeParse(cardEvent({ itemKind: "trade-off" })).success).toBe(false);
    expect(eventSchema.safeParse(cardEvent({ choiceIndex: 2 })).success).toBe(false);
    expect(eventSchema.safeParse(cardEvent({ itemId: "cache" })).success).toBe(false);
  });
});
