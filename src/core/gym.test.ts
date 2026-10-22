import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildBundle } from "@/content/bundle";
import { fixtureSaleDayTwin, fixtureTown, fixtureTownV2, fixtureTwistTown } from "@/content/fixture-town";
import { townSchema, type Town } from "@/content/schema";
import { bestRow, readyOffers, type BattleOffer, type BattleRecord } from "./battle.ts";
import type { CatchRecord } from "./catch.ts";
import { badges, gymBattles, gymIsOpen, gymOpensOn, gymProgress, gymTwinOffers, reversedTurns, type GymRecord } from "./gym.ts";

const caught = (...itemIds: string[]): CatchRecord[] =>
  itemIds.map((itemId) => ({ itemId, correct: true, learningDay: "2026-11-01" }));

/** The fixture town with `count` copies of its scenario, so a Gym has enough battles. */
function townWithScenarios(count: number) {
  const content = fixtureTown();
  const [scenario] = content.scenarios;
  content.scenarios = Array.from({ length: count }, (_, i) => ({ ...structuredClone(scenario), id: `t99-sale-${i + 1}` }));
  return buildBundle([townSchema.parse(content)]).towns[0];
}

/** Town 1 and a town 2 with `count` copies of a battle whose turn 1 needs proxy.cdn, a move of town 1. */
function townsWithEarlierTownBattles(count: number) {
  const two = fixtureTwistTown();
  const [scenario] = two.scenarios;
  const [first] = scenario.turns;
  first.moves = first.moves.map((row) => ({ ...row, damage: row.moveId === "proxy.cdn" ? 2 : row.damage === 2 ? 1 : row.damage })) as typeof first.moves;
  two.scenarios = Array.from({ length: count }, (_, i) => ({ ...structuredClone(scenario), id: `t98-api-${i + 1}` }));
  return buildBundle([townSchema.parse(fixtureTown()), townSchema.parse(two)]).towns;
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
  it("counts battles that need a caught creature of an earlier town (design 7.5)", () => {
    const [one, two] = townsWithEarlierTownBattles(5);
    expect(gymBattles({ town: two, towns: [one, two], catches: caught("rate-limit", "api-key", "proxy"), battles: [] })).toHaveLength(5);
    expect(gymBattles({ town: two, towns: [one, two], catches: caught("rate-limit", "api-key"), battles: [] })).toBeNull();
  });

  it("is 5 different ready scenarios, the least played first", () => {
    const town = townWithScenarios(7);
    const played: BattleRecord[] = [{ battleId: "b1", scenarioId: "t99-sale-1", learningDay: "2026-11-02" }];
    const gym = gymBattles({ towns: [], town, catches: caught("cache", "proxy"), battles: played });
    expect(gym?.map((offer) => offer.scenario.id)).toEqual(["t99-sale-2", "t99-sale-3", "t99-sale-4", "t99-sale-5", "t99-sale-6"]);
  });

  it("shows worked examples only before the first Gym battle that uses a concept", () => {
    const gym = gymBattles({ towns: [], town: townWithScenarios(5), catches: caught("cache", "proxy"), battles: [] })!;
    expect(gym.map((offer) => offer.workedExamples.map((example) => example.creatureId))).toEqual([
      ["cache", "proxy"],
      [],
      [],
      [],
      [],
    ]);
  });

  it("prefers a battle with both sides of a pair, also when one side is a wrong move in its table", () => {
    // This town pairs cache.ttl with cookie.http-only. Battle 1 gives cookie.http-only no row at all,
    // so it holds only one side. The other battles list both in turn 1 (best TTL, wrong HttpOnly).
    const content = fixtureTown();
    content.confusablePairs = [["cache.ttl", "cookie.http-only"]];
    const [scenario] = content.scenarios;
    content.scenarios = Array.from({ length: 6 }, (_, i) => ({ ...structuredClone(scenario), id: `t99-sale-${i + 1}` }));
    // In battle 1, HttpOnly becomes another move: No store in turn 1, TTL in turn 3 (each 0 damage).
    content.scenarios[0].turns.forEach((turn, index) => {
      const instead = index === 0 ? "cache.no-store" : "cache.ttl";
      turn.moves = turn.moves.map((row) => (row.moveId === "cookie.http-only" ? { ...row, moveId: instead } : row));
    });
    const town = buildBundle([townSchema.parse(content)]).towns[0];
    const gym = gymBattles({ towns: [], town, catches: caught("cache", "cookie", "proxy"), battles: [] });
    expect(gym?.[0].scenario.id).toBe("t99-sale-2");
  });

  it("needs 5 ready scenarios, so a learner with too few caught creatures cannot start it yet", () => {
    expect(gymBattles({ towns: [], town: townWithScenarios(4), catches: caught("cache", "proxy"), battles: [] })).toBeNull();
    expect(gymBattles({ towns: [], town: townWithScenarios(7), catches: caught("cache"), battles: [] })).toBeNull();
  });
});

