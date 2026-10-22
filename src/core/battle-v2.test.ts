import { describe, expect, it } from "vitest";
import { fixtureTownV2 } from "@/content/fixture-town";
import type { BattleTurn } from "@/content/schema";
import {
  BAR_NAMES,
  CONSTRAINT_MAIN,
  CONSTRAINT_REVERSED,
  CREATURE_HP,
  YOU,
  damageBack,
  endSummary,
  playTurnV2,
  progressV2,
  startBattleV2,
  teamHp,
  turnLog,
  usableMovesV2,
  weakenedHit,
  type BattleV2,
} from "./battle-v2.ts";
import { OPPONENT_HP, MAX_TURNS } from "./battle.ts";
import { REASONS } from "@/content/schema";
import { SKILLS } from "@/content/skills";

// ADR 0001 (battle rules v2) and design 7.3. Every number here comes from the ADR.

const reasons = (rightAt: number) => [0, 1, 2].map((i) => ({ text: `Reason ${i}.`, right: i === rightAt }));

/** A turn whose move table has these damages. The moves are a.m, b.m, c.m and c.n: creature c has two. */
function turnOf(damages: (0 | 1 | 2)[], rightReason = 0, extra: Partial<BattleTurn> = {}): BattleTurn {
  return {
    threat: "The page is slow.",
    constraint: "The team has 2 people.",
    reasons: reasons(rightReason),
    skills: [3],
    moves: damages.map((damage, i) => ({ moveId: ["a.m", "b.m", "c.m", "c.n"][i], damage, counterattack: `Result ${i}.` })),
    modelAnswer: "Use the best move.",
    keyPoints: ["One.", "Two.", "Three."],
    ...extra,
  };
}

const battleOf = (damages: (0 | 1 | 2)[], team = ["a", "b", "c"]) =>
  startBattleV2({ kind: "battle", turns: [turnOf(damages), turnOf(damages, 1), turnOf(damages, 2)] }, team);

/** The right Reason of the current turn, and a wrong one. */
const rightReason = (battle: BattleV2) => battle.turns[battle.played.length].reasons!.findIndex((r) => r.right);
const wrongReason = (battle: BattleV2) => battle.turns[battle.played.length].reasons!.findIndex((r) => !r.right);

describe("the numbers of the HP rules", () => {
  it("are opponent HP 4, creature HP 3 and at most 3 turns", () => {
    expect(OPPONENT_HP).toBe(4);
    expect(CREATURE_HP).toBe(3);
    expect(MAX_TURNS).toBe(3);
  });
});

describe("the battle log's database checks", () => {
  it("match the content: 3 Reasons (index 0 to 2) and 26 Skills. A change needs a new migration", () => {
    expect(REASONS).toBe(3);
    expect(SKILLS.map((skill) => skill.id)).toEqual(Array.from({ length: 26 }, (_, i) => i + 1));
  });
});

describe("damage back", () => {
  it("is 0 for the best move, 1 for a damage-1 move and 2 for a damage-0 move", () => {
    expect(damageBack(2, true)).toBe(0);
    expect(damageBack(1, false)).toBe(1);
    expect(damageBack(0, false)).toBe(2);
  });

  it("is 0 for a best move of damage 1, because the best move never hurts you", () => {
    expect(damageBack(1, true)).toBe(0);
  });
});

describe("a wrong Reason", () => {
  it("weakens the hit by 1: 2 becomes 1, 1 becomes 0, and 0 stays 0", () => {
    expect(weakenedHit(2, false)).toBe(1);
    expect(weakenedHit(1, false)).toBe(0);
    expect(weakenedHit(0, false)).toBe(0);
  });

  it("leaves the hit as it is when the Reason is right, or when the turn has no Reasons", () => {
    expect(weakenedHit(2, true)).toBe(2);
    expect(weakenedHit(1, null)).toBe(1);
  });

  it("turns a best move of damage 2 into a hit of 1, and the move still counts as the best", () => {
    const battle = battleOf([2, 1, 0]);
    const next = playTurnV2(battle, "a.m", wrongReason(battle));
    expect(next.played[0]).toMatchObject({ moveDamage: 2, damage: 1, bestMove: true, reasonCorrect: false, hpLost: 0 });
    expect(progressV2(next).opponentHp).toBe(3);
  });

  it("turns a damage-1 move into no damage, and you still lose 1 HP", () => {
    const battle = battleOf([2, 1, 0]);
    const next = playTurnV2(battle, "b.m", wrongReason(battle));
    expect(next.played[0]).toMatchObject({ moveDamage: 1, damage: 0, bestMove: false, reasonCorrect: false, hpLost: 1 });
    expect(progressV2(next).opponentHp).toBe(4);
  });
});

