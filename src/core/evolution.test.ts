import { describe, expect, it } from "vitest";
import type { CatchRecord } from "./catch.ts";
import { backlogPaused, reviewStates, type Grade, type ReviewRecord } from "./review.ts";

const caught = (itemId: string, learningDay: string): CatchRecord => ({ itemId, correct: true, learningDay });
const reviewed = (itemId: string, learningDay: string, grade: Grade): ReviewRecord => ({ itemId, learningDay, grade });

/** Reviews an item on time with the given grades, starting the day after the catch. */
function onTime(itemId: string, caughtDay: string, grades: Grade[]) {
  const catches = [caught(itemId, caughtDay)];
  const reviews: ReviewRecord[] = [];
  for (const grade of grades) {
    const state = reviewStates(catches, reviews).get(itemId)!;
    reviews.push(reviewed(itemId, state.dueDay!, grade));
  }
  return reviewStates(catches, reviews).get(itemId)!;
}

describe("evolution", () => {
  it("starts at stage 1 when caught", () => {
    expect(onTime("cache", "2026-10-01", []).stage).toBe(1);
  });

  it("stays at stage 1 until the 7-day step is passed", () => {
    // 1 → 3 → 7: now on the 7-day step, not past it.
    expect(onTime("cache", "2026-10-01", ["good", "good"]).stage).toBe(1);
  });

  it("reaches stage 2 after passing the 7-day step", () => {
    expect(onTime("cache", "2026-10-01", ["good", "good", "good"]).stage).toBe(2);
  });

  it("reaches stage 2 when Easy jumps over the 7-day step", () => {
    // 1 → 3, then Easy 3 → 14.
    expect(onTime("cache", "2026-10-01", ["good", "easy"]).stage).toBe(2);
  });

  it("reaches stage 3 after passing the 30-day step", () => {
    // 1 → 3 → 7 → 14 → 30 → 90.
    expect(onTime("cache", "2026-10-01", ["good", "good", "good", "good", "good"]).stage).toBe(3);
  });

  it("keeps its stage after a later Again", () => {
    const state = onTime("cache", "2026-10-01", ["good", "good", "good", "again"]);
    expect({ step: state.step, stage: state.stage }).toEqual({ step: 7, stage: 2 });
  });

  it("does not evolve on Hard or Again", () => {
    expect(onTime("cache", "2026-10-01", ["good", "good", "hard", "again", "hard"]).stage).toBe(1);
  });
});

describe("backlogPaused", () => {
  /** n items caught on `day`, so all of them are first due the day after. */
  const catchesOn = (day: string, n: number, prefix = day) =>
    Array.from({ length: n }, (_, i) => caught(`${prefix}-${i}`, day));

  it("does not pause when more than 8 are due on only 2 days in a row", () => {
    const catches = catchesOn("2026-10-17", 9);
    // Due from 18 Oct. Today is 19 Oct: 2 days over 8.
    expect(backlogPaused(catches, [], "2026-10-19")).toBe(false);
  });

  it("pauses new catches when more than 8 are due on 3 days in a row", () => {
    const catches = catchesOn("2026-10-17", 9);
    expect(backlogPaused(catches, [], "2026-10-20")).toBe(true);
  });

  it("does not pause at exactly 8 due", () => {
    expect(backlogPaused(catchesOn("2026-10-10", 8), [], "2026-10-20")).toBe(false);
  });

  it("starts again when 8 or fewer are due", () => {
    const catches = catchesOn("2026-10-17", 9);
    // On 20 Oct the learner reviews 8 of them: 1 stays due on 21 Oct.
    const reviews = catches.slice(0, 8).map((c) => reviewed(c.itemId, "2026-10-20", "good"));
    expect(backlogPaused(catches, reviews, "2026-10-21")).toBe(false);
  });

  it("counts the queue at the start of each day, before that day's reviews", () => {
    const catches = catchesOn("2026-10-17", 9);
    const reviews = catches.slice(0, 5).map((c) => reviewed(c.itemId, "2026-10-20", "good"));
    // Reviews done today do not lift the pause until tomorrow.
    expect(backlogPaused(catches, reviews, "2026-10-20")).toBe(true);
  });

  it("does not count items that can no longer be reviewed", () => {
    const catches = catchesOn("2026-10-17", 9);
    const retired = catches[0].itemId;
    expect(backlogPaused(catches, [], "2026-10-20", (id) => id !== retired)).toBe(false);
  });
});
