import type { SupabaseClient } from "@supabase/supabase-js";
import { morningReminder, morningReminderDue } from "@/core/reminders";
import { selectAll } from "../select-all";
import type { StoredSubscription } from "./push-subscriptions";

/** "gone" means the push service no longer knows this device, so it is forgotten. */
export type PushResult = "sent" | "gone" | "failed";
export type PushSender = (subscription: StoredSubscription, payload: string) => Promise<PushResult>;

export type ReminderRun = { due: number; sent: number; failed: number; gone: number };

type SubscriptionRow = { id: number; user_id: string; endpoint: string; p256dh: string; auth: string };
type ProfileRow = { user_id: string; home_time_zone: string; day_cutoff_hour: number; morning_reminder_time: string };

/**
 * One run of the 5-minute timer. For each user with a device, it checks in the home time zone
 * whether the morning reminder is due, claims it, and sends it to every device of that user.
 * `admin` must use the secret key: the run reads every user's devices and writes reminders.
 */
export async function sendDueReminders(admin: SupabaseClient, now: Date, send: PushSender): Promise<ReminderRun> {
  const subscriptions = await selectAll((from, to) =>
    admin.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").order("id").range(from, to).returns<SubscriptionRow[]>(),
  );
  const devices = Map.groupBy(subscriptions, (row) => row.user_id);
  if (devices.size === 0) return { due: 0, sent: 0, failed: 0, gone: 0 };

  const profiles = await selectAll((from, to) =>
    admin
      .from("profiles")
      .select("user_id, home_time_zone, day_cutoff_hour, morning_reminder_time")
      .in("user_id", [...devices.keys()])
      .order("user_id")
      .range(from, to)
      .returns<ProfileRow[]>(),
  );

  const run: ReminderRun = { due: 0, sent: 0, failed: 0, gone: 0 };
  for (const profile of profiles) {
    const due = morningReminderDue(now, {
      homeTimeZone: profile.home_time_zone,
      dayCutoffHour: profile.day_cutoff_hour,
      // Postgres returns "07:30:00".
      morningReminderTime: profile.morning_reminder_time.slice(0, 5),
    });
    if (!due.due) continue;
    const reminderId = await claimReminder(admin, profile.user_id, due.learningDay, now);
    if (reminderId === null) continue;
    run.due += 1;
    await deliver(admin, reminderId, devices.get(profile.user_id) ?? [], send, now, run);
  }
  return run;
}

/** Plans the reminder. Null when it was already planned for this day: never send it twice. */
async function claimReminder(admin: SupabaseClient, userId: string, learningDay: string, now: Date): Promise<number | null> {
  const { data, error } = await admin
    .from("reminders")
    .upsert(
      { user_id: userId, learning_day: learningDay, kind: "morning", planned_at: now.toISOString() },
      { onConflict: "user_id,learning_day,kind", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw error;
  return data[0]?.id ?? null;
}

async function deliver(
  admin: SupabaseClient,
  reminderId: number,
  devices: SubscriptionRow[],
  send: PushSender,
  now: Date,
  run: ReminderRun,
): Promise<void> {
  const payload = JSON.stringify(morningReminder());
  const results = await Promise.all(
    devices.map(async (row) => ({
      row,
      result: await send({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, payload).catch(
        (): PushResult => "failed",
      ),
    })),
  );

  const delivered = results.filter((r) => r.result === "sent").length;
  const gone = results.filter((r) => r.result === "gone").map((r) => r.row.id);
  run.sent += delivered;
  run.failed += results.filter((r) => r.result === "failed").length;
  run.gone += gone.length;

  if (gone.length > 0) {
    const removed = await admin.from("push_subscriptions").delete().in("id", gone);
    if (removed.error) throw removed.error;
  }
  const { error } = await admin
    .from("reminders")
    .update({ sent_at: now.toISOString(), delivered })
    .eq("id", reminderId);
  if (error) throw error;
}