describe("the Reason", () => {
  it("is picked before the result: a turn with Reasons refuses a move without one", () => {
    const battle = battleOf([2, 1, 0]);
    expect(() => playTurnV2(battle, "a.m", null)).toThrow(/Reason/);
    expect(() => playTurnV2(battle, "a.m", 3)).toThrow(/Reason/);
    expect(() => playTurnV2(battle, "a.m", 1.5)).toThrow(/Reason/);
  });

  it("is logged by its index in the file, with whether it was right at play time", () => {
    const battle = battleOf([2, 1, 0]);
    const next = playTurnV2(battle, "a.m", 2);
    expect(next.played[0]).toMatchObject({ reasonIndex: 2, rightReasonIndex: 0, reasonCorrect: false });
  });

  it("refuses a turn whose Reasons have no right one, so no pick is wrongly marked wrong", () => {
    const broken = turnOf([2, 1, 0], 0, { reasons: reasons(5) });
    const battle = startBattleV2({ turns: [broken, broken, broken] }, ["a"]);
    expect(() => playTurnV2(battle, "a.m", 0)).toThrow(/no right Reason/);
  });

  it("is not asked on a turn with no Reasons, which plays by the v1 damage", () => {
    const old = startBattleV2({ turns: [turnOf([2, 1, 0], 0, { reasons: undefined }), turnOf([2, 1, 0]), turnOf([2, 1, 0])] }, ["a"]);
    expect(() => playTurnV2(old, "a.m", 0)).toThrow(/no Reasons/);
    expect(playTurnV2(old, "a.m", null).played[0]).toMatchObject({ damage: 2, reasonIndex: null, reasonCorrect: null });
  });
});

describe("HP and Faint", () => {
  it("costs nothing for the best move, 1 HP for a damage-1 move and 2 HP for a damage-0 move", () => {
    const battle = battleOf([2, 1, 0]);
    expect(teamHp(playTurnV2(battle, "a.m", rightReason(battle)))).toEqual([3, 3, 3]);
    expect(teamHp(playTurnV2(battle, "b.m", rightReason(battle)))).toEqual([2, 3, 3]);
    expect(teamHp(playTurnV2(battle, "c.m", rightReason(battle)))).toEqual([1, 3, 3]);
  });

  it("makes a creature at 0 HP Faint, and the next creature comes in and takes the rest of the hit", () => {
    let battle = battleOf([2, 1, 0]);
    battle = playTurnV2(battle, "c.m", rightReason(battle));
    battle = playTurnV2(battle, "c.m", rightReason(battle));
    expect(teamHp(battle)).toEqual([0, 2, 3]);
    expect(battle.played[1].fainted).toEqual(["a"]);
    expect(progressV2(battle)).toMatchObject({ active: "b", faints: 1, finished: false });
  });

  it("lets the team use the moves of every creature in it, also after one Faints", () => {
    let battle = battleOf([2, 1, 0]);
    battle = playTurnV2(battle, "c.m", rightReason(battle));
    battle = playTurnV2(battle, "c.m", rightReason(battle));
    expect(usableMovesV2(battle)).toEqual(["a.m", "b.m", "c.m"]);
  });

  it("has no hit back once the opponent is down", () => {
    let battle = battleOf([2, 1, 0]);
    battle = playTurnV2(battle, "a.m", rightReason(battle));
    battle = playTurnV2(battle, "b.m", rightReason(battle));
    battle = playTurnV2(battle, "b.m", rightReason(battle));
    expect(battle.played.map((turn) => turn.hpLost)).toEqual([0, 1, 0]);
    expect(progressV2(battle)).toMatchObject({ won: true, finished: true, opponentHp: 0 });
  });

  it("counts a turn with no move as a damage-0 move: no hit and 2 HP lost", () => {
    const battle = startBattleV2({ kind: "battle", turns: [turnOf([2, 1, 0]), turnOf([2, 1, 0]), turnOf([2, 1, 0])] }, ["x"]);
    expect(usableMovesV2(battle)).toEqual([]);
    expect(() => playTurnV2(battle, null, 0)).toThrow(/no move/);
    const next = playTurnV2(battle, null, null);
    expect(next.played[0]).toMatchObject({ moveId: null, damage: 0, bestMove: false, hpLost: 2, reasonIndex: null });
  });
});

