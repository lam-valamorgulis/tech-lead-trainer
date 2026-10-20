// Reminder rules (design 2 and 12.4). Pure functions: no clock, no database.
import { addDays, dayNumber, isLearnedDay, learningDay, type LearningDay } from "./day";

const MINUTE_MS = 60 * 1000;
const DAY_MINUTES = 24 * 60;

/**
 * How long a reminder stays due after its time. The timer runs every 5 minutes, so a reminder
 * gets about 12 chances. Later than one hour, it is no longer a morning cue, so it is skipped.
 */
export const REMINDER_WINDOW_MINUTES = 60;

export type ReminderKind = "morning" | "evening";

export type ReminderSettings = {
  homeTimeZone: string;
  dayCutoffHour: number;
  /** "HH:MM" in the home time zone. */
  morningReminderTime: string;
  /** "HH:MM" in the home time zone. */
  eveningReminderTime: string;
};

export type ReminderDue = { due: true; learningDay: LearningDay } | { due: false };

/**
 * Whether the reminder of this kind is due at `now`. It is due from its time, in the home
 * time zone, for one hour. `learningDay` is the day the reminder belongs to: the storage keeps
 * at most one reminder per user, learning day and kind (design 12.4).
 */
export function reminderDue(now: Date, settings: ReminderSettings, kind: ReminderKind): ReminderDue {
  const time = kind === "morning" ? settings.morningReminderTime : settings.eveningReminderTime;
  const minutesLate = minutesSince(now, settings.homeTimeZone, time);
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

// The texts never name lesson content (design 2) and never blame the learner. Each kind has
// 3 styles that rotate, one per learning day, so the learner keeps noticing them.
const TEXTS: Record<ReminderKind, readonly string[]> = {
  morning: [
    "Good morning. Your daily practice is ready. 3 minutes is enough.",
    "Good morning. A short practice keeps what you learned fresh.",
    "Good morning. Tap 3, 15 or 45 minutes. Every choice counts.",
  ],
  evening: [
    "There is still time today. 3 minutes counts as a learned day.",
    "A short practice before bed? 3 minutes is enough for today.",
    "Your practice for today is still open. Even 3 minutes counts.",
  ],
};

/** The morning text after exactly one missed day. A little stronger, still no blame. */
const STRONGER_MORNING = "Today matters most. Just 3 minutes keeps your practice going.";

/**
 * The reminder to send for a due reminder, or null when it is not needed.
 * `activeSeconds` holds the active seconds per learning day (see `activeSecondsByDay`).
 * The evening reminder comes only when the day is not learned yet (design 2).
 * The link is a route name, never a user id (design 12.7).
 */
export function reminderToSend(
  kind: ReminderKind,
  day: LearningDay,
  activeSeconds: ReadonlyMap<LearningDay, number>,
): ReminderMessage | null {
  const learnedDaysAgo = (days: number) => isLearnedDay(activeSeconds.get(addDays(day, -days)) ?? 0);
  if (kind === "evening" && learnedDaysAgo(0)) return null;
  // Never miss twice (design 2): exactly one missed day, yesterday, after a learned day.
  // After a longer break the normal text comes, and home opens on the Rest Stop.
  const body = kind === "morning" && !learnedDaysAgo(1) && learnedDaysAgo(2) ? STRONGER_MORNING : rotatingText(kind, day);
  return { title: "Tech Lead Trainer", body, url: "/" };
}

/** The style for this learning day: the next style each day, in a fixed cycle. */
function rotatingText(kind: ReminderKind, day: LearningDay): string {
  const texts = TEXTS[kind];
  return texts[dayNumber(day) % texts.length];
}
