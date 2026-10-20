import { describe, expect, it } from "vitest";
import { buildBundle } from "@/content/bundle";
import { fixtureTown } from "@/content/fixture-town";
import { townSchema } from "@/content/schema";
import type { CatchRecord } from "./catch.ts";
import type { SessionSnapshot } from "./day.ts";
import { reviewStates, type Grade, type ReviewRecord } from "./review.ts";
import type { TurnRecord } from "./battle.ts";
import { bestMovesByTown, fieldGuideCounts, learningCalendar, weakestThisWeek, yearGoals } from "./tracking.ts";
import type { CreatureOf } from "./week.ts";

function learned(day: string, activeSeconds = 180): SessionSnapshot {
  return { sessionId: `s-${day}-${activeSeconds}`, learningDay: day, activeSeconds, occurredAt: new Date(`${day}T03:00:00Z`) };
}

describe("learningCalendar", () => {
  // 2026-10-21 is a Wednesday. Its 30 days start on Tuesday 2026-09-22.
  const today = "2026-10-21";

  it("shows the 30 days of the 30-day rate, in whole weeks from Monday to Sunday", () => {
    const weeks = learningCalendar([], today);
    expect(weeks.map((week) => [week[0].day, week[6].day])).toEqual([
      ["2026-09-21", "2026-09-27"],
      ["2026-09-28", "2026-10-04"],
      ["2026-10-05", "2026-10-11"],
      ["2026-10-12", "2026-10-18"],
      ["2026-10-19", "2026-10-25"],
    ]);
    const inWindow = weeks.flat().filter((cell) => cell.status !== "outside");
    expect(inWindow).toHaveLength(30);
    expect(inWindow[0].day).toBe("2026-09-22");
    expect(inWindow[29].day).toBe(today);
  });

  it("marks a day learned at 3 minutes, the same rule as the 30-day rate", () => {
    const cells = learningCalendar([learned("2026-10-20", 180), learned("2026-10-19", 179)], today).flat();
    const status = (day: string) => cells.find((cell) => cell.day === day)?.status;
    expect(status("2026-10-20")).toBe("learned");
    expect(status("2026-10-19")).toBe("not-learned");
    // Before the window and after today: shown as blank cells, never as learned.
    expect(status("2026-09-21")).toBe("outside");
    expect(status("2026-10-22")).toBe("outside");
  });

  it("never marks learning outside the window, so it agrees with the 30-day rate", () => {
    const cells = learningCalendar([learned("2026-09-21", 600), learned("2026-10-22", 600)], today).flat();
    expect(cells.filter((cell) => cell.status === "learned")).toEqual([]);
  });
});

describe("weakestThisWeek", () => {
  const NAMES: Record<string, string> = { cache: "Cache", cookie: "Cookie", proxy: "Proxy", cors: "CORS" };
  /** A move id is "<creature>.<move>", so its creature is the part before the dot. */
  const creatureOf: CreatureOf = (itemId) => {
    const id = itemId.split(".")[0];
    return NAMES[id] ? { id, name: NAMES[id] } : undefined;
  };
  const reviewed = (itemId: string, learningDay: string, grade: Grade): ReviewRecord => ({ itemId, learningDay, grade });
  // Wednesday. This week runs from Monday 2026-10-19.
  const today = "2026-10-21";

  it("counts only this week's reviews, from Monday up to today", () => {
    const reviews = [
      reviewed("cache", "2026-10-18", "again"),
      reviewed("cookie", "2026-10-19", "hard"),
      reviewed("proxy", "2026-10-21", "again"),
      reviewed("cors", "2026-10-22", "again"),
    ];
    expect(weakestThisWeek(reviews, today, creatureOf).map((c) => c.name)).toEqual(["Proxy", "Cookie"]);
  });

  it("uses the Sunday summary's rule: at most 3, Again before Hard, a move counts for its creature", () => {
    const reviews = [
      reviewed("cache.ttl", "2026-10-19", "hard"),
      reviewed("cache", "2026-10-20", "hard"),
      reviewed("cookie.http-only", "2026-10-20", "again"),
      reviewed("proxy", "2026-10-20", "hard"),
      reviewed("cors", "2026-10-21", "again"),
      reviewed("cors", "2026-10-21", "again"),
    ];
    expect(weakestThisWeek(reviews, today, creatureOf).map((c) => c.name)).toEqual(["CORS", "Cookie", "Cache"]);
  });

  it("is empty when this week has only good answers", () => {
    expect(weakestThisWeek([reviewed("cache", "2026-10-20", "good"), reviewed("cookie", "2026-10-20", "easy")], today, creatureOf)).toEqual([]);
  });
});

