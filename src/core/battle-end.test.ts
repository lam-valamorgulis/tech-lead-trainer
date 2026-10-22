import { describe, expect, it } from "vitest";
import type { BundledScenario } from "@/content/bundle";
import { fixtureTownV2 } from "@/content/fixture-town";
import { battleRechecks, type CheckRecord } from "./battle.ts";
import { endChecks, endView, moveName, resultLine, toggleTick, whyLost } from "./battle-end.ts";
import { playTurnV2, progressV2, startBattleV2, type BattleV2 } from "./battle-v2.ts";

// The end-of-Battle screen (#104, design 7.4). "Sale day": TTL is best on turn 1 (Reason 0 is
// right), No store on turn 2 (Reason 1), CDN on turn 3 (Reason 2). "Late launch" is a Meeting Battle.
const town = fixtureTownV2();
const scenario = (id: string) => ({ ...town.scenarios.find((s) => s.id === id)!, hash: "0123456789abcdef" }) as BundledScenario;
const saleDay = scenario("t99-sale-day");
const lateLaunch = scenario("t99-late-launch");
const NAMES: Record<string, string> = {
  cache: "Cache",
  cookie: "Cookie",
  proxy: "Proxy",
  "cache.ttl": "TTL",
  "cache.no-store": "No store",
  "proxy.cdn": "CDN",
  "cookie.http-only": "HttpOnly",
};
const nameOf = (id: string) => NAMES[id] ?? id;

function play(battle: BattleV2, moves: [string | null, number | null][]): BattleV2 {
  return moves.reduce((state, [moveId, reason]) => playTurnV2(state, moveId, reason), battle);
}

/** Lost on turns: HttpOnly, then TTL on turn 2 (Cache Faints), then CDN with a wrong Reason. */
const lost = () =>
  play(startBattleV2(saleDay, ["cache", "cookie", "proxy"]), [
    ["cookie.http-only", 0],
    ["cache.ttl", 1],
    ["proxy.cdn", 0],
  ]);

