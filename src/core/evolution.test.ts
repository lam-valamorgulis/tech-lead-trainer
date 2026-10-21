import { describe, expect, it } from "vitest";
import type { CatchRecord } from "./catch.ts";
import {
  asksTradeOff,
  backlogPaused,
  evolvesTo,
  REVIEW_RULES,
  reviewStates,
  type CardRecord,
  type Grade,
  type ReviewRecord,
  type ReviewState,
} from "./review.ts";

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

describe("evolvesTo: the evolution moment after one grade", () => {
  const onStep = (step: ReviewState["step"], stage: ReviewState["stage"]): ReviewState => ({
    itemId: "cache",
    step,
    dueDay: "2026-10-20",
    caughtDay: "2026-10-01",
    stage,
  });

  it("says stage 2 when Good passes the 7-day step", () => {
    expect(evolvesTo(onStep(7, 1), "good", "2026-10-20")).toBe(2);
  });

  it("says stage 2 when Easy jumps over the 7-day step", () => {
    expect(evolvesTo(onStep(3, 1), "easy", "2026-10-20")).toBe(2);
  });

  it("says nothing when Good passes the 30-day step: Stage 3 waits for the trade-off answer (v1.5)", () => {
    expect(evolvesTo(onStep(30, 2), "good", "2026-10-20")).toBeNull();
  });

  it("says stage 3 at the 30-day step when the creature has no trade-off question to show", () => {
    expect(evolvesTo(onStep(30, 2), "good", "2026-10-20", false)).toBe(3);
    expect(evolvesTo(onStep(14, 2), "good", "2026-10-20", false)).toBeNull();
  });

  it("says nothing on Hard or Again", () => {
    expect(evolvesTo(onStep(7, 1), "hard", "2026-10-20")).toBeNull();
    expect(evolvesTo(onStep(7, 1), "again", "2026-10-20")).toBeNull();
  });

  it("says nothing when the stage does not change", () => {
    // Back on the 7-day step after an Again, already stage 2.
    expect(evolvesTo(onStep(7, 2), "good", "2026-10-20")).toBeNull();
    expect(evolvesTo(onStep(3, 1), "good", "2026-10-20")).toBeNull();
  });

  it("says nothing for an early review, which keeps its step", () => {
    expect(evolvesTo(onStep(7, 1), "good", "2026-10-18")).toBeNull();
  });

  it("agrees with the Field Guide stage replayed from the log", () => {
    const before = onTime("cache", "2026-10-01", ["good", "good"]);
    const after = onTime("cache", "2026-10-01", ["good", "good", "good"]);
    expect(evolvesTo(before, "good", before.dueDay!)).toBe(after.stage);
  });
});

