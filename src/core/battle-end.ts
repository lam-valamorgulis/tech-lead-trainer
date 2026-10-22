// The end-of-Battle screen (design 7.4, ticket #104). Pure functions: no browser, no clock.
// One screen after the last turn: the counts, then each turn with its model answer and the key
// points to tick. It works for every kind of battle: the bar names come from BAR_NAMES.
import { KEY_POINTS, type BattleTurn } from "../content/schema.ts";
import { bestRow, creatureOf, damageLabel, OPPONENT_HP, type SelfCheck } from "./battle.ts";
import { BAR_NAMES, endSummary, type BattleV2 } from "./battle-v2.ts";

/** The display name of a creature or a move, from the content. */
export type NameOf = (id: string) => string;

/**
 * How a move shows on the end screen and in the package. A Meeting answer shows its own words.
 * A creature's move names its creature too, for example "TTL (Cache)", as the move buttons do.
 */
export function moveName(battle: Pick<BattleV2, "kind">, turn: BattleTurn, moveId: string | null, nameOf: NameOf): string | null {
  if (moveId === null) return null;
  const row = turn.moves.find((r) => r.moveId === moveId);
  if (row?.label) return row.label;
  return battle.kind === "battle" ? `${nameOf(moveId)} (${nameOf(creatureOf(moveId))})` : nameOf(moveId);
}

/** One turn on the end screen. */
export type EndTurn = {
  turnNumber: number;
  threat: string;
  constraint: string | null;
  /** The move played, or null when the team had none for this threat. */
  move: string | null;
  bestMove: string;
  isBest: boolean;
  /** The Reason picked, or null on a turn with no Reasons. */
  reason: string | null;
  reasonCorrect: boolean | null;
  /** The right Reason, only when the one picked was wrong. */
  rightReason: string | null;
  damage: string;
  /** True when a wrong Reason took 1 off the hit. */
  weakened: boolean;
  hpLost: number;
  modelAnswer: string;
  keyPoints: string[];
};

/** A count out of a total, for example 2 of 3 best moves. */
export type Count = { count: number; of: number };

export type EndView = {
  result: "won" | "lost";
  /** The one line under the result. */
  line: string;
  bestMoves: Count;
  /** Only the turns that had Reasons count. */
  rightReasons: Count;
  /** All the HP the learner's side lost, under the kind's own bar name. */
  hpLost: number;
  /**
   * True when an unticked key point brings the turn's best move back in tomorrow's reviews: only in
   * a Battle. The answers of a Meeting Battle and the verdicts of an Agent Diff Battle are not review items.
   */
  ticksFeedReviews: boolean;
  turns: EndTurn[];
};

/** Everything the end screen shows, for a finished battle. The turns' content is the one the battle was played with. */
export function endView(battle: BattleV2, nameOf: NameOf): EndView {
  const summary = endSummary(battle);
  const turns = summary.turns.map((played): EndTurn => {
    const turn = battle.turns[played.turnNumber - 1];
    const reasons = turn.reasons;
    const reason = played.reasonIndex !== null && reasons ? reasons[played.reasonIndex].text : null;
    const rightReason =
      played.reasonCorrect === false && reasons && played.rightReasonIndex !== null ? reasons[played.rightReasonIndex].text : null;
    return {
      turnNumber: played.turnNumber,
      threat: turn.threat,
      constraint: turn.constraint ?? null,
      move: moveName(battle, turn, played.moveId, nameOf),
      bestMove: moveName(battle, turn, bestRow(turn).moveId, nameOf)!,
      isBest: played.bestMove,
      reason,
      reasonCorrect: played.reasonCorrect,
      rightReason,
      damage: damageLabel(played.damage),
      weakened: played.damage < played.moveDamage,
      hpLost: played.hpLost,
      modelAnswer: turn.modelAnswer,
      keyPoints: [...turn.keyPoints],
    };
  });
  const withReasons = turns.filter((turn) => turn.reasonCorrect !== null);
  return {
    result: summary.result,
    line: resultLine(battle),
    bestMoves: { count: turns.filter((turn) => turn.isBest).length, of: turns.length },
    rightReasons: { count: withReasons.filter((turn) => turn.reasonCorrect).length, of: withReasons.length },
    hpLost: turns.reduce((sum, turn) => sum + turn.hpLost, 0),
    ticksFeedReviews: battle.kind === "battle",
    turns,
  };
}

/**
 * The one line under the result. Only a lost Battle sends its moves back to tomorrow's review:
 * the answers of a Meeting Battle and the verdicts of an Agent Diff Battle are not review items.
 */
export function resultLine(battle: BattleV2): string {
  const summary = endSummary(battle);
  const bars = BAR_NAMES[battle.kind];
  if (summary.result === "won") return `The opponent's ${bars.opponent} reached 0 in ${summary.turnsUsed} turns.`;
  const left = `The opponent still has ${bars.opponent} ${summary.opponentHp} of ${OPPONENT_HP}.`;
  const why = whyLost(battle, "you");
  return battle.kind === "battle" ? `${why} ${left} The moves you used come back in tomorrow's review.` : `${why} ${left}`;
}

/** Why a lost battle was lost, said by the screen ("you") or by the learner in the package ("I"). */
export function whyLost(battle: BattleV2, who: "you" | "I"): string {
  const { lostBy } = endSummary(battle);
  if (lostBy === null) throw new Error("The battle was not lost.");
  if (lostBy === "turns") return who === "you" ? "Out of turns." : "I ran out of turns.";
  const your = who === "you" ? "your" : "my";
  const why = battle.kind === "battle" ? `all ${your} creatures fainted.` : `${your} ${BAR_NAMES[battle.kind].team} reached 0.`;
  return `${why.charAt(0).toUpperCase()}${why.slice(1)}`;
}

/** The key points (1 to 3) ticked on each turn, by turn number. A turn with none may be missing. */
export type Ticks = Record<number, number[]>;

/**
 * The self-check of every played turn, one per turn (design 7.4). A turn with no ticks is a check
 * with no points, so its best move comes back in tomorrow's reviews. It never changes the battle,
 * so the ticks cannot change the damage or the result. The best move is the one of the content
 * the battle was played with.
 */
export function endChecks(battle: BattleV2, ticks: Ticks): SelfCheck[] {
  return battle.played.map(({ turnNumber }) => {
    const points = ticks[turnNumber] ?? [];
    if (points.some((point) => !Number.isInteger(point) || point < 1 || point > KEY_POINTS)) {
      throw new Error(`A key point is 1, 2 or ${KEY_POINTS}.`);
    }
    if (new Set(points).size !== points.length) throw new Error("A key point is ticked once.");
    return { turnNumber, bestMoveId: bestRow(battle.turns[turnNumber - 1]).moveId, tickedPoints: [...points].sort((a, b) => a - b) };
  });
}

/** Ticks one key point on, or off again. Returns new ticks. */
export function toggleTick(ticks: Ticks, turnNumber: number, point: number): Ticks {
  const now = ticks[turnNumber] ?? [];
  return { ...ticks, [turnNumber]: now.includes(point) ? now.filter((p) => p !== point) : [...now, point] };
}
