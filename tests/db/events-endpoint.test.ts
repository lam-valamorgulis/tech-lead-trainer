import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureProfile } from "@/lib/profile";
import { forgetEmail, signedInUser } from "./helpers";

type User = { id: string; email: string; client: SupabaseClient };

// The route reads its Supabase settings from the environment, like on Vercel.
process.env.NEXT_PUBLIC_SUPABASE_URL = inject("supabaseUrl");
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = inject("supabasePublishableKey");
const { POST } = await import("@/app/api/events/route");

function request(body: unknown, token?: string) {
  return new Request("http://localhost/api/events", {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
}

describe("POST /api/events", () => {
  let user: User;
  let token: string;

  beforeAll(async () => {
    user = await signedInUser("endpoint");
    await ensureProfile(user.client);
    token = (await user.client.auth.getSession()).data.session!.access_token;
  });

  afterAll(async () => {
    await forgetEmail(user.email);
  });

  const batch = () => ({
    events: [
      {
        type: "session",
        clientEventId: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
        occurredAt: new Date().toISOString(),
        committedMinutes: 3,
        activeSeconds: 0,
        device: "test",
      },
    ],
  });

  it("writes a batch, and the same batch again gives no new rows", async () => {
    const body = batch();
    expect((await POST(request(body, token))).status).toBe(200);
    expect((await POST(request(body, token))).status).toBe(200);

    const { data } = await user.client
      .from("session_events")
      .select("id")
      .eq("client_event_id", body.events[0].clientEventId);
    expect(data).toHaveLength(1);
  });

  it("refuses a request without a signed-in user", async () => {
    expect((await POST(request(batch()))).status).toBe(401);
  });

  it("refuses an event that does not match the schema", async () => {
    const body = batch();
    body.events[0].committedMinutes = 20;
    const response = await POST(request(body, token));
    expect(response.status).toBe(400);
  });

  it("refuses a body that is not JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: "not json",
      }),
    );
    expect(response.status).toBe(400);
  });
});
