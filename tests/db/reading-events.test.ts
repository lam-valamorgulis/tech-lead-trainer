import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { writeEvents, type ReadingEvent } from "@/lib/events/write-events";
import { ensureProfile } from "@/lib/profile";
import { forgetEmail, signedInUser } from "./helpers";

function readingEvent(overrides: Partial<ReadingEvent> = {}): ReadingEvent {
  return {
    type: "reading",
    clientEventId: crypto.randomUUID(),
    sessionId: crypto.randomUUID(),
    occurredAt: "2026-10-18T17:30:00.000Z",
    itemId: "cache",
    sourceUrl: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching",
    points: ["A cache keeps a copy.", "max-age sets how long.", "no-store keeps nothing."],
    ...overrides,
  };
}

describe("read-close-write events", () => {
  let user: { id: string; email: string; client: SupabaseClient };

  beforeAll(async () => {
    user = await signedInUser("reading");
    await ensureProfile(user.client);
  });

  afterAll(async () => {
    await forgetEmail(user.email);
  });

  it("store the source, the item and the 3 points once", async () => {
    const event = readingEvent();
    await writeEvents(user.client, [event, event]);
    const { data } = await user.client
      .from("reading_events")
      .select("item_id, source_url, points, learning_day")
      .eq("client_event_id", event.clientEventId);
    expect(data).toEqual([
      {
        item_id: "cache",
        source_url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching",
        points: ["A cache keeps a copy.", "max-age sets how long.", "no-store keeps nothing."],
        learning_day: "2026-10-18",
      },
    ]);
  });

  it("refuse anything but 3 points, an empty point, or a source that is not https", async () => {
    await expect(writeEvents(user.client, [readingEvent({ points: ["One.", "Two."] })])).rejects.toThrow();
    await expect(writeEvents(user.client, [readingEvent({ points: ["One.", " ", "Three."] })])).rejects.toThrow();
    await expect(writeEvents(user.client, [readingEvent({ sourceUrl: "http://example.com/" })])).rejects.toThrow();
  });
});
