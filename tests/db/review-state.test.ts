import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureProfile } from "@/lib/profile";
import { rebuildReviewState, refreshReviewState } from "@/lib/review-state";
import { adminClient, forgetEmail, signedInUser } from "./helpers";

process.env.NEXT_PUBLIC_SUPABASE_URL = inject("supabaseUrl");
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = inject("supabasePublishableKey");
const { POST } = await import("@/app/api/events/route");

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
const sessionId = crypto.randomUUID();

const catchEvent = (itemId: string, at: string, correct = true) => ({
  type: "catch",
  clientEventId: crypto.randomUUID(),
  sessionId,
  occurredAt: at,
  itemId,
  itemKind: "creature",
  contentHash: "0123456789abcdef",
  answerText: "an answer",
  correct,
  confidence: 2,
  phase: "before-card",
});

const reviewEvent = (itemId: string, at: string, grade: string, stepBefore: number, stepAfter: number) => ({
  type: "review",
  clientEventId: crypto.randomUUID(),
  sessionId,
  occurredAt: at,
  itemId,
  itemKind: "creature",
  contentHash: "0123456789abcdef",
  stepBefore,
  stepAfter,
  grade,
  plannedDueDay: at.slice(0, 10),
  shownAt: at,
  revealedAt: at,
  gradedAt: at,
  typedAnswer: null,
  confidence: null,
});

async function post(token: string, events: unknown[]) {
  const response = await POST(
    new Request("http://localhost/api/events", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ events }),
    }),
  );
  expect(response.status).toBe(200);
}

async function stateOf(client: SupabaseClient) {
  const { data, error } = await client
    .from("review_state")
    .select("item_id, step, due_day, caught_day, stage")
    .order("item_id");
  expect(error).toBeNull();
  return data;
}

describe("the review state cache", () => {
  let user: { id: string; email: string; client: SupabaseClient };
  let token: string;

  beforeAll(async () => {
    user = await signedInUser("state");
    await ensureProfile(user.client);
    token = (await user.client.auth.getSession()).data.session!.access_token;
  });

  afterAll(async () => {
    await forgetEmail(user.email);
  });

  it("is kept up to date by the event endpoint, and a rebuild from the log gives the same state", async () => {
    const goodReview = reviewEvent("cache", daysAgo(9), "good", 1, 3);
    await post(token, [catchEvent("cache", daysAgo(10)), catchEvent("cookie", daysAgo(10), false)]);
    await post(token, [goodReview, goodReview]);
    await post(token, [catchEvent("cookie", daysAgo(8))]);
    // Sent late, after a newer review: it was made offline.
    await post(token, [reviewEvent("cookie", daysAgo(5), "again", 1, 1)]);
    await post(token, [reviewEvent("cookie", daysAgo(7), "good", 1, 3)]);
    await post(token, [reviewEvent("cache", daysAgo(6), "good", 3, 7)]);

    const live = await stateOf(user.client);
    expect(live!.map((row) => [row.item_id, row.step, row.stage])).toEqual([
      ["cache", 7, 1],
      // Replayed in time order: Good on day -7 (1 → 3), then Again on day -5 (3 → 1).
      ["cookie", 1, 1],
    ]);

    await rebuildReviewState(adminClient(), user.id);
    expect(await stateOf(user.client)).toEqual(live);
  });

  it("rebuilds a state that was lost or changed", async () => {
    const before = await stateOf(user.client);
    await adminClient().from("review_state").delete().eq("user_id", user.id).eq("item_id", "cache");
    await adminClient().from("review_state").update({ stage: 3 }).eq("user_id", user.id).eq("item_id", "cookie");

    await rebuildReviewState(adminClient(), user.id);
    expect(await stateOf(user.client)).toEqual(before);
  });

  it("is rebuilt for every user by `npm run rebuild:review-state`", async () => {
    const before = await stateOf(user.client);
    await adminClient().from("review_state").delete().eq("user_id", user.id);

    const output = execFileSync("node", ["scripts/rebuild-review-state.mjs"], { encoding: "utf8" });

    expect(output).toMatch(/review_state: rebuilt \d+ row\(s\) for \d+ user\(s\)/);
    expect(await stateOf(user.client)).toEqual(before);
  });

  it("never lets an older result overwrite a newer one", async () => {
    // Two devices save at the same time. Device A read the log before device B's review was saved.
    const before = await stateOf(user.client);
    const { data: stale } = await user.client.from("review_state").select("*").eq("item_id", "cache").single();
    // cache is due tomorrow, so this is an early review. An early Again still changes the state.
    await post(token, [reviewEvent("cache", daysAgo(1), "again", 7, 3)]);
    const newer = await stateOf(user.client);
    expect(newer).not.toEqual(before);

    const { error } = await user.client.rpc("save_review_state", { states: [stale] });
    expect(error).toBeNull();
    expect(await stateOf(user.client)).toEqual(newer);

    // A normal refresh still works.
    await refreshReviewState(user.client, user.id, ["cache"]);
    expect(await stateOf(user.client)).toEqual(newer);
  });
});

