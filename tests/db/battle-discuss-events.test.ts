import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  eventSchema,
  writeEvents,
  type BattleDiscussEvent,
  type BattleTeachBackEvent,
} from "@/lib/events/write-events";
import { ensureProfile } from "@/lib/profile";
import { forgetEmail, signedInUser } from "./helpers";

const base = () => ({
  clientEventId: crypto.randomUUID(),
  sessionId: crypto.randomUUID(),
  occurredAt: "2026-10-18T17:30:00.000Z",
});

function discussEvent(overrides: Partial<BattleDiscussEvent> = {}): BattleDiscussEvent {
  return {
    type: "battle-discuss",
    ...base(),
    battleId: crypto.randomUUID(),
    scenarioId: "t99-sale-day",
    contentHash: "0123456789abcdef",
    copied: true,
    ...overrides,
  };
}

function teachBackEvent(overrides: Partial<BattleTeachBackEvent> = {}): BattleTeachBackEvent {
  return {
    type: "battle-teach-back",
    ...base(),
    battleId: crypto.randomUUID(),
    scenarioId: "t99-sale-day",
    contentHash: "0123456789abcdef",
    itemIds: ["cache.ttl", "cache"],
    firstSentence: "A TTL says how long a copy stays fresh.",
    secondSentence: "A long TTL makes a new logo show late.",
    ...overrides,
  };
}

describe("Discuss in Claude and teach-back events", () => {
  let user: { id: string; email: string; client: SupabaseClient };

  beforeAll(async () => {
    user = await signedInUser("discuss");
    await ensureProfile(user.client);
  });

  afterAll(async () => {
    await forgetEmail(user.email);
  });

  it("store each Discuss in Claude tap and whether the copy worked", async () => {
    const tap = discussEvent();
    const manual = discussEvent({ battleId: tap.battleId, copied: false });
    await writeEvents(user.client, [tap, tap, manual]);

    const { data } = await user.client
      .from("battle_discuss_events")
      .select("battle_id, scenario_id, content_hash, copied, learning_day")
      .eq("battle_id", tap.battleId)
      .order("id");
    expect(data).toEqual([
      { battle_id: tap.battleId, scenario_id: "t99-sale-day", content_hash: "0123456789abcdef", copied: true, learning_day: "2026-10-18" },
      { battle_id: tap.battleId, scenario_id: "t99-sale-day", content_hash: "0123456789abcdef", copied: false, learning_day: "2026-10-18" },
    ]);
  });

  it("store the 2 teach-back sentences on the battle once, with the items they belong to", async () => {
    const teachBack = teachBackEvent();
    await writeEvents(user.client, [teachBack, teachBack]);
    // A second teach-back for the same battle, for example from another device, is refused.
    await expect(writeEvents(user.client, [teachBackEvent({ battleId: teachBack.battleId })])).rejects.toThrow();

    const { data } = await user.client
      .from("battle_teach_back_events")
      .select("battle_id, scenario_id, content_hash, item_ids, first_sentence, second_sentence, learning_day")
      .eq("client_event_id", teachBack.clientEventId);
    expect(data).toEqual([
      {
        battle_id: teachBack.battleId,
        scenario_id: "t99-sale-day",
        content_hash: "0123456789abcdef",
        item_ids: ["cache.ttl", "cache"],
        first_sentence: "A TTL says how long a copy stays fresh.",
        second_sentence: "A long TTL makes a new logo show late.",
        learning_day: "2026-10-18",
      },
    ]);
  });

  it("refuse an empty sentence, a sentence over 500 characters and a teach-back with no item", async () => {
    await expect(writeEvents(user.client, [teachBackEvent({ firstSentence: "  " })])).rejects.toThrow();
    await expect(writeEvents(user.client, [teachBackEvent({ secondSentence: "x".repeat(501) })])).rejects.toThrow();
    await expect(writeEvents(user.client, [teachBackEvent({ itemIds: [] })])).rejects.toThrow();
  });

  it("refuse a teach-back that the endpoint schema does not accept", () => {
    expect(eventSchema.safeParse(teachBackEvent({ firstSentence: " " })).success).toBe(false);
    expect(eventSchema.safeParse(teachBackEvent({ itemIds: [] })).success).toBe(false);
    expect(eventSchema.safeParse(teachBackEvent({ itemIds: Array(7).fill("cache") })).success).toBe(false);
    expect(eventSchema.safeParse(teachBackEvent()).success).toBe(true);
    expect(eventSchema.safeParse(discussEvent()).success).toBe(true);
  });
});
