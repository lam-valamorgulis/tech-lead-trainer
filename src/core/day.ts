// Day rules (design 3 and 12.4). Pure functions: no clock, no database.

/** A learning day as "YYYY-MM-DD". */
export type LearningDay = string;

/** A day counts as learned at 3 minutes of active time. */
export const LEARNED_DAY_SECONDS = 180;
export const RATE_WINDOW_DAYS = 30;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * The date of (the time in the home time zone, minus the cutoff hour).
 * With cutoff 4, learning at 00:30 still counts for the day before.
 * The database computes the same rule in `private.learning_day`.
 */
export function learningDay(at: Date, timeZone: string, cutoffHour: number): LearningDay {
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
  // The wall-clock time in the home time zone, moved back by the cutoff hour.
  const wallClock = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return new Date(wallClock - cutoffHour * HOUR_MS).toISOString().slice(0, 10);
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

/** Learned days among the 30 days that end today. There is no streak anywhere (design 2). */
export function thirtyDayRate(snapshots: SessionSnapshot[], today: LearningDay): ThirtyDayRate {
  const first = addDays(today, -(RATE_WINDOW_DAYS - 1));
  let learnedDays = 0;
  for (const [day, seconds] of activeSecondsByDay(snapshots)) {
    if (day >= first && day <= today && isLearnedDay(seconds)) learnedDays += 1;
  }
  return { learnedDays, windowDays: RATE_WINDOW_DAYS };
}

export function addDays(day: LearningDay, count: number): LearningDay {
  return new Date(Date.parse(`${day}T00:00:00Z`) + count * DAY_MS).toISOString().slice(0, 10);
}
