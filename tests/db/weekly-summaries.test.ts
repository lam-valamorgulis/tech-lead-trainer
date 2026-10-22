import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { latestSummaryWeek } from "@/core/week";
import { writeEvents, type BattleTurnEvent, type LearningEvent } from "@/lib/events/write-events";
import { ensureProfile } from "@/lib/profile";
import { createDueWeeklySummaries, ensureWeeklySummary } from "@/lib/weekly-summary";
import { adminClient, forgetEmail, signedInUser, sql } from "./helpers";

type User = { id: string; email: string; client: SupabaseClient };

// The week of Monday 5 Oct 2026 in Ho Chi Minh City (UTC+7, the default home time zone).
// Its summary is due on Sunday 11 Oct at 20:00 home time, which is 13:00 UTC.
const SUMMARY_AT = "2026-10-11T13:00:00.000Z";
// Monday 12 Oct, 12:00 home time: the summary of that week is the latest one due.
const MONDAY_AFTER = new Date("2026-10-12T05:00:00Z");

const base = (occurredAt: string) => ({ clientEventId: crypto.randomUUID(), sessionId: crypto.randomUUID(), occurredAt });

function session(sessionId: string, occurredAt: string, activeSeconds: number): LearningEvent {
  return { type: "session", ...base(occurredAt), sessionId, committedMinutes: 15, activeSeconds, device: "test" };
}

function review(itemId: string, grade: "again" | "hard" | "good" | "easy", occurredAt: string): LearningEvent {
  return {
    type: "review",
    ...base(occurredAt),
    itemId,
    itemKind: itemId.includes(".") ? "move" : "creature",
    contentHash: "0123456789abcdef",
    stepBefore: 1,
    stepAfter: 1,
    grade,
    plannedDueDay: "2026-10-05",
    shownAt: occurredAt,
    revealedAt: occurredAt,
    gradedAt: occurredAt,
    typedAnswer: null,
    confidence: null,
  };
}

function turn(bestMove: boolean, occurredAt: string): BattleTurnEvent {
  return {
    type: "battle-turn",
    ...base(occurredAt),
    battleId: crypto.randomUUID(),
    scenarioId: "t01-test",
    contentHash: "0123456789abcdef",
    turnNumber: 1,
    moveId: "http-method.safe",
    damage: 2,
    bestMove,
    whyText: "A GET must not change anything.",
  };
}

/** A v2 turn that showed its Constraint. Turn 1 of t01-crawler-deletes tests HTTP method (best move http-method.safe). */
function constraintTurn(bestMove: boolean, occurredAt: string, scenarioId = "t01-crawler-deletes"): LearningEvent {
  return { ...turn(bestMove, occurredAt), scenarioId, constraintVariant: "main", reasonIndex: 0, reasonCorrect: true };
}

/** An answered Decision Card or trade-off question (#109). */
function card(itemId: string, right: boolean, occurredAt: string): LearningEvent {
  return {
    type: "review-card",
    ...base(occurredAt),
    itemId,
    itemKind: itemId.includes(".trade-off.") ? "trade-off" : "decision",
    contentHash: "0123456789abcdef",
    choiceIndex: right ? 0 : 1,
    choiceCorrect: right,
    reasonIndex: 0,
    reasonCorrect: true,
    skillIds: [1],
    shownAt: occurredAt,
    gradedAt: occurredAt,
    rulesVersion: "v1.5",
  };
}

