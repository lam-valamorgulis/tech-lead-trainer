import { describe, expect, it } from "vitest";
import { dayNumber, isLearnedDay, learningDay, thirtyDayRate, type SessionSnapshot } from "./day.ts";

const HCM = "Asia/Ho_Chi_Minh";

describe("learningDay", () => {
  it("counts a session at 00:30 in Ho Chi Minh City for the previous day", () => {
    // 00:30 on 21 Oct in Ho Chi Minh City (UTC+7).
    expect(learningDay(new Date("2026-10-20T17:30:00Z"), HCM, 4)).toBe("2026-10-20");
  });

  it("starts the new day at the cutoff hour, 04:00", () => {
    expect(learningDay(new Date("2026-10-20T20:59:59Z"), HCM, 4)).toBe("2026-10-20");
    expect(learningDay(new Date("2026-10-20T21:00:00Z"), HCM, 4)).toBe("2026-10-21");
  });

  it("uses the home time zone, not UTC", () => {
    // 10:00 on 21 Oct in Paris is 08:00 UTC; it is 15:00 in Ho Chi Minh City.
    const at = new Date("2026-10-21T08:00:00Z");
    expect(learningDay(at, "Europe/Paris", 4)).toBe("2026-10-21");
    expect(learningDay(new Date("2026-10-21T01:00:00Z"), "Europe/Paris", 4)).toBe("2026-10-20");
  });
});

describe("isLearnedDay", () => {
  it("does not count 179 seconds and counts 180", () => {
    expect(isLearnedDay(179)).toBe(false);
    expect(isLearnedDay(180)).toBe(true);
  });
});

function snapshot(sessionId: string, day: string, activeSeconds: number, minute = 0): SessionSnapshot {
  return { sessionId, learningDay: day, activeSeconds, occurredAt: new Date(Date.UTC(2026, 9, 1, 0, minute)) };
}

describe("thirtyDayRate", () => {
  it("counts the days with at least 180 active seconds in the last 30 days", () => {
    const events = [
      snapshot("a", "2026-10-20", 0),
      snapshot("a", "2026-10-20", 60, 1),
      snapshot("a", "2026-10-20", 200, 4),
      snapshot("b", "2026-10-19", 179),
    ];
    expect(thirtyDayRate(events, "2026-10-20")).toEqual({ learnedDays: 1, windowDays: 30 });
  });

  it("adds the sessions of one day together", () => {
    const events = [snapshot("a", "2026-10-19", 100), snapshot("b", "2026-10-19", 80)];
    expect(thirtyDayRate(events, "2026-10-20").learnedDays).toBe(1);
  });

  it("keeps a whole session on the day it started, even past the cutoff", () => {
    // Started at 03:55 (day 19), still learning at 04:05 (day 20).
    const events = [snapshot("a", "2026-10-19", 0, 0), snapshot("a", "2026-10-20", 240, 10)];
    expect(thirtyDayRate(events, "2026-10-20").learnedDays).toBe(1);
    expect(thirtyDayRate(events, "2026-11-18").learnedDays).toBe(0);
  });

  it("leaves out days older than 30 days and days after today", () => {
    const events = [
      snapshot("old", "2026-09-20", 300),
      snapshot("first", "2026-09-21", 300),
      snapshot("future", "2026-10-21", 300),
    ];
    expect(thirtyDayRate(events, "2026-10-20").learnedDays).toBe(1);
  });

  it("keeps the days already learned when the home time zone changes", () => {
    // Two days learned in Ho Chi Minh City. Then the learner moves to Paris.
    const events = [snapshot("a", "2026-10-18", 300), snapshot("b", "2026-10-19", 300)];
    // 02:00 UTC on 20 Oct is 04:00 in Paris: a new day there.
    const todayInParis = learningDay(new Date("2026-10-20T02:00:00Z"), "Europe/Paris", 4);
    expect(todayInParis).toBe("2026-10-20");
    expect(thirtyDayRate(events, todayInParis)).toEqual({ learnedDays: 2, windowDays: 30 });
  });
});

describe("dayNumber", () => {
  it("counts days from 1970-01-01, one more each day, also across a month and a year", () => {
    expect(dayNumber("1970-01-01")).toBe(0);
    expect(dayNumber("1970-01-02")).toBe(1);
    expect(dayNumber("2026-10-31")).toBe(20757);
    expect(dayNumber("2026-11-01")).toBe(20758);
    expect(dayNumber("2027-01-01")).toBe(20819);
  });
});
