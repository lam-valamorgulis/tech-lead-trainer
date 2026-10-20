// Day rules (design 3 and 12.4). Pure functions: no clock, no database.

/** A learning day as "YYYY-MM-DD". */
export type LearningDay = string;

/** A day counts as learned at 3 minutes of active time. */
export const LEARNED_DAY_SECONDS = 180;
export const RATE_WINDOW_DAYS = 30;

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * The date of (the time in the home time zone, minus the cutoff hour).
 * With cutoff 4, learning at 00:30 still counts for the day before.
 * The database computes the same rule in `private.learning_day`.
 */
export function learningDay(at: Date, timeZone: string, cutoffHour: number): LearningDay {
  // The wall-clock time in the home time zone, moved back by the cutoff hour.
  return new Date(homeWallClock(at, timeZone) - cutoffHour * HOUR_MS).toISOString().slice(0, 10);
}

/**
 * The wall-clock time in `timeZone` at the moment `at`, to the minute, written as if it were UTC.
 * For example 00:30 on 21 Oct in Ho Chi Minh City gives Date.UTC(2026, 9, 21, 0, 30).
 */
export function homeWallClock(at: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(at)
      .map((part) => [part.type, Number(part.value)]),
  );
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
}

/** The moment the wall clock in `timeZone` shows `minuteOfDay` (0 to 1439) on `day`. */
export function homeTimeToInstant(day: LearningDay, minuteOfDay: number, timeZone: string): Date {
  const wanted = dayStart(day) + minuteOfDay * MINUTE_MS;
  // The time zone offset at a first guess, then again at the corrected guess, for summer time.
  const offsetAt = (at: number) => homeWallClock(new Date(at), timeZone) - Math.floor(at / MINUTE_MS) * MINUTE_MS;
  const guess = wanted - offsetAt(wanted);
  return new Date(wanted - offsetAt(guess));
}

export function isLearnedDay(activeSeconds: number): boolean {
  return activeSeconds >= LEARNED_DAY_SECONDS;
}

/** One saved snapshot of a session. A session writes one every 60 seconds. */
export type SessionSnapshot = {
  sessionId: string;
  occurredAt: Date;
  /** Set by the server from the home time zone when the snapshot was written. */
  learningDay: LearningDay;
  /** Active seconds since the session started. Grows from one snapshot to the next. */
  activeSeconds: number;
};

/** Active seconds per learning day. A session counts for the day it started. */
export function activeSecondsByDay(snapshots: SessionSnapshot[]): Map<LearningDay, number> {
  const sessions = new Map<string, { firstAt: number; day: LearningDay; activeSeconds: number }>();
  for (const snap of snapshots) {
    const at = snap.occurredAt.getTime();
    const session = sessions.get(snap.sessionId);
    if (!session) {
      sessions.set(snap.sessionId, { firstAt: at, day: snap.learningDay, activeSeconds: snap.activeSeconds });
      continue;
    }
    if (at < session.firstAt) {
      session.firstAt = at;
      session.day = snap.learningDay;
    }
    session.activeSeconds = Math.max(session.activeSeconds, snap.activeSeconds);
  }

  const days = new Map<LearningDay, number>();
  for (const { day, activeSeconds } of sessions.values()) {
    days.set(day, (days.get(day) ?? 0) + activeSeconds);
  }
  return days;
}

export type ThirtyDayRate = { learnedDays: number; windowDays: number };

/** The learned days up to today (days after today are left out), in no fixed order. */
export function learnedDays(snapshots: SessionSnapshot[], today: LearningDay): LearningDay[] {
  const days: LearningDay[] = [];
  for (const [day, seconds] of activeSecondsByDay(snapshots)) {
    if (day <= today && isLearnedDay(seconds)) days.push(day);
  }
  return days;
}

/** Learned days among the 30 days that end today. There is no streak anywhere (design 2). */
export function thirtyDayRate(snapshots: SessionSnapshot[], today: LearningDay): ThirtyDayRate {
  const first = addDays(today, -(RATE_WINDOW_DAYS - 1));
  const inWindow = learnedDays(snapshots, today).filter((day) => day >= first);
  return { learnedDays: inWindow.length, windowDays: RATE_WINDOW_DAYS };
}

export function addDays(day: LearningDay, count: number): LearningDay {
  return new Date(dayStart(day) + count * DAY_MS).toISOString().slice(0, 10);
}

/** The number of the day: 0 on 1970-01-01, one more each day after. */
export function dayNumber(day: LearningDay): number {
  return Math.floor(dayStart(day) / DAY_MS);
}

function dayStart(day: LearningDay): number {
  return Date.parse(`${day}T00:00:00Z`);
}