/** A week of learning, with some learning after Sunday 20:00 that the summary must leave out. */
async function learnTheWeek(client: SupabaseClient) {
  const monday = crypto.randomUUID();
  const sunday = crypto.randomUUID();
  await writeEvents(client, [
    // Monday 09:00 home time: 15 minutes.
    session(monday, "2026-10-05T02:00:00Z", 0),
    session(monday, "2026-10-05T02:15:00Z", 900),
    // Sunday 19:00 home time: 5 minutes before 20:00, then 35 more after it.
    session(sunday, "2026-10-11T12:00:00Z", 0),
    session(sunday, "2026-10-11T12:05:00Z", 300),
    session(sunday, "2026-10-11T13:30:00Z", 2400),
    // Sunday 21:00 home time: after the summary moment.
    session(crypto.randomUUID(), "2026-10-11T14:00:00Z", 1200),
    review("http-method", "again", "2026-10-06T02:00:00Z"),
    review("status-code.redirect", "again", "2026-10-07T02:00:00Z"),
    review("status-code", "hard", "2026-10-07T02:01:00Z"),
    review("client-server", "good", "2026-10-07T02:02:00Z"),
    review("client-server", "again", "2026-10-11T14:00:00Z"),
    turn(true, "2026-10-06T02:10:00Z"),
    turn(false, "2026-10-06T02:11:00Z"),
    turn(true, "2026-10-11T14:05:00Z"),
    // v1.5: 1 of 2 turns under a Constraint. The one after Sunday 20:00 does not count.
    constraintTurn(true, "2026-10-08T02:00:00Z"),
    constraintTurn(false, "2026-10-08T02:01:00Z"),
    constraintTurn(false, "2026-10-11T14:06:00Z"),
    // 1 of 2 Decision Cards. A trade-off question is not a Decision Card.
    card("status-code.decision.retry", false, "2026-10-07T03:00:00Z"),
    card("status-code.decision.cache", true, "2026-10-07T03:01:00Z"),
    card("http-method.trade-off.verbs", true, "2026-10-07T03:02:00Z"),
    // The week before (28 Sep to 4 Oct), counted up to its own Sunday 20:00 (4 Oct, 13:00 UTC).
    constraintTurn(true, "2026-09-30T02:00:00Z", "t01-account-errors"),
    constraintTurn(false, "2026-10-04T14:00:00Z", "t01-account-errors"),
    card("status-code.decision.retry", true, "2026-10-01T02:00:00Z"),
    card("status-code.decision.cache", false, "2026-10-04T14:00:00Z"),
  ]);
}

const EXPECTED = {
  weekStart: "2026-10-05",
  summaryAt: SUMMARY_AT,
  // Monday (15 min) and Sunday (5 min before 20:00).
  daysLearned: 2,
  minutes: 20,
  goalMinutes: 315,
  bestMoves: { bestMoves: 2, turns: 4 },
  // Status code: 1 Again (on its move) and 1 Hard. HTTP method: 1 Again.
  weakest: [
    { id: "status-code", name: "Status code" },
    { id: "http-method", name: "HTTP method" },
  ],
  picks: {
    constraintBestMoves: { thisWeek: { right: 1, total: 2 }, lastWeek: { right: 1, total: 1 } },
    decisionCards: { thisWeek: { right: 1, total: 2 }, lastWeek: { right: 1, total: 1 } },
    // HTTP method: 1 turn without the best move. Status code: 1 wrong Decision Card. A tie goes by id.
    // The v1 turn of "t01-test" is not in the content, so it names no concept.
    mostMissed: [
      { id: "http-method", name: "HTTP method" },
      { id: "status-code", name: "Status code" },
    ],
    workConcept: { id: "http-method", name: "HTTP method" },
  },
};

