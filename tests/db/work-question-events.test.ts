import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { writeEvents, type WorkQuestionEvent } from "@/lib/events/write-events";
import { ensureProfile } from "@/lib/profile";
import { loadWorkAnswer } from "@/lib/work-question-log";
import { forgetEmail, signedInUser } from "./helpers";

process.env.NEXT_PUBLIC_SUPABASE_URL = inject("supabaseUrl");
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = inject("supabasePublishableKey");
const { POST } = await import("@/app/api/events/route");
const { GET } = await import("@/app/api/export/route");

type User = { id: string; email: string; client: SupabaseClient };

function answer(overrides: Partial<WorkQuestionEvent> = {}): WorkQuestionEvent {
  return {
    type: "work-question",
    clientEventId: crypto.randomUUID(),
    sessionId: crypto.randomUUID(),
    // Monday 19 Oct, 12:00 in Ho Chi Minh City.
    occurredAt: "2026-10-19T05:00:00.000Z",
    weekStart: "2026-10-12",
    conceptId: "http-method",
    met: true,
    note: "A crawler followed a GET link that deleted rows.",
    ...overrides,
  };
}

async function tokenOf(user: User): Promise<string> {
  return (await user.client.auth.getSession()).data.session!.access_token;
}

describe("work question events", () => {
  let user: User;
  let other: User;

  beforeAll(async () => {
    user = await signedInUser("work-question");
    other = await signedInUser("work-question-other");
    await ensureProfile(user.client);
    await ensureProfile(other.client);
  });

  afterAll(async () => {
    await forgetEmail(user.email);
    await forgetEmail(other.email);
  });

  it("store the week, the concept, the answer and the note once", async () => {
    const event = answer();
    await writeEvents(user.client, [event, event]);
    const { data } = await user.client
      .from("work_question_events")
      .select("week_start, concept_id, met, note, learning_day")
      .eq("client_event_id", event.clientEventId);
    expect(data).toEqual([
      {
        week_start: "2026-10-12",
        concept_id: "http-method",
        met: true,
        note: "A crawler followed a GET link that deleted rows.",
        learning_day: "2026-10-19",
      },
    ]);
  });

  it("store 'Not this week' with no note", async () => {
    const event = answer({ weekStart: "2026-10-05", met: false, note: undefined });
    await writeEvents(user.client, [event]);
    expect(await loadWorkAnswer(user.client, "2026-10-05")).toEqual({ met: false, note: null });
  });

  it("show the latest answer of the week: the log keeps every answer", async () => {
    await writeEvents(user.client, [answer({ weekStart: "2026-09-28", met: false, note: undefined, occurredAt: "2026-10-05T05:00:00Z" })]);
    await writeEvents(user.client, [answer({ weekStart: "2026-09-28", note: "In a code review.", occurredAt: "2026-10-05T05:01:00Z" })]);
    expect(await loadWorkAnswer(user.client, "2026-09-28")).toEqual({ met: true, note: "In a code review." });
    expect(await loadWorkAnswer(user.client, "2026-09-21")).toBeNull();
  });

  it("refuse a note on 'Not this week', a blank note, and a week that does not start on Monday", async () => {
    await expect(writeEvents(user.client, [answer({ met: false })])).rejects.toThrow();
    await expect(writeEvents(user.client, [answer({ note: "   " })])).rejects.toThrow();
    await expect(writeEvents(user.client, [answer({ weekStart: "2026-10-13" })])).rejects.toThrow();
  });

  it("never change: the learner cannot edit or delete an answer", async () => {
    await user.client.from("work_question_events").update({ met: false }).eq("user_id", user.id);
    await user.client.from("work_question_events").delete().eq("user_id", user.id);
    const { data } = await user.client.from("work_question_events").select("met").eq("week_start", "2026-10-12");
    expect(data).toEqual([{ met: true }]);
  });

  it("are hidden from other learners", async () => {
    const { data } = await other.client.from("work_question_events").select("id");
    expect(data).toEqual([]);
    expect(await loadWorkAnswer(other.client, "2026-10-12")).toBeNull();
  });

  it("go through POST /api/events, which refuses a note on 'Not this week'", async () => {
    const token = await tokenOf(other);
    const good = answer({ weekStart: "2026-10-19", note: "  Our API review.  " });
    const sent = await POST(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ events: [good] }),
      }),
    );
    expect(sent.status).toBe(200);
    expect(await loadWorkAnswer(other.client, "2026-10-19")).toEqual({ met: true, note: "Our API review." });

    const refused = await POST(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ events: [answer({ met: false, note: "Not true." })] }),
      }),
    );
    expect(refused.status).toBe(400);
  });

  it("are in 'Download my data'", async () => {
    const response = await GET(new Request("http://localhost/api/export", { headers: { authorization: `Bearer ${await tokenOf(user)}` } }));
    expect(response.status).toBe(200);
    const file = await response.json();
    expect(file.events.work_question_events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ week_start: "2026-10-12", concept_id: "http-method", met: true }),
        expect.objectContaining({ week_start: "2026-10-05", met: false, note: null }),
      ]),
    );
    expect(file.events.work_question_events).toHaveLength(4);
  });
});