describe("win and lose", () => {
  it("is a win when the opponent's HP reaches 0, so two strong hits end the battle after 2 turns", () => {
    let battle = battleOf([2, 1, 0]);
    battle = playTurnV2(battle, "a.m", rightReason(battle));
    battle = playTurnV2(battle, "a.m", rightReason(battle));
    expect(progressV2(battle)).toMatchObject({ won: true, finished: true, lostBy: null, turnNumber: 2 });
    expect(() => playTurnV2(battle, "a.m", 0)).toThrow(/over/);
  });

  it("is a loss when the opponent still has HP after 3 turns", () => {
    let battle = battleOf([2, 1, 0]);
    for (let i = 0; i < 3; i += 1) battle = playTurnV2(battle, "b.m", rightReason(battle));
    expect(progressV2(battle)).toMatchObject({ won: false, finished: true, lostBy: "turns", opponentHp: 1 });
  });

  it("names Faint as the reason when the turns run out and the last team member Faints on turn 3 together", () => {
    // You alone, HP 3: three damage-1 moves do 3 damage to the opponent (HP 4) and cost 1 HP each.
    let battle = startBattleV2({ kind: "meeting", turns: [turnOf([2, 1, 0]), turnOf([2, 1, 0], 1), turnOf([2, 1, 0], 2)] });
    for (let i = 0; i < 3; i += 1) battle = playTurnV2(battle, "b.m", rightReason(battle));
    expect(battle.played[2]).toMatchObject({ hpLost: 1, fainted: [YOU] });
    expect(progressV2(battle)).toMatchObject({
      finished: true,
      won: false,
      lostBy: "faint",
      faints: 1,
      opponentHp: 1,
      turnNumber: 3,
      active: null,
    });
    expect(endSummary(battle)).toMatchObject({ result: "lost", lostBy: "faint", turnsUsed: 3, teamHp: [{ id: YOU, hp: 0 }] });
  });

  it("refuses a move the team cannot use, and a team with no creature, a repeat or more than 3", () => {
    const battle = battleOf([2, 1, 0], ["a", "b"]);
    expect(() => playTurnV2(battle, "c.m", 0)).toThrow(/not a move/);
    const turns = battle.turns;
    expect(() => startBattleV2({ kind: "battle", turns }, [])).toThrow();
    expect(() => startBattleV2({ kind: "battle", turns }, ["a", "a"])).toThrow();
    expect(() => startBattleV2({ kind: "battle", turns }, ["a", "b", "c", "d"])).toThrow();
  });

  it("never changes the battle it was given", () => {
    const battle = battleOf([2, 1, 0]);
    const copy = structuredClone(battle);
    playTurnV2(battle, "c.m", 0);
    expect(battle).toEqual(copy);
  });
});