describe("weekly summaries", () => {
  const users: User[] = [];

  async function learner(label: string): Promise<User> {
    const user = await signedInUser(label);
    users.push(user);
    await ensureProfile(user.client);
    return user;
  }

  afterAll(async () => {
    await Promise.all(users.map((user) => forgetEmail(user.email)));
  });

  describe("for a learner with a week of learning", () => {
    let user: User;

    beforeAll(async () => {
      user = await learner("week-summary");
      await learnTheWeek(user.client);
    });

    it("counts only what happened before Sunday 20:00 home time", async () => {
      expect(await ensureWeeklySummary(adminClient(), user.id, MONDAY_AFTER)).toEqual(EXPECTED);
    });

    it("never changes its numbers once it is saved, even when late learning arrives", async () => {
      // A Wednesday session that reaches the server late, for example from the outbox.
      await writeEvents(user.client, [session(crypto.randomUUID(), "2026-10-07T02:00:00Z", 3000)]);
      expect(await ensureWeeklySummary(adminClient(), user.id, new Date("2026-10-15T05:00:00Z"))).toEqual(EXPECTED);
    });

    it("refuses any change to a saved summary, even with the secret key", async () => {
      const { error } = await adminClient().from("weekly_summaries").update({ minutes: 999 }).eq("user_id", user.id);
      expect(error?.message).toMatch(/never changes/);
      const v2 = await adminClient().from("weekly_summaries").update({ most_missed_concepts: [] }).eq("user_id", user.id);
      expect(v2.error?.message).toMatch(/never changes/);
      const rows = await sql<{ minutes: number }>("select minutes from public.weekly_summaries where user_id = $1", [user.id]);
      expect(rows).toEqual([{ minutes: 20 }]);
    });

    it("lets the learner read their own summary, and never write one", async () => {
      const { data } = await user.client.from("weekly_summaries").select("week_start, minutes");
      expect(data).toEqual([{ week_start: "2026-10-05", minutes: 20 }]);

      const row = { week_start: "2026-10-12", summary_at: SUMMARY_AT, days_learned: 7, minutes: 315, goal_minutes: 315, best_moves: 0, best_move_turns: 0, weakest_creatures: [] };
      expect((await user.client.from("weekly_summaries").insert(row)).error).not.toBeNull();
      await user.client.from("weekly_summaries").delete().eq("user_id", user.id);
      expect((await user.client.from("weekly_summaries").select("id")).data).toHaveLength(1);
    });

    it("is hidden from other learners", async () => {
      const other = await learner("week-summary-other");
      const { data } = await other.client.from("weekly_summaries").select("id");
      expect(data).toEqual([]);
    });
  });

  it("keeps a summary saved before v1.5 as it was shown: its new numbers stay empty", async () => {
    const user = await learner("week-summary-old");
    await learnTheWeek(user.client);
    const old = await adminClient().from("weekly_summaries").insert({
      user_id: user.id,
      week_start: "2026-10-05",
      summary_at: SUMMARY_AT,
      days_learned: 1,
      minutes: 5,
      goal_minutes: 315,
      best_moves: 0,
      best_move_turns: 0,
      weakest_creatures: [],
    });
    expect(old.error).toBeNull();
    expect(await ensureWeeklySummary(adminClient(), user.id, MONDAY_AFTER)).toEqual({
      weekStart: "2026-10-05",
      summaryAt: SUMMARY_AT,
      daysLearned: 1,
      minutes: 5,
      goalMinutes: 315,
      bestMoves: { bestMoves: 0, turns: 0 },
      weakest: [],
      picks: null,
    });
  });

  it("refuses a summary with only some of the v1.5 numbers", async () => {
    const user = await learner("week-summary-half");
    const { error } = await adminClient().from("weekly_summaries").insert({
      user_id: user.id,
      week_start: "2026-10-05",
      summary_at: SUMMARY_AT,
      days_learned: 1,
      minutes: 5,
      goal_minutes: 315,
      best_moves: 0,
      best_move_turns: 0,
      weakest_creatures: [],
      constraint_best_moves: 1,
      constraint_turns: 2,
    });
    expect(error?.message).toMatch(/weekly_summaries_v2_shape/);
  });

  it("saves one summary when two runs happen at the same moment", async () => {
    const user = await learner("week-summary-race");
    await learnTheWeek(user.client);
    const runs = await Promise.all([
      ensureWeeklySummary(adminClient(), user.id, MONDAY_AFTER),
      ensureWeeklySummary(adminClient(), user.id, MONDAY_AFTER),
      ensureWeeklySummary(adminClient(), user.id, MONDAY_AFTER),
    ]);
    expect(runs).toEqual([EXPECTED, EXPECTED, EXPECTED]);
    const rows = await sql("select id from public.weekly_summaries where user_id = $1", [user.id]);
    expect(rows).toHaveLength(1);
  });

  it("saves nothing for a week with no learning at all", async () => {
    const user = await learner("week-summary-empty");
    expect(await ensureWeeklySummary(adminClient(), user.id, MONDAY_AFTER)).toBeNull();
    const rows = await sql("select id from public.weekly_summaries where user_id = $1", [user.id]);
    expect(rows).toEqual([]);
  });

  it("is made for every learner by one timer run", async () => {
    const a = await learner("week-summary-timer-a");
    const b = await learner("week-summary-timer-b");
    await learnTheWeek(a.client);
    await learnTheWeek(b.client);
    const created = await createDueWeeklySummaries(adminClient(), MONDAY_AFTER);
    expect(created).toBeGreaterThanOrEqual(2);
    const rows = await sql<{ user_id: string }>(
      "select user_id from public.weekly_summaries where user_id = any($1::uuid[]) order by user_id",
      [[a.id, b.id]],
    );
    expect(rows.map((row) => row.user_id)).toEqual([a.id, b.id].sort());
    // A second run finds nothing new for them.
    await createDueWeeklySummaries(adminClient(), MONDAY_AFTER);
    expect(await sql("select id from public.weekly_summaries where user_id = any($1::uuid[])", [[a.id, b.id]])).toHaveLength(2);
  });
});