const playedOn = (...scenarioIds: string[]): BattleRecord[] =>
  scenarioIds.map((scenarioId, i) => ({ battleId: `b${i}`, scenarioId, learningDay: "2026-11-02", kind: "battle" }));

describe("gymBattles with Gym twins (design 7.5, #113)", () => {
  // The v2 fixture town has 5 normal Battles: Sale day and 4 copies. Its twin "Sale day, new logo"
  // has Sale day's threats; on turn 1 the logo changes every hour, so CDN wins, not TTL.
  const bundled = (content: Town) => buildBundle([townSchema.parse(content)]).towns[0];
  function townWithTwins(...extra: ((content: Town) => Town["scenarios"][number])[]) {
    const content = fixtureTownV2();
    content.scenarios.push(fixtureSaleDayTwin(content), ...extra.map((make) => make(content)));
    return content;
  }
  const ids = (gym: BattleOffer[] | null) => gym?.map((offer) => offer.scenario.id);

  it("plays the twin of a battle the learner already played first, then the normal battles", () => {
    const gym = gymBattles({ towns: [], town: bundled(townWithTwins()), catches: caught("cache", "proxy"), battles: playedOn("t99-sale-day") });
    expect(ids(gym)).toEqual(["t99-sale-day-new-logo", "t99-flash-sale", "t99-holiday-rush", "t99-launch-day", "t99-price-drop"]);
  });

  it("gives the twin offer its old scenario and the reversed turn, with last time's Constraint and best move", () => {
    const [twin, normal] = gymBattles({ towns: [], town: bundled(townWithTwins()), catches: caught("cache", "proxy"), battles: playedOn("t99-sale-day") })!;
    expect(twin.twin).toEqual({
      originalId: "t99-sale-day",
      originalName: "Sale day",
      turns: [{ oldConstraint: "The logo changes once a year.", oldBestMoveId: "cache.ttl" }, null, null],
    });
    expect(normal.twin).toBeUndefined();
  });

  it("leaves out a twin whose old battle the learner never played: it is not an old situation yet", () => {
    const gym = gymBattles({ towns: [], town: bundled(townWithTwins()), catches: caught("cache", "proxy"), battles: playedOn("t99-flash-sale") });
    expect(ids(gym)).not.toContain("t99-sale-day-new-logo");
    expect(gym).toHaveLength(5);
  });

  it("leaves out a twin the team cannot win, like any battle", () => {
    const content = townWithTwins();
    const twin = content.scenarios.at(-1)!;
    // Turn 1 of the twin now needs HttpOnly, and the learner did not catch Cookie.
    for (const row of twin.turns[0].moves) row.damage = row.moveId === "cookie.http-only" ? 2 : 0;
    const gym = gymBattles({ towns: [], town: bundled(content), catches: caught("cache", "proxy"), battles: playedOn("t99-sale-day") });
    expect(ids(gym)).not.toContain("t99-sale-day-new-logo");
  });

  it("plays 5 normal battles in a town with no twins, and counts a twin toward the 5, so twins never block the Gym", () => {
    const noTwins = gymBattles({ towns: [], town: bundled(fixtureTownV2()), catches: caught("cache", "proxy"), battles: playedOn("t99-sale-day") });
    expect(noTwins?.every((offer) => offer.twin === undefined)).toBe(true);
    expect(noTwins).toHaveLength(5);

    // Only 4 normal battles left: the twin makes the fifth.
    const content = townWithTwins();
    Object.assign(content.scenarios.find((s) => s.id === "t99-price-drop")!, { retired: true });
    const withTwin = gymBattles({ towns: [], town: bundled(content), catches: caught("cache", "proxy"), battles: playedOn("t99-sale-day") });
    expect(withTwin).toHaveLength(5);
    expect(gymBattles({ towns: [], town: bundled(content), catches: caught("cache", "proxy"), battles: [] })).toBeNull();
  });

  it("puts every twin before the normal battles, and still picks the twin with both sides of a confusable pair first", () => {
    // A twin of Flash sale, first in the file, with no HttpOnly row: it holds Cache but not Cookie.
    const flashTwin = (content: Town) => {
      const twin = { ...fixtureSaleDayTwin(content), id: "t99-flash-sale-new-logo", twinOf: "t99-flash-sale" };
      // HttpOnly becomes another 0-damage move: No store in turn 1, TTL in turn 3.
      twin.turns.forEach((turn, index) => {
        const instead = index === 0 ? "cache.no-store" : "cache.ttl";
        turn.moves = turn.moves.map((row) => (row.moveId === "cookie.http-only" ? { ...row, moveId: instead } : row));
      });
      return twin;
    };
    const content = townWithTwins(flashTwin);
    content.scenarios.splice(content.scenarios.length - 2, 0, content.scenarios.pop()!);
    expect(content.scenarios.at(-2)!.id).toBe("t99-flash-sale-new-logo");
    const gym = gymBattles({
      towns: [],
      town: bundled(content),
      catches: caught("cache", "cookie", "proxy"),
      battles: playedOn("t99-sale-day", "t99-flash-sale"),
    });
    expect(ids(gym)?.slice(0, 2)).toEqual(["t99-sale-day-new-logo", "t99-flash-sale-new-logo"]);
    expect(gym?.slice(2).every((offer) => offer.twin === undefined)).toBe(true);
  });

  it("never offers a twin in the daily Battle, even after its old battle was played", () => {
    const town = bundled(townWithTwins());
    expect(readyOffers({ towns: [], town, catches: caught("cache", "proxy"), battles: playedOn("t99-sale-day") }).map((o) => o.scenario.id)).not.toContain(
      "t99-sale-day-new-logo",
    );
  });

  it("leaves out a twin of a Meeting Battle: the Gym holds normal Battles", () => {
    const meetingTwin = (content: Town) => ({ ...structuredClone(content.scenarios.find((s) => s.id === "t99-late-launch")!), id: "t99-late-launch-twin", twinOf: "t99-late-launch" });
    const town = bundled(townWithTwins(meetingTwin));
    expect(gymTwinOffers({ towns: [], town, catches: caught("cache", "proxy"), battles: playedOn("t99-sale-day", "t99-late-launch") }).map((o) => o.scenario.id)).toEqual([
      "t99-sale-day-new-logo",
    ]);
  });
});

