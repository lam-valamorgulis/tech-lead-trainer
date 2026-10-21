import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  eventSchema,
  writeEvents,
  type BattleCheckEvent,
  type BattleEvent,
  type BattleTurnEvent,
} from "@/lib/events/write-events";
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

function checkEvent(overrides: Partial<BattleCheckEvent> = {}): BattleCheckEvent {
  return {
    type: "battle-check",
    ...base(),
    battleId: crypto.randomUUID(),
    scenarioId: "t99-sale-day",
    contentHash: "0123456789abcdef",
    turnNumber: 2,
    bestMoveId: "cache.no-store",
    tickedPoints: [1, 3],
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

  it("refuse a team name over 100 characters, like every other text column", async () => {
    await expect(writeEvents(user.client, [battleEvent({ team: ["cache", "x".repeat(101)] })])).rejects.toThrow();
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

  it("store the self-check of a turn once: the ticked key points and the best move of play time", async () => {
    const check = checkEvent();
    await writeEvents(user.client, [check, check]);

    const { data } = await user.client
      .from("battle_check_events")
      .select("battle_id, scenario_id, content_hash, turn_number, best_move_id, ticked_points, learning_day")
      .eq("client_event_id", check.clientEventId);
    expect(data).toEqual([
      {
        battle_id: check.battleId,
        scenario_id: "t99-sale-day",
        content_hash: "0123456789abcdef",
        turn_number: 2,
        best_move_id: "cache.no-store",
        ticked_points: [1, 3],
        learning_day: "2026-10-18",
      },
    ]);
  });

  it("store a self-check with no ticks", async () => {
    const check = checkEvent({ tickedPoints: [] });
    await writeEvents(user.client, [check]);
    const { data } = await user.client.from("battle_check_events").select("ticked_points").eq("client_event_id", check.clientEventId);
    expect(data).toEqual([{ ticked_points: [] }]);
  });

  it("refuse a second self-check of the same turn, a point that does not exist and a point ticked twice", async () => {
    const first = checkEvent();
    await writeEvents(user.client, [first]);
    await expect(writeEvents(user.client, [checkEvent({ battleId: first.battleId })])).rejects.toThrow();
    await expect(writeEvents(user.client, [checkEvent({ tickedPoints: [4] })])).rejects.toThrow();
    await expect(writeEvents(user.client, [checkEvent({ tickedPoints: [2, 2] })])).rejects.toThrow();
    await expect(writeEvents(user.client, [checkEvent({ tickedPoints: [1, 2, 3, 1] })])).rejects.toThrow();
  });

  it("store a v2 turn: the kind, the Reason by its file index, the HP lost, the Skills and the Constraint, with no typed why", async () => {
    const turn = turnEvent({
      whyText: undefined,
      damage: 1,
      battleKind: "meeting",
      reasonIndex: 2,
      reasonCorrect: false,
      hpLost: 0,
      skillIds: [3, 10],
      constraintVariant: "main",
    });
    await writeEvents(user.client, [turn, turn]);

    const { data } = await user.client
      .from("battle_turn_events")
      .select("move_id, damage, best_move, why_text, battle_kind, reason_index, reason_correct, hp_lost, skill_ids, constraint_variant")
      .eq("client_event_id", turn.clientEventId);
    expect(data).toEqual([
      {
        move_id: "cache.ttl",
        damage: 1,
        best_move: true,
        why_text: null,
        battle_kind: "meeting",
        reason_index: 2,
        reason_correct: false,
        hp_lost: 0,
        skill_ids: [3, 10],
        constraint_variant: "main",
      },
    ]);
  });

  it("still store an old-shaped turn from the v1 screen: the why stays, and every v2 field is empty", async () => {
    const turn = turnEvent();
    await writeEvents(user.client, [turn]);
    const { data } = await user.client
      .from("battle_turn_events")
      .select("why_text, battle_kind, reason_index, reason_correct, hp_lost, skill_ids, constraint_variant")
      .eq("client_event_id", turn.clientEventId);
    expect(data).toEqual([
      {
        why_text: "The logo rarely changes, so a copy can live for an hour.",
        battle_kind: null,
        reason_index: null,
        reason_correct: null,
        hp_lost: null,
        skill_ids: null,
        constraint_variant: null,
      },
    ]);
  });

  it("refuse v2 turn fields out of range, and a Reason without whether it was right", async () => {
    const bad: Partial<BattleTurnEvent>[] = [
      { battleKind: "boss" as "battle" },
      { reasonIndex: 3, reasonCorrect: true },
      { reasonIndex: 1 },
      { reasonCorrect: true },
      { hpLost: 3 as 2 },
      { skillIds: [] },
      { skillIds: [0] },
      { skillIds: [27] },
      { skillIds: [3, 3] },
      { constraintVariant: "Main line" },
    ];
    for (const overrides of bad) {
      await expect(writeEvents(user.client, [turnEvent(overrides)]), JSON.stringify(overrides)).rejects.toThrow();
      expect(eventSchema.safeParse(turnEvent(overrides)).success, JSON.stringify(overrides)).toBe(false);
    }
  });

  it("let the endpoint schema accept the old shape and the v2 shape", () => {
    expect(eventSchema.safeParse(turnEvent()).success).toBe(true);
    const v2 = turnEvent({ whyText: undefined, battleKind: "battle", reasonIndex: 0, reasonCorrect: true, hpLost: 2, skillIds: [3], constraintVariant: "main" });
    expect(eventSchema.safeParse(v2).success).toBe(true);
    // A why that is given still needs words.
    expect(eventSchema.safeParse(turnEvent({ whyText: "  " })).success).toBe(false);
  });

  it("store the kind and the Faints at the end of a v2 battle, and leave them empty in the old shape", async () => {
    const v2 = battleEvent({ battleKind: "agent-diff", team: ["you"], result: "lost", faints: 1 });
    const old = battleEvent();
    await writeEvents(user.client, [v2, old]);
    const { data } = await user.client
      .from("battle_events")
      .select("client_event_id, battle_kind, faints")
      .in("client_event_id", [v2.clientEventId, old.clientEventId])
      .order("id");
    expect(data).toEqual([
      { client_event_id: v2.clientEventId, battle_kind: "agent-diff", faints: 1 },
      { client_event_id: old.clientEventId, battle_kind: null, faints: null },
    ]);
    await expect(writeEvents(user.client, [battleEvent({ faints: 4 })])).rejects.toThrow();
  });

  it("refuse a self-check event that the endpoint schema does not accept", () => {
    expect(eventSchema.safeParse(checkEvent({ tickedPoints: [2, 2] })).success).toBe(false);
    expect(eventSchema.safeParse(checkEvent({ tickedPoints: [0] })).success).toBe(false);
    expect(eventSchema.safeParse(checkEvent()).success).toBe(true);
  });
});
