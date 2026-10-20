import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureProfile, saveReminderTimes } from "@/lib/profile";
import { removePushSubscription, savePushSubscription } from "@/lib/reminders/push-subscriptions";
import { sendDueReminders, type PushResult, type PushSender } from "@/lib/reminders/send-reminders";
import { adminClient, forgetEmail, signedInUser, sql } from "./helpers";

type User = { id: string; email: string; client: SupabaseClient };

function subscriptionFor(label: string) {
  return {
    endpoint: `https://push.example.test/${label}/${crypto.randomUUID()}`,
    keys: { p256dh: "BPublicKeyOfTheBrowser", auth: "authSecret" },
  };
}

/** A push service that records what it was asked to send. */
function fakePushService(answer: (endpoint: string) => PushResult = () => "sent") {
  const calls: { endpoint: string; payload: unknown }[] = [];
  const send: PushSender = async (subscription, payload) => {
    calls.push({ endpoint: subscription.endpoint, payload: JSON.parse(payload) });
    return answer(subscription.endpoint);
  };
  return { send, callsTo: (endpoints: string[]) => calls.filter((c) => endpoints.includes(c.endpoint)) };
}

// 07:30 in Ho Chi Minh City (the default home time zone, UTC+7) on 21 Jan 2030.
const MORNING = new Date("2030-01-21T00:30:00Z");

describe("push subscriptions", () => {
  let a: User;
  let b: User;

  beforeAll(async () => {
    a = await signedInUser("push-a");
    b = await signedInUser("push-b");
    await ensureProfile(a.client);
    await ensureProfile(b.client);
  });

  afterAll(async () => {
    await forgetEmail(a.email);
    await forgetEmail(b.email);
  });

  it("are stored per user, and saving the same device twice gives one row", async () => {
    const sub = subscriptionFor("a");
    await savePushSubscription(a.client, sub, "iPhone");
    await savePushSubscription(a.client, sub, "iPhone");
    const { data } = await a.client.from("push_subscriptions").select("endpoint, p256dh, auth, device");
    expect(data).toEqual([{ endpoint: sub.endpoint, p256dh: "BPublicKeyOfTheBrowser", auth: "authSecret", device: "iPhone" }]);
  });

  it("are hidden from other users", async () => {
    await savePushSubscription(a.client, subscriptionFor("a-hidden"), "iPhone");
    const { data } = await b.client.from("push_subscriptions").select("endpoint");
    expect(data).toEqual([]);
  });

  it("can be removed by their owner", async () => {
    const sub = subscriptionFor("a-removed");
    await savePushSubscription(a.client, sub, "iPhone");
    await removePushSubscription(a.client, sub.endpoint);
    const { data } = await a.client.from("push_subscriptions").select("endpoint").eq("endpoint", sub.endpoint);
    expect(data).toEqual([]);
  });

  it("refuse an endpoint that is not https", async () => {
    await expect(
      savePushSubscription(a.client, { ...subscriptionFor("a"), endpoint: "http://push.example.test/x" }, "iPhone"),
    ).rejects.toThrow();
  });
});

describe("sendDueReminders", () => {
  let user: User;
  let phone: ReturnType<typeof subscriptionFor>;
  let laptop: ReturnType<typeof subscriptionFor>;

  beforeAll(async () => {
    user = await signedInUser("remind");
    await ensureProfile(user.client);
    phone = subscriptionFor("remind-phone");
    laptop = subscriptionFor("remind-laptop");
    await savePushSubscription(user.client, phone, "iPhone");
    await savePushSubscription(user.client, laptop, "Mac");
  });

  afterAll(async () => {
    await forgetEmail(user.email);
  });

  it("sends nothing before 07:30 home time", async () => {
    const push = fakePushService();
    await sendDueReminders(adminClient(), new Date("2030-01-21T00:00:00Z"), push.send);
    expect(push.callsTo([phone.endpoint, laptop.endpoint])).toEqual([]);
  });

  it("sends the morning reminder to every device at 07:30, with no lesson content and a slug link", async () => {
    const push = fakePushService();
    await sendDueReminders(adminClient(), MORNING, push.send);
    const calls = push.callsTo([phone.endpoint, laptop.endpoint]);
    expect(calls.map((c) => c.endpoint).sort()).toEqual([phone.endpoint, laptop.endpoint].sort());
    for (const call of calls) {
      expect(call.payload).toEqual({
        title: "Tech Lead Trainer",
        body: "Good morning. Your daily practice is ready. 3 minutes is enough.",
        url: "/",
      });
    }

    const { data } = await user.client.from("reminders").select("learning_day, kind, delivered, sent_at");
    expect(data).toEqual([{ learning_day: "2030-01-21", kind: "morning", delivered: 2, sent_at: expect.any(String) }]);
  });

  it("never sends a second morning reminder on the same learning day", async () => {
    const push = fakePushService();
    await sendDueReminders(adminClient(), new Date("2030-01-21T00:35:00Z"), push.send);
    await sendDueReminders(adminClient(), new Date("2030-01-21T00:40:00Z"), push.send);
    expect(push.callsTo([phone.endpoint, laptop.endpoint])).toEqual([]);
  });

  it("sends again on the next learning day", async () => {
    const push = fakePushService();
    await sendDueReminders(adminClient(), new Date("2030-01-22T00:30:00Z"), push.send);
    expect(push.callsTo([phone.endpoint, laptop.endpoint])).toHaveLength(2);
  });

  it("gives one reminder when two timer runs overlap", async () => {
    const push = fakePushService();
    const at = new Date("2030-01-23T00:30:00Z");
    await Promise.all([
      sendDueReminders(adminClient(), at, push.send),
      sendDueReminders(adminClient(), at, push.send),
    ]);
    expect(push.callsTo([phone.endpoint])).toHaveLength(1);
  });
});

