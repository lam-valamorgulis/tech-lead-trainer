import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureProfile } from "@/lib/profile";
import { deleteUser, publicClient, signedInUser } from "./helpers";

describe("profiles row-level security", () => {
  let a: { id: string; client: SupabaseClient };
  let b: { id: string; client: SupabaseClient };

  beforeAll(async () => {
    a = await signedInUser("user-a");
    b = await signedInUser("user-b");
    const created = await a.client.from("profiles").insert({}).select().single();
    expect(created.error).toBeNull();
  });

  afterAll(async () => {
    await deleteUser(a.id);
    await deleteUser(b.id);
  });

  it("lets user A read their own profile", async () => {
    const { data, error } = await a.client.from("profiles").select("user_id");
    expect(error).toBeNull();
    expect(data).toEqual([{ user_id: a.id }]);
  });

  it("hides user A's profile from user B", async () => {
    const { data, error } = await b.client.from("profiles").select("user_id").eq("user_id", a.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("stops user B from creating a profile for user A", async () => {
    const { error } = await b.client.from("profiles").insert({ user_id: a.id });
    expect(error?.code).toBe("42501");
  });

  it("stops user B from changing or deleting user A's profile", async () => {
    const updated = await b.client.from("profiles").update({ sound_on: false }).eq("user_id", a.id).select();
    expect(updated.data).toEqual([]);
    const deleted = await b.client.from("profiles").delete().eq("user_id", a.id).select();
    expect(deleted.data).toEqual([]);

    const still = await a.client.from("profiles").select("sound_on").single();
    expect(still.data).toEqual({ sound_on: true });
  });
});

describe("first sign-in", () => {
  let user: { id: string; client: SupabaseClient };

  beforeAll(async () => {
    user = await signedInUser("first-sign-in");
  });

  afterAll(async () => {
    await deleteUser(user.id);
  });

  it("creates a profile with the design defaults and today as day 1", async () => {
    const profile = await ensureProfile(user.client);

    // Day 1 is today in Ho Chi Minh City, where a day starts at 04:00.
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const today = fourHoursAgo.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

    expect(profile).toEqual({
      homeTimeZone: "Asia/Ho_Chi_Minh",
      dayCutoffHour: 4,
      morningReminderTime: "07:30",
      eveningReminderTime: "20:00",
      plainFont: false,
      reduceEffects: false,
      soundOn: true,
      ifThenPlan: null,
      tiredDayPlan: null,
      programStartDate: today,
    });
  });

  it("keeps the same profile on the next sign-in", async () => {
    const first = await ensureProfile(user.client);
    await user.client.from("profiles").update({ sound_on: false }).eq("user_id", user.id);
    const second = await ensureProfile(user.client);
    expect(second).toEqual({ ...first, soundOn: false });
  });
});

describe("learning day in the database", () => {
  it("counts 00:30 in Ho Chi Minh City for the day before", async () => {
    const { data } = await publicClient().rpc("learning_day", {
      at: "2026-10-20T17:30:00Z",
      time_zone: "Asia/Ho_Chi_Minh",
      cutoff_hour: 4,
    });
    expect(data).toBe("2026-10-20");
  });

  it("starts the new day at 04:00", async () => {
    const { data } = await publicClient().rpc("learning_day", {
      at: "2026-10-20T21:00:00Z",
      time_zone: "Asia/Ho_Chi_Minh",
      cutoff_hour: 4,
    });
    expect(data).toBe("2026-10-21");
  });
});
