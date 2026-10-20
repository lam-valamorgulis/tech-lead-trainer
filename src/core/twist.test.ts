import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildBundle } from "@/content/bundle";
import { fixtureTown, fixtureTwistTown } from "@/content/fixture-town";
import { townSchema } from "@/content/schema";
import { battleProgress, creatureOf, playTurn, type BattleState } from "./battle.ts";
import { opponentTypes, scenarioTwist, threatTypeOf, TWISTS, twistOf } from "./twist.ts";

// Ticket #36: a town can turn on one battle twist. Town 2's twist is "two-types".
const [, twistTown] = buildBundle([townSchema.parse(fixtureTown()), townSchema.parse(fixtureTwistTown())]).towns;
const townOne = buildBundle([townSchema.parse(JSON.parse(readFileSync("content/towns/t01.json", "utf8")))]).towns[0];

/** A battle whose team can use every move of every table, so each row can be played. */
function battleWithEveryMove(scenario: BattleState["scenario"]): BattleState {
  const team = [...new Set(scenario.turns.flatMap((turn) => turn.moves.map((row) => creatureOf(row.moveId))))];
  return { scenario, team, turns: [] };
}

describe("town 1, which has no twist", () => {
  it("has no twist, so no new rule, also in each battle", () => {
    expect(twistOf(townOne)).toBeNull();
    for (const scenario of townOne.scenarios) expect(scenarioTwist(scenario), scenario.id).toBeNull();
  });

  it("plays every battle exactly as before: one type, and the move table sets every result", () => {
    for (const scenario of townOne.scenarios) {
      expect(opponentTypes(scenario), scenario.id).toEqual([scenario.opponentType]);
      // The weakest moves keep the battle going, so every row of every turn can be played.
      let weak = battleWithEveryMove(scenario);
      scenario.turns.forEach((turn, index) => {
        expect(threatTypeOf(scenario, index), scenario.id).toBe(scenario.opponentType);
        const top = Math.max(...turn.moves.map((row) => row.damage));
        for (const row of turn.moves) {
          expect(playTurn(weak, row.moveId).turns[index], scenario.id).toEqual({
            turnNumber: index + 1,
            moveId: row.moveId,
            damage: row.damage,
            bestMove: row.damage === top,
            counterattack: row.counterattack,
          });
        }
        const lowest = turn.moves.reduce((low, row) => (row.damage < low.damage ? row : low));
        weak = playTurn(weak, lowest.moveId);
      });

      // The opponent still has HP 4, so the best moves win the battle.
      let best = battleWithEveryMove(scenario);
      while (!battleProgress(best).finished) {
        const turn = scenario.turns[best.turns.length];
        best = playTurn(best, turn.moves.reduce((top, row) => (row.damage > top.damage ? row : top)).moveId);
      }
      expect(battleProgress(best), scenario.id).toMatchObject({ hp: 0, won: true });
    }
  });

  it("keeps the content hash of its battles, so the battle history stays on the same version", () => {
    // Hashes from the bundle shipped before #36.
    const hashes = Object.fromEntries(townOne.scenarios.map((scenario) => [scenario.id, scenario.hash]));
    expect(hashes).toMatchObject({
      "t01-empty-sign-up": "410297b8da4ef7ca",
      "t01-live-prices": "9644ead4ed169512",
      "t01-crawler-deletes": "95e513cfef03e80c",
    });
  });
});

describe("the two-types twist", () => {
  const [scenario] = twistTown.scenarios;

  it("is the twist of the fixture town 2, with a name and a one-sentence damage rule", () => {
    expect(twistOf(twistTown)).toEqual(TWISTS["two-types"]);
    expect(TWISTS["two-types"]).toEqual({
      name: "Two-type opponents",
      rule: "Each opponent has two types, and each turn shows the type that attacks.",
      damageRule: "Damage still comes from the turn's move table, as in town 1.",
    });
  });

  it("shows in its battles, so the battle screen can explain the rule", () => {
    expect(scenarioTwist(scenario)).toEqual(TWISTS["two-types"]);
  });

  it("gives the opponent both of its types, the first type first", () => {
    expect(opponentTypes(scenario)).toEqual(["traffic", "security"]);
  });

  it("names the type that attacks on each turn", () => {
    expect([0, 1, 2].map((index) => threatTypeOf(scenario, index))).toEqual(["traffic", "security", "traffic"]);
  });

  it("keeps the damage from the move table, so the best moves still win", () => {
    let battle: BattleState = { scenario, team: ["rate-limit", "api-key"], turns: [] };
    battle = playTurn(battle, "rate-limit.quota");
    battle = playTurn(battle, "api-key.rotate");
    expect(battle.turns.map((turn) => [turn.damage, turn.bestMove])).toEqual([
      [2, true],
      [2, true],
    ]);
    expect(battleProgress(battle)).toMatchObject({ hp: 0, finished: true, won: true });
  });
});
