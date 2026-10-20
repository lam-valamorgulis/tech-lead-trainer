import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { writeEvents, type GymEvent } from "@/lib/events/write-events";
import { ensureProfile } from "@/lib/profile";
import { forgetEmail, signedInUser } from "./helpers";

function gymEvent(overrides: Partial<GymEvent> = {}): GymEvent {
  return {
    type: "gym",
    clientEventId: crypto.randomUUID(),
    sessionId: crypto.randomUUID(),
    occurredAt: "2026-10-18T17:30:00.000Z",
    gymId: crypto.randomUUID(),
    townId: "t01",
    battleIds: Array.from({ length: 5 }, () => crypto.randomUUID()),
    wins: 4,
    passed: true,
    ...overrides,
  };
}

describe("gym events", () => {
  let user: { id: string; email: string; client: SupabaseClient };

  beforeAll(async () => {
    user = await signedInUser("gym");
    await ensureProfile(user.client);
  });

  afterAll(async () => {
    await forgetEmail(user.email);
  });

  it("store a finished Gym once: the town, its battles, the wins and the badge", async () => {
    const gym = gymEvent();
    await writeEvents(user.client, [gym, gym]);
    const { data } = await user.client
      .from("gym_events")
      .select("gym_id, town_id, battle_ids, wins, passed, learning_day")
      .eq("client_event_id", gym.clientEventId);
    expect(data).toEqual([
      { gym_id: gym.gymId, town_id: "t01", battle_ids: gym.battleIds, wins: 4, passed: true, learning_day: "2026-10-18" },
    ]);
  });

  it("refuse a second end of the same Gym, for example from another device", async () => {
    const gym = gymEvent();
    await writeEvents(user.client, [gym]);
    await expect(writeEvents(user.client, [gymEvent({ gymId: gym.gymId })])).rejects.toThrow();
  });

  it("refuse a badge without 4 wins, and more battles than 5", async () => {
    await expect(writeEvents(user.client, [gymEvent({ wins: 3, passed: true })])).rejects.toThrow();
    const six = Array.from({ length: 6 }, () => crypto.randomUUID());
    await expect(writeEvents(user.client, [gymEvent({ battleIds: six })])).rejects.toThrow();
  });
});
