import { describe, expect, it } from "vitest";
import { buildBundle } from "@/content/bundle";
import { fixtureTown } from "@/content/fixture-town";
import { townSchema } from "@/content/schema";
import type { BattleRecord } from "./battle.ts";
import type { CatchRecord } from "./catch.ts";
import { badges, gymBattles, gymIsOpen, gymOpensOn, gymProgress, type GymRecord } from "./gym.ts";

const caught = (...itemIds: string[]): CatchRecord[] =>
  itemIds.map((itemId) => ({ itemId, correct: true, learningDay: "2026-11-01" }));

/** The fixture town with `count` copies of its scenario, so a Gym has enough battles. */
function townWithScenarios(count: number) {
  const content = fixtureTown();
  const [scenario] = content.scenarios;
  content.scenarios = Array.from({ length: count }, (_, i) => ({ ...structuredClone(scenario), id: `t99-sale-${i + 1}` }));
  return buildBundle([townSchema.parse(content)]).towns[0];
}

describe("when the Gym opens", () => {
  it("opens 7 days before the next town starts, in the last week of the town's month", () => {
    expect(gymOpensOn("2026-10-20", 1)).toBe("2026-11-13");
    expect(gymOpensOn("2026-10-20", 12)).toBe("2027-10-13");
  });

  it("stays open after that, so a lost Gym can be tried again any time", () => {
    expect(gymIsOpen("2026-10-20", 1, "2026-11-12")).toBe(false);
    expect(gymIsOpen("2026-10-20", 1, "2026-11-13")).toBe(true);
    expect(gymIsOpen("2026-10-20", 1, "2027-03-01")).toBe(true);
  });
});

describe("gymBattles", () => {
  it("is 5 different ready scenarios, the least played first", () => {
    const town = townWithScenarios(7);
    const played: BattleRecord[] = [{ battleId: "b1", scenarioId: "t99-sale-1", learningDay: "2026-11-02" }];
    const gym = gymBattles({ town, catches: caught("cache", "proxy"), battles: played });
    expect(gym?.map((offer) => offer.scenario.id)).toEqual(["t99-sale-2", "t99-sale-3", "t99-sale-4", "t99-sale-5", "t99-sale-6"]);
  });

  it("shows worked examples only before the first Gym battle that uses a concept", () => {
    const gym = gymBattles({ town: townWithScenarios(5), catches: caught("cache", "proxy"), battles: [] })!;
    expect(gym.map((offer) => offer.workedExamples.map((example) => example.creatureId))).toEqual([
      ["cache", "proxy"],
      [],
      [],
      [],
      [],
    ]);
  });

  it("mixes confusable concepts: a battle that adds the other side of a pair comes in early", () => {
    // The fixture pairs Cache with Cookie. Only the last of 7 scenarios uses Cookie, as its turn 1 best move.
    const content = fixtureTown();
    const [scenario] = content.scenarios;
    content.scenarios = Array.from({ length: 7 }, (_, i) => ({ ...structuredClone(scenario), id: `t99-sale-${i + 1}` }));
    content.scenarios[6].turns[0].moves = content.scenarios[6].turns[0].moves.map((row) => ({
      ...row,
      damage: row.moveId === "cookie.http-only" ? 2 : 0,
    }));
    const town = buildBundle([townSchema.parse(content)]).towns[0];
    const gym = gymBattles({ town, catches: caught("cache", "cookie", "proxy"), battles: [] });
    // Battle 7 tests both sides of the pair (Cookie in turn 1, Cache in turn 2), so it comes first.
    expect(gym?.map((offer) => offer.scenario.id)).toEqual(["t99-sale-7", "t99-sale-1", "t99-sale-2", "t99-sale-3", "t99-sale-4"]);
  });

  it("needs 5 ready scenarios, so a learner with too few caught creatures cannot start it yet", () => {
    expect(gymBattles({ town: townWithScenarios(4), catches: caught("cache", "proxy"), battles: [] })).toBeNull();
    expect(gymBattles({ town: townWithScenarios(7), catches: caught("cache"), battles: [] })).toBeNull();
  });
});

describe("gymProgress", () => {
  it("gives the badge for 4 or more wins in 5 battles", () => {
    expect(gymProgress([true, true, true, false, true])).toEqual({ played: 5, wins: 4, finished: true, passed: true });
    expect(gymProgress([true, true, true, true, true])).toMatchObject({ finished: true, passed: true });
  });

  it("keeps going after 4 straight wins, because the Gym is 5 battles in a row", () => {
    expect(gymProgress([true, true, true, true])).toEqual({ played: 4, wins: 4, finished: false, passed: false });
  });

  it("ends early after 2 losses, when the badge can no longer be won", () => {
    expect(gymProgress([true, false, false])).toEqual({ played: 3, wins: 1, finished: true, passed: false });
    expect(gymProgress([false])).toMatchObject({ finished: false });
  });
});

describe("badges", () => {
  it("lists each town with a passed Gym once, with the day of the first pass", () => {
    const gyms: GymRecord[] = [
      { townId: "t01", passed: false, learningDay: "2026-11-14" },
      { townId: "t01", passed: true, learningDay: "2026-11-15" },
      { townId: "t01", passed: true, learningDay: "2026-11-20" },
      { townId: "t02", passed: false, learningDay: "2026-12-14" },
    ];
    expect(badges(gyms)).toEqual([{ townId: "t01", earnedOn: "2026-11-15" }]);
  });
});
