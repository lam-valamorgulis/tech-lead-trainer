import { describe, expect, it } from "vitest";
import type { BundledScenario } from "@/content/bundle";
import { fixtureTownV2 } from "@/content/fixture-town";
import { OPPONENT_TYPES } from "@/content/schema";
import { playTurnV2, startBattleV2, type BattleV2 } from "./battle-v2.ts";
import {
  activeBefore,
  attackTypeShown,
  hpLevel,
  moveWords,
  turnResultText,
  turnTimeline,
} from "./battle-screen.ts";
import { EFFECTS } from "./effects.ts";
import { OPPONENT_SPECIES } from "./sprite.ts";

// The Battle screen v2 (#103): what the screen shows and when, from the v2 rules. No browser.

const town = fixtureTownV2();
// "Sale day": TTL is best on turn 1 (Reason 0 is right), No store on turn 2 (Reason 1), CDN on turn 3 (Reason 2).
const saleDay = { ...town.scenarios[0], hash: "0123456789abcdef" } as BundledScenario;
const NAMES: Record<string, string> = { cache: "Cache", cookie: "Cookie", proxy: "Proxy", "cache.ttl": "TTL", "cache.no-store": "No store", "proxy.cdn": "CDN", "cookie.http-only": "HttpOnly" };
const nameOf = (id: string) => NAMES[id] ?? id;

const start = () => startBattleV2(saleDay, ["cache", "cookie", "proxy"]);

function play(battle: BattleV2, moves: [string, number][]): BattleV2 {
  return moves.reduce((state, [moveId, reason]) => playTurnV2(state, moveId, reason), battle);
}

describe("the turn timeline: one effect after the other, all CSS", () => {
  it("lands the hit after the attack, and shows the result when the damage text has risen", () => {
    const best = play(start(), [["cache.ttl", 0]]).played[0];
    expect(turnTimeline(best)).toEqual({
      hitAt: EFFECTS.attack.durationMs,
      counterAt: null,
      faintAt: null,
      resultAt: EFFECTS.attack.durationMs + EFFECTS.rise.durationMs,
    });
  });

  it("adds the opponent's attack back and your hurt flash when you lose HP", () => {
    const weak = play(start(), [["proxy.cdn", 0]]).played[0];
    const { hitAt, counterAt, faintAt, resultAt } = turnTimeline(weak);
    expect(counterAt).toBe(hitAt + EFFECTS.rise.durationMs + EFFECTS.attack.durationMs);
    expect(faintAt).toBeNull();
    expect(resultAt).toBe(counterAt! + EFFECTS.flash.durationMs);
  });

  it("adds the Faint last, and the whole turn stays under 2.5 seconds", () => {
    // HttpOnly then TTL on turn 2: 2 + 2 HP lost, so Cache (3 HP) Faints on turn 2.
    const battle = play(start(), [
      ["cookie.http-only", 0],
      ["cache.ttl", 1],
    ]);
    const turn = battle.played[1];
    expect(turn.fainted).toEqual(["cache"]);
    const { counterAt, faintAt, resultAt } = turnTimeline(turn);
    expect(faintAt).toBe(counterAt! + EFFECTS.flash.durationMs);
    expect(resultAt).toBe(faintAt! + EFFECTS.faint.durationMs);
    expect(resultAt).toBeLessThan(2500);
  });
});

describe("the result text of a turn", () => {
  it("says the damage, 'You chose X. Y happens.', and that the best move takes no hit back", () => {
    const battle = play(start(), [["cache.ttl", 0]]);
    expect(turnResultText({ battle, scenario: saleDay, turnNumber: 1, nameOf })).toEqual({
      damage: "Strong hit · 2 ●●",
      choice: "You chose TTL. The logo loads fast, but a new logo takes an hour to show.",
      reason: null,
      hitBack: "Best move. No hit back.",
    });
  });

  it("names the right Reason when yours was wrong, and says the hit lost 1", () => {
    const battle = play(start(), [["cache.ttl", 2]]);
    const text = turnResultText({ battle, scenario: saleDay, turnNumber: 1, nameOf });
    expect(text.damage).toBe("Hit · 1 ●○");
    expect(text.reason).toBe("Wrong Reason. The right one: “A rarely changed file is safe to keep for long.” Your hit lost 1.");
  });

  it("does not say the hit lost 1 when the move did no damage anyway", () => {
    const battle = play(start(), [["cookie.http-only", 1]]);
    const text = turnResultText({ battle, scenario: saleDay, turnNumber: 1, nameOf });
    expect(text.reason).toBe("Wrong Reason. The right one: “A rarely changed file is safe to keep for long.”");
  });

  it("says the HP you lost on a weak move", () => {
    const battle = play(start(), [["proxy.cdn", 0]]);
    expect(turnResultText({ battle, scenario: saleDay, turnNumber: 1, nameOf }).hitBack).toBe("The opponent hits back: −1 HP.");
  });

  it("says who Fainted and who comes in next", () => {
    const battle = play(start(), [
      ["cookie.http-only", 0],
      ["cache.ttl", 1],
    ]);
    expect(turnResultText({ battle, scenario: saleDay, turnNumber: 2, nameOf }).hitBack).toBe(
      "The opponent hits back: −2 HP. Cache fainted! Cookie comes in next.",
    );
  });

  it("says the opponent is down on the winning turn", () => {
    const battle = play(start(), [
      ["cache.ttl", 0],
      ["cache.no-store", 1],
    ]);
    expect(turnResultText({ battle, scenario: saleDay, turnNumber: 2, nameOf }).hitBack).toBe("Sale day is down!");
  });

  it("says so when the team had no move for the threat", () => {
    // Cookie has HttpOnly on turn 1, and no move at all on turn 2.
    const battle = playTurnV2(play(startBattleV2(saleDay, ["cookie"]), [["cookie.http-only", 0]]), null, null);
    const text = turnResultText({ battle, scenario: saleDay, turnNumber: 2, nameOf });
    expect(text.choice).toBe("You had no move for this threat. Nothing changes.");
    expect(text.reason).toBeNull();
    // A team of one had 1 HP left: it Faints, and nobody comes in next.
    expect(text.hitBack).toBe("The opponent hits back: −1 HP. Cookie fainted!");
  });
});

