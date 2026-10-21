// Battle rules v2 (design 7.3, ADR 0001, ticket #102). Pure functions: no clock, no database.
// HP on both sides, damage back, Faint, and a Reason picked before the result. The same engine
// runs a Battle (a team of up to 3 creatures) and a Meeting or Agent Diff Battle (You alone).
// The v1 rules in battle.ts still run the current Battle screen until the v2 screen ships (#103).
import { kindOf, type BattleTurn, type Scenario, type ScenarioKind } from "../content/schema.ts";
import { MAX_TURNS, OPPONENT_HP, bestRow, creatureOf } from "./battle.ts";

/** The HP of each creature in the team, and of You in a Meeting or Agent Diff Battle. */
export const CREATURE_HP = 3;

/** The team of a Meeting Battle and an Agent Diff Battle: the learner alone. */
export const YOU = "you";

const TEAM_SIZE = 3;

/** The names of the two HP bars, per kind of battle. The screen shows them; the rules do not use them. */
export const BAR_NAMES: Record<ScenarioKind, { opponent: string; team: string }> = {
  battle: { opponent: "HP", team: "HP" },
  meeting: { opponent: "Doubt", team: "Trust" },
  "agent-diff": { opponent: "Risk", team: "Trust" },
};

/**
 * The Constraint a turn showed, as logged. "main" is the turn's own `constraint` line. A later
 * Gym can show a reversed Constraint under another name (design 7.5).
 */
export const CONSTRAINT_MAIN = "main";

type Damage = 0 | 1 | 2;

/** What the rules need from a scenario: its kind and its 3 turns. */
export type ScenarioRules = Pick<Scenario, "kind" | "turns">;

export type PlayedTurnV2 = {
  turnNumber: number;
  /** Null when the team had no move for this threat. */
  moveId: string | null;
  /** The damage in the move table. */
  moveDamage: Damage;
  /** The hit on the opponent: the move's damage, 1 weaker after a wrong Reason. */
  damage: Damage;
  /** Stored at play time, so a later content edit never changes the history (design 12.2). */
  bestMove: boolean;
  /** The Reason picked, by its index in the content file. Null on a turn with no Reasons. */
  reasonIndex: number | null;
  rightReasonIndex: number | null;
  reasonCorrect: boolean | null;
  /** The HP the learner's side lost this turn: 0, 1 or 2. */
  hpLost: Damage;
  /** The team members that Fainted this turn, in team order. */
  fainted: string[];
};

/** A battle in play. The HP of both sides follows from the played turns. */
export type BattleV2 = { kind: ScenarioKind; turns: BattleTurn[]; team: string[]; played: PlayedTurnV2[] };

export type ProgressV2 = {
  opponentHp: number;
  /** The team member who takes the next hit, or null when all of them Fainted. */
  active: string | null;
  /** The turn to play next, or the last one played when the battle is over. */
  turnNumber: number;
  faints: number;
  finished: boolean;
  won: boolean;
  /** Why a lost battle was lost: the 3 turns ran out, or every team member Fainted. */
  lostBy: "turns" | "faint" | null;
};

/** The HP the learner loses: none for the best move, 1 for a damage-1 move, 2 for a damage-0 move. */
export function damageBack(moveDamage: Damage, bestMove: boolean): Damage {
  if (bestMove) return 0;
  return moveDamage === 0 ? 2 : 1;
}

/** A wrong Reason makes the hit 1 weaker: 2 → 1, 1 → 0. A turn with no Reasons (null) keeps its damage. */
export function weakenedHit(damage: Damage, reasonCorrect: boolean | null): Damage {
  if (reasonCorrect !== false) return damage;
  return Math.max(0, damage - 1) as Damage;
}

/**
 * Starts a battle. A Battle takes a team of 1 to 3 different creatures. A Meeting or Agent Diff
 * Battle takes no team: You play alone. Checking that the creatures were caught is the offer's job.
 */
