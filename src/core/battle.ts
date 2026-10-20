// Battle rules (design 7, ticket #16). Pure functions: no clock, no database.
import type { BundledScenario, BundledTown } from "@/content/bundle";
import type { BattleTurn } from "@/content/schema";
import { caughtIds, type CatchRecord } from "./catch.ts";
import type { LearningDay } from "./day.ts";

/** The opponent's HP. With HP 3 a random guesser wins 63% of battles; with HP 4, 37% (design 7). */
export const OPPONENT_HP = 4;
/** A battle lasts at most this many turns. */
export const MAX_TURNS = 3;

/** What the rules need from a battle the learner started: one per battle, from its turn events. */
export type BattleRecord = { battleId: string; scenarioId: string; learningDay: LearningDay };

/** The team: `size` creatures picked from `choices`, the creatures the learner caught. */
export type BattleOffer = { scenario: BundledScenario; team: { size: number; choices: string[] } };

export type PlayedTurn = {
  turnNumber: number;
  /** Null when the team had no move for this threat. */
  moveId: string | null;
  damage: 0 | 1 | 2;
  /** Stored at play time, so a later content edit never changes the history (design 12.2). */
  bestMove: boolean;
  counterattack: string | null;
};

export type BattleState = { scenario: BundledScenario; team: string[]; turns: PlayedTurn[] };

export type BattleProgress = { hp: number; turnNumber: number; finished: boolean; won: boolean };

const TEAM_SIZE = 3;

/** A move id is <creature>.<move>, so its creature is the part before the dot. */
export function creatureOf(moveId: string): string {
  return moveId.slice(0, moveId.indexOf("."));
}

/** The move with the top damage. The content checker makes sure there is exactly one. */
function bestRow(turn: BattleTurn) {
  return turn.moves.reduce((best, row) => (row.damage > best.damage ? row : best));
}

/**
 * Today's battle, or null. A 3-minute day is reviews only, and a day that already started a
 * battle gets no second one. A scenario is ready when the team can hold the creature of every
 * best move, so a well-chosen team can always win. The least-played ready scenario comes first.
 */
export function nextBattle({
  town,
  catches,
  battles,
  today,
  committedMinutes,
}: {
  town: BundledTown;
  catches: CatchRecord[];
  battles: BattleRecord[];
  today: LearningDay;
  committedMinutes: 3 | 15 | 45;
}): BattleOffer | null {
  if (committedMinutes === 3) return null;
  if (battles.some((battle) => battle.learningDay === today)) return null;
  const caught = caughtIds(catches);
  // A retired creature cannot join a team, even when it was caught.
  const choices = town.creatures.filter((creature) => !creature.retired && caught.has(creature.id)).map((c) => c.id);
  const ready = town.scenarios.filter(
    (scenario) => !scenario.retired && scenario.turns.every((turn) => choices.includes(creatureOf(bestRow(turn).moveId))),
  );
  const plays = (scenario: BundledScenario) => battles.filter((battle) => battle.scenarioId === scenario.id).length;
  // A stable sort keeps file order between scenarios played equally often.
  const [scenario] = [...ready].sort((a, b) => plays(a) - plays(b));
  if (!scenario) return null;
  return { scenario, team: { size: Math.min(TEAM_SIZE, choices.length), choices } };
}

/** Starts a battle with the picked team. Throws when the team breaks the rules. */
export function startBattle(offer: BattleOffer, team: string[]): BattleState {
  if (new Set(team).size !== offer.team.size || team.length !== offer.team.size) {
    throw new Error(`Pick ${offer.team.size} creatures.`);
  }
  const notCaught = team.find((id) => !offer.team.choices.includes(id));
  if (notCaught) throw new Error(`${notCaught} is not a creature you caught.`);
  return { scenario: offer.scenario, team: [...team], turns: [] };
}

/** Where the battle stands: the opponent's HP, the turn to play next, and the result. */
export function battleProgress(battle: BattleState): BattleProgress {
  const hp = Math.max(0, OPPONENT_HP - battle.turns.reduce((sum, turn) => sum + turn.damage, 0));
  const finished = hp === 0 || battle.turns.length === MAX_TURNS;
  return { hp, turnNumber: finished ? battle.turns.length : battle.turns.length + 1, finished, won: hp === 0 };
}

/** The moves the team can use this turn: the rows of the move table whose creature is in the team. */
export function usableMoves(battle: BattleState): string[] {
  const turn = battle.scenario.turns[battle.turns.length];
  if (!turn) return [];
  return turn.moves.map((row) => row.moveId).filter((moveId) => battle.team.includes(creatureOf(moveId)));
}

/**
 * Plays the current turn. `moveId` is null only when the team has no move for this threat:
 * the turn then does no damage. Returns the new state and never changes the old one.
 */
export function playTurn(battle: BattleState, moveId: string | null): BattleState {
  if (battleProgress(battle).finished) throw new Error("The battle is over.");
  const turn = battle.scenario.turns[battle.turns.length];
  const usable = usableMoves(battle);
  const turnNumber = battle.turns.length + 1;
  let played: PlayedTurn;
  if (moveId === null) {
    if (usable.length > 0) throw new Error("You have a move for this turn. Pick one.");
    played = { turnNumber, moveId: null, damage: 0, bestMove: false, counterattack: null };
  } else {
    if (!usable.includes(moveId)) throw new Error(`${moveId} is not a move you can use this turn.`);
    const row = turn.moves.find((r) => r.moveId === moveId)!;
    played = { turnNumber, moveId, damage: row.damage, bestMove: row === bestRow(turn), counterattack: row.counterattack };
  }
  return { ...battle, turns: [...battle.turns, played] };
}

const DAMAGE_WORDS = { 0: "No effect", 1: "Hit", 2: "Strong hit" } as const;

/** UI rule 3: words, a number and pips, for example "Strong hit · 2 ●●". */
export function damageLabel(damage: 0 | 1 | 2): string {
  return `${DAMAGE_WORDS[damage]} · ${damage} ${"●".repeat(damage)}${"○".repeat(2 - damage)}`;
}

/** UI rule 2: "You chose X. Y happens." A turn with no move says so. */
export function counterattackSentence(moveName: string | null, counterattack: string | null): string {
  if (moveName === null || counterattack === null) return "You had no move for this threat. Nothing changes.";
  return `You chose ${moveName}. ${counterattack}`;
}
