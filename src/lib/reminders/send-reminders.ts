import type { SupabaseClient } from "@supabase/supabase-js";
import { activeSecondsByDay, addDays, type LearningDay } from "@/core/day";
import { adrReminderDue, adrReminderMessage } from "@/core/adr";
import { reminderDue, reminderToSend, type ReminderKind, type ReminderMessage } from "@/core/reminders";
import { toSnapshot, type SnapshotRow } from "@/lib/learning-log";
import { selectAll } from "@/lib/select-all";
import type { StoredSubscription } from "./push-subscriptions";

/** "gone" means the push service no longer knows this device, so it is forgotten. */
export type PushResult = "sent" | "gone" | "failed";
export type PushSender = (subscription: StoredSubscription, payload: string) => Promise<PushResult>;

/** What one run did. `errors` counts users whose reminder hit a database error. */
export type ReminderRun = { due: number; sent: number; failed: number; gone: number; errors: number };

type SubscriptionRow = { id: number; user_id: string; endpoint: string; p256dh: string; auth: string };
type ProfileRow = {
  user_id: string;
  home_time_zone: string;
  day_cutoff_hour: number;
  morning_reminder_time: string;
  evening_reminder_time: string;
};

const KINDS: readonly ReminderKind[] = ["morning", "evening"];

/** The kinds in the reminders table: the daily ones, and the ADR outcome check. */
type StoredReminderKind = ReminderKind | "adr-outcome";

/**
 * One run of the 5-minute timer. For each user with a device, it checks in the home time zone
 * whether the morning or the evening reminder is due and needed, claims it, and sends it to
 * every device of that user.
 * `admin` must use the secret key: the run reads every user's devices and learning, and writes reminders.
 */
export async function sendDueReminders(admin: SupabaseClient, now: Date, send: PushSender): Promise<ReminderRun> {
  const run: ReminderRun = { due: 0, sent: 0, failed: 0, gone: 0, errors: 0 };
  const subscriptions = await selectAll((from, to) =>
    admin.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").order("id").range(from, to).returns<SubscriptionRow[]>(),
  );
  const devices = Map.groupBy(subscriptions, (row) => row.user_id);
  if (devices.size === 0) return run;

  const profiles = await selectAll((from, to) =>
    admin
      .from("profiles")
      .select("user_id, home_time_zone, day_cutoff_hour, morning_reminder_time, evening_reminder_time")
      .in("user_id", [...devices.keys()])
      .order("user_id")
      .range(from, to)
      .returns<ProfileRow[]>(),
  );

  for (const profile of profiles) {
    // One user's database error must not cost every later user their reminder.
    try {
      await remindUser(admin, profile, devices.get(profile.user_id) ?? [], send, now, run);
    } catch (error) {
      run.errors += 1;
      console.error("reminder failed for one user", error);
    }
  }
  return run;
}

async function remindUser(
  admin: SupabaseClient,
  profile: ProfileRow,
  devices: SubscriptionRow[],
  send: PushSender,
  now: Date,
  run: ReminderRun,
): Promise<void> {
  const settings = {
    homeTimeZone: profile.home_time_zone,
    dayCutoffHour: profile.day_cutoff_hour,
    // Postgres returns "07:30:00".
    morningReminderTime: profile.morning_reminder_time.slice(0, 5),
    eveningReminderTime: profile.evening_reminder_time.slice(0, 5),
  };
  for (const kind of KINDS) {
    const due = reminderDue(now, settings, kind);
    if (!due.due) continue;
    const message = reminderToSend(kind, due.learningDay, await recentActiveSeconds(admin, profile.user_id, due.learningDay));
    if (message !== null) await sendOnce(admin, profile.user_id, due.learningDay, kind, message, devices, send, now, run);
  }
  // The ADR outcome check (#33) comes at the morning reminder time of its check date.
  const morning = reminderDue(now, settings, "morning");
  if (morning.due) {
    const adr = await adrToCheck(admin, profile.user_id, morning.learningDay);
    if (adr) await sendOnce(admin, profile.user_id, morning.learningDay, "adr-outcome", adrReminderMessage(adr), devices, send, now, run);
  }
}

