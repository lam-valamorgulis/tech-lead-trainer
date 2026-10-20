import { describe, expect, it } from "vitest";
import { buildBundle } from "@/content/bundle";
import { fixtureTown } from "@/content/fixture-town";
import { townSchema } from "@/content/schema";
import { nextCatch } from "./catch.ts";
import { placementCatches, placementProgress, type PlacementRecord } from "./placement.ts";

const town = () => buildBundle([townSchema.parse(fixtureTown())]).towns[0];
const TODAY = "2026-10-20";
const answer = (itemId: string, correct: boolean, learningDay = TODAY): PlacementRecord => ({
  townId: "t99",
  itemId,
  correct,
  learningDay,
});

describe("placementProgress", () => {
  it("starts with the first question of the town", () => {
    expect(placementProgress(town(), [])).toMatchObject({ done: false, answered: 0, total: 2, correct: 0 });
    expect(placementProgress(town(), []).next?.creatureId).toBe("cache");
  });

  it("goes to the next question after an answer", () => {
    expect(placementProgress(town(), [answer("cache", false)]).next?.creatureId).toBe("cookie");
  });

  it("is done when every question has an answer, and counts the right ones", () => {
    expect(placementProgress(town(), [answer("cache", true), answer("cookie", false)])).toMatchObject({
      done: true,
      next: null,
      answered: 2,
      correct: 1,
    });
  });

  it("ignores answers from another town", () => {
    expect(placementProgress(town(), [{ ...answer("cache", true), townId: "t02" }]).answered).toBe(0);
  });
});

describe("placementCatches", () => {
  it("catches each creature answered right, at stage 1", () => {
    expect(placementCatches([answer("cache", true), answer("cookie", false)])).toEqual([
      { itemId: "cache", correct: true, learningDay: TODAY, fromPlacement: true },
    ]);
  });

  it("skips a creature caught by placement when choosing the next catch", () => {
    const records = placementCatches([answer("cache", true, "2026-10-19")]);
    expect(nextCatch({ town: town(), records, today: TODAY, committedMinutes: 15 })?.id).toBe("cache.ttl");
  });

  it("does not use up the day's catch", () => {
    const records = placementCatches([answer("cache", true)]);
    expect(nextCatch({ town: town(), records, today: TODAY, committedMinutes: 15 })?.id).toBe("cache.ttl");
  });
});