describe("the end view", () => {
  it("counts the best moves and the right Reasons, and lists every turn with its threat, Constraint and model answer", () => {
    const view = endView(lost(), nameOf);
    expect(view).toMatchObject({
      result: "lost",
      line: "Out of turns. The opponent still has HP 3 of 4. The moves you used come back in tomorrow's review.",
      bestMoves: { count: 1, of: 3 },
      rightReasons: { count: 2, of: 3 },
      hpLost: 4,
      ticksFeedReviews: true,
    });
    expect(view.turns.map((t) => [t.turnNumber, t.move, t.bestMove, t.isBest, t.reasonCorrect, t.hpLost])).toEqual([
      [1, "HttpOnly (Cookie)", "TTL (Cache)", false, true, 2],
      [2, "TTL (Cache)", "No store (Cache)", false, true, 2],
      [3, "CDN (Proxy)", "CDN (Proxy)", true, false, 0],
    ]);
    expect(view.turns[0]).toMatchObject({
      threat: "Every visitor downloads the same logo and styles again.",
      constraint: "The logo changes once a year.",
      reason: "A rarely changed file is safe to keep for long.",
      rightReason: null,
      modelAnswer: "Give the logo and styles a long TTL. Browsers keep a copy, so the server sends each file once.",
      keyPoints: ["The logo and styles rarely change.", "A TTL lets browsers reuse their copy.", "A new logo shows only after the TTL ends."],
    });
    // A wrong Reason names the right one, and the hit was 1 weaker.
    expect(view.turns[2]).toMatchObject({
      reason: "No store makes far pages faster.",
      rightReason: "A copy near the visitor cuts the travel time.",
      damage: "Hit · 1 ●○",
      weakened: true,
    });
  });

  it("uses the bar names of the battle's kind, so a Meeting Battle reads Doubt and Trust", () => {
    const battle = play(startBattleV2(lateLaunch), [
      ["answer.blame-0", 0],
      ["answer.vague-1", 1],
    ]);
    const view = endView(battle, nameOf);
    // An answer is not a review item, so the screen does not say an unticked point comes back.
    expect(view).toMatchObject({ result: "lost", hpLost: 3, bestMoves: { count: 0, of: 2 }, ticksFeedReviews: false });
    expect(view.line).toBe("Your Trust reached 0. The opponent still has Doubt 4 of 4.");
    expect(whyLost(battle, "I")).toBe("My Trust reached 0.");
    expect(view.turns[0]).toMatchObject({ move: "Say the server team was slow.", bestMove: "Give the cause, the new date and the risk." });
  });

  it("says a won battle in one line, with the bar name", () => {
    const won = play(startBattleV2(saleDay, ["cache", "proxy"]), [
      ["cache.ttl", 0],
      ["cache.no-store", 1],
    ]);
    expect(resultLine(won)).toBe("The opponent's HP reached 0 in 2 turns.");
    const meeting = play(startBattleV2(lateLaunch), [
      ["answer.facts-0", 0],
      ["answer.facts-1", 0],
    ]);
    expect(resultLine(meeting)).toBe("The opponent's Doubt reached 0 in 2 turns.");
  });

  it("names the person of a Meeting Battle when the screen gives one (#105)", () => {
    const won = play(startBattleV2(lateLaunch), [
      ["answer.facts-0", 0],
      ["answer.facts-1", 0],
    ]);
    expect(endView(won, nameOf, "The client").line).toBe("The client's Doubt reached 0 in 2 turns.");
    const lost = play(startBattleV2(lateLaunch), [
      ["answer.blame-0", 0],
      ["answer.vague-1", 1],
    ]);
    expect(resultLine(lost, "Your manager")).toBe("Your Trust reached 0. Your manager still has Doubt 4 of 4.");
  });

  it("says when all the creatures fainted", () => {
    // Cookie alone: HttpOnly costs 2 HP, then no move costs the last 1.
    const battle = play(startBattleV2(saleDay, ["cookie"]), [
      ["cookie.http-only", 0],
      [null, null],
    ]);
    expect(resultLine(battle)).toBe(
      "All your creatures fainted. The opponent still has HP 4 of 4. The moves you used come back in tomorrow's review.",
    );
    expect(whyLost(battle, "I")).toBe("All my creatures fainted.");
    expect(endView(battle, nameOf).turns[1]).toMatchObject({ move: null, reason: null, reasonCorrect: null });
    // A turn with no Reason is not counted.
    expect(endView(battle, nameOf).rightReasons).toEqual({ count: 1, of: 1 });
  });

  it("names a creature's move with its creature, and a Meeting answer by its words", () => {
    const battle = startBattleV2(saleDay, ["cache"]);
    expect(moveName(battle, saleDay.turns[0], "cache.ttl", nameOf)).toBe("TTL (Cache)");
    expect(moveName(battle, saleDay.turns[0], null, nameOf)).toBeNull();
    expect(moveName(startBattleV2(lateLaunch), lateLaunch.turns[0], "answer.facts-0", nameOf)).toBe(
      "Give the cause, the new date and the risk.",
    );
  });

  it("is only for a finished battle", () => {
    const oneTurn = play(startBattleV2(saleDay, ["cache"]), [["cache.ttl", 0]]);
    expect(() => endView(oneTurn, nameOf)).toThrow(/not over/);
    const won = play(startBattleV2(saleDay, ["cache", "proxy"]), [
      ["cache.ttl", 0],
      ["cache.no-store", 1],
    ]);
    expect(() => whyLost(won, "you")).toThrow(/not lost/);
  });
});

describe("the ticks and the recheck rule", () => {
  it("make one check per played turn, with that turn's best move; a turn with no ticks has none", () => {
    expect(endChecks(lost(), { 1: [3, 1] })).toEqual([
      { turnNumber: 1, bestMoveId: "cache.ttl", tickedPoints: [1, 3] },
      { turnNumber: 2, bestMoveId: "cache.no-store", tickedPoints: [] },
      { turnNumber: 3, bestMoveId: "proxy.cdn", tickedPoints: [] },
    ]);
  });

  it("refuse points that do not exist", () => {
    expect(() => endChecks(lost(), { 1: [4] })).toThrow("A key point is 1, 2 or 3.");
    expect(() => endChecks(lost(), { 1: [0] })).toThrow("A key point is 1, 2 or 3.");
    expect(() => endChecks(lost(), { 2: [2, 2] })).toThrow("A key point is ticked once.");
  });

  it("bring back tomorrow the best move of each turn with fewer than 3 ticks, and change nothing in the battle", () => {
    const battle = lost();
    const before = structuredClone(battle);
    const checks: CheckRecord[] = endChecks(battle, { 1: [1, 2, 3], 2: [1], 3: [] }).map((check) => ({
      ...check,
      battleId: "b1",
      learningDay: "2026-10-22",
    }));
    // The ticks never change the damage, the HP or the result.
    expect(battle).toEqual(before);
    expect(progressV2(battle)).toMatchObject({ won: false, opponentHp: 3 });
    const rechecks = battleRechecks({ turns: [], ends: [], checks });
    expect(rechecks.map((r) => r.itemId)).toEqual(["cache.no-store", "proxy.cdn"]);
  });

  it("toggle one key point on and off", () => {
    const once = toggleTick({}, 2, 3);
    expect(once).toEqual({ 2: [3] });
    expect(toggleTick(toggleTick(once, 2, 1), 2, 3)).toEqual({ 2: [1] });
  });
});