describe("reversedTurns", () => {
  it("marks the turn with the old threat and another Constraint, and its best move differs from last time's", () => {
    const content = fixtureTownV2();
    const twin = fixtureSaleDayTwin(content);
    const turns = reversedTurns(twin, content.scenarios[0]);
    expect(turns.map((turn) => turn !== null)).toEqual([true, false, false]);
    expect(bestRow(twin.turns[0]).moveId).toBe("proxy.cdn");
    expect(turns[0]?.oldBestMoveId).toBe("cache.ttl");
  });

  it("finds the old turn by its threat when the twin moves it to another place", () => {
    const content = fixtureTownV2();
    const twin = fixtureSaleDayTwin(content);
    twin.turns.reverse();
    expect(reversedTurns(twin, content.scenarios[0]).map((turn) => turn?.oldBestMoveId ?? null)).toEqual([null, null, "cache.ttl"]);
  });

  it("holds for every twin of town 1: one reversed turn at least, where the old best move is no longer the best", () => {
    const town1 = townSchema.parse(JSON.parse(readFileSync("content/towns/t01.json", "utf8")));
    const twins = town1.scenarios.filter((scenario) => scenario.twinOf !== undefined);
    expect(twins.length).toBeGreaterThanOrEqual(5);
    for (const twin of twins) {
      const original = town1.scenarios.find((scenario) => scenario.id === twin.twinOf)!;
      const changed = reversedTurns(twin, original).filter((turn, i) => turn !== null && bestRow(twin.turns[i]).moveId !== turn.oldBestMoveId);
      expect(changed.length, twin.id).toBeGreaterThanOrEqual(1);
    }
  });

  it("gives town 1 a Gym of 5 twins once the learner played their old battles and caught every creature", () => {
    const town1 = buildBundle([townSchema.parse(JSON.parse(readFileSync("content/towns/t01.json", "utf8")))]).towns[0];
    const originals = town1.scenarios.filter((s) => s.twinOf !== undefined).map((s) => s.twinOf!);
    const gym = gymBattles({ towns: [town1], town: town1, catches: caught(...town1.creatures.map((c) => c.id)), battles: playedOn(...originals) });
    expect(gym?.filter((offer) => offer.twin !== undefined)).toHaveLength(5);
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