describe("the review state cache after a battle", () => {
  let user: { id: string; email: string; client: SupabaseClient };
  let token: string;
  const battleId = crypto.randomUUID();
  const battle = { sessionId, battleId, scenarioId: "t99-sale-day", contentHash: "0123456789abcdef" };

  beforeAll(async () => {
    user = await signedInUser("state-battle");
    await ensureProfile(user.client);
    token = (await user.client.auth.getSession()).data.session!.access_token;
  });

  afterAll(async () => {
    await forgetEmail(user.email);
  });

  it("brings back a used move of a lost battle and an unticked best move tomorrow, and a rebuild agrees", async () => {
    // Both moves reach the 14-day step 9 days ago, so they are due in 5 days.
    for (const itemId of ["cache.ttl", "proxy.cdn"]) {
      await post(token, [catchEvent(itemId, daysAgo(20))]);
      await post(token, [
        reviewEvent(itemId, daysAgo(19), "good", 1, 3),
        reviewEvent(itemId, daysAgo(16), "good", 3, 7),
        reviewEvent(itemId, daysAgo(9), "good", 7, 14),
      ]);
    }
    const { data: today } = await user.client.rpc("current_learning_day");
    const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const steps = async () => (await stateOf(user.client))!.map((row) => [row.item_id, row.step, row.due_day]);
    const before = await steps();
    expect(before.every(([, step, due]) => step === 14 && due !== tomorrow)).toBe(true);

    const now = new Date().toISOString();
    const event = { clientEventId: crypto.randomUUID(), occurredAt: now, ...battle };
    await post(token, [
      { type: "battle-turn", ...event, turnNumber: 1, moveId: "cache.ttl", damage: 0, bestMove: false, whyText: "Old copies are fine." },
    ]);
    // Ticks of all 3 points change nothing.
    await post(token, [
      { type: "battle-check", ...event, clientEventId: crypto.randomUUID(), turnNumber: 1, bestMoveId: "proxy.cdn", tickedPoints: [1, 2, 3] },
    ]);
    expect(await steps()).toEqual(before);

    // The end of the battle arrives in its own request, after the turn.
    await post(token, [
      { type: "battle", ...event, clientEventId: crypto.randomUUID(), team: ["cache", "proxy"], result: "lost", turnsUsed: 3 },
    ]);
    expect(await steps()).toEqual([
      ["cache.ttl", 14, tomorrow],
      ["proxy.cdn", 14, before[1][2]],
    ]);

    await post(token, [
      { type: "battle-check", ...event, clientEventId: crypto.randomUUID(), turnNumber: 2, bestMoveId: "proxy.cdn", tickedPoints: [2] },
    ]);
    const live = await stateOf(user.client);
    expect(live!.map((row) => [row.item_id, row.step, row.due_day])).toEqual([
      ["cache.ttl", 14, tomorrow],
      ["proxy.cdn", 14, tomorrow],
    ]);

    await rebuildReviewState(adminClient(), user.id);
    expect(await stateOf(user.client)).toEqual(live);
  });
});

describe("the review state cache after a v2 battle (#102)", () => {
  type User = { id: string; email: string; client: SupabaseClient; token: string };
  let old: User;
  let v2: User;

  async function learner(label: string): Promise<User> {
    const user = await signedInUser(label);
    await ensureProfile(user.client);
    return { ...user, token: (await user.client.auth.getSession()).data.session!.access_token };
  }

  /** The same caught moves and the same lost battle. Only the shape of the battle events differs. */
  async function playLostBattle(user: User, v2Fields: Record<string, unknown> | null) {
    const caughtAt = daysAgo(3);
    await post(user.token, ["cache.ttl", "proxy.cdn"].map((itemId) => catchEvent(itemId, caughtAt)));
    const battle = { sessionId, battleId: crypto.randomUUID(), scenarioId: "t99-sale-day", contentHash: "0123456789abcdef" };
    const now = new Date().toISOString();
    const turn = (turnNumber: number, moveId: string) => ({
      type: "battle-turn",
      clientEventId: crypto.randomUUID(),
      occurredAt: now,
      ...battle,
      turnNumber,
      moveId,
      damage: 0,
      bestMove: false,
      ...(v2Fields ?? { whyText: "Old copies are fine." }),
    });
    await post(user.token, [
      turn(1, "cache.ttl"),
      turn(2, "proxy.cdn"),
      turn(3, "cache.ttl"),
      {
        type: "battle",
        clientEventId: crypto.randomUUID(),
        occurredAt: now,
        ...battle,
        team: ["cache", "proxy"],
        result: "lost",
        turnsUsed: 3,
        ...(v2Fields ? { battleKind: "battle", faints: 1 } : {}),
      },
    ]);
  }

  beforeAll(async () => {
    old = await learner("state-v1-shape");
    v2 = await learner("state-v2-shape");
    await playLostBattle(old, null);
    await playLostBattle(v2, { battleKind: "battle", moveDamage: 0, reasonIndex: 1, reasonCorrect: false, hpLost: 2, skillIds: [3], constraintVariant: "main" });
  });

  afterAll(async () => {
    await forgetEmail(old.email);
    await forgetEmail(v2.email);
  });

  it("brings back the same moves from a v2 battle as from an old one, and a rebuild gives the same rows", async () => {
    const fromOld = await stateOf(old.client);
    expect(fromOld!.map((row) => row.item_id)).toEqual(["cache.ttl", "proxy.cdn"]);
    expect(await stateOf(v2.client)).toEqual(fromOld);

    for (const user of [old, v2]) {
      const live = await stateOf(user.client);
      await rebuildReviewState(adminClient(), user.id);
      expect(await stateOf(user.client)).toEqual(live);
    }
  });
});

