// Reminder rules (design 2 and 12.4). Pure functions: no clock, no database.
import { learningDay, type LearningDay } from "./day";

const MINUTE_MS = 60 * 1000;
const DAY_MINUTES = 24 * 60;

/**
 * How long a reminder stays due after its time. The timer runs every 5 minutes, so a reminder
 * gets about 12 chances. Later than one hour, it is no longer a morning cue, so it is skipped.
 */
export const REMINDER_WINDOW_MINUTES = 60;

export type ReminderSettings = {
  homeTimeZone: string;
  dayCutoffHour: number;
  /** "HH:MM" in the home time zone. */
  morningReminderTime: string;
};

export type ReminderDue = { due: true; learningDay: LearningDay } | { due: false };

/**
 * Whether the morning reminder is due at `now`. It is due from the reminder time, in the home
 * time zone, for one hour. `learningDay` is the day the reminder belongs to: the storage keeps
 * at most one morning reminder per user and learning day (design 12.4).
 */
export function morningReminderDue(now: Date, settings: ReminderSettings): ReminderDue {
  const minutesLate = minutesSince(now, settings.homeTimeZone, settings.morningReminderTime);
  if (minutesLate >= REMINDER_WINDOW_MINUTES) return { due: false };
  // The day of the moment the reminder time passed, so a reminder late after midnight
  // still belongs to the day before.
  const reminderAt = new Date(now.getTime() - minutesLate * MINUTE_MS);
  return { due: true, learningDay: learningDay(reminderAt, settings.homeTimeZone, settings.dayCutoffHour) };
}

/** Whole minutes from the last time the wall clock in `timeZone` showed `time`, 0 to 1439. */
function minutesSince(now: Date, timeZone: string, time: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", hour: "2-digit", minute: "2-digit" })
      .formatToParts(now)
      .map((part) => [part.type, Number(part.value)]),
  );
  const [hour, minute] = time.split(":").map(Number);
  return (parts.hour * 60 + parts.minute - (hour * 60 + minute) + DAY_MINUTES) % DAY_MINUTES;
}

export type ReminderMessage = { title: string; body: string; url: string };

/**
 * The morning reminder text. It never names lesson content (design 2), and its link uses
 * a route name, never a user id (design 12.7).
 */
export function morningReminder(): ReminderMessage {
  return {
    title: "Tech Lead Trainer",
    body: "Good morning. Your daily practice is ready. 3 minutes is enough.",
    url: "/",
  };
}
