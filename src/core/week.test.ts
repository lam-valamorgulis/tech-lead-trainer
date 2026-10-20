import { describe, expect, it } from "vitest";
import { learningDay, type SessionSnapshot } from "./day.ts";
import type { TurnRecord } from "./battle.ts";
import type { ReviewRecord } from "./review.ts";
import {
  formatWeek,
  formatWeekMinutes,
  latestSummaryWeek,
  weakestCreatures,
  weeklySummary,
  weekMinutes,
  weekStart,
  WEEKLY_GOAL_MINUTES,
  type Creature,
} from "./week.ts";

const HCM = "Asia/Ho_Chi_Minh";

function snapshot(sessionId: string, day: string, activeSeconds: number, minute = 0): SessionSnapshot {
  return { sessionId, learningDay: day, activeSeconds, occurredAt: new Date(Date.UTC(2026, 9, 1, 0, minute)) };
}

describe("weekStart", () => {
  it("is the Monday of the learning day's week", () => {
    // 2026-10-19 is a Monday, 2026-10-25 a Sunday.
    expect(weekStart("2026-10-19")).toBe("2026-10-19");
    expect(weekStart("2026-10-22")).toBe("2026-10-19");
    expect(weekStart("2026-10-25")).toBe("2026-10-19");
    expect(weekStart("2026-10-26")).toBe("2026-10-26");
  });

  it("starts the new week on Monday at the cutoff hour, 04:00 home time", () => {
    // 03:59 on Monday 26 Oct in Ho Chi Minh City (UTC+7) still belongs to the week before.
    expect(weekStart(learningDay(new Date("2026-10-25T20:59:00Z"), HCM, 4))).toBe("2026-10-19");
    expect(weekStart(learningDay(new Date("2026-10-25T21:00:00Z"), HCM, 4))).toBe("2026-10-26");
  });
});

describe("weekMinutes", () => {
  it("adds the active time of this week's learning days up to today, in whole minutes", () => {
    const events = [
      snapshot("sun-before", "2026-10-18", 3000),
      snapshot("mon", "2026-10-19", 600),
      snapshot("mon", "2026-10-19", 1200, 1),
      snapshot("wed", "2026-10-21", 959),
    ];
    // 1200 + 959 seconds = 35 minutes 59 seconds.
    expect(weekMinutes(events, "2026-10-21")).toBe(35);
  });

  it("leaves out days after today", () => {
    expect(weekMinutes([snapshot("a", "2026-10-22", 600)], "2026-10-21")).toBe(0);
  });

  it("counts a session for the day it started, so one that began last Sunday stays in last week", () => {
    const events = [snapshot("late", "2026-10-18", 60, 0), snapshot("late", "2026-10-19", 1800, 30)];
    expect(weekMinutes(events, "2026-10-19")).toBe(0);
  });
});

describe("formatWeekMinutes", () => {
  it("shows minutes against the goal of 5 hours 15 minutes", () => {
    expect(WEEKLY_GOAL_MINUTES).toBe(315);
    expect(formatWeekMinutes(0)).toBe("0 min of 5 h 15 min");
    expect(formatWeekMinutes(47)).toBe("47 min of 5 h 15 min");
    expect(formatWeekMinutes(80)).toBe("1 h 20 min of 5 h 15 min");
    expect(formatWeekMinutes(360)).toBe("6 h of 5 h 15 min");
  });
});

describe("formatWeek", () => {
  it("names the week by its Monday and its Sunday", () => {
    expect(formatWeek("2026-10-12")).toBe("12 Oct – 18 Oct");
    expect(formatWeek("2026-09-28")).toBe("28 Sep – 4 Oct");
  });
});

describe("latestSummaryWeek", () => {
  it("is last week until Sunday 20:00 home time, then this week", () => {
    // Sunday 25 Oct in Ho Chi Minh City (UTC+7): 19:59 and 20:00.
    expect(latestSummaryWeek(new Date("2026-10-25T12:59:00Z"), HCM)).toEqual({
      weekStart: "2026-10-12",
      summaryAt: new Date("2026-10-18T13:00:00Z"),
    });
    expect(latestSummaryWeek(new Date("2026-10-25T13:00:00Z"), HCM)).toEqual({
      weekStart: "2026-10-19",
      summaryAt: new Date("2026-10-25T13:00:00Z"),
    });
  });

  it("stays on the week that just ended from Sunday night until next Sunday 20:00", () => {
    const week = { weekStart: "2026-10-19", summaryAt: new Date("2026-10-25T13:00:00Z") };
    // Monday 02:00, Wednesday 12:00 and Saturday 23:00 home time.
    expect(latestSummaryWeek(new Date("2026-10-25T19:00:00Z"), HCM)).toEqual(week);
    expect(latestSummaryWeek(new Date("2026-10-28T05:00:00Z"), HCM)).toEqual(week);
    expect(latestSummaryWeek(new Date("2026-10-31T16:00:00Z"), HCM)).toEqual(week);
  });

  it("finds 20:00 home time across summer time changes", () => {
    // London: summer time (UTC+1) on 18 Oct, winter time (UTC+0) from 25 Oct 2026.
    expect(latestSummaryWeek(new Date("2026-10-20T12:00:00Z"), "Europe/London").summaryAt).toEqual(
      new Date("2026-10-18T19:00:00Z"),
    );
    expect(latestSummaryWeek(new Date("2026-10-26T12:00:00Z"), "Europe/London").summaryAt).toEqual(
      new Date("2026-10-25T20:00:00Z"),
    );
    // New York leaves summer time on Sunday 1 Nov 2026: 20:00 that evening is 01:00 UTC on Monday.
    expect(latestSummaryWeek(new Date("2026-11-02T12:00:00Z"), "America/New_York")).toEqual({
      weekStart: "2026-10-26",
      summaryAt: new Date("2026-11-02T01:00:00Z"),
    });
  });
});