describe("fieldGuideCounts", () => {
  // The fixture town has 3 creatures: Cache, Cookie and Proxy.
  const town = buildBundle([townSchema.parse(fixtureTown())]).towns[0];
  const answered = (itemId: string, correct: boolean): CatchRecord => ({ itemId, correct, learningDay: "2026-01-01" });

  /** Good on every due day, until the item has passed the 30-day step. */
  function reviewedPastThirtyDays(catches: CatchRecord[], itemId: string): ReviewRecord[] {
    const reviews: ReviewRecord[] = [];
    for (let i = 0; i < 5; i += 1) {
      const due = reviewStates(catches, reviews).get(itemId)!.dueDay!;
      reviews.push({ itemId, learningDay: due, grade: "good" });
    }
    return reviews;
  }

  it("counts seen, caught and fully evolved creatures; a caught creature was seen too", () => {
    const catches = [answered("cache", true), answered("cookie", false), answered("cookie.http-only", true)];
    expect(fieldGuideCounts([town], catches, [])).toEqual({ seen: 2, caught: 1, fullyEvolved: 0 });
  });

  it("counts a creature as fully evolved at stage 3, after the 30-day step", () => {
    const catches = [answered("cache", true), answered("proxy", true)];
    const reviews = reviewedPastThirtyDays(catches, "cache");
    expect(fieldGuideCounts([town], catches, reviews)).toEqual({ seen: 2, caught: 2, fullyEvolved: 1 });
  });

  it("is all zero for a new learner", () => {
    expect(fieldGuideCounts([town], [], [])).toEqual({ seen: 0, caught: 0, fullyEvolved: 0 });
  });
});

describe("bestMovesByTown", () => {
  const turn = (scenarioId: string, bestMove: boolean): TurnRecord => ({
    battleId: "b",
    scenarioId,
    turnNumber: 1,
    moveId: "cache.ttl",
    bestMove,
    learningDay: "2026-10-20",
  });

  it("gives each town with battle turns its rate and name, in town order", () => {
    // The fixture town t99 is town 1. Town t02 has no content here, so its name comes from the year plan.
    const town = buildBundle([townSchema.parse(fixtureTown())]).towns[0];
    const turns = [turn("t02-rate-limit", false), turn("t99-sale-day", true), turn("t99-flash-sale", false), turn("t99-sale-day", true)];
    expect(bestMovesByTown(turns, [town])).toEqual([
      { townId: "t99", name: "Town 1: Fixture Town", rate: { bestMoves: 2, turns: 3 } },
      { townId: "t02", name: "Town 2: API design", rate: { bestMoves: 0, turns: 1 } },
    ]);
  });

  it("is empty before the first battle", () => {
    expect(bestMovesByTown([], [])).toEqual([]);
  });
});

describe("yearGoals", () => {
  const badge = (townId: string) => ({ townId, earnedOn: "2027-01-01" });
  const twelve = Array.from({ length: 12 }, (_, i) => badge(`t${String(i + 1).padStart(2, "0")}`));

  it("are the 3 goals of the year, in order, with the badge count on the first", () => {
    expect(yearGoals([badge("t01"), badge("t02")], [])).toEqual([
      { id: "twelve-badges", label: "12 badges (2 of 12)", checked: false, byHand: false },
      { id: "interview-tower", label: "Interview Tower passed", checked: false, byHand: true },
      { id: "champion-project", label: "Champion project done", checked: false, byHand: true },
    ]);
  });

  it("checks 12 badges by itself once there are 12 badges", () => {
    expect(yearGoals(twelve.slice(0, 11), [])[0].checked).toBe(false);
    expect(yearGoals(twelve, [])[0]).toEqual({ id: "twelve-badges", label: "12 badges (12 of 12)", checked: true, byHand: false });
  });

  it("checks the other two only by hand", () => {
    expect(yearGoals(twelve, ["champion-project"]).map((goal) => goal.checked)).toEqual([true, false, true]);
    expect(yearGoals([], ["interview-tower"]).map((goal) => goal.checked)).toEqual([false, true, false]);
  });
});
