import { describe, expect, it } from "vitest";
import type { CatchRecord } from "./catch.ts";
import {
  cardCreatureId,
  reviewStates,
  todaysReviews,
  type CardRecord,
  type Grade,
  type ReviewRecord,
  type TodayPlace,
} from "./review.ts";

// Decision Cards in review (design 6.4, ticket #109).

const TODAY = "2026-10-20";
const caught = (itemId: string, learningDay = "2026-10-19"): CatchRecord => ({ itemId, correct: true, learningDay });
const reviewed = (itemId: string, learningDay: string, grade: Grade = "good"): ReviewRecord => ({ itemId, learningDay, grade });
const decision = (cardId: string, learningDay: string, right: boolean): CardRecord => ({ cardId, kind: "decision", learningDay, right });

/** n creatures caught yesterday, so each one is due today. */
const creatures = (n: number) => Array.from({ length: n }, (_, i) => caught(`c${i}`));

/** A short label for each place: the item id, or "D:<card id>" for a Decision Card. */
const labels = (places: TodayPlace[]) => places.map((place) => (place.kind === "review" ? place.review.itemId : `D:${place.cardId}`));

function today(catches: CatchRecord[], options: { reviews?: ReviewRecord[]; cards?: CardRecord[]; decisionCardIds?: string[] } = {}) {
  const reviews = options.reviews ?? [];
  const cards = options.cards ?? [];
  return labels(
    todaysReviews({
      states: reviewStates(catches, reviews, [], cards),
      reviews,
      cards,
      decisionCardIds: options.decisionCardIds ?? ["c0.decision.a"],
      today: TODAY,
    }),
  );
}

describe("the 1-in-4 mix rule", () => {
  it("makes the 4th place of 4 due reviews a Decision Card, and keeps all 4 reviews", () => {
    expect(today(creatures(4))).toEqual(["c0", "c1", "c2", "D:c0.decision.a", "c3"]);
  });

  it("adds no Decision Card to a short queue of 3", () => {
    expect(today(creatures(3))).toEqual(["c0", "c1", "c2"]);
  });

  it("fills a full day with 2 Decision Cards in 8 places; 2 due reviews wait until tomorrow", () => {
    const places = today(creatures(10), { decisionCardIds: ["c0.decision.a", "c1.decision.b"] });
    expect(places).toEqual(["c0", "c1", "c2", "D:c0.decision.a", "c3", "c4", "c5", "D:c1.decision.b"]);
  });

  it("counts the places of today's earlier sessions, Decision Cards too", () => {
    const catches = creatures(8);
    // 3 reviews in the morning: the next place is the 4th.
    const morning = ["c5", "c6", "c7"].map((id) => reviewed(id, TODAY));
    expect(today(catches, { reviews: morning })).toEqual(["D:c0.decision.a", "c0", "c1", "c2", "c3"]);
    // After the morning's Decision Card, the next one is at place 8.
    const cards = [decision("c0.decision.a", TODAY, true)];
    expect(today(catches, { reviews: morning, cards, decisionCardIds: ["c0.decision.a", "c1.decision.b"] })).toEqual([
      "c0",
      "c1",
      "c2",
      "D:c1.decision.b",
    ]);
  });

  it("shows normal reviews only when no caught creature has a Decision Card", () => {
    expect(today(creatures(5), { decisionCardIds: ["proxy.decision.x"] })).toEqual(["c0", "c1", "c2", "c3", "c4"]);
    expect(today(creatures(5), { decisionCardIds: [] })).toEqual(["c0", "c1", "c2", "c3", "c4"]);
  });

  it("shows the card answered longest ago first, a new card before all, and never a card twice in one day", () => {
    const ids = ["c0.decision.a", "c1.decision.b", "c2.decision.c"];
    const cards = [decision("c0.decision.a", "2026-10-18", true), decision("c1.decision.b", "2026-10-10", false)];
    expect(today(creatures(4), { cards, decisionCardIds: ids })).toContain("D:c2.decision.c");
    const all = [...cards, decision("c2.decision.c", "2026-10-15", true)];
    expect(today(creatures(4), { cards: all, decisionCardIds: ids })).toContain("D:c1.decision.b");
    // Answered today: the only card does not come back today.
    expect(today(creatures(8), { cards: [decision("c0.decision.a", TODAY, true)] })).not.toContain("D:c0.decision.a");
  });
});

describe("a Decision Card result", () => {
  // c0 was caught on 1 Oct and reviewed Good on 2 Oct: on the 3-day step, due 5 Oct.
  const catches = [caught("c0", "2026-10-01")];
  const reviews = [reviewed("c0", "2026-10-02")];

  it("belongs to the creature named at the start of its id", () => {
    expect(cardCreatureId("cache.decision.logo")).toBe("cache");
    expect(cardCreatureId("http-method.trade-off.cancel-order")).toBe("http-method");
  });

  it("does not move the creature's step or due day when it is right", () => {
    const before = reviewStates(catches, reviews).get("c0");
    const after = reviewStates(catches, reviews, [], [decision("c0.decision.a", "2026-10-03", true)]).get("c0");
    expect(after).toEqual(before);
    expect(after).toMatchObject({ step: 3, dueDay: "2026-10-05" });
  });

  it("brings the creature back tomorrow when it is wrong, and keeps the step", () => {
    const after = reviewStates(catches, reviews, [], [decision("c0.decision.a", "2026-10-03", false)]).get("c0");
    expect(after).toMatchObject({ step: 3, dueDay: "2026-10-04", stage: 1 });
  });

  it("counts after the reviews of its day, like a battle recheck", () => {
    // Reviewed Good on 5 Oct (3 → 7, due 12 Oct), and a wrong Decision Card the same day.
    const sameDay = [...reviews, reviewed("c0", "2026-10-05")];
    const after = reviewStates(catches, sameDay, [], [decision("c0.decision.a", "2026-10-05", false)]).get("c0");
    expect(after).toMatchObject({ step: 7, dueDay: "2026-10-06" });
  });
});
