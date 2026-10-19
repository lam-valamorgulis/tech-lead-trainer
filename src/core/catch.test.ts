import { describe, expect, it } from "vitest";
import { buildBundle } from "@/content/bundle";
import { fixtureTown } from "@/content/fixture-town";
import { townSchema } from "@/content/schema";
import { catchQueue, checkCatchAnswer, fieldGuideProgress, nextCatch, type CatchRecord } from "./catch.ts";

const town = () => buildBundle([townSchema.parse(fixtureTown())]).towns[0];
const TODAY = "2026-10-20";

const record = (itemId: string, correct: boolean, learningDay = "2026-10-19"): CatchRecord => ({
  itemId,
  correct,
  learningDay,
});

describe("catchQueue", () => {
  it("lists creatures and their moves in content order", () => {
    expect(catchQueue(town()).map((item) => [item.id, item.kind])).toEqual([
      ["cache", "creature"],
      ["cache.ttl", "move"],
      ["cookie", "creature"],
    ]);
  });

  it("leaves out retired items", () => {
    const content = fixtureTown();
    Object.assign(content.creatures[0].moves[0], { retired: true });
    const [retired] = buildBundle([townSchema.parse(content)]).towns;
    expect(catchQueue(retired).map((item) => item.id)).toEqual(["cache", "cookie"]);
  });
});

describe("nextCatch", () => {
  it("offers the first item on the first 15-minute day", () => {
    expect(nextCatch({ town: town(), records: [], today: TODAY, committedMinutes: 15 })?.id).toBe("cache");
  });

  it("offers nothing on a 3-minute day, which is reviews only", () => {
    expect(nextCatch({ town: town(), records: [], today: TODAY, committedMinutes: 3 })).toBeNull();
  });

  it("offers a catch on a 45-minute day too", () => {
    expect(nextCatch({ town: town(), records: [], today: TODAY, committedMinutes: 45 })?.id).toBe("cache");
  });

  it("offers the next item in content order after a catch on an earlier day", () => {
    const records = [record("cache", true)];
    expect(nextCatch({ town: town(), records, today: TODAY, committedMinutes: 15 })?.id).toBe("cache.ttl");
  });

  it("offers only one new item per day", () => {
    const records = [record("cache", true, TODAY)];
    expect(nextCatch({ town: town(), records, today: TODAY, committedMinutes: 15 })).toBeNull();
  });

  it("offers the same item again the next day when it was not caught", () => {
    const records = [record("cache", false), record("cache", false)];
    expect(nextCatch({ town: town(), records, today: TODAY, committedMinutes: 15 })?.id).toBe("cache");
  });

  it("offers nothing when every item is caught", () => {
    const records = ["cache", "cache.ttl", "cookie"].map((id) => record(id, true));
    expect(nextCatch({ town: town(), records, today: TODAY, committedMinutes: 15 })).toBeNull();
  });

  it("offers nothing while new catches are paused", () => {
    expect(nextCatch({ town: town(), records: [], today: TODAY, committedMinutes: 15, paused: true })).toBeNull();
  });
});

describe("checkCatchAnswer", () => {
  const [cache] = catchQueue(town());

  it("is correct for the right choice and gives the explanation", () => {
    expect(checkCatchAnswer(cache, "To load it faster next time")).toEqual({
      correct: true,
      rightAnswer: "To load it faster next time",
      explanation: "A saved copy can be shown without a new download.",
    });
  });

  it("is wrong for any other choice", () => {
    expect(checkCatchAnswer(cache, "To make it smaller").correct).toBe(false);
  });
});

describe("fieldGuideProgress", () => {
  it("shows caught, seen and not-met creatures, with caught moves", () => {
    const records = [record("cache", false), record("cache", true), record("cache.ttl", true)];
    expect(fieldGuideProgress(town(), records)).toEqual({
      townName: "Fixture Town",
      caughtCount: 1,
      creatures: [
        { id: "cache", name: "Cache", status: "caught", stage: 1, movesCaught: 1, movesTotal: 1 },
        { id: "cookie", name: "Cookie", status: "not-met", stage: null, movesCaught: 0, movesTotal: 0 },
      ],
    });
  });

  it("hides a retired creature, unless it was caught", () => {
    const content = fixtureTown();
    Object.assign(content.creatures[1], { retired: true });
    const [retired] = buildBundle([townSchema.parse(content)]).towns;
    expect(fieldGuideProgress(retired, []).creatures.map((c) => c.id)).toEqual(["cache"]);
    expect(fieldGuideProgress(retired, [record("cookie", true)]).creatures.map((c) => c.id)).toEqual(["cache", "cookie"]);
  });

  it("shows a creature as seen after a wrong answer", () => {
    expect(fieldGuideProgress(town(), [record("cookie", false)]).creatures[1].status).toBe("seen");
  });
});
