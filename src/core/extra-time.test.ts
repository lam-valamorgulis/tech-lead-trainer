import { describe, expect, it } from "vitest";
import { buildBundle } from "@/content/bundle";
import { fixtureTown, fixtureTwistTown } from "@/content/fixture-town";
import { townSchema } from "@/content/schema";
import { nextBattle, type BattleRecord } from "./battle.ts";
import type { CatchRecord } from "./catch.ts";
import { extraTime, type ReadingRecord } from "./extra-time.ts";

// The fixture: 5 copies of "Sale day", won with Cache and Proxy. Every card cites MDN: HTTP caching.
const town = () => buildBundle([townSchema.parse(fixtureTown())]).towns[0];
const TODAY = "2026-10-20";
const caught = (...itemIds: string[]): CatchRecord[] =>
  itemIds.map((itemId) => ({ itemId, correct: true, learningDay: "2026-10-18" }));
const base = { towns: [], catches: caught("cache", "cookie", "proxy"), battles: [] as BattleRecord[], readings: [] as ReadingRecord[], today: TODAY };

describe("extraTime", () => {
  it("comes only on a 45-minute day", () => {
    expect(extraTime({ ...base, town: town(), committedMinutes: 3, hasBoss: true })).toBeNull();
    expect(extraTime({ ...base, town: town(), committedMinutes: 15, hasBoss: true })).toBeNull();
    expect(extraTime({ ...base, town: town(), committedMinutes: 45, hasBoss: true })).not.toBeNull();
  });

  it("offers an extra battle that is not today's normal battle", () => {
    const main = nextBattle({ ...base, town: town(), committedMinutes: 45 });
    const extra = extraTime({ ...base, town: town(), committedMinutes: 45, hasBoss: true });
    expect(main?.scenario.id).toBe("t99-sale-day");
    expect(extra?.extraBattle?.scenario.id).toBe("t99-flash-sale");
  });

  it("offers the boss only when the town has one", () => {
    expect(extraTime({ ...base, town: town(), committedMinutes: 45, hasBoss: true })?.boss).toBe(true);
    expect(extraTime({ ...base, town: town(), committedMinutes: 45, hasBoss: false })?.boss).toBe(false);
  });

  it("gives read-close-write the source of a caught item, one not read yet first, in catch order", () => {
    const reading = extraTime({ ...base, town: town(), committedMinutes: 45, hasBoss: true })?.reading;
    expect(reading).toEqual({
      itemId: "cache",
      itemName: "Cache",
      source: { title: "MDN: HTTP caching", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching" },
    });
  });

  it("takes the item read longest ago once every caught item was read", () => {
    const readings: ReadingRecord[] = [
      { itemId: "cache", learningDay: "2026-10-19" },
      { itemId: "cookie", learningDay: "2026-10-12" },
      { itemId: "proxy", learningDay: "2026-10-15" },
    ];
    expect(extraTime({ ...base, readings, town: town(), committedMinutes: 45, hasBoss: true })?.reading?.itemId).toBe("cookie");
  });

  it("has no reading before the first catch, and no extra battle when no scenario is ready", () => {
    const empty = extraTime({ ...base, catches: [], town: town(), committedMinutes: 45, hasBoss: true });
    expect(empty?.reading).toBeNull();
    expect(empty?.extraBattle).toBeNull();
  });

  it("is not offered when it would have no task at all", () => {
    expect(extraTime({ ...base, catches: [], town: town(), committedMinutes: 45, hasBoss: false })).toBeNull();
  });
});

describe("extra time in a town whose battles need a creature of an earlier town (design 7.5)", () => {
  // Town 2 of the fixture with two copies of its battle. Turn 1's best move is proxy.cdn, a move of town 1.
  const towns = () => {
    const two = fixtureTwistTown();
    const [scenario] = two.scenarios;
    const [first] = scenario.turns;
    first.moves = first.moves.map((row) => ({ ...row, damage: row.moveId === "proxy.cdn" ? 2 : row.damage === 2 ? 1 : row.damage })) as typeof first.moves;
    two.scenarios = [scenario, { ...structuredClone(scenario), id: "t98-public-api-2" }];
    return buildBundle([townSchema.parse(fixtureTown()), townSchema.parse(two)]).towns;
  };
  const extraFor = (itemIds: string[]) => {
    const [one, two] = towns();
    return extraTime({ ...base, catches: caught(...itemIds), town: two, towns: [one, two], committedMinutes: 45, hasBoss: false });
  };

  it("offers the second battle once the town 1 creature is caught too", () => {
    expect(extraFor(["rate-limit", "api-key", "proxy"])?.extraBattle?.scenario.id).toBe("t98-public-api-2");
  });

  it("offers no extra battle while the town 1 creature is missing", () => {
    expect(extraFor(["rate-limit", "api-key"])?.extraBattle ?? null).toBeNull();
  });
});