describe("Stage 3 with the trade-off question (v1.5, design 6.5)", () => {
  const graded = (itemId: string, learningDay: string, grade: Grade): ReviewRecord => ({ itemId, learningDay, grade, rules: REVIEW_RULES });
  const tradeOff = (learningDay: string, right: boolean): CardRecord => ({
    cardId: "cache.trade-off.fresh-prices",
    kind: "trade-off",
    learningDay,
    right,
  });

  /** v1.5 reviews on time with the given grades, starting the day after the catch. */
  function v15OnTime(grades: Grade[], cards: CardRecord[] = []) {
    const catches = [caught("cache", "2026-01-01")];
    const reviews: ReviewRecord[] = [];
    for (const grade of grades) {
      const state = reviewStates(catches, reviews).get("cache")!;
      reviews.push(graded("cache", state.dueDay!, grade));
    }
    return { catches, reviews, state: reviewStates(catches, reviews, [], cards).get("cache")! };
  }
  const TO_90 = ["good", "good", "good", "good", "good"] as Grade[];

  it("keeps Stage 2 after passing the 30-day step with no trade-off answer", () => {
    const { state } = v15OnTime(TO_90);
    expect({ step: state.step, stage: state.stage }).toEqual({ step: 90, stage: 2 });
  });

  it("gives Stage 3 after a right trade-off answer at the 30-day step", () => {
    const { reviews } = v15OnTime(TO_90);
    const passDay = reviews.at(-1)!.learningDay;
    expect(v15OnTime(TO_90, [tradeOff(passDay, true)]).state.stage).toBe(3);
  });

  it("keeps Stage 2 after a wrong answer, and a right answer at the next review gives Stage 3", () => {
    const { reviews, catches } = v15OnTime(TO_90);
    const passDay = reviews.at(-1)!.learningDay;
    const wrong = [tradeOff(passDay, false)];
    expect(reviewStates(catches, reviews, [], wrong).get("cache")!.stage).toBe(2);

    const next = reviewStates(catches, reviews, [], wrong).get("cache")!;
    const later = [...reviews, graded("cache", next.dueDay!, "good")];
    expect(reviewStates(catches, later, [], wrong).get("cache")!.stage).toBe(2);
    expect(reviewStates(catches, later, [], [...wrong, tradeOff(next.dueDay!, true)]).get("cache")!.stage).toBe(3);
  });

  it("gives Stage 3 at the 30-day step itself when the creature had no trade-off question (a review with no rules)", () => {
    // A Stage 2 creature that waited on v1.5 rules, then its question was gone at the next review.
    const { catches, reviews, state } = v15OnTime(TO_90);
    const noQuestion: ReviewRecord = { itemId: "cache", learningDay: state.dueDay!, grade: "good", rules: null };
    expect(reviewStates(catches, [...reviews, noQuestion]).get("cache")!.stage).toBe(3);
  });

  it("needs the 30-day step too: a right answer before it does not evolve", () => {
    // 1 → 3 → 7 → 14: Stage 2, not past the 30-day step yet.
    const { reviews } = v15OnTime(["good", "good", "good"]);
    expect(v15OnTime(["good", "good", "good"], [tradeOff(reviews.at(-1)!.learningDay, true)]).state.stage).toBe(2);
  });

  it("keeps Stage 3 reached before v1.5 when the old events are replayed", () => {
    // The old rows have no rules: passing the 30-day step gave Stage 3 by itself.
    const catches = [caught("cache", "2026-01-01")];
    const oldReviews: ReviewRecord[] = [];
    for (const grade of TO_90) {
      const state = reviewStates(catches, oldReviews).get("cache")!;
      oldReviews.push(reviewed("cache", state.dueDay!, grade));
    }
    const old = reviewStates(catches, oldReviews).get("cache")!;
    expect({ step: old.step, stage: old.stage }).toEqual({ step: 90, stage: 3 });
    // A later v1.5 review never takes Stage 3 away, not even an Again.
    const after = reviewStates(catches, [...oldReviews, graded("cache", old.dueDay!, "again")]).get("cache")!;
    expect({ step: after.step, stage: after.stage }).toEqual({ step: 30, stage: 3 });
  });

  describe("asksTradeOff: the question after one grade", () => {
    const onStep = (step: ReviewState["step"], stage: ReviewState["stage"]): ReviewState => ({
      itemId: "cache",
      step,
      dueDay: "2026-10-20",
      caughtDay: "2026-01-01",
      stage,
    });

    it("asks when Good or Easy passes the 30-day step at Stage 2", () => {
      expect(asksTradeOff(onStep(30, 2), "good", "2026-10-20")).toBe(true);
      expect(asksTradeOff(onStep(14, 2), "easy", "2026-10-20")).toBe(true);
    });

    it("asks again at the next Good or Easy after a wrong answer, while past the 30-day step", () => {
      expect(asksTradeOff(onStep(90, 2), "good", "2026-10-20")).toBe(true);
      expect(asksTradeOff(onStep(90, 2), "easy", "2026-10-20")).toBe(true);
    });

    it("does not ask before the 30-day step, after Hard or Again, or at Stage 3", () => {
      expect(asksTradeOff(onStep(14, 2), "good", "2026-10-20")).toBe(false);
      expect(asksTradeOff(onStep(30, 2), "hard", "2026-10-20")).toBe(false);
      expect(asksTradeOff(onStep(90, 2), "hard", "2026-10-20")).toBe(false);
      expect(asksTradeOff(onStep(180, 2), "again", "2026-10-20")).toBe(false);
      expect(asksTradeOff(onStep(30, 3), "good", "2026-10-20")).toBe(false);
    });
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

  it("counts the items a battle made due", () => {
    const catches = catchesOn("2026-10-17", 9);
    // Reviewed on 18 Oct, so only 8 are due on 19 and 20 Oct.
    const reviews = [reviewed(catches[0].itemId, "2026-10-18", "good")];
    expect(backlogPaused(catches, reviews, "2026-10-20")).toBe(false);
    // A lost battle on 18 Oct makes it due again on 19 Oct: 9 due on 3 days in a row.
    const rechecks = [{ itemId: catches[0].itemId, learningDay: "2026-10-18" }];
    expect(backlogPaused(catches, reviews, "2026-10-20", () => true, rechecks)).toBe(true);
  });
});