describe("POST /api/weekly-summary", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = inject("supabaseUrl");
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = inject("supabasePublishableKey");
  process.env.SUPABASE_SECRET_KEY = inject("supabaseSecretKey");
  let user: User;

  beforeAll(async () => {
    user = await signedInUser("week-summary-route");
    await ensureProfile(user.client);
  });

  afterAll(async () => {
    await forgetEmail(user.email);
  });

  async function call(authorization?: string) {
    const { POST } = await import("@/app/api/weekly-summary/route");
    return POST(new Request("http://localhost/api/weekly-summary", { method: "POST", headers: authorization ? { authorization } : {} }));
  }

  it("needs a signed-in learner", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer not-a-token")).status).toBe(401);
  });

  it("answers with no summary when the last week had no learning", async () => {
    const { data } = await user.client.auth.getSession();
    const response = await call(`Bearer ${data.session!.access_token}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ summary: null });
  });

  it("makes the summary of the last finished week when the learner opens the app", async () => {
    // Monday 09:00 home time of the latest week whose Sunday 20:00 has passed, whenever this runs.
    const { weekStart, summaryAt } = latestSummaryWeek(new Date(), "Asia/Ho_Chi_Minh");
    const sessionId = crypto.randomUUID();
    const at = (minutes: number) => new Date(Date.parse(`${weekStart}T02:00:00Z`) + minutes * 60_000).toISOString();
    await writeEvents(user.client, [session(sessionId, at(0), 0), session(sessionId, at(4), 240)]);

    const { data } = await user.client.auth.getSession();
    const response = await call(`Bearer ${data.session!.access_token}`);
    expect(await response.json()).toEqual({
      summary: {
        weekStart,
        summaryAt: summaryAt.toISOString(),
        daysLearned: 1,
        minutes: 4,
        goalMinutes: 315,
        bestMoves: { bestMoves: 0, turns: 0 },
        weakest: [],
        picks: {
          constraintBestMoves: { thisWeek: { right: 0, total: 0 }, lastWeek: { right: 0, total: 0 } },
          decisionCards: { thisWeek: { right: 0, total: 0 }, lastWeek: { right: 0, total: 0 } },
          mostMissed: [],
          workConcept: null,
        },
      },
    });
  });
});
