import { describe, expect, it } from "vitest";
import { buildBundle } from "@/content/bundle";
import { fixtureTown } from "@/content/fixture-town";
import { townSchema } from "@/content/schema";
import {
  battleProgress,
  counterattackSentence,
  damageLabel,
  nextBattle,
  playTurn,
  startBattle,
  usableMoves,
  type BattleRecord,
} from "./battle.ts";
import type { CatchRecord } from "./catch.ts";

// The fixture scenario "t99-sale-day": the best moves are cache.ttl, cache.no-store and proxy.cdn.
const town = () => buildBundle([townSchema.parse(fixtureTown())]).towns[0];
const TODAY = "2026-10-20";

const caught = (...itemIds: string[]): CatchRecord[] =>
  itemIds.map((itemId) => ({ itemId, correct: true, learningDay: "2026-10-18" }));

describe("nextBattle", () => {
  it("offers the scenario once the learner caught the creatures of its best moves", () => {
    const offer = nextBattle({ town: town(), catches: caught("cache", "proxy"), battles: [], today: TODAY, committedMinutes: 15 });
    expect(offer?.scenario.id).toBe("t99-sale-day");
  });

  it("offers nothing while a best move belongs to a creature the learner has not caught", () => {
    expect(nextBattle({ town: town(), catches: caught("cache", "cookie"), battles: [], today: TODAY, committedMinutes: 15 })).toBeNull();
  });

  it("offers nothing on a 3-minute day, which is reviews only", () => {
    expect(nextBattle({ town: town(), catches: caught("cache", "proxy"), battles: [], today: TODAY, committedMinutes: 3 })).toBeNull();
  });

  it("offers one battle per day, even when the first was left unfinished", () => {
    const battles: BattleRecord[] = [{ battleId: "b1", scenarioId: "t99-sale-day", learningDay: TODAY }];
    expect(nextBattle({ town: town(), catches: caught("cache", "proxy"), battles, today: TODAY, committedMinutes: 45 })).toBeNull();
  });

  it("offers the scenario played the fewest times, and file order breaks a tie", () => {
    const content = fixtureTown();
    content.scenarios.push({ ...structuredClone(content.scenarios[0]), id: "t99-flash-sale" });
    const twoScenarios = buildBundle([townSchema.parse(content)]).towns[0];
    const offer = (battles: BattleRecord[]) =>
      nextBattle({ town: twoScenarios, catches: caught("cache", "proxy"), battles, today: TODAY, committedMinutes: 15 })
        ?.scenario.id;

    expect(offer([])).toBe("t99-sale-day");
    expect(offer([{ battleId: "b1", scenarioId: "t99-sale-day", learningDay: "2026-10-19" }])).toBe("t99-flash-sale");
    expect(
      offer([
        { battleId: "b1", scenarioId: "t99-sale-day", learningDay: "2026-10-18" },
        { battleId: "b2", scenarioId: "t99-flash-sale", learningDay: "2026-10-19" },
      ]),
    ).toBe("t99-sale-day");
  });

  it("offers nothing when a best move belongs to a retired creature, which no team can hold", () => {
    const content = fixtureTown();
    Object.assign(content.creatures[2], { retired: true });
    const retired = buildBundle([townSchema.parse(content)]).towns[0];
    expect(nextBattle({ town: retired, catches: caught("cache", "proxy"), battles: [], today: TODAY, committedMinutes: 15 })).toBeNull();
  });

  it("never offers a retired scenario", () => {
    const content = fixtureTown();
    Object.assign(content.scenarios[0], { retired: true });
    const retired = buildBundle([townSchema.parse(content)]).towns[0];
    expect(nextBattle({ town: retired, catches: caught("cache", "proxy"), battles: [], today: TODAY, committedMinutes: 15 })).toBeNull();
  });
});

describe("the team", () => {
  it("is 3 caught creatures, or every caught creature when there are fewer", () => {
    const two = nextBattle({ town: town(), catches: caught("cache", "proxy"), battles: [], today: TODAY, committedMinutes: 15 });
    expect(two?.team).toEqual({ size: 2, choices: ["cache", "proxy"] });
    const three = nextBattle({
      town: town(),
      catches: caught("cache", "cookie", "proxy", "cache.ttl"),
      battles: [],
      today: TODAY,
      committedMinutes: 15,
    });
    expect(three?.team).toEqual({ size: 3, choices: ["cache", "cookie", "proxy"] });
  });

  it("must be the right size and only hold caught creatures", () => {
    const offer = nextBattle({ town: town(), catches: caught("cache", "cookie", "proxy"), battles: [], today: TODAY, committedMinutes: 15 })!;
    expect(() => startBattle(offer, ["cache", "proxy"])).toThrow("Pick 3 creatures.");
    expect(() => startBattle(offer, ["cache", "proxy", "dns"])).toThrow("dns is not a creature you caught.");
    expect(() => startBattle(offer, ["cache", "proxy", "proxy"])).toThrow("Pick 3 creatures.");
  });
});

