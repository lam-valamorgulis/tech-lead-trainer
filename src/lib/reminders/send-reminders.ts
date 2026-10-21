import type { SupabaseClient } from "@supabase/supabase-js";
import { activeSecondsByDay, addDays, type LearningDay } from "@/core/day";
import { adrReminderDue, adrReminderMessage } from "@/core/adr";
import { townOfDocument } from "@/lib/weekend-doc";
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

/** A reminder that is due and needed for one user. */
type Planned = { userId: string; learningDay: LearningDay; kind: StoredReminderKind; message: ReminderMessage };

/**
 * One run of the 5-minute timer. For each user with a device, it checks in the home time zone
 * whether the morning or the evening reminder is due and needed, claims it, and sends it to
 * every device of that user.
 * The reads are one query per table for all due users, so a run does not get slower per user (#91).
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

  for (const reminder of await planReminders(admin, profiles, now)) {
    // One user's database error must not cost every later user their reminder.
    try {
      await sendOnce(admin, reminder, devices.get(reminder.userId) ?? [], send, now, run);
    } catch (error) {
      run.errors += 1;
      console.error("reminder failed for one user", error);
    }
  }
  return run;
}

/** Every reminder that is due now and needed, for all users, from one read per table. */
async function planReminders(admin: SupabaseClient, profiles: ProfileRow[], now: Date): Promise<Planned[]> {
  const daily: { userId: string; learningDay: LearningDay; kind: ReminderKind }[] = [];
  const adrDays = new Map<string, LearningDay>();
  for (const profile of profiles) {
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
      daily.push({ userId: profile.user_id, learningDay: due.learningDay, kind });
      // The ADR outcome check (#33) comes at the morning reminder time of its check date.
      if (kind === "morning") adrDays.set(profile.user_id, due.learningDay);
    }
  }
  if (daily.length === 0) return [];

  const [sessions, adrs] = await Promise.all([recentSessions(admin, daily), adrsToCheck(admin, adrDays)]);
  const planned: Planned[] = [];
  for (const { userId, learningDay, kind } of daily) {
    const message = reminderToSend(kind, learningDay, secondsBefore(sessions.get(userId) ?? [], learningDay));
    if (message !== null) planned.push({ userId, learningDay, kind, message });
    const town = kind === "morning" ? adrs.get(userId) : undefined;
    if (town) planned.push({ userId, learningDay, kind: "adr-outcome", message: adrReminderMessage(town) });
  }
  return planned;
}

/** Claims the reminder for this day and kind, and sends it. A second claim of the same day sends nothing. */
async function sendOnce(
  admin: SupabaseClient,
  reminder: Planned,
  devices: SubscriptionRow[],
  send: PushSender,
  now: Date,
  run: ReminderRun,
): Promise<void> {
  const reminderId = await claimReminder(admin, reminder, now);
  if (reminderId === null) return;
  run.due += 1;

  const delivered = await deliver(admin, devices, JSON.stringify(reminder.message), send, run);
  if (delivered === 0) {
    // Every device failed (for example a short push-service outage): no device has the
    // reminder, so the next run, 5 minutes later, tries again inside the reminder window.
    await releaseReminder(admin, reminderId);
    return;
  }
  const { error } = await admin.from("reminders").update({ sent_at: now.toISOString(), delivered }).eq("id", reminderId);
  if (error) throw error;
}

type SessionRow = SnapshotRow & { user_id: string };
type AdrRow = { user_id: string; document_key: string; outcome_check_date: string; sections: Record<string, unknown> };

/** Per user, the town of an ADR whose outcome check is on that user's day and not written yet. */
async function adrsToCheck(admin: SupabaseClient, days: Map<string, LearningDay>): Promise<Map<string, string>> {
  const towns = new Map<string, string>();
  if (days.size === 0) return towns;
  const rows = await selectAll((from, to) =>
    admin
      .from("weekend_documents")
      .select("user_id, document_key, outcome_check_date, sections")
      .eq("kind", "adr")
      .in("user_id", [...days.keys()])
      .in("outcome_check_date", [...new Set(days.values())])
      .order("id")
      .range(from, to)
      .returns<AdrRow[]>(),
  );
  for (const row of rows) {
    const day = days.get(row.user_id);
    if (!day || towns.has(row.user_id)) continue;
    const check = { outcomeCheckDate: row.outcome_check_date, outcome: String(row.sections.outcome ?? "") };
    if (adrReminderDue([check], day)) towns.set(row.user_id, townOfDocument(row.document_key));
  }
  return towns;
}

/**
 * The session rows of every due user, for the earliest reminder day minus 3 up to the latest one.
 * Users in other time zones can be on another learning day, so `secondsBefore` keeps each
 * reminder's own days.
 */
async function recentSessions(admin: SupabaseClient, due: { userId: string; learningDay: LearningDay }[]): Promise<Map<string, SessionRow[]>> {
  const days = due.map((d) => d.learningDay).sort();
  const rows = await selectAll((from, to) =>
    admin
      .from("session_events")
      .select("user_id, session_id, occurred_at, learning_day, active_seconds")
      .in("user_id", [...new Set(due.map((d) => d.userId))])
      .gte("learning_day", addDays(days[0], -3))
      .lte("learning_day", days[days.length - 1])
      .order("id")
      .range(from, to)
      .returns<SessionRow[]>(),
  );
  return Map.groupBy(rows, (row) => row.user_id);
}

/**
 * Active seconds per learning day for the reminder's day and the 2 days before it. One more
 * day is used, because a session counts for the day it started (see `activeSecondsByDay`).
 */
function secondsBefore(rows: SessionRow[], day: LearningDay): Map<LearningDay, number> {
  const own = rows.filter((row) => row.learning_day >= addDays(day, -3) && row.learning_day <= day);
  return activeSecondsByDay(own.map(toSnapshot));
}

/** Plans the reminder. Null when it was already planned for this day: never send it twice. */
async function claimReminder(admin: SupabaseClient, reminder: Planned, now: Date): Promise<number | null> {
  const { data, error } = await admin
    .from("reminders")
    .upsert(
      { user_id: reminder.userId, learning_day: reminder.learningDay, kind: reminder.kind, planned_at: now.toISOString() },
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
