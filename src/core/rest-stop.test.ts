import { describe, expect, it } from "vitest";
import type { SessionSnapshot } from "./day.ts";
import { lastLearnedDay, showsRestStop } from "./rest-stop.ts";

function snapshot(sessionId: string, day: string, activeSeconds: number, minute = 0): SessionSnapshot {
  return { sessionId, learningDay: day, activeSeconds, occurredAt: new Date(Date.UTC(2026, 9, 1, 0, minute)) };
}

describe("lastLearnedDay", () => {
  it("is the latest day with at least 3 minutes of learning", () => {
    const events = [
      snapshot("a", "2026-10-10", 300),
      snapshot("b", "2026-10-14", 200),
      snapshot("c", "2026-10-16", 179),
    ];
    expect(lastLearnedDay(events, "2026-10-20")).toBe("2026-10-14");
  });

  it("adds short sessions of one day together, like the 30-day rate", () => {
    const events = [snapshot("a", "2026-10-15", 100), snapshot("b", "2026-10-15", 80)];
    expect(lastLearnedDay(events, "2026-10-20")).toBe("2026-10-15");
  });

  it("is null when no day has 3 minutes of learning yet", () => {
    expect(lastLearnedDay([], "2026-10-20")).toBeNull();
    expect(lastLearnedDay([snapshot("a", "2026-10-19", 120)], "2026-10-20")).toBeNull();
  });

  it("leaves out days after today, for example after a time zone change", () => {
    const events = [snapshot("a", "2026-10-15", 300), snapshot("b", "2026-10-21", 300)];
    expect(lastLearnedDay(events, "2026-10-20")).toBe("2026-10-15");
  });
});

describe("showsRestStop", () => {
  it("shows when the last learned day is 3 or more days ago", () => {
    expect(showsRestStop("2026-10-17", "2026-10-20")).toBe(true);
    expect(showsRestStop("2026-09-01", "2026-10-20")).toBe(true);
  });

  it("does not show when the last learned day is 2 days ago or closer", () => {
    expect(showsRestStop("2026-10-18", "2026-10-20")).toBe(false);
    expect(showsRestStop("2026-10-19", "2026-10-20")).toBe(false);
    expect(showsRestStop("2026-10-20", "2026-10-20")).toBe(false);
  });

  it("counts across a month end", () => {
    expect(showsRestStop("2026-10-30", "2026-11-02")).toBe(true);
    expect(showsRestStop("2026-10-31", "2026-11-02")).toBe(false);
  });

  it("never shows for a new learner with no learned day yet", () => {
    expect(showsRestStop(null, "2026-10-20")).toBe(false);
  });
});
