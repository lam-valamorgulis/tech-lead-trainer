import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EVENT_TABLES, writeEvents } from "@/lib/events/write-events";
import { ensureProfile } from "@/lib/profile";
import { forgetEmail, signedInUser } from "./helpers";
import { saveDesignDoc } from "@/lib/weekend-doc";

process.env.NEXT_PUBLIC_SUPABASE_URL = inject("supabaseUrl");
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = inject("supabasePublishableKey");
const { GET } = await import("@/app/api/export/route");

type User = { id: string; email: string; client: SupabaseClient };

async function exportOf(user: User) {
  const token = (await user.client.auth.getSession()).data.session!.access_token;
  const response = await GET(new Request("http://localhost/api/export", { headers: { authorization: `Bearer ${token}` } }));
  expect(response.status).toBe(200);
  expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="tech-lead-trainer-\d{4}-\d{2}-\d{2}\.json"$/);
  return response.json();
}

describe("GET /api/export", () => {
  let a: User;
  let b: User;

  beforeAll(async () => {
    a = await signedInUser("export-a");
    b = await signedInUser("export-b");
    await ensureProfile(a.client);
    await ensureProfile(b.client);
    const sessionId = crypto.randomUUID();
    await writeEvents(a.client, [
      {
        type: "session",
        clientEventId: crypto.randomUUID(),
        sessionId,
        occurredAt: new Date().toISOString(),
        committedMinutes: 3,
        activeSeconds: 200,
        device: "test",
      },
      {
        type: "catch",
        clientEventId: crypto.randomUUID(),
        sessionId,
        occurredAt: new Date().toISOString(),
        itemId: "cache",
        itemKind: "creature",
        contentHash: "0123456789abcdef",
        answerText: "To load it faster next time",
        correct: true,
        confidence: 3,
        phase: "before-card",
      },
    ]);
  });

  afterAll(async () => {
    await forgetEmail(a.email);
    await forgetEmail(b.email);
  });

  it("holds every event table, the profile, a schema version, the export time and days learned in 30", async () => {
    await saveDesignDoc(a.client, "t01-boss", { problem: "Slow page.", options: "", decision: "", tradeOffs: "", risks: "", diagram: "graph TD" });
    const file = await exportOf(a);

    expect(file.schemaVersion).toBe(1);
    expect(file.userId).toBe(a.id);
    expect(file.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Date.now() - Date.parse(file.exportedAt)).toBeLessThan(60_000);
    expect(file.profile).toMatchObject({ home_time_zone: "Asia/Ho_Chi_Minh", day_cutoff_hour: 4 });
    expect(Object.keys(file.events).sort()).toEqual([...EVENT_TABLES].sort());
    expect(file.events.session_events).toHaveLength(1);
    expect(file.events.catch_events).toMatchObject([{ item_id: "cache", correct: true }]);
    expect(file.daysLearnedLast30).toMatchObject({ learnedDays: 1, windowDays: 30, ruleSeconds: 180 });
    // The learner's own weekend writing goes with the learning log.
    expect(file.weekendDocuments).toMatchObject([{ document_key: "t01-boss", sections: { problem: "Slow page." } }]);
  });

  it("holds only the signed-in user's rows", async () => {
    const file = await exportOf(b);

    for (const rows of Object.values(file.events) as unknown[][]) expect(rows).toEqual([]);
    expect(file.weekendDocuments).toEqual([]);
    expect(file.profile.user_id).toBe(b.id);
    expect(file.userId).toBe(b.id);
    expect(JSON.stringify(file)).not.toContain(a.id);
    expect(file.daysLearnedLast30.learnedDays).toBe(0);
  });

  it("refuses a request without a signed-in user", async () => {
    expect((await GET(new Request("http://localhost/api/export"))).status).toBe(401);
  });
});