export function startBattleV2(scenario: ScenarioRules, team: string[] = []): BattleV2 {
  const kind = kindOf(scenario);
  if (kind !== "battle") {
    if (team.length > 0) throw new Error("In a Meeting or Agent Diff Battle, You play alone.");
    return { kind, turns: scenario.turns, team: [YOU], played: [] };
  }
  if (team.length < 1 || team.length > TEAM_SIZE || new Set(team).size !== team.length) {
    throw new Error(`Pick 1 to ${TEAM_SIZE} different creatures.`);
  }
  return { kind, turns: scenario.turns, team: [...team], played: [] };
}

/** The HP of each team member after `lost` HP in total, in team order. */
function hpAfter(team: string[], lost: number): number[] {
  return team.map((_, i) => Math.min(CREATURE_HP, Math.max(0, CREATURE_HP * (i + 1) - lost)));
}

const lostHp = (battle: BattleV2) => battle.played.reduce((sum, turn) => sum + turn.hpLost, 0);

/**
 * The HP of each team member, in team order. A hit that takes a member below 0 goes on to the
 * next one, so the team shares one pool of 3 HP per member (design 7.3: 6 HP lost, 2 Faints).
 */
export function teamHp(battle: BattleV2): number[] {
  return hpAfter(battle.team, lostHp(battle));
}

/** Where the battle stands: both sides' HP, who takes the next hit, and the result. */
export function progressV2(battle: BattleV2): ProgressV2 {
  const opponentHp = Math.max(0, OPPONENT_HP - battle.played.reduce((sum, turn) => sum + turn.damage, 0));
  const hp = teamHp(battle);
  const activeIndex = hp.findIndex((points) => points > 0);
  const active = activeIndex === -1 ? null : battle.team[activeIndex];
  const won = opponentHp === 0;
  const finished = won || active === null || battle.played.length === MAX_TURNS;
  const lostBy = won || !finished ? null : active === null ? "faint" : "turns";
  return {
    opponentHp,
    active,
    turnNumber: finished ? battle.played.length : battle.played.length + 1,
    faints: hp.filter((points) => points === 0).length,
    finished,
    won,
    lostBy,
  };
}

/**
 * The moves the learner can use this turn. In a Battle, the rows whose creature is in the team,
 * also after that creature Fainted: Faint changes who takes the hits, not the moves. In a
 * Meeting or Agent Diff Battle, every answer or verdict of the table.
 */
export function usableMovesV2(battle: BattleV2): string[] {
  const turn = battle.turns[battle.played.length];
  if (!turn) return [];
  const rows = turn.moves.map((row) => row.moveId);
  return battle.kind === "battle" ? rows.filter((moveId) => battle.team.includes(creatureOf(moveId))) : rows;
}

/**
 * Plays the current turn: a move, then a Reason picked before the result. `moveId` is null only
 * when the team has no move for this threat; it then counts as a damage-0 move, with no Reason.
 * The opponent hits back unless the hit took its HP to 0. Returns a new state.
 */
