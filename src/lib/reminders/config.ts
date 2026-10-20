import { createHash, timingSafeEqual } from "node:crypto";

// Reminder settings come from server environment variables. The owner adds them with
// scripts/setup-reminders.sh. Until then, reminders stay off and nothing fails.

export type VapidDetails = { subject: string; publicKey: string; privateKey: string };
export type ReminderConfig = { cronSecret: string; vapid: VapidDetails };

type Env = Record<string, string | undefined>;

/** Null until the cron secret and all three push settings are set. */
export function reminderConfig(env: Env = process.env): ReminderConfig | null {
  const cronSecret = env.REMINDER_CRON_SECRET;
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  const subject = env.VAPID_SUBJECT;
  if (!cronSecret || !publicKey || !privateKey || !subject) return null;
  return { cronSecret, vapid: { subject, publicKey, privateKey } };
}

/** The key a browser needs to turn on push. It is public by design. Null means reminders are off. */
export function vapidPublicKey(env: Env = process.env): string | null {
  return reminderConfig(env)?.vapid.publicKey ?? null;
}

/** True only for "Bearer <cron secret>". The compare takes the same time for every wrong guess. */
export function hasCronSecret(request: Request, cronSecret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const digest = (text: string) => createHash("sha256").update(text).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${cronSecret}`));
}
