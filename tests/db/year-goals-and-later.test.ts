import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addLaterGoal, LATER_GOAL_MAX_LENGTH, loadLaterGoals, removeLaterGoal } from "@/lib/later-list";
import { loadCheckedYearGoals, saveYearGoal } from "@/lib/year-goals";
import { forgetEmail, signedInUser } from "./helpers";

type User = { id: string; email: string; client: SupabaseClient };

describe("year goals checked by hand", () => {
  let a: User;
  let b: User;

  beforeAll(async () => {
    a = await signedInUser("goals-a");
    b = await signedInUser("goals-b");
  });

  afterAll(async () => {
    await forgetEmail(a.email);
    await forgetEmail(b.email);
  });

  it("start unchecked, and keep a tick and an untick per user", async () => {
    expect(await loadCheckedYearGoals(a.client)).toEqual([]);
    await saveYearGoal(a.client, "interview-tower", true);
    await saveYearGoal(a.client, "champion-project", true);
    await saveYearGoal(a.client, "champion-project", false);
    expect(await loadCheckedYearGoals(a.client)).toEqual(["interview-tower"]);
    // Ticking twice is harmless: one row per goal.
    await saveYearGoal(a.client, "interview-tower", true);
    expect(await loadCheckedYearGoals(a.client)).toEqual(["interview-tower"]);
  });

  it("are hidden from other users, who cannot change them", async () => {
    await saveYearGoal(a.client, "interview-tower", true);
    expect(await loadCheckedYearGoals(b.client)).toEqual([]);
    const changed = await b.client.from("year_goals").update({ checked: false }).eq("user_id", a.id).select();
    expect(changed.data).toEqual([]);
    expect(await loadCheckedYearGoals(a.client)).toEqual(["interview-tower"]);
  });

  it("refuse a goal that does not exist, and the 12 badges goal, which only the app checks", async () => {
    await expect(saveYearGoal(a.client, "twelve-badges" as "interview-tower", true)).rejects.toThrow();
    await expect(saveYearGoal(a.client, "learn-rust" as "interview-tower", true)).rejects.toThrow();
  });

  it("cannot be deleted by the learner: an untick is kept as unchecked", async () => {
    const deleted = await a.client.from("year_goals").delete().eq("goal", "interview-tower");
    expect(deleted.error?.code).toBe("42501");
  });
});

describe("the Later list", () => {
  let a: User;
  let b: User;

  beforeAll(async () => {
    a = await signedInUser("later-a");
    b = await signedInUser("later-b");
  });

  afterAll(async () => {
    await forgetEmail(a.email);
    await forgetEmail(b.email);
  });

  it("adds goals in order and removes one, per user", async () => {
    const rust = await addLaterGoal(a.client, "  Learn Rust  ");
    const k8s = await addLaterGoal(a.client, "Kubernetes course");
    expect((await loadLaterGoals(a.client)).map((goal) => goal.text)).toEqual(["Learn Rust", "Kubernetes course"]);
    expect(rust.text).toBe("Learn Rust");

    await removeLaterGoal(a.client, rust.id);
    expect(await loadLaterGoals(a.client)).toEqual([k8s]);
    expect(await loadLaterGoals(b.client)).toEqual([]);
  });

  it("cannot be read or removed by another user", async () => {
    const goal = await addLaterGoal(a.client, "Write a blog");
    const read = await b.client.from("later_goals").select("id").eq("id", goal.id);
    expect(read.data).toEqual([]);
    await removeLaterGoal(b.client, goal.id);
    expect((await loadLaterGoals(a.client)).map((g) => g.id)).toContain(goal.id);
  });

  it("refuses an empty goal and one that is too long", async () => {
    await expect(addLaterGoal(a.client, "   ")).rejects.toThrow();
    await expect(addLaterGoal(a.client, "x".repeat(LATER_GOAL_MAX_LENGTH + 1))).rejects.toThrow();
    await addLaterGoal(a.client, "x".repeat(LATER_GOAL_MAX_LENGTH));
  });

  it("keeps a removed goal's text: the learner cannot edit it or delete the row", async () => {
    const goal = await addLaterGoal(a.client, "Learn Go");
    const edited = await a.client.from("later_goals").update({ text: "Learn Zig" }).eq("id", goal.id);
    expect(edited.error?.code).toBe("42501");
    const deleted = await a.client.from("later_goals").delete().eq("id", goal.id);
    expect(deleted.error?.code).toBe("42501");
  });
});