describe("a Meeting Battle on the screen (#105)", () => {
  // "Late launch": the client asks. On every turn the facts answer is best (2), the vague one
  // does 1 and blame does 0. Reason 0 is right.
  const lateLaunch = { ...town.scenarios.find((s) => s.kind === "meeting")!, hash: "0123456789abcdef" } as BundledScenario;
  const meet = (answers: [string, number][]) =>
    answers.reduce((state, [answer, reason], i) => playTurnV2(state, `answer.${answer}-${i}`, reason), startBattleV2(lateLaunch));
  const text = (battle: BattleV2, turnNumber: number) => turnResultText({ battle, scenario: lateLaunch, turnNumber, nameOf });

  it("puts the full answer line on the button, where a Battle shows the move and its creature", () => {
    const [facts] = lateLaunch.turns[0].moves;
    expect(moveWords(facts, nameOf)).toEqual({ main: "Give the cause, the new date and the risk.", owner: null });
    expect(moveWords(saleDay.turns[0].moves[0], nameOf)).toEqual({ main: "TTL", owner: "Cache" });
  });

  it("says the answer you chose, then what happens, and that the best answer costs no Trust", () => {
    expect(text(meet([["facts", 0]]), 1)).toEqual({
      damage: "Strong hit · 2 ●●",
      choice: "You chose “Give the cause, the new date and the risk.” The client trusts the new date.",
      reason: null,
      hitBack: "Best answer. No Trust lost.",
    });
  });

  it("says the Trust you lost when the person pushes back, and when your Trust is gone", () => {
    const battle = meet([
      ["blame", 0],
      ["blame", 0],
    ]);
    expect(text(battle, 1).hitBack).toBe("The client pushes back: −2 Trust.");
    expect(text(battle, 2).hitBack).toBe("The client pushes back: −1 Trust. Your Trust is gone!");
  });

  it("shows no attack type in a two-types town, where a normal Battle shows it (#36)", () => {
    const twoTypes = { ...lateLaunch, opponentType: "outage" as const, secondType: "speed" as const };
    twoTypes.turns = lateLaunch.turns.map((turn) => ({ ...turn, threatType: "speed" as const }));
    expect(attackTypeShown({ kind: "meeting" }, twoTypes, 0)).toBeNull();
    expect(attackTypeShown({ kind: "battle" }, twoTypes, 0)).toBe("speed");
    expect(attackTypeShown({ kind: "battle" }, saleDay, 0)).toBeNull();
  });

  it("says the person has no doubt left on the winning turn", () => {
    const battle = meet([
      ["facts", 0],
      ["facts", 0],
    ]);
    expect(text(battle, 2).hitBack).toBe("The client has no doubt left!");
  });
});

describe("who takes the hit", () => {
  it("is the creature that was in at the start of the turn, also when it Faints in that turn", () => {
    const battle = play(start(), [
      ["cookie.http-only", 0],
      ["cache.ttl", 1],
    ]);
    expect(activeBefore(battle, 1)).toBe("cache");
    expect(activeBefore(battle, 2)).toBe("cache");
    expect(activeBefore(battle, 3)).toBe("cookie");
  });
});

describe("the HP bar colour", () => {
  it("is full above two thirds, mid down to one third, and low below", () => {
    expect([4, 3, 2, 1, 0].map((hp) => hpLevel(hp, 4))).toEqual(["full", "full", "mid", "low", "low"]);
    expect([3, 2, 1, 0].map((hp) => hpLevel(hp, 3))).toEqual(["full", "mid", "low", "low"]);
  });
});

describe("opponent sprites", () => {
  it("give each opponent type its own species of the pack", () => {
    const species = OPPONENT_TYPES.map((type) => OPPONENT_SPECIES[type]);
    expect(new Set(species).size).toBe(OPPONENT_TYPES.length);
    for (const number of species) expect(number).toBeGreaterThanOrEqual(1);
  });
});
