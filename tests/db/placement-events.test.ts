import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { writeEvents, type PlacementEvent } from "@/lib/events/write-events";
import { ensureProfile } from "@/lib/profile";
import { rebuildReviewState } from "@/lib/review-state";
import { adminClient, forgetEmail, signedInUser } from "./helpers";

process.env.NEXT_PUBLIC_SUPABASE_URL = inject("supabaseUrl");
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = inject("supabasePublishableKey");
const { POST } = await import("@/app/api/events/route");

function placementEvent(overrides: Partial<PlacementEvent> = {}): PlacementEvent {
  return {
    type: "placement",
    clientEventId: crypto.randomUUID(),
    sessionId: crypto.randomUUID(),
    occurredAt: "2026-10-18T02:00:00.000Z",
    townId: "t01",
    itemId: "cache",
    contentHash: "0123456789abcdef",
    answerText: "A copy of a response",
    correct: true,
    confidence: 2,
    ...overrides,
  };
}

describe("placement events", () => {
  let user: { id: string; email: string; client: SupabaseClient };

  beforeAll(async () => {
    user = await signedInUser("placement");
    await ensureProfile(user.client);
  });

  afterAll(async () => {
    await forgetEmail(user.email);
  });

  it("store the town, item, content hash, answer, correct or not, and confidence, once", async () => {
    const event = placementEvent();
    await writeEvents(user.client, [event, event]);

    const { data } = await user.client
      .from("placement_events")
      .select("town_id, item_id, content_hash, answer_text, correct, confidence, learning_day")
      .eq("client_event_id", event.clientEventId);
    expect(data).toEqual([
      {
        town_id: "t01",
        item_id: "cache",
        content_hash: "0123456789abcdef",
        answer_text: "A copy of a response",
        correct: true,
        confidence: 2,
        learning_day: "2026-10-18",
      },
    ]);
  });

});

describe("a right placement answer", () => {
  let user: { id: string; email: string; client: SupabaseClient };

  beforeAll(async () => {
    user = await signedInUser("placement-state");
    await ensureProfile(user.client);
  });

  afterAll(async () => {
    await forgetEmail(user.email);
  });

  it("catches the creature in the review state, and the rebuild agrees", async () => {
    const token = (await user.client.auth.getSession()).data.session!.access_token;
    const body = { events: [placementEvent({ itemId: "cookie" }), placementEvent({ itemId: "dns", correct: false })] };
    const response = await POST(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      }),
    );
    expect(response.status).toBe(200);

    const live = await user.client.from("review_state").select("item_id, step, caught_day, stage").order("item_id");
    // A wrong answer (dns) catches nothing.
    expect(live.data).toEqual([{ item_id: "cookie", step: 1, caught_day: "2026-10-18", stage: 1 }]);

    await rebuildReviewState(adminClient(), user.id);
    const rebuilt = await user.client.from("review_state").select("item_id, step, caught_day, stage").order("item_id");
    expect(rebuilt.data).toEqual(live.data);
  });
});
