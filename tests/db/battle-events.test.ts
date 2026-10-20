import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { writeEvents, type BattleEvent, type BattleTurnEvent } from "@/lib/events/write-events";
import { ensureProfile } from "@/lib/profile";
import { forgetEmail, signedInUser } from "./helpers";

const base = () => ({
  clientEventId: crypto.randomUUID(),
  sessionId: crypto.randomUUID(),
  occurredAt: "2026-10-18T17:30:00.000Z",
});

function turnEvent(overrides: Partial<BattleTurnEvent> = {}): BattleTurnEvent {
  return {
    type: "battle-turn",
    ...base(),
    battleId: crypto.randomUUID(),
    scenarioId: "t99-sale-day",
    contentHash: "0123456789abcdef",
    turnNumber: 1,
    moveId: "cache.ttl",
    damage: 2,
    bestMove: true,
    whyText: "The logo rarely changes, so a copy can live for an hour.",
    ...overrides,
  };
}

function battleEvent(overrides: Partial<BattleEvent> = {}): BattleEvent {
  return {
    type: "battle",
    ...base(),
    battleId: crypto.randomUUID(),
    scenarioId: "t99-sale-day",
    contentHash: "0123456789abcdef",
    team: ["cache", "cookie", "proxy"],
    result: "won",
    turnsUsed: 2,
    ...overrides,
  };
}

describe("battle events", () => {
  let user: { id: string; email: string; client: SupabaseClient };

  beforeAll(async () => {
    user = await signedInUser("battle");
    await ensureProfile(user.client);
  });

  afterAll(async () => {
    await forgetEmail(user.email);
  });

  it("store each turn with its move, damage, why and the best-move flag of play time", async () => {
    const turn = turnEvent();
    await writeEvents(user.client, [turn, turn]);

    const { data } = await user.client
      .from("battle_turn_events")
      .select("battle_id, scenario_id, content_hash, turn_number, move_id, damage, best_move, why_text, learning_day")
      .eq("client_event_id", turn.clientEventId);
    expect(data).toEqual([
      {
        battle_id: turn.battleId,
        scenario_id: "t99-sale-day",
        content_hash: "0123456789abcdef",
        turn_number: 1,
        move_id: "cache.ttl",
        damage: 2,
        best_move: true,
        why_text: "The logo rarely changes, so a copy can live for an hour.",
        learning_day: "2026-10-18",
      },
    ]);
  });

  it("store a turn with no move when the team had none", async () => {
    const turn = turnEvent({ moveId: null, damage: 0, bestMove: false });
    await writeEvents(user.client, [turn]);
    const { data } = await user.client.from("battle_turn_events").select("move_id").eq("client_event_id", turn.clientEventId);
    expect(data).toEqual([{ move_id: null }]);
  });

  it("refuse a second answer to the same turn of the same battle, for example from another device", async () => {
    const first = turnEvent();
    await writeEvents(user.client, [first]);
    await expect(writeEvents(user.client, [turnEvent({ battleId: first.battleId })])).rejects.toThrow();
  });

  it("refuse an empty why, a damage above 2 and a turn after 3", async () => {
    await expect(writeEvents(user.client, [turnEvent({ whyText: "  " })])).rejects.toThrow();
    await expect(writeEvents(user.client, [turnEvent({ damage: 3 as 2 })])).rejects.toThrow();
    await expect(writeEvents(user.client, [turnEvent({ turnNumber: 4 })])).rejects.toThrow();
  });

  it("store the end of a battle once: the team, the result and the turns used", async () => {
    const battle = battleEvent();
    await writeEvents(user.client, [battle, battle]);
    await expect(writeEvents(user.client, [battleEvent({ battleId: battle.battleId })])).rejects.toThrow();

    const { data } = await user.client
      .from("battle_events")
      .select("battle_id, scenario_id, content_hash, team, result, turns_used, learning_day")
      .eq("client_event_id", battle.clientEventId);
    expect(data).toEqual([
      {
        battle_id: battle.battleId,
        scenario_id: "t99-sale-day",
        content_hash: "0123456789abcdef",
        team: ["cache", "cookie", "proxy"],
        result: "won",
        turns_used: 2,
        learning_day: "2026-10-18",
      },
    ]);
  });
});
