import { describe, expect, it } from "vitest";
import { buildBundle } from "@/content/bundle";
import { fixtureTown, fixtureTownV2, fixtureTwistTown } from "@/content/fixture-town";
import { townSchema } from "@/content/schema";
import {
  battleProgress,
  battleRechecks,
  bestMoveRates,
  checkTurn,
  counterattackSentence,
  damageLabel,
  formatBestMoveRate,
  nextBattle,
  playTurn,
  startBattle,
  usableMoves,
  type BattleEndRecord,
  type BattleRecord,
  type CheckRecord,
  type TurnRecord,
} from "./battle.ts";
import type { CatchRecord } from "./catch.ts";
import { reviewStates } from "./review.ts";

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
    // The fixture has 5 scenarios: t99-sale-day first, then t99-flash-sale, and three more.
    const offer = (battles: BattleRecord[]) =>
      nextBattle({ town: town(), catches: caught("cache", "proxy"), battles, today: TODAY, committedMinutes: 15 })
        ?.scenario.id;

    expect(offer([])).toBe("t99-sale-day");
    expect(offer([{ battleId: "b1", scenarioId: "t99-sale-day", learningDay: "2026-10-19" }])).toBe("t99-flash-sale");
    expect(
      offer([
        { battleId: "b1", scenarioId: "t99-sale-day", learningDay: "2026-10-18" },
        { battleId: "b2", scenarioId: "t99-flash-sale", learningDay: "2026-10-19" },
      ]),
    ).toBe("t99-holiday-rush");
  });

  it("offers nothing when a best move belongs to a retired creature, which no team can hold", () => {
    const content = fixtureTown();
    Object.assign(content.creatures[2], { retired: true });
    const retired = buildBundle([townSchema.parse(content)]).towns[0];
    expect(nextBattle({ town: retired, catches: caught("cache", "proxy"), battles: [], today: TODAY, committedMinutes: 15 })).toBeNull();
  });

  it("offers only normal Battles until Meeting Battle and Agent Diff Battle ship (#93)", () => {
    // Every normal Battle of the v2 fixture was played, so a Meeting or Agent Diff Battle would come first.
    const content = fixtureTownV2();
    const meetingFirst = { ...structuredClone(content.scenarios[0]), id: "t99-meeting-twin", kind: "meeting" as const };
    content.scenarios.push(meetingFirst);
    const v2 = buildBundle([content]).towns[0];
    const battles: BattleRecord[] = v2.scenarios
      .filter((s) => s.kind === undefined)
      .map((s, i) => ({ battleId: `b${i}`, scenarioId: s.id, learningDay: "2026-10-19" }));
    const offer = nextBattle({ town: v2, catches: caught("cache", "proxy"), battles, today: TODAY, committedMinutes: 15 });
    expect(offer).not.toBeNull();
    expect(offer?.scenario.kind).toBeUndefined();
  });

  it("does not offer a Gym twin yet, because the Battle screen does not show its reversed Constraint (#107)", () => {
    // The twin is never played, so it would come first if it could be offered.
    const content = fixtureTownV2();
    content.scenarios.push({ ...structuredClone(content.scenarios[0]), id: "t99-sale-day-twin", twinOf: "t99-sale-day" });
    const v2 = buildBundle([content]).towns[0];
    const battles: BattleRecord[] = v2.scenarios
      .filter((s) => s.kind === undefined && s.twinOf === undefined)
      .map((s, i) => ({ battleId: `b${i}`, scenarioId: s.id, learningDay: "2026-10-19" }));
    const offer = nextBattle({ town: v2, catches: caught("cache", "proxy"), battles, today: TODAY, committedMinutes: 15 });
    expect(offer?.scenario.id).toBe("t99-sale-day");
  });

  it("never offers a retired scenario", () => {
    const content = fixtureTown();
    for (const scenario of content.scenarios) Object.assign(scenario, { retired: true });
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

describe("a battle that needs a creature of an earlier town (design 7.5)", () => {
  // Town 2 of the fixture, where turn 1's best move is proxy.cdn: a move of the town 1 creature proxy.
  const towns = () => {
    const two = fixtureTwistTown();
    const [first] = two.scenarios[0].turns;
    first.moves = first.moves.map((row) => ({ ...row, damage: row.moveId === "proxy.cdn" ? 2 : row.damage === 2 ? 1 : row.damage })) as typeof first.moves;
    return buildBundle([townSchema.parse(fixtureTown()), townSchema.parse(two)]).towns;
  };
  const offerFor = (catches: CatchRecord[]) => {
    const [one, two] = towns();
    return nextBattle({ town: two, towns: [one, two], catches, battles: [], today: TODAY, committedMinutes: 15 });
  };

  it("is offered once the learner caught the creature of each best move, also from the earlier town", () => {
    expect(offerFor(caught("rate-limit", "api-key", "proxy"))?.scenario.id).toBe("t98-public-api");
  });

  it("is not offered while the earlier town's creature is not caught", () => {
    expect(offerFor(caught("rate-limit", "api-key"))).toBeNull();
  });

  it("lets the team hold the earlier town's creature, after the creatures of this town", () => {
    const offer = offerFor(caught("rate-limit", "api-key", "proxy", "cookie"))!;
    expect(offer.team).toEqual({ size: 3, choices: ["rate-limit", "api-key", "cookie", "proxy"] });
    const battle = startBattle(offer, ["rate-limit", "api-key", "proxy"]);
    expect(usableMoves(battle)).toEqual(["rate-limit.quota", "api-key.rotate", "proxy.cdn"]);
    expect(playTurn(battle, "proxy.cdn").turns[0]).toMatchObject({ damage: 2, bestMove: true });
  });

  it("never lets a later town's creature join a town 1 battle", () => {
    const [one, two] = towns();
    const offer = nextBattle({
      town: one,
      towns: [one, two],
      catches: caught("cache", "proxy", "rate-limit"),
      battles: [],
      today: TODAY,
      committedMinutes: 15,
    });
    expect(offer?.team).toEqual({ size: 2, choices: ["cache", "proxy"] });
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

describe("the self-check on a model answer", () => {
  const start = (catches: CatchRecord[], team: string[]) =>
    startBattle(nextBattle({ town: town(), catches, battles: [], today: TODAY, committedMinutes: 15 })!, team);
  // Damage 0, 0, 2: HP 2 is left, so the battle is lost.
  const lostBattle = () =>
    playTurn(playTurn(playTurn(start(caught("cache", "cookie", "proxy"), ["cache", "cookie", "proxy"]), "cookie.http-only"), "cache.ttl"), "proxy.cdn");

  it("records the ticked key points and the turn's best move, fixed at play time", () => {
    expect(checkTurn(lostBattle(), 1, [3, 1])).toEqual({ turnNumber: 1, bestMoveId: "cache.ttl", tickedPoints: [1, 3] });
    expect(checkTurn(lostBattle(), 2, [])).toEqual({ turnNumber: 2, bestMoveId: "cache.no-store", tickedPoints: [] });
  });

  it("refuses a turn that was not played, and points that do not exist", () => {
    const oneTurn = playTurn(start(caught("cache", "proxy"), ["cache", "proxy"]), "cache.ttl");
    expect(() => checkTurn(oneTurn, 2, [])).toThrow("Turn 2 was not played.");
    expect(() => checkTurn(oneTurn, 1, [4])).toThrow("A key point is 1, 2 or 3.");
    expect(() => checkTurn(oneTurn, 1, [2, 2])).toThrow("A key point is ticked once.");
  });

  it("changes only the review state: the damage, the HP and the result stay the same", () => {
    const battle = lostBattle();
    const before = structuredClone(battle);
    const checks: CheckRecord[] = battle.turns.map((turn) => ({
      ...checkTurn(battle, turn.turnNumber, []),
      battleId: "b1",
      learningDay: TODAY,
    }));
    expect(battle).toEqual(before);
    expect(battleProgress(battle)).toEqual({ hp: 2, turnNumber: 3, finished: true, won: false });

    // The best moves sit on the 3-day step after one Good, due 10-19 + 3 = 10-22.
    const catches = caught("cache.ttl", "cache.no-store", "proxy.cdn");
    const goods = catches.map((record) => ({ itemId: record.itemId, learningDay: "2026-10-19", grade: "good" as const }));
    expect(reviewStates(catches, goods).get("cache.ttl")).toMatchObject({ step: 3, dueDay: "2026-10-22" });
    const checked = reviewStates(catches, goods, battleRechecks({ turns: [], ends: [], checks }));
    for (const itemId of ["cache.ttl", "cache.no-store", "proxy.cdn"]) {
      expect(checked.get(itemId)).toMatchObject({ step: 3, dueDay: "2026-10-21" });
    }
  });
});

describe("battleRechecks", () => {
  const turn = (battleId: string, turnNumber: number, moveId: string | null): TurnRecord => ({
    battleId,
    scenarioId: "t99-sale-day",
    turnNumber,
    moveId,
    bestMove: false,
    learningDay: TODAY,
  });

  it("brings back a turn's best move tomorrow when the learner did not say all 3 key points", () => {
    const checks: CheckRecord[] = [
      { battleId: "b1", turnNumber: 1, bestMoveId: "cache.ttl", tickedPoints: [1, 2, 3], learningDay: TODAY },
      { battleId: "b1", turnNumber: 2, bestMoveId: "cache.no-store", tickedPoints: [1, 3], learningDay: TODAY },
    ];
    expect(battleRechecks({ turns: [], ends: [], checks })).toEqual([{ itemId: "cache.no-store", learningDay: TODAY }]);
  });

  it("makes every move used in a lost battle due, once each", () => {
    const turns = [turn("b1", 1, "cookie.http-only"), turn("b1", 2, "cache.ttl"), turn("b1", 3, "cache.ttl"), turn("b2", 1, "proxy.cdn")];
    const ends: BattleEndRecord[] = [{ battleId: "b1", result: "lost", learningDay: TODAY }];
    expect(battleRechecks({ turns, ends, checks: [] })).toEqual([
      { itemId: "cookie.http-only", learningDay: TODAY },
      { itemId: "cache.ttl", learningDay: TODAY },
    ]);
  });

  it("leaves a won or unfinished battle alone, and a turn with no move", () => {
    const turns = [turn("b1", 1, "cache.ttl"), turn("b2", 1, "proxy.cdn"), turn("b3", 1, null)];
    const ends: BattleEndRecord[] = [
      { battleId: "b1", result: "won", learningDay: TODAY },
      { battleId: "b3", result: "lost", learningDay: TODAY },
    ];
    expect(battleRechecks({ turns, ends, checks: [] })).toEqual([]);
  });

  it("makes the used moves of a lost battle due tomorrow in the review schedule", () => {
    const catches = caught("cache.ttl", "proxy.cdn").map((record) => ({ ...record, learningDay: "2026-10-01" }));
    // Both on the 7-day step after two Goods, due 10-25.
    const reviews = ["cache.ttl", "proxy.cdn"].flatMap((itemId) => [
      { itemId, learningDay: "2026-10-02", grade: "good" as const },
      { itemId, learningDay: "2026-10-18", grade: "good" as const },
    ]);
    const turns = [turn("b1", 1, "cache.ttl"), turn("b1", 2, "cache.no-store")];
    const ends: BattleEndRecord[] = [{ battleId: "b1", result: "lost", learningDay: TODAY }];
    const states = reviewStates(catches, reviews, battleRechecks({ turns, ends, checks: [] }));
    expect(states.get("cache.ttl")).toMatchObject({ step: 7, dueDay: "2026-10-21" });
    expect(states.get("proxy.cdn")).toMatchObject({ step: 7, dueDay: "2026-10-25" });
  });
});

describe("the best-move rate", () => {
  const turn = (scenarioId: string, bestMove: boolean): TurnRecord => ({
    battleId: "b1",
    scenarioId,
    turnNumber: 1,
    moveId: bestMove ? "cache.ttl" : null,
    bestMove,
    learningDay: TODAY,
  });

  it("counts the turns played with the best move, per town, from the stored flags", () => {
    const rates = bestMoveRates([
      turn("t01-black-friday", true),
      turn("t01-black-friday", false),
      turn("t01-login-storm", true),
      turn("t02-slow-search", false),
    ]);
    expect(rates).toEqual(
      new Map([
        ["t01", { bestMoves: 2, turns: 3 }],
        ["t02", { bestMoves: 0, turns: 1 }],
      ]),
    );
  });

  it("reads as a share of turns, never as wins", () => {
    expect(formatBestMoveRate({ bestMoves: 2, turns: 3 })).toBe("67% (2 of 3 turns)");
    expect(formatBestMoveRate({ bestMoves: 0, turns: 0 })).toBe("no battle turns yet");
  });
});

describe("worked examples before a battle", () => {
  const offer = (catches: CatchRecord[], battles: BattleRecord[] = []) =>
    nextBattle({ town: town(), catches, battles, today: TODAY, committedMinutes: 15 })!;
  const exampleIds = (catches: CatchRecord[], battles: BattleRecord[] = []) =>
    offer(catches, battles).workedExamples.map((example) => example.creatureId);

  it("come first in the first battle that uses a concept: the creatures of its best moves, in town order", () => {
    expect(exampleIds(caught("cache", "cookie", "proxy"))).toEqual(["cache", "proxy"]);
    expect(offer(caught("cache", "proxy")).workedExamples[0]).toEqual({
      creatureId: "cache",
      name: "Cache",
      workedExample: {
        problem: "The product page loads slowly for every visitor.",
        steps: ["Find the parts that change rarely.", "Let the browser cache them for one hour."],
        answer: "Cache the logo and the styles. Keep the price fresh.",
      },
    });
  });

  it("are shown once per concept: a later battle that uses the same concepts has none", () => {
    const played: BattleRecord[] = [{ battleId: "b1", scenarioId: "t99-sale-day", learningDay: "2026-10-19" }];
    expect(exampleIds(caught("cache", "cookie", "proxy"), played)).toEqual([]);
  });

  it("are skipped for a concept the placement test caught", () => {
    const placed: CatchRecord[] = [
      { itemId: "cache", correct: true, learningDay: "2026-10-18", fromPlacement: true },
      ...caught("proxy"),
    ];
    expect(exampleIds(placed)).toEqual(["proxy"]);
  });
});
