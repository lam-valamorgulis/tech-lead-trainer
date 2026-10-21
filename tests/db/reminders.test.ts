import { afterAll, beforeAll, describe, expect, inject, it, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ensureProfile, saveReminderTimes } from "@/lib/profile";
import { removePushSubscription, savePushSubscription } from "@/lib/reminders/push-subscriptions";
import { sendDueReminders, type PushResult, type PushSender } from "@/lib/reminders/send-reminders";
import { saveAdr } from "@/lib/weekend-doc";
import { adminClient, forgetEmail, signedInUser, sql } from "./helpers";

type User = { id: string; email: string; client: SupabaseClient };

// One reminder run takes at most about 0.3 s here (#91). On the CI machine, one request once
// waited 5.4 s while 26 files shared one database. 15 s keeps such a wait from failing CI,
// and a real hang still fails.
vi.setConfig({ testTimeout: 15_000 });

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
        // 21 Jan 2030 has the third morning style.
        body: "Good morning. Tap 3, 15 or 45 minutes. Every choice counts.",
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

  it("tries again on the next run when every device failed, and still sends only once", async () => {
    const sub = subscriptionFor("flaky");
    const other = await signedInUser("remind-flaky");
    await ensureProfile(other.client);
    try {
      await savePushSubscription(other.client, sub, "iPhone");
      const down = fakePushService(() => "failed");
      await sendDueReminders(adminClient(), new Date("2030-01-25T00:30:00Z"), down.send);
      expect(down.callsTo([sub.endpoint])).toHaveLength(1);

      const up = fakePushService();
      await sendDueReminders(adminClient(), new Date("2030-01-25T00:35:00Z"), up.send);
      await sendDueReminders(adminClient(), new Date("2030-01-25T00:40:00Z"), up.send);
      expect(up.callsTo([sub.endpoint])).toHaveLength(1);
    } finally {
      await forgetEmail(other.email);
    }
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

describe("sendDueReminders in the evening and after a missed day", () => {
  let user: User;
  let phone: ReturnType<typeof subscriptionFor>;

  // Past days, because the database refuses session events from the future.
  // 20:00 in Ho Chi Minh City is 13:00 UTC; 07:30 is 00:30 UTC.
  const EVENING_MAR_10 = new Date("2026-03-10T13:00:00Z");
  const EVENING_MAR_11 = new Date("2026-03-11T13:00:00Z");
  const MORNING_MAR_13 = new Date("2026-03-13T00:30:00Z");

  /** One session snapshot with this many active seconds, at 12:00 home time. */
  async function learn(day: string, activeSeconds: number) {
    const { error } = await user.client.from("session_events").insert({
      client_event_id: crypto.randomUUID(),
      session_id: crypto.randomUUID(),
      occurred_at: `${day}T05:00:00Z`,
      learning_day: day,
      committed_minutes: 3,
      active_seconds: activeSeconds,
      device: "test",
    });
    if (error) throw error;
  }

  async function remindersOn(day: string) {
    const { data } = await user.client.from("reminders").select("kind").eq("learning_day", day).order("kind");
    return data?.map((row) => row.kind);
  }

  beforeAll(async () => {
    user = await signedInUser("remind-evening");
    await ensureProfile(user.client);
    phone = subscriptionFor("evening-phone");
    await savePushSubscription(user.client, phone, "iPhone");
  });

  afterAll(async () => {
    await forgetEmail(user.email);
  });

  it("sends the evening reminder at 20:00 when today is not learned, once", async () => {
    await learn("2026-03-10", 179);
    const push = fakePushService();
    await sendDueReminders(adminClient(), EVENING_MAR_10, push.send);
    await sendDueReminders(adminClient(), new Date("2026-03-10T13:05:00Z"), push.send);
    expect(push.callsTo([phone.endpoint]).map((c) => c.payload)).toEqual([
      { title: "Tech Lead Trainer", body: "Your practice for today is still open. Even 3 minutes counts.", url: "/" },
    ]);
    expect(await remindersOn("2026-03-10")).toEqual(["evening"]);
  });

  it("sends no evening reminder when today already has 180 active seconds", async () => {
    await learn("2026-03-11", 180);
    const push = fakePushService();
    await sendDueReminders(adminClient(), EVENING_MAR_11, push.send);
    expect(push.callsTo([phone.endpoint])).toEqual([]);
    expect(await remindersOn("2026-03-11")).toEqual([]);
  });

  it("sends the stronger morning text after one missed day", async () => {
    // 11 March is learned, 12 March is not.
    const push = fakePushService();
    await sendDueReminders(adminClient(), MORNING_MAR_13, push.send);
    expect(push.callsTo([phone.endpoint]).map((c) => c.payload)).toEqual([
      { title: "Tech Lead Trainer", body: "Today matters most. Just 3 minutes keeps your practice going.", url: "/" },
    ]);
  });

  it("keeps one morning and one evening reminder apart on the same learning day", async () => {
    const push = fakePushService();
    await sendDueReminders(adminClient(), new Date("2026-03-13T13:00:00Z"), push.send);
    await sendDueReminders(adminClient(), new Date("2026-03-13T00:35:00Z"), push.send);
    expect(push.callsTo([phone.endpoint])).toHaveLength(1);
    expect(await remindersOn("2026-03-13")).toEqual(["evening", "morning"]);
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

describe("sendDueReminders for an ADR outcome check", () => {
  let user: User;
  let phone: ReturnType<typeof subscriptionFor>;
  const adr = (outcome: string) => ({
    sections: { title: "Prices in the browser", context: "", decision: "", consequences: "", prediction: "Faster pages.", outcome },
    status: "accepted" as const,
    outcomeCheckDate: "2030-02-04",
  });

  beforeAll(async () => {
    user = await signedInUser("remind-adr");
    await ensureProfile(user.client);
    phone = subscriptionFor("remind-adr-phone");
    await savePushSubscription(user.client, phone, "iPhone");
    await saveAdr(user.client, "t01-adr", adr(""));
  });

  afterAll(async () => {
    await forgetEmail(user.email);
  });

  it("sends the ADR reminder on its check date at the morning time, next to the daily reminder, once", async () => {
    const push = fakePushService();
    // 07:30 in Ho Chi Minh City on 4 Feb 2030.
    await sendDueReminders(adminClient(), new Date("2030-02-04T00:30:00Z"), push.send);
    await sendDueReminders(adminClient(), new Date("2030-02-04T00:35:00Z"), push.send);
    const bodies = push.callsTo([phone.endpoint]).map((call) => call.payload);
    expect(bodies).toContainEqual({
      title: "Tech Lead Trainer",
      body: "Today is the day to check your ADR. What really happened after your decision?",
      url: "/weekend/t01/adr",
    });
    expect(bodies).toHaveLength(2);
    const { data } = await user.client.from("reminders").select("kind").eq("learning_day", "2030-02-04").order("kind");
    expect(data).toEqual([{ kind: "adr-outcome" }, { kind: "morning" }]);
  });

  it("sends no ADR reminder on another day, or once the real outcome is written", async () => {
    const before = fakePushService();
    await sendDueReminders(adminClient(), new Date("2030-02-03T00:30:00Z"), before.send);
    expect(before.callsTo([phone.endpoint]).map((call) => (call.payload as { url: string }).url)).toEqual(["/"]);

    await saveAdr(user.client, "t01-adr", { ...adr("Pages got faster, but the cache broke twice."), outcomeCheckDate: "2030-02-05" });
    const written = fakePushService();
    await sendDueReminders(adminClient(), new Date("2030-02-05T00:30:00Z"), written.send);
    expect(written.callsTo([phone.endpoint]).map((call) => (call.payload as { url: string }).url)).toEqual(["/"]);
  });
});

describe("sendDueReminders as the number of learners grows", () => {
  const users: User[] = [];
  const phones: string[] = [];

  /** An admin client that counts its read requests (GET), so a test can see how the reads grow. */
  function countingAdmin() {
    const counter = { reads: 0 };
    const client = createClient(inject("supabaseUrl"), inject("supabaseSecretKey"), {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          if ((init?.method ?? "GET") === "GET") counter.reads += 1;
          return fetch(input, init);
        },
      },
    });
    return { client, counter };
  }

  async function addLearner(label: string) {
    const user = await signedInUser(label);
    users.push(user);
    await ensureProfile(user.client);
    // A morning time no other test uses, so only these learners are due.
    await saveReminderTimes(user.client, user.id, { morning: "04:05", evening: "22:55" });
    const phone = subscriptionFor(label);
    phones.push(phone.endpoint);
    await savePushSubscription(user.client, phone, "iPhone");
    await saveAdr(user.client, "t01-adr", {
      sections: { title: "Queues", context: "", decision: "", consequences: "", prediction: "Fewer timeouts.", outcome: "" },
      status: "accepted",
      outcomeCheckDate: "2031-03-05",
    });
  }

  beforeAll(async () => {
    await addLearner("grow-1");
  });

  afterAll(async () => {
    for (const user of users) await forgetEmail(user.email);
  });

  it("reads the same number of times for 3 due learners as for 1", async () => {
    // 04:05 in Ho Chi Minh City is 21:05 UTC the day before.
    const one = countingAdmin();
    const push = fakePushService();
    await sendDueReminders(one.client, new Date("2031-03-03T21:05:00Z"), push.send);
    expect(push.callsTo(phones)).toHaveLength(1);

    await addLearner("grow-2");
    await addLearner("grow-3");
    const three = countingAdmin();
    // The ADR check day: each learner gets the daily reminder and the ADR reminder.
    await sendDueReminders(three.client, new Date("2031-03-04T21:05:00Z"), push.send);
    expect(push.callsTo(phones)).toHaveLength(1 + 3 * 2);

    expect(three.counter.reads).toBe(one.counter.reads);
  });
});

describe("sendDueReminders for learners in two time zones", () => {
  let vietnam: User;
  let newYork: User;
  let vietnamPhone: string;
  let newYorkPhone: string;

  /** One session of 180 active seconds at noon home time on this day. */
  async function learn(user: User, noonUtc: string) {
    const { error } = await user.client.from("session_events").insert({
      client_event_id: crypto.randomUUID(),
      session_id: crypto.randomUUID(),
      occurred_at: noonUtc,
      committed_minutes: 3,
      active_seconds: 180,
      device: "test",
    });
    if (error) throw error;
  }

  beforeAll(async () => {
    vietnam = await signedInUser("remind-zone-vn");
    newYork = await signedInUser("remind-zone-ny");
    await ensureProfile(vietnam.client);
    await ensureProfile(newYork.client);
    // At 01:00 UTC on 20 March 2026 it is 08:00 on the 20th in Ho Chi Minh City
    // and 21:00 on the 19th in New York: each learner's evening reminder is due.
    await saveReminderTimes(vietnam.client, vietnam.id, { morning: "12:00", evening: "08:00" });
    await sql("update public.profiles set home_time_zone = 'America/New_York' where user_id = $1", [newYork.id]);
    await saveReminderTimes(newYork.client, newYork.id, { morning: "07:30", evening: "21:00" });
    vietnamPhone = subscriptionFor("zone-vn").endpoint;
    newYorkPhone = subscriptionFor("zone-ny").endpoint;
    await savePushSubscription(vietnam.client, { endpoint: vietnamPhone, keys: { p256dh: "p", auth: "a" } }, "iPhone");
    await savePushSubscription(newYork.client, { endpoint: newYorkPhone, keys: { p256dh: "p", auth: "a" } }, "iPhone");
    // Both learned on 19 March, each at noon home time. Only New York is still on that day.
    await learn(vietnam, "2026-03-19T05:00:00Z");
    await learn(newYork, "2026-03-19T16:00:00Z");
  });

  afterAll(async () => {
    await forgetEmail(vietnam.email);
    await forgetEmail(newYork.email);
  });

  it("checks each learner's own learning day", async () => {
    const push = fakePushService();
    await sendDueReminders(adminClient(), new Date("2026-03-20T01:00:00Z"), push.send);
    // Vietnam is on 20 March and has not learned yet. New York is on 19 March and has.
    expect(push.callsTo([vietnamPhone])).toHaveLength(1);
    expect(push.callsTo([newYorkPhone])).toEqual([]);
    const { data } = await vietnam.client.from("reminders").select("learning_day, kind");
    expect(data).toEqual([{ learning_day: "2026-03-20", kind: "evening" }]);
  });
});
