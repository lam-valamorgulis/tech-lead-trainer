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
      new Map([["cache", { itemId: "cache", step: 1, dueDay: "2026-10-11", caughtDay: "2026-10-10", stage: 1 }]]),
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

  describe("a recheck from a battle", () => {
    // cache: caught 10-10, Good 10-11 (step 3), Good 10-14 (step 7, due 10-21).
    const catches = [caught("cache", "2026-10-10")];
    const reviews = [reviewed("cache", "2026-10-11", "good"), reviewed("cache", "2026-10-14", "good")];

    it("makes the item due the next day and keeps its step and stage", () => {
      const states = reviewStates(catches, reviews, [{ itemId: "cache", learningDay: "2026-10-16" }]);
      expect(states.get("cache")).toEqual({
        itemId: "cache",
        step: 7,
        dueDay: "2026-10-17",
        caughtDay: "2026-10-10",
        stage: 1,
      });
    });

    it("never moves a due day later", () => {
      const states = reviewStates(catches, reviews, [{ itemId: "cache", learningDay: "2026-10-22" }]);
      expect(states.get("cache")?.dueDay).toBe("2026-10-21");
    });

    it("brings back an item whose reviews had ended", () => {
      // Good on each due day: steps 1, 3, 7, 14, 30, 90, 180, then the reviews end.
      const dueDays = ["2026-10-11", "2026-10-14", "2026-10-21", "2026-11-04", "2026-12-04", "2027-03-04", "2027-08-31"];
      const ended = dueDays.map((day) => reviewed("cache", day, "good"));
      expect(reviewStates(catches, ended).get("cache")?.dueDay).toBeNull();
      const states = reviewStates(catches, ended, [{ itemId: "cache", learningDay: "2027-09-10" }]);
      expect(states.get("cache")).toMatchObject({ step: 180, dueDay: "2027-09-11" });
    });

    it("does nothing for an item that is not caught, or was caught after the battle", () => {
      const states = reviewStates(catches, [], [
        { itemId: "cache.ttl", learningDay: "2026-10-12" },
        { itemId: "cache", learningDay: "2026-10-09" },
      ]);
      expect([...states.keys()]).toEqual(["cache"]);
      expect(states.get("cache")?.dueDay).toBe("2026-10-11");
    });

    it("counts in day order with the reviews: a later review moves the item on again", () => {
      const states = reviewStates(
        catches,
        [...reviews, reviewed("cache", "2026-10-17", "good")],
        [{ itemId: "cache", learningDay: "2026-10-16" }],
      );
      // Due 10-17 by the recheck, then Good on 10-17 from step 7 gives step 14.
      expect(states.get("cache")).toMatchObject({ step: 14, dueDay: "2026-10-31" });
    });

    it("counts after the reviews of the same day, because the battle comes after the reviews", () => {
      const states = reviewStates(catches, reviews, [{ itemId: "cache", learningDay: "2026-10-14" }]);
      expect(states.get("cache")).toMatchObject({ step: 7, dueDay: "2026-10-15" });
    });
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
    // Good on or after each due day, through all 7 steps.
    const days = ["2026-01-15", "2026-02-15", "2026-03-15", "2026-04-15", "2026-05-15", "2026-08-15", "2027-02-15"];
    const reviews = days.map((day) => reviewed("cache", day, "good"));
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

describe("an early review, before the due day (a mixed-in confusable partner)", () => {
  it("keeps the step and the due day after Good, Easy or Hard, so seeing it early never skips spacing", () => {
    for (const grade of ["good", "easy", "hard"] as const) {
      expect(gradeReview({ step: 3, gradedDay: "2026-10-10", grade, dueDay: "2026-10-12" })).toEqual({
        step: 3,
        dueDay: "2026-10-12",
      });
    }
  });

  it("still goes back one step after Again, because a real mistake counts", () => {
    expect(gradeReview({ step: 3, gradedDay: "2026-10-10", grade: "again", dueDay: "2026-10-12" })).toEqual({
      step: 1,
      dueDay: "2026-10-11",
    });
  });

  it("is replayed the same way from the log", () => {
    // Caught on the 1st: due on the 2nd. Good on the 2nd: step 3, due on the 5th. Then Good early on the 3rd.
    const states = reviewStates(
      [caught("cookie", "2026-10-01")],
      [reviewed("cookie", "2026-10-02", "good"), reviewed("cookie", "2026-10-03", "good")],
    );
    expect(states.get("cookie")).toMatchObject({ step: 3, dueDay: "2026-10-05" });
  });
});

describe("dueReviews with confusable pairs", () => {
  const TODAY = "2026-10-10";
  const pairs: [string, string][] = [
    ["cache", "cookie"],
    ["proxy", "cache.ttl"],
  ];
  const ids = (list: { itemId: string; mixedWith?: string }[]) => list.map((s) => (s.mixedWith ? `${s.itemId}~${s.mixedWith}` : s.itemId));

  it("puts a caught partner right after a due item, even when the partner is not due, and marks it", () => {
    // cache is due today. cookie was caught today, so it is not due until tomorrow.
    const states = reviewStates([caught("cache", "2026-10-09"), caught("cookie", TODAY)], []);
    expect(ids(dueReviews({ states, reviews: [], today: TODAY, pairs }))).toEqual(["cache", "cookie~cache"]);
  });

  it("moves a due partner next to its pair", () => {
    const states = reviewStates(
      [caught("cache", "2026-10-07"), caught("proxy", "2026-10-08"), caught("cookie", "2026-10-09")],
      [],
    );
    expect(ids(dueReviews({ states, reviews: [], today: TODAY, pairs }))).toEqual(["cache", "cookie", "proxy"]);
  });

  it("never lets a partner take a place from a due item: the 8 places go to the oldest due items first", () => {
    // 8 due items, caught on days 1 to 8. cache is the oldest. cookie, its partner, is not due yet.
    const records = [
      caught("cache", "2026-10-01"),
      ...Array.from({ length: 7 }, (_, i) => caught(`item${i}`, `2026-10-0${i + 2}`)),
      caught("cookie", TODAY),
    ];
    const due = dueReviews({ states: reviewStates(records, []), reviews: [], today: TODAY, pairs });
    expect(ids(due)).toEqual(["cache", "item0", "item1", "item2", "item3", "item4", "item5", "item6"]);
  });

  it("moves a due partner up only inside today's places, never past an older due item that would drop out", () => {
    // 9 due items, oldest first: cache, item0..item6, cookie. Only 8 fit, so cookie stays out.
    const records = [
      caught("cache", "2026-10-01"),
      ...Array.from({ length: 7 }, (_, i) => caught(`item${i}`, `2026-10-0${i + 2}`)),
      caught("cookie", "2026-10-09"),
    ];
    const due = dueReviews({ states: reviewStates(records, []), reviews: [], today: TODAY, pairs });
    expect(ids(due)).toEqual(["cache", "item0", "item1", "item2", "item3", "item4", "item5", "item6"]);
  });

  it("adds no partner that is not caught, already reviewed today, or past the daily limit of 8", () => {
    const one = reviewStates([caught("cache", "2026-10-09")], []);
    expect(ids(dueReviews({ states: one, reviews: [], today: TODAY, pairs }))).toEqual(["cache"]);

    const both = reviewStates([caught("cache", "2026-10-09"), caught("cookie", TODAY)], []);
    const cookieDone = [reviewed("cookie", TODAY, "good")];
    expect(ids(dueReviews({ states: both, reviews: cookieDone, today: TODAY, pairs }))).toEqual(["cache"]);

    const sevenDone = Array.from({ length: 7 }, (_, i) => reviewed(`other-${i}`, TODAY, "good"));
    expect(ids(dueReviews({ states: both, reviews: sevenDone, today: TODAY, pairs }))).toEqual(["cache"]);
  });
});