describe("the review state cache with Decision Cards and the Stage 3 trade-off question (#109)", () => {
  type User = { id: string; email: string; client: SupabaseClient; token: string };
  let v15: User;
  let old: User;
  let cards: User;

  async function learner(label: string): Promise<User> {
    const user = await signedInUser(label);
    await ensureProfile(user.client);
    return { ...user, token: (await user.client.auth.getSession()).data.session!.access_token };
  }

  /** Cache caught 60 days ago, then Good on time 5 times: 1 → 3 → 7 → 14 → 30 → 90. */
  async function passThirty(user: User, rules: Record<string, unknown>) {
    await post(user.token, [catchEvent("cache", daysAgo(60))]);
    const steps = [
      [59, 1, 3],
      [56, 3, 7],
      [49, 7, 14],
      [35, 14, 30],
      [5, 30, 90],
    ];
    for (const [ago, before, after] of steps) {
      await post(user.token, [{ ...reviewEvent("cache", daysAgo(ago), "good", before, after), ...rules }]);
    }
  }

  const card = (itemId: string, at: string, right: boolean) => ({
    type: "review-card",
    clientEventId: crypto.randomUUID(),
    sessionId,
    occurredAt: at,
    itemId,
    itemKind: itemId.includes(".trade-off.") ? "trade-off" : "decision",
    contentHash: "fedcba9876543210",
    choiceIndex: right ? 1 : 0,
    choiceCorrect: right,
    reasonIndex: 0,
    reasonCorrect: true,
    skillIds: [3],
    shownAt: at,
    gradedAt: at,
    rulesVersion: "v1.5",
  });

  const rowOf = async (user: User, itemId: string) => (await stateOf(user.client))!.find((row) => row.item_id === itemId);

  beforeAll(async () => {
    v15 = await learner("state-stage-3");
    old = await learner("state-old-stage-3");
    cards = await learner("state-decision");
    await passThirty(v15, { rulesVersion: "v1.5" });
    await passThirty(old, {});
  });

  afterAll(async () => {
    for (const user of [v15, old, cards]) await forgetEmail(user.email);
  });

  it("keeps Stage 2 past the 30-day step until a right trade-off answer, and a rebuild agrees", async () => {
    expect(await rowOf(v15, "cache")).toMatchObject({ step: 90, stage: 2 });
    await post(v15.token, [card("cache.trade-off.fresh-prices", daysAgo(5), false)]);
    expect(await rowOf(v15, "cache")).toMatchObject({ step: 90, stage: 2 });
    await post(v15.token, [card("cache.trade-off.fresh-prices", daysAgo(0), true)]);
    expect(await rowOf(v15, "cache")).toMatchObject({ step: 90, stage: 3 });

    const live = await stateOf(v15.client);
    await rebuildReviewState(adminClient(), v15.id);
    expect(await stateOf(v15.client)).toEqual(live);
  });

  it("keeps Stage 3 reached before v1.5 when the old rows are rebuilt", async () => {
    expect(await rowOf(old, "cache")).toMatchObject({ step: 90, stage: 3 });
    await adminClient().from("review_state").delete().eq("user_id", old.id);
    await rebuildReviewState(adminClient(), old.id);
    expect(await rowOf(old, "cache")).toMatchObject({ step: 90, stage: 3 });
  });

  it("brings a creature back tomorrow after a wrong Decision Card, keeps it after a right one, and a rebuild agrees", async () => {
    // Cookie: caught 3 days ago, then Easy 2 days ago: 1 → 7, due in 5 days.
    await post(cards.token, [catchEvent("cookie", daysAgo(3)), reviewEvent("cookie", daysAgo(2), "easy", 1, 7)]);
    const before = await rowOf(cards, "cookie");
    await post(cards.token, [card("cookie.decision.samesite-widget", daysAgo(0), true)]);
    expect(await rowOf(cards, "cookie")).toEqual(before);

    await post(cards.token, [card("cookie.decision.samesite-widget", daysAgo(0), false)]);
    const after = await rowOf(cards, "cookie");
    const days = (Date.parse(before!.due_day) - Date.parse(after!.due_day)) / (24 * 60 * 60 * 1000);
    // Due tomorrow instead of in 5 days, on the same step.
    expect({ step: after!.step, days }).toEqual({ step: 7, days: 4 });

    const live = await stateOf(cards.client);
    await rebuildReviewState(adminClient(), cards.id);
    expect(await stateOf(cards.client)).toEqual(live);
  });
});
