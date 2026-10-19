import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { learningDay } from "@/core/day";
import { writeEvents, type SessionEvent } from "@/lib/events/write-events";
import { ensureProfile } from "@/lib/profile";
import { forgetEmail, signedInUser, sql } from "./helpers";

type User = { id: string; email: string; client: SupabaseClient };

function sessionEvent(overrides: Partial<SessionEvent> = {}): SessionEvent {
  return {
    type: "session",
    clientEventId: crypto.randomUUID(),
    sessionId: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    committedMinutes: 15,
    activeSeconds: 0,
    device: "test",
    ...overrides,
  };
}

describe("writeEvents", () => {
  let a: User;
  let b: User;

  beforeAll(async () => {
    a = await signedInUser("events-a");
    b = await signedInUser("events-b");
    await ensureProfile(a.client);
    await ensureProfile(b.client);
  });

  afterAll(async () => {
    await forgetEmail(a.email);
    await forgetEmail(b.email);
  });

  it("writes the same client event id only once, so a double tap is harmless", async () => {
    const event = sessionEvent();
    await writeEvents(a.client, [event]);
    await writeEvents(a.client, [event, event]);

    const { data } = await a.client.from("session_events").select("client_event_id").eq("client_event_id", event.clientEventId);
    expect(data).toHaveLength(1);
  });

  it("stores the session fields and sets the learning day on the server", async () => {
    // 00:30 on 19 Oct in Ho Chi Minh City counts for 18 Oct.
    const event = sessionEvent({ occurredAt: "2026-10-18T17:30:00.000Z", committedMinutes: 3, activeSeconds: 60 });
    await writeEvents(a.client, [event]);

    const { data } = await a.client
      .from("session_events")
      .select("session_id, occurred_at, learning_day, committed_minutes, active_seconds, device")
      .eq("client_event_id", event.clientEventId)
      .single();
    expect(data).toEqual({
      session_id: event.sessionId,
      occurred_at: "2026-10-18T17:30:00+00:00",
      learning_day: "2026-10-18",
      committed_minutes: 3,
      active_seconds: 60,
      device: "test",
    });
  });

  it("ignores a learning day sent by the app", async () => {
    const event = sessionEvent({ occurredAt: "2026-10-18T17:30:00.000Z" });
    await a.client.from("session_events").insert({
      client_event_id: event.clientEventId,
      session_id: event.sessionId,
      occurred_at: event.occurredAt,
      learning_day: "2020-01-01",
      committed_minutes: 15,
      active_seconds: 0,
      device: "test",
    });
    const { data } = await a.client.from("session_events").select("learning_day").eq("client_event_id", event.clientEventId).single();
    expect(data).toEqual({ learning_day: "2026-10-18" });
  });

  it("refuses a time far in the future", async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await expect(writeEvents(a.client, [sessionEvent({ occurredAt: future })])).rejects.toThrow();
  });

  it("refuses committed minutes other than 3, 15 or 45", async () => {
    await expect(writeEvents(a.client, [sessionEvent({ committedMinutes: 20 as 15 })])).rejects.toThrow();
  });

  it("never lets anyone change or delete an event", async () => {
    const event = sessionEvent();
    await writeEvents(a.client, [event]);
    const updated = await a.client.from("session_events").update({ active_seconds: 999 }).eq("client_event_id", event.clientEventId);
    expect(updated.error?.code).toBe("42501");
    const deleted = await a.client.from("session_events").delete().eq("client_event_id", event.clientEventId);
    expect(deleted.error?.code).toBe("42501");
  });

  it("hides user A's events from user B", async () => {
    const event = sessionEvent();
    await writeEvents(a.client, [event]);
    const { data } = await b.client.from("session_events").select("id").eq("client_event_id", event.clientEventId);
    expect(data).toEqual([]);
  });

  it("lets user B use the same client event id as user A", async () => {
    const event = sessionEvent();
    await writeEvents(a.client, [event]);
    await writeEvents(b.client, [event]);
    const { data } = await b.client.from("session_events").select("id").eq("client_event_id", event.clientEventId);
    expect(data).toHaveLength(1);
  });
});

describe("the day rule in the database and in the game rules core", () => {
  it("gives the same learning day for the same moments", async () => {
    const moments = [
      "2026-10-20T17:30:00Z",
      "2026-10-20T20:59:00Z",
      "2026-10-20T21:00:00Z",
      "2026-03-29T01:30:00Z",
      "2026-10-25T02:30:00Z",
    ];
    for (const timeZone of ["Asia/Ho_Chi_Minh", "Europe/Paris", "America/New_York"]) {
      for (const at of moments) {
        const [row] = await sql<{ day: string }>("select private.learning_day($1, $2, 4::smallint)::text as day", [
          at,
          timeZone,
        ]);
        expect({ timeZone, at, day: row.day }).toEqual({ timeZone, at, day: learningDay(new Date(at), timeZone, 4) });
      }
    }
  });
});
