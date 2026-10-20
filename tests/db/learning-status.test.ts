import { afterEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { writeEvents } from "@/lib/events/write-events";
import { loadLearningStatus } from "@/lib/learning-log";
import { ensureProfile } from "@/lib/profile";
import { forgetEmail, signedInUser } from "./helpers";

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

async function learnedAt(client: SupabaseClient, occurredAt: string, activeSeconds: number) {
  await writeEvents(client, [
    {
      type: "session",
      clientEventId: crypto.randomUUID(),
      sessionId: crypto.randomUUID(),
      occurredAt,
      committedMinutes: 3,
      activeSeconds,
      device: "test",
    },
  ]);
}

describe("loadLearningStatus", () => {
  const emails: string[] = [];

  async function learner(label: string): Promise<SupabaseClient> {
    const user = await signedInUser(label);
    emails.push(user.email);
    await ensureProfile(user.client);
    return user.client;
  }

  afterEach(async () => {
    await Promise.all(emails.splice(0).map(forgetEmail));
  });

  it("does not open the Rest Stop for a new learner with no learning yet", async () => {
    const client = await learner("status-new");
    expect(await loadLearningStatus(client)).toMatchObject({ rate: { learnedDays: 0, windowDays: 30 }, restStop: false });
  });

  it("does not open the Rest Stop the day after a learned day", async () => {
    const client = await learner("status-recent");
    await learnedAt(client, daysAgo(1), 200);
    expect(await loadLearningStatus(client)).toMatchObject({ rate: { learnedDays: 1, windowDays: 30 }, restStop: false });
  });

  it("opens the Rest Stop 4 days after the last learned day", async () => {
    const client = await learner("status-away");
    await learnedAt(client, daysAgo(4), 200);
    await learnedAt(client, daysAgo(1), 60);
    expect(await loadLearningStatus(client)).toMatchObject({ rate: { learnedDays: 1, windowDays: 30 }, restStop: true });
  });

  it("opens the Rest Stop when the last learned day is older than the 30-day window", async () => {
    const client = await learner("status-long-away");
    await learnedAt(client, daysAgo(45), 300);
    expect(await loadLearningStatus(client)).toMatchObject({ rate: { learnedDays: 0, windowDays: 30 }, restStop: true });
  });

  it("does not open the Rest Stop when old sessions never reached 3 minutes", async () => {
    const client = await learner("status-short");
    await learnedAt(client, daysAgo(45), 60);
    expect(await loadLearningStatus(client)).toMatchObject({ rate: { learnedDays: 0, windowDays: 30 }, restStop: false });
  });

  it("gives the minutes of this week, which a new learner starts at 0", async () => {
    const client = await learner("status-week");
    expect(await loadLearningStatus(client)).toMatchObject({ weekMinutes: 0 });
    // 10 minutes and 59 seconds right now: always this week. 45 days ago: never this week.
    await learnedAt(client, new Date().toISOString(), 659);
    await learnedAt(client, daysAgo(45), 3000);
    expect(await loadLearningStatus(client)).toMatchObject({ weekMinutes: 10 });
  });
});
