import { afterAll, afterEach, beforeAll, describe, expect, inject, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { latestSummaryWeek } from "@/core/week";
import { writeEvents } from "@/lib/events/write-events";
import { ensureProfile, saveReminderTimes } from "@/lib/profile";
import { savePushSubscription } from "@/lib/reminders/push-subscriptions";
import type { PushSender } from "@/lib/reminders/send-reminders";
import { forgetEmail, signedInUser } from "./helpers";

type User = { id: string; email: string; client: SupabaseClient };

// The push service is the one thing faked here: a test must never send a real push.
const sent: { endpoint: string; payload: string }[] = [];
const fakeSender: PushSender = async (subscription, payload) => {
  sent.push({ endpoint: subscription.endpoint, payload });
  return "sent";
};
vi.mock("@/lib/reminders/web-push-sender", () => ({ webPushSender: () => fakeSender }));

// The routes read their settings from the environment, like on Vercel.
process.env.NEXT_PUBLIC_SUPABASE_URL = inject("supabaseUrl");
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = inject("supabasePublishableKey");
process.env.SUPABASE_SECRET_KEY = inject("supabaseSecretKey");
const { POST } = await import("@/app/api/reminders/notify/route");
const { GET } = await import("@/app/api/reminders/key/route");

// Throwaway keys, made for this test run only.
const vapid = webpush.generateVAPIDKeys();
const CRON_SECRET = `test-${crypto.randomUUID()}`;

function setUp() {
  process.env.REMINDER_CRON_SECRET = CRON_SECRET;
  process.env.VAPID_PUBLIC_KEY = vapid.publicKey;
  process.env.VAPID_PRIVATE_KEY = vapid.privateKey;
  process.env.VAPID_SUBJECT = "mailto:owner@example.test";
}

function tearDown() {
  for (const name of ["REMINDER_CRON_SECRET", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"]) {
    delete process.env[name];
  }
}

function notify(authorization?: string) {
  return POST(
    new Request("http://localhost/api/reminders/notify", {
      method: "POST",
      headers: authorization ? { authorization } : {},
    }),
  );
}

/** The wall-clock time in Ho Chi Minh City, "HH:MM", `hoursFromNow` hours from now. */
function homeTime(hoursFromNow = 0): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    new Date(Date.now() + hoursFromNow * 60 * 60 * 1000),
  );
}

afterEach(tearDown);

describe("POST /api/reminders/notify", () => {
  let user: User;
  const endpoint = `https://push.example.test/endpoint/${crypto.randomUUID()}`;

  beforeAll(async () => {
    user = await signedInUser("notify");
    await ensureProfile(user.client);
    // The morning reminder is due right now, wherever the clock is when this test runs.
    // The evening one is 12 hours away, so this run sends exactly one reminder.
    await saveReminderTimes(user.client, user.id, { morning: homeTime(), evening: homeTime(12) });
    await savePushSubscription(user.client, { endpoint, keys: { p256dh: "p", auth: "a" } }, "iPhone");
  });

  afterAll(async () => {
    await forgetEmail(user.email);
  });

  it("is off, with no crash, before the owner adds the secret and the push keys", async () => {
    const response = await notify(`Bearer ${CRON_SECRET}`);
    expect(response.status).toBe(503);
    expect(sent.filter((s) => s.endpoint === endpoint)).toEqual([]);
  });

  it("refuses a request without the cron secret", async () => {
    setUp();
    expect((await notify()).status).toBe(401);
    expect((await notify("Bearer wrong")).status).toBe(401);
    expect((await notify(CRON_SECRET)).status).toBe(401);
    expect(sent.filter((s) => s.endpoint === endpoint)).toEqual([]);
  });

  it("sends due reminders with the cron secret, once per learning day", async () => {
    setUp();
    const first = await notify(`Bearer ${CRON_SECRET}`);
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual(expect.objectContaining({ due: expect.any(Number), sent: expect.any(Number) }));
    expect(sent.filter((s) => s.endpoint === endpoint)).toHaveLength(1);

    expect((await notify(`Bearer ${CRON_SECRET}`)).status).toBe(200);
    expect(sent.filter((s) => s.endpoint === endpoint)).toHaveLength(1);
  });

  it("also makes the Sunday summary of the last finished week on the same run", async () => {
    setUp();
    // 5 minutes on Monday 09:00 home time of the last finished week, whenever this test runs.
    const { weekStart } = latestSummaryWeek(new Date(), "Asia/Ho_Chi_Minh");
    const sessionId = crypto.randomUUID();
    const at = (minutes: number) => new Date(Date.parse(`${weekStart}T02:00:00Z`) + minutes * 60_000).toISOString();
    const snapshot = (minutes: number) => ({
      type: "session" as const,
      clientEventId: crypto.randomUUID(),
      sessionId,
      occurredAt: at(minutes),
      committedMinutes: 3 as const,
      activeSeconds: minutes * 60,
      device: "test",
    });
    await writeEvents(user.client, [snapshot(0), snapshot(5)]);

    const response = await notify(`Bearer ${CRON_SECRET}`);
    expect(await response.json()).toEqual(expect.objectContaining({ summariesChecked: expect.any(Number) }));
    const { data } = await user.client.from("weekly_summaries").select("week_start, minutes");
    expect(data).toEqual([{ week_start: weekStart, minutes: 5 }]);
  });
});

describe("GET /api/reminders/key", () => {
  it("gives no key before the owner adds the push keys, so the app keeps reminders off", async () => {
    expect(await (await GET(new Request("http://localhost/api/reminders/key"))).json()).toEqual({ publicKey: null });
  });

  it("gives the public key, never the private one", async () => {
    setUp();
    const body = await (await GET(new Request("http://localhost/api/reminders/key"))).json();
    expect(body).toEqual({ publicKey: vapid.publicKey });
    expect(JSON.stringify(body)).not.toContain(vapid.privateKey);
  });
});
