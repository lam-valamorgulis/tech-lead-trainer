import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureProfile } from "@/lib/profile";
import { forgetEmail, signedInUser, sql } from "./helpers";

type User = { id: string; email: string; client: SupabaseClient };

describe("profiles row-level security", () => {
  let a: User;
  let b: User;

  beforeAll(async () => {
    a = await signedInUser("user-a");
    b = await signedInUser("user-b");
    await ensureProfile(a.client);
  });

  afterAll(async () => {
    await forgetEmail(a.email);
    await forgetEmail(b.email);
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
  let user: User;

  beforeAll(async () => {
    user = await signedInUser("first-sign-in");
  });

  afterAll(async () => {
    await forgetEmail(user.email);
  });

  // Day 1 is today in Ho Chi Minh City, where a day starts at 04:00.
  const todayInHoChiMinh = () =>
    new Date(Date.now() - 4 * 60 * 60 * 1000).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

  it("creates a profile with the design defaults and today as day 1", async () => {
    const before = todayInHoChiMinh();
    const profile = await ensureProfile(user.client);
    const after = todayInHoChiMinh();

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
      programStartDate: expect.toBeOneOf([before, after]),
    });
  });

  it("keeps the same profile on the next sign-in", async () => {
    const first = await ensureProfile(user.client);
    await user.client.from("profiles").update({ sound_on: false }).eq("user_id", user.id);
    const second = await ensureProfile(user.client);
    expect(second).toEqual({ ...first, soundOn: false });
  });

  it("never lets the user choose or change day 1", async () => {
    const first = await ensureProfile(user.client);
    await user.client.from("profiles").update({ program_start_date: "2020-01-01" }).eq("user_id", user.id);
    expect((await ensureProfile(user.client)).programStartDate).toBe(first.programStartDate);
  });

  it("refuses a home time zone that does not exist", async () => {
    const { error } = await user.client.from("profiles").update({ home_time_zone: "Mars/Olympus" }).eq("user_id", user.id);
    expect(error?.code).toBe("23514");
  });
});

describe("a new profile that sends its own day 1", () => {
  it("still gets today as day 1", async () => {
    const user = await signedInUser("own-day-1");
    try {
      await user.client.from("profiles").insert({ program_start_date: "2020-01-01" });
      expect((await ensureProfile(user.client)).programStartDate).not.toBe("2020-01-01");
    } finally {
      await forgetEmail(user.email);
    }
  });
});

describe("learning day in the database", () => {
  const learningDay = async (at: string) =>
    (
      await sql<{ day: string }>("select private.learning_day($1, 'Asia/Ho_Chi_Minh', 4::smallint)::text as day", [at])
    )[0].day;

  it("counts 00:30 in Ho Chi Minh City for the day before", async () => {
    expect(await learningDay("2026-10-20T17:30:00Z")).toBe("2026-10-20");
  });

  it("starts the new day at 04:00", async () => {
    expect(await learningDay("2026-10-20T21:00:00Z")).toBe("2026-10-21");
  });
});