describe("a turn", () => {
  const offer = () =>
    nextBattle({ town: town(), catches: caught("cache", "cookie", "proxy"), battles: [], today: TODAY, committedMinutes: 15 })!;

  it("offers only the moves of creatures in the team", () => {
    const battle = startBattle(offer(), ["cache", "cookie", "proxy"]);
    expect(usableMoves(battle)).toEqual(["cache.ttl", "proxy.cdn", "cookie.http-only"]);
    const withoutProxy = startBattle(
      nextBattle({ town: town(), catches: caught("cache", "proxy"), battles: [], today: TODAY, committedMinutes: 15 })!,
      ["cache", "proxy"],
    );
    expect(usableMoves(withoutProxy)).toEqual(["cache.ttl", "proxy.cdn"]);
  });

  it("deals the damage from the move table and stores whether it was the best move", () => {
    const battle = playTurn(startBattle(offer(), ["cache", "cookie", "proxy"]), "proxy.cdn");
    expect(battle.turns).toEqual([
      {
        turnNumber: 1,
        moveId: "proxy.cdn",
        damage: 1,
        bestMove: false,
        counterattack: "Far visitors are faster, but each first load is still slow.",
      },
    ]);
    expect(battleProgress(battle)).toEqual({ hp: 3, turnNumber: 2, finished: false, won: false });
  });

  it("refuses a move that is not usable this turn", () => {
    const battle = startBattle(offer(), ["cache", "cookie", "proxy"]);
    expect(() => playTurn(battle, "cache.no-store")).toThrow("cache.no-store is not a move you can use this turn.");
  });
});

describe("the end of a battle", () => {
  const start = (team: string[], catches = caught("cache", "cookie", "proxy")) =>
    startBattle(nextBattle({ town: town(), catches, battles: [], today: TODAY, committedMinutes: 15 })!, team);

  it("is a win when HP reaches 0, so a strong start ends the battle after 2 turns", () => {
    const battle = playTurn(playTurn(start(["cache", "cookie", "proxy"]), "cache.ttl"), "cache.no-store");
    expect(battleProgress(battle)).toEqual({ hp: 0, turnNumber: 2, finished: true, won: true });
    expect(() => playTurn(battle, "proxy.cdn")).toThrow("The battle is over.");
  });

  it("is a loss when HP is still above 0 after 3 turns", () => {
    const battle = playTurn(playTurn(playTurn(start(["cache", "cookie", "proxy"]), "cookie.http-only"), "cache.ttl"), "proxy.cdn");
    expect(battleProgress(battle)).toEqual({ hp: 2, turnNumber: 3, finished: true, won: false });
  });

  it("lets a turn pass with no move only when the team has none for it", () => {
    // Two extra creatures with no moves. A team of Cookie, DNS and TLS has no move for turn 2.
    const content = fixtureTown();
    const cookie = content.creatures[1];
    content.creatures.push({ ...structuredClone(cookie), id: "dns", moves: [] }, { ...structuredClone(cookie), id: "tls", moves: [] });
    const bigTown = buildBundle([townSchema.parse(content)]).towns[0];
    const offer = nextBattle({
      town: bigTown,
      catches: caught("cache", "cookie", "proxy", "dns", "tls"),
      battles: [],
      today: TODAY,
      committedMinutes: 15,
    })!;

    const battle = startBattle(offer, ["cookie", "dns", "tls"]);
    expect(() => playTurn(battle, null)).toThrow("You have a move for this turn. Pick one.");
    const turnTwo = playTurn(battle, "cookie.http-only");
    expect(usableMoves(turnTwo)).toEqual([]);
    expect(playTurn(turnTwo, null).turns[1]).toEqual({
      turnNumber: 2,
      moveId: null,
      damage: 0,
      bestMove: false,
      counterattack: null,
    });
  });
});

describe("damageLabel", () => {
  it("shows the damage as words, a number and pips", () => {
    expect(damageLabel(2)).toBe("Strong hit · 2 ●●");
    expect(damageLabel(1)).toBe("Hit · 1 ●○");
    expect(damageLabel(0)).toBe("No effect · 0 ○○");
  });
});

describe("counterattackSentence", () => {
  it("says what the learner chose, then what happens", () => {
    expect(counterattackSentence("TTL", "The logo loads fast, but a new logo takes an hour to show.")).toBe(
      "You chose TTL. The logo loads fast, but a new logo takes an hour to show.",
    );
    expect(counterattackSentence(null, null)).toBe("You had no move for this threat. Nothing changes.");
  });
});