export function playTurnV2(battle: BattleV2, moveId: string | null, reasonIndex: number | null): BattleV2 {
  const before = progressV2(battle);
  if (before.finished) throw new Error("The battle is over.");
  const turn = battle.turns[battle.played.length];
  const usable = usableMovesV2(battle);
  const turnNumber = battle.played.length + 1;

  let moveDamage: Damage = 0;
  let bestMove = false;
  if (moveId === null) {
    if (usable.length > 0) throw new Error("You have a move for this turn. Pick one.");
    if (reasonIndex !== null) throw new Error("A turn with no move has no Reason.");
  } else {
    if (!usable.includes(moveId)) throw new Error(`${moveId} is not a move you can use this turn.`);
    const row = turn.moves.find((r) => r.moveId === moveId)!;
    moveDamage = row.damage;
    bestMove = row === bestRow(turn);
  }

  const rightReasonIndex = turn.reasons ? turn.reasons.findIndex((reason) => reason.right) : null;
  // The content check makes exactly one Reason right. Without one, every pick would count as wrong.
  if (rightReasonIndex === -1) throw new Error("This turn has no right Reason.");
  if (!turn.reasons && reasonIndex !== null) throw new Error("This turn has no Reasons.");
  if (turn.reasons && moveId !== null) {
    if (reasonIndex === null || !Number.isInteger(reasonIndex) || reasonIndex < 0 || reasonIndex >= turn.reasons.length) {
      throw new Error(`Pick a Reason: 0 to ${turn.reasons.length - 1}.`);
    }
  }
  const reasonCorrect = moveId === null || rightReasonIndex === null ? null : reasonIndex === rightReasonIndex;
  const damage = weakenedHit(moveDamage, reasonCorrect);

  const opponentDown = before.opponentHp - damage <= 0;
  const hpBefore = teamHp(battle);
  const teamLeft = hpBefore.reduce((sum, points) => sum + points, 0);
  const hpLost = (opponentDown ? 0 : Math.min(damageBack(moveDamage, bestMove), teamLeft)) as Damage;
  const hpNow = hpAfter(battle.team, lostHp(battle) + hpLost);

  const played: PlayedTurnV2 = {
    turnNumber,
    moveId,
    moveDamage,
    damage,
    bestMove,
    reasonIndex: moveId === null ? null : reasonIndex,
    rightReasonIndex,
    reasonCorrect,
    hpLost,
    fainted: battle.team.filter((_, i) => hpNow[i] === 0 && hpBefore[i] > 0),
  };
  return { ...battle, played: [...battle.played, played] };
}

/** The v2 fields of a played turn's log row (design 12.2), fixed at play time. */
export type TurnLogFields = Pick<PlayedTurnV2, "moveDamage" | "reasonIndex" | "reasonCorrect" | "hpLost"> & {
  battleKind: ScenarioKind;
  /** Null when the turn's content has no Skills. */
  skillIds: number[] | null;
  /** Null when the turn's content has no Constraint. */
  constraintVariant: string | null;
};

/** The v2 log fields of one played turn. The Skills and the Constraint come from the content at play time. */
export function turnLog(battle: BattleV2, turnNumber: number): TurnLogFields {
  const played = battle.played.find((turn) => turn.turnNumber === turnNumber);
  if (!played) throw new Error(`Turn ${turnNumber} was not played.`);
  const turn = battle.turns[turnNumber - 1];
  return {
    battleKind: battle.kind,
    moveDamage: played.moveDamage,
    reasonIndex: played.reasonIndex,
    reasonCorrect: played.reasonCorrect,
    hpLost: played.hpLost,
    skillIds: turn.skills && turn.skills.length > 0 ? [...turn.skills] : null,
    constraintVariant: turn.constraint ? CONSTRAINT_MAIN : null,
  };
}

export type SummaryTurn = PlayedTurnV2 & { bestMoveId: string; modelAnswer: string; keyPoints: string[] };

/** The end-of-battle screen in one record (design 7.4): every turn's result and model answer. */
export type EndSummary = {
  kind: ScenarioKind;
  result: "won" | "lost";
  lostBy: "turns" | "faint" | null;
  turnsUsed: number;
  opponentHp: number;
  faints: number;
  teamHp: { id: string; hp: number }[];
  turns: SummaryTurn[];
};

/** The end summary of a finished battle. */
export function endSummary(battle: BattleV2): EndSummary {
  const progress = progressV2(battle);
  if (!progress.finished) throw new Error("The battle is not over.");
  const hp = teamHp(battle);
  return {
    kind: battle.kind,
    result: progress.won ? "won" : "lost",
    lostBy: progress.lostBy,
    turnsUsed: battle.played.length,
    opponentHp: progress.opponentHp,
    faints: progress.faints,
    teamHp: battle.team.map((id, i) => ({ id, hp: hp[i] })),
    turns: battle.played.map((played) => {
      const turn = battle.turns[played.turnNumber - 1];
      return { ...played, bestMoveId: bestRow(turn).moveId, modelAnswer: turn.modelAnswer, keyPoints: [...turn.keyPoints] };
    }),
  };
}
