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
    await post(token, [reviewEvent("cache", daysAgo(1), "good", 7, 14)]);
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