const CREATURES: Record<string, Creature> = {
  cache: { id: "cache", name: "Cache" },
  dns: { id: "dns", name: "DNS" },
  http: { id: "http", name: "HTTP" },
  tls: { id: "tls", name: "TLS" },
};

/** A creature and its moves (ids like "cache.ttl") belong to the same creature. */
const creatureOf = (itemId: string) => CREATURES[itemId.split(".")[0]];

function review(itemId: string, grade: ReviewRecord["grade"], learningDay = "2026-10-20"): ReviewRecord {
  return { itemId, grade, learningDay };
}

describe("weakestCreatures", () => {
  it("ranks creatures by Again answers, then Hard answers, and keeps at most 3", () => {
    const reviews = [
      review("dns", "hard"),
      review("cache", "again"),
      review("cache.ttl", "again"),
      review("http", "again"),
      review("http", "hard"),
      review("tls", "hard"),
      review("tls", "hard"),
    ];
    // Cache: 2 Again (one on its move TTL). HTTP: 1 Again, 1 Hard. TLS: 2 Hard. DNS: 1 Hard.
    expect(weakestCreatures(reviews, creatureOf)).toEqual([CREATURES.cache, CREATURES.http, CREATURES.tls]);
  });

  it("leaves out creatures that only got Good or Easy, so a strong creature is never called weak", () => {
    expect(weakestCreatures([review("cache", "good"), review("dns", "easy"), review("tls", "hard")], creatureOf)).toEqual([
      CREATURES.tls,
    ]);
    expect(weakestCreatures([], creatureOf)).toEqual([]);
  });

  it("breaks a tie by the creature id, so the order never changes between two runs", () => {
    expect(weakestCreatures([review("tls", "again"), review("dns", "again")], creatureOf)).toEqual([
      CREATURES.dns,
      CREATURES.tls,
    ]);
  });

  it("skips reviews of items the content no longer has", () => {
    expect(weakestCreatures([review("gone", "again")], creatureOf)).toEqual([]);
  });
});

function turn(bestMove: boolean, learningDay = "2026-10-20"): TurnRecord {
  return { battleId: "b", scenarioId: "t01-x", turnNumber: 1, moveId: "cache.ttl", bestMove, learningDay };
}

describe("weeklySummary", () => {
  it("holds days learned, minutes against 315, the best-move rate and the 3 weakest creatures of one week", () => {
    const summary = weeklySummary({
      weekStart: "2026-10-19",
      snapshots: [
        snapshot("mon", "2026-10-19", 900),
        snapshot("tue", "2026-10-20", 120),
        snapshot("sat", "2026-10-24", 2700),
        snapshot("before", "2026-10-18", 3000),
        snapshot("after", "2026-10-26", 3000),
      ],
      turns: [turn(true), turn(false), turn(true, "2026-10-24"), turn(false, "2026-10-18")],
      reviews: [review("dns", "again"), review("cache", "again", "2026-10-26"), review("http", "hard", "2026-10-18")],
      creatureOf,
    });
    expect(summary).toEqual({
      weekStart: "2026-10-19",
      // Monday (15 min) and Saturday (45 min) count. Tuesday has only 2 minutes.
      daysLearned: 2,
      minutes: 62,
      goalMinutes: 315,
      bestMoves: { bestMoves: 2, turns: 3 },
      weakest: [CREATURES.dns],
    });
  });

  it("is all zeros for a week with nothing in it", () => {
    expect(weeklySummary({ weekStart: "2026-10-19", snapshots: [], turns: [], reviews: [], creatureOf })).toEqual({
      weekStart: "2026-10-19",
      daysLearned: 0,
      minutes: 0,
      goalMinutes: 315,
      bestMoves: { bestMoves: 0, turns: 0 },
      weakest: [],
    });
  });
});