/** Claims the reminder for this day and kind, and sends it. A second claim of the same day sends nothing. */
async function sendOnce(
  admin: SupabaseClient,
  userId: string,
  learningDay: LearningDay,
  kind: StoredReminderKind,
  message: ReminderMessage,
  devices: SubscriptionRow[],
  send: PushSender,
  now: Date,
  run: ReminderRun,
): Promise<void> {
  const reminderId = await claimReminder(admin, userId, learningDay, kind, now);
  if (reminderId === null) return;
  run.due += 1;

  const delivered = await deliver(admin, devices, JSON.stringify(message), send, run);
  if (delivered === 0) {
    // Every device failed (for example a short push-service outage): no device has the
    // reminder, so the next run, 5 minutes later, tries again inside the reminder window.
    await releaseReminder(admin, reminderId);
    return;
  }
  const { error } = await admin.from("reminders").update({ sent_at: now.toISOString(), delivered }).eq("id", reminderId);
  if (error) throw error;
}

/** The town of an ADR whose outcome check is today and not written yet, or null. */
async function adrToCheck(admin: SupabaseClient, userId: string, day: LearningDay): Promise<string | null> {
  const { data, error } = await admin
    .from("weekend_documents")
    .select("document_key, outcome_check_date, sections")
    .eq("user_id", userId)
    .eq("kind", "adr")
    .eq("outcome_check_date", day)
    .returns<{ document_key: string; outcome_check_date: string; sections: Record<string, unknown> }[]>();
  if (error) throw error;
  const due = data.find((row) =>
    adrReminderDue([{ outcomeCheckDate: row.outcome_check_date, outcome: String(row.sections.outcome ?? "") }], day),
  );
  return due ? due.document_key.slice(0, 3) : null;
}

/**
 * Active seconds per learning day for the reminder's day and the 2 days before it. One more
 * day is loaded, because a session counts for the day it started (see `activeSecondsByDay`).
 */
async function recentActiveSeconds(admin: SupabaseClient, userId: string, day: LearningDay): Promise<Map<LearningDay, number>> {
  const rows = await selectAll((from, to) =>
    admin
      .from("session_events")
      .select("session_id, occurred_at, learning_day, active_seconds")
      .eq("user_id", userId)
      .gte("learning_day", addDays(day, -3))
      .lte("learning_day", day)
      .order("id")
      .range(from, to)
      .returns<SnapshotRow[]>(),
  );
  return activeSecondsByDay(rows.map(toSnapshot));
}

/** Plans the reminder. Null when it was already planned for this day: never send it twice. */
async function claimReminder(
  admin: SupabaseClient,
  userId: string,
  learningDay: LearningDay,
  kind: StoredReminderKind,
  now: Date,
): Promise<number | null> {
  const { data, error } = await admin
    .from("reminders")
    .upsert(
      { user_id: userId, learning_day: learningDay, kind, planned_at: now.toISOString() },
      { onConflict: "user_id,learning_day,kind", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw error;
  return data[0]?.id ?? null;
}

async function releaseReminder(admin: SupabaseClient, reminderId: number): Promise<void> {
  const { error } = await admin.from("reminders").delete().eq("id", reminderId);
  if (error) throw error;
}

/**
 * Sends to every device and forgets the gone ones. Returns how many devices got it.
 * It never throws once a push went out, so a sent reminder is never released and sent again.
 */
async function deliver(
  admin: SupabaseClient,
  devices: SubscriptionRow[],
  payload: string,
  send: PushSender,
  run: ReminderRun,
): Promise<number> {
  const results = await Promise.all(
    devices.map(async (row) => ({
      id: row.id,
      result: await send({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, payload).catch(
        (): PushResult => "failed",
      ),
    })),
  );

  const delivered = results.filter((r) => r.result === "sent").length;
  const gone = results.filter((r) => r.result === "gone").map((r) => r.id);
  run.sent += delivered;
  run.failed += results.filter((r) => r.result === "failed").length;
  run.gone += gone.length;

  if (gone.length > 0) {
    // A gone device that stays costs one refused push tomorrow, nothing more.
    const removed = await admin.from("push_subscriptions").delete().in("id", gone);
    if (removed.error) console.error("could not forget gone push devices", removed.error);
  }
  return delivered;
}