describe("sendDueReminders with Settings and devices", () => {
  let user: User;

  beforeAll(async () => {
    user = await signedInUser("remind-settings");
    await ensureProfile(user.client);
  });

  afterAll(async () => {
    await forgetEmail(user.email);
  });

  it("follows the morning time saved in Settings", async () => {
    const sub = subscriptionFor("settings");
    await savePushSubscription(user.client, sub, "iPhone");
    await saveReminderTimes(user.client, user.id, { morning: "09:15", evening: "21:00" });
    expect((await ensureProfile(user.client)).morningReminderTime).toBe("09:15");
    expect((await ensureProfile(user.client)).eveningReminderTime).toBe("21:00");

    const push = fakePushService();
    await sendDueReminders(adminClient(), MORNING, push.send);
    expect(push.callsTo([sub.endpoint])).toEqual([]);
    // 09:15 in Ho Chi Minh City is 02:15 UTC.
    await sendDueReminders(adminClient(), new Date("2030-01-21T02:15:00Z"), push.send);
    expect(push.callsTo([sub.endpoint])).toHaveLength(1);
  });

  it("forgets a device that the push service says is gone, and keeps the others", async () => {
    const gone = subscriptionFor("gone");
    const kept = subscriptionFor("kept");
    await savePushSubscription(user.client, gone, "old iPhone");
    await savePushSubscription(user.client, kept, "iPhone");

    const push = fakePushService((endpoint) => (endpoint === gone.endpoint ? "gone" : "sent"));
    // 09:15 the next day.
    await sendDueReminders(adminClient(), new Date("2030-01-22T02:15:00Z"), push.send);
    expect(push.callsTo([gone.endpoint, kept.endpoint])).toHaveLength(2);

    const { data } = await user.client.from("push_subscriptions").select("endpoint").in("endpoint", [gone.endpoint, kept.endpoint]);
    expect(data).toEqual([{ endpoint: kept.endpoint }]);
  });

  it("does not let the learner write or change reminders", async () => {
    const insert = await user.client.from("reminders").insert({ learning_day: "2030-01-30", kind: "morning" });
    expect(insert.error?.code).toBe("42501");
    const update = await user.client.from("reminders").update({ delivered: 9 }).eq("user_id", user.id);
    expect(update.error?.code).toBe("42501");
    const remove = await user.client.from("reminders").delete().eq("user_id", user.id);
    expect(remove.error?.code).toBe("42501");
  });
});

describe("the 5-minute timer", () => {
  it("runs every 5 minutes on database time", async () => {
    const rows = await sql<{ schedule: string }>("select schedule from cron.job where jobname = 'reminders-notify'");
    expect(rows).toEqual([{ schedule: "*/5 * * * *" }]);
  });

  it("does nothing until the owner stores the endpoint and the secret", async () => {
    const rows = await sql<{ request: string | null }>("select private.request_reminders() as request");
    expect(rows).toEqual([{ request: null }]);
  });

  it("calls the notify endpoint with the cron secret once both are stored", async () => {
    // Port 9 (discard) on this Mac: the request goes nowhere. Removed again right after.
    const url = `http://127.0.0.1:9/api/reminders/notify?test=${crypto.randomUUID()}`;
    await sql("select vault.create_secret($1, 'reminders_notify_url'), vault.create_secret('test-secret', 'reminders_cron_secret')", [url]);
    try {
      const rows = await sql<{ request: string | null }>("select private.request_reminders()::text as request");
      expect(rows[0].request).toMatch(/^\d+$/);
      const queued = await sql<{ url: string; headers: Record<string, string> }>(
        "select url, headers from net.http_request_queue where id = $1::bigint",
        [rows[0].request],
      );
      // pg_net may already have sent it, so the queue can be empty.
      for (const row of queued) {
        expect(row.url).toBe(url);
        expect(row.headers.authorization).toBe("Bearer test-secret");
      }
    } finally {
      await sql("delete from vault.secrets where name in ('reminders_notify_url', 'reminders_cron_secret')");
    }
  });

  it("cannot be called by signed-in users", async () => {
    const rows = await sql<{ allowed: boolean }>(
      "select has_function_privilege('authenticated', 'private.request_reminders()', 'execute') as allowed",
    );
    expect(rows).toEqual([{ allowed: false }]);
  });
});
