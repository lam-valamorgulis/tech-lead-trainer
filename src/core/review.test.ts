import { describe, expect, it } from "vitest";
import type { CatchRecord } from "./catch.ts";
import { dueReviews, gradeReview, reviewStates, REVIEW_STEPS, type ReviewRecord } from "./review.ts";

const caught = (itemId: string, learningDay: string): CatchRecord => ({ itemId, correct: true, learningDay });
const reviewed = (itemId: string, learningDay: string, grade: ReviewRecord["grade"]): ReviewRecord => ({
  itemId,
  learningDay,
  grade,
});

describe("review steps", () => {
  it("are 1, 3, 7, 14, 30 and 90 days, plus one near day 180", () => {
    expect(REVIEW_STEPS).toEqual([1, 3, 7, 14, 30, 90, 180]);
  });
});

describe("gradeReview", () => {
  it("Good moves to the next step", () => {
    expect(gradeReview({ step: 3, gradedDay: "2026-10-10", grade: "good" })).toEqual({ step: 7, dueDay: "2026-10-17" });
  });

  it("Hard repeats the current step", () => {
    expect(gradeReview({ step: 3, gradedDay: "2026-10-10", grade: "hard" })).toEqual({ step: 3, dueDay: "2026-10-13" });
  });

  it("Again goes back one step", () => {
    expect(gradeReview({ step: 3, gradedDay: "2026-10-10", grade: "again" })).toEqual({ step: 1, dueDay: "2026-10-11" });
  });

  it("Again on the first step stays on the first step", () => {
    expect(gradeReview({ step: 1, gradedDay: "2026-10-10", grade: "again" })).toEqual({ step: 1, dueDay: "2026-10-11" });
  });

  it("Easy skips one step", () => {
    expect(gradeReview({ step: 3, gradedDay: "2026-10-10", grade: "easy" })).toEqual({ step: 14, dueDay: "2026-10-24" });
  });

  it("Easy near the end stops at the last step", () => {
    expect(gradeReview({ step: 90, gradedDay: "2026-10-10", grade: "easy" })).toEqual({
      step: 180,
      dueDay: "2027-04-08",
    });
  });

  it("Good on the last step ends the reviews", () => {
    expect(gradeReview({ step: 180, gradedDay: "2026-10-10", grade: "good" })).toEqual({ step: 180, dueDay: null });
  });
});

describe("reviewStates", () => {
  it("makes a caught item due the next day, on the 1-day step", () => {
    expect(reviewStates([caught("cache", "2026-10-10")], [])).toEqual(
      new Map([["cache", { itemId: "cache", step: 1, dueDay: "2026-10-11", caughtDay: "2026-10-10" }]]),
    );
  });

  it("replays every review in order", () => {
    const states = reviewStates(
      [caught("cache", "2026-10-10")],
      [reviewed("cache", "2026-10-11", "good"), reviewed("cache", "2026-10-14", "again")],
    );
    expect(states.get("cache")).toMatchObject({ step: 1, dueDay: "2026-10-15" });
  });

  it("ignores wrong catch answers and uses the first right one", () => {
    const records: CatchRecord[] = [
      { itemId: "cache", correct: false, learningDay: "2026-10-09" },
      caught("cache", "2026-10-10"),
      caught("cache", "2026-10-12"),
    ];
    expect(reviewStates(records, []).get("cache")).toMatchObject({ caughtDay: "2026-10-10", dueDay: "2026-10-11" });
  });
});

describe("dueReviews", () => {
  it("shows the items due today or earlier, oldest overdue first", () => {
    const states = reviewStates(
      [caught("a", "2026-10-15"), caught("b", "2026-10-10"), caught("c", "2026-10-19"), caught("d", "2026-10-20")],
      [],
    );
    expect(dueReviews({ states, reviews: [], today: "2026-10-20" }).map((s) => s.itemId)).toEqual(["b", "a", "c"]);
  });

  it("shows at most 8 when 11 are overdue, the oldest first", () => {
    const records = Array.from({ length: 11 }, (_, i) => caught(`item${i}`, `2026-10-${String(i + 1).padStart(2, "0")}`));
    const due = dueReviews({ states: reviewStates(records, []), reviews: [], today: "2026-10-20" });
    expect(due.map((s) => s.itemId)).toEqual(["item0", "item1", "item2", "item3", "item4", "item5", "item6", "item7"]);
  });

  it("leaves out items whose reviews have ended", () => {
    const records = [caught("cache", "2026-01-01")];
    const reviews = (["good", "good", "good", "good", "good", "good", "good"] as const).map((grade, i) =>
      reviewed("cache", `2026-0${i + 1}-15`, grade),
    );
    expect(dueReviews({ states: reviewStates(records, reviews), reviews, today: "2027-12-31" })).toEqual([]);
  });

  it("counts the reviews already done today against the 8, across sessions", () => {
    const records = Array.from({ length: 11 }, (_, i) => caught(`item${i}`, `2026-10-${String(i + 1).padStart(2, "0")}`));
    const doneToday = ["item0", "item1", "item2", "item3", "item4"].map((id) => reviewed(id, "2026-10-20", "good"));
    const due = dueReviews({ states: reviewStates(records, doneToday), reviews: doneToday, today: "2026-10-20" });
    expect(due.map((s) => s.itemId)).toEqual(["item5", "item6", "item7"]);
  });

  it("skips items that can no longer be reviewed before it takes the 8", () => {
    const records = Array.from({ length: 10 }, (_, i) => caught(`item${i}`, `2026-10-${String(i + 1).padStart(2, "0")}`));
    const retired = new Set(["item0", "item1"]);
    const due = dueReviews({
      states: reviewStates(records, []),
      reviews: [],
      today: "2026-10-20",
      isReviewable: (id) => !retired.has(id),
    });
    expect(due.map((s) => s.itemId)).toEqual(["item2", "item3", "item4", "item5", "item6", "item7", "item8", "item9"]);
  });
});