/** Every way to play a whole battle, with how many of the equally likely guesses lead to it. */
function everyPlay(battle: BattleV2, onEnd: (end: BattleV2, ways: number) => void, ways = 1) {
  if (progressV2(battle).finished) {
    // A battle that ends early leaves its later turns unplayed: each of their guesses leads here.
    const left = battle.turns.slice(battle.played.length).reduce((n, turn) => n * turn.moves.length * 3, 1);
    onEnd(battle, ways * left);
    return;
  }
  for (const moveId of usableMovesV2(battle)) {
    for (const reasonIndex of [0, 1, 2]) everyPlay(playTurnV2(battle, moveId, reasonIndex), onEnd, ways);
  }
}

function guessWins(damages: (0 | 1 | 2)[]): { wins: number; all: number } {
  let wins = 0;
  let all = 0;
  everyPlay(battleOf(damages), (end, ways) => {
    all += ways;
    if (progressV2(end).won) wins += ways;
  });
  return { wins, all };
}

describe("a random guesser (ADR 0001, counted exactly)", () => {
  it("wins 52 of 729 battles with 3 moves of damage 2, 1, 0: about 7.1%", () => {
    const { wins, all } = guessWins([2, 1, 0]);
    expect({ wins, all }).toEqual({ wins: 52, all: 729 });
    expect(Math.round((wins / all) * 1000) / 10).toBe(7.1);
  });

  it("wins 61 of 1728 battles with 4 moves of damage 2, 1, 0, 0: about 3.5%", () => {
    const { wins, all } = guessWins([2, 1, 0, 0]);
    expect({ wins, all }).toEqual({ wins: 61, all: 1728 });
    expect(Math.round((wins / all) * 1000) / 10).toBe(3.5);
  });

  it("makes at most 2 creatures Faint in 3 turns, so a team of 3 never loses by Faint", () => {
    let most = 0;
    for (const damages of [[2, 1, 0], [2, 1, 0, 0]] as (0 | 1 | 2)[][]) {
      everyPlay(battleOf(damages), (end) => {
        const { faints, lostBy } = progressV2(end);
        most = Math.max(most, faints);
        expect(lostBy).not.toBe("faint");
      });
    }
    expect(most).toBe(2);
  });
});

describe("a team of one: Meeting Battle and Agent Diff Battle", () => {
  const town = fixtureTownV2();
  const meeting = town.scenarios.find((s) => s.kind === "meeting")!;
  const agentDiff = town.scenarios.find((s) => s.kind === "agent-diff")!;
  const best = (turn: BattleTurn) => turn.moves.reduce((a, b) => (b.damage > a.damage ? b : a));
  const worst = (turn: BattleTurn) => turn.moves.reduce((a, b) => (b.damage < a.damage ? b : a));

  it("is You with HP 3, and every answer or verdict of the move table can be used", () => {
    const battle = startBattleV2(meeting);
    expect(battle.team).toEqual([YOU]);
    expect(teamHp(battle)).toEqual([3]);
    expect(usableMovesV2(battle)).toEqual(meeting.turns[0].moves.map((row) => row.moveId));
  });

  it("refuses a team, because You play alone", () => {
    expect(() => startBattleV2(meeting, ["cache"])).toThrow(/alone/);
  });

  it("names the bars by the kind of battle, as data", () => {
    expect(BAR_NAMES.battle).toEqual({ opponent: "HP", team: "HP" });
    expect(BAR_NAMES.meeting).toEqual({ opponent: "Doubt", team: "Trust" });
    expect(BAR_NAMES["agent-diff"]).toEqual({ opponent: "Risk", team: "Trust" });
  });

  it("is lost when You Faint: two weak answers take 4 of 3 HP", () => {
    let battle = startBattleV2(agentDiff);
    for (let i = 0; i < 2; i += 1) {
      const turn = battle.turns[battle.played.length];
      battle = playTurnV2(battle, worst(turn).moveId, turn.reasons!.findIndex((r) => r.right));
    }
    expect(battle.played.map((turn) => turn.hpLost)).toEqual([2, 1]);
    expect(progressV2(battle)).toMatchObject({ finished: true, won: false, lostBy: "faint", faints: 1, active: null });
  });

  it("plays by the same rules as a Battle: the best moves with the right Reasons win", () => {
    let battle = startBattleV2(meeting);
    while (!progressV2(battle).finished) {
      const turn = battle.turns[battle.played.length];
      battle = playTurnV2(battle, best(turn).moveId, turn.reasons!.findIndex((r) => r.right));
    }
    expect(progressV2(battle).won).toBe(true);
    expect(teamHp(battle)).toEqual([3]);
  });
});

describe("the log fields of a turn", () => {
  it("hold the kind, the Reason, the HP lost, the Skills and the Constraint, fixed at play time", () => {
    let battle = startBattleV2({ kind: "battle", turns: [turnOf([2, 1, 0], 1, { skills: [3, 10] }), turnOf([2, 1, 0]), turnOf([2, 1, 0])] }, ["a", "b", "c"]);
    battle = playTurnV2(battle, "b.m", 0);
    expect(turnLog(battle, 1)).toEqual({
      battleKind: "battle",
      moveDamage: 1,
      reasonIndex: 0,
      reasonCorrect: false,
      hpLost: 1,
      skillIds: [3, 10],
      constraintVariant: CONSTRAINT_MAIN,
    });
  });

  it("log a Gym twin's reversed Constraint as reversed, and a turn with no Constraint as none (#113)", () => {
    let battle = startBattleV2({ kind: "battle", turns: [turnOf([2, 1, 0]), turnOf([2, 1, 0], 0, { constraint: undefined }), turnOf([2, 1, 0])] }, ["a"]);
    battle = playTurnV2(playTurnV2(battle, "a.m", 0), "a.m", 0);
    expect(turnLog(battle, 1, true).constraintVariant).toBe(CONSTRAINT_REVERSED);
    expect(turnLog(battle, 1).constraintVariant).toBe(CONSTRAINT_MAIN);
    expect(turnLog(battle, 2, true).constraintVariant).toBeNull();
  });

  it("leave out the Skills and the Constraint of a turn that has none, and the Reason of a turn with none", () => {
    const plain = turnOf([2, 1, 0], 0, { reasons: undefined, skills: undefined, constraint: undefined });
    const battle = playTurnV2(startBattleV2({ turns: [plain, plain, plain] }, ["a"]), "a.m", null);
    expect(turnLog(battle, 1)).toEqual({
      battleKind: "battle",
      moveDamage: 2,
      reasonIndex: null,
      reasonCorrect: null,
      hpLost: 0,
      skillIds: null,
      constraintVariant: null,
    });
  });

  it("refuse a turn that was not played", () => {
    expect(() => turnLog(battleOf([2, 1, 0]), 1)).toThrow(/not played/);
  });
});

describe("the end summary", () => {
  it("gathers each turn's move, Reason, damage, HP lost, model answer and key points on one screen", () => {
    let battle = battleOf([2, 1, 0]);
    battle = playTurnV2(battle, "c.m", rightReason(battle));
    battle = playTurnV2(battle, "a.m", wrongReason(battle));
    battle = playTurnV2(battle, "a.m", rightReason(battle));
    const summary = endSummary(battle);
    expect(summary).toMatchObject({
      kind: "battle",
      result: "lost",
      lostBy: "turns",
      turnsUsed: 3,
      opponentHp: 1,
      faints: 0,
      teamHp: [{ id: "a", hp: 1 }, { id: "b", hp: 3 }, { id: "c", hp: 3 }],
    });
    expect(summary.turns.map((t) => [t.turnNumber, t.moveId, t.bestMoveId, t.bestMove, t.reasonCorrect, t.damage, t.hpLost])).toEqual([
      [1, "c.m", "a.m", false, true, 0, 2],
      [2, "a.m", "a.m", true, false, 1, 0],
      [3, "a.m", "a.m", true, true, 2, 0],
    ]);
    expect(summary.turns[1]).toMatchObject({ rightReasonIndex: 1, modelAnswer: "Use the best move.", keyPoints: ["One.", "Two.", "Three."] });
  });

  it("is only for a finished battle", () => {
    expect(() => endSummary(battleOf([2, 1, 0]))).toThrow(/not over/);
  });
});
