// Battle rules (design 7, ticket #16). Pure functions: no clock, no database.
import type { BundledCreature, BundledScenario, BundledTown } from "@/content/bundle";
import { KEY_POINTS, type BattleTurn } from "../content/schema.ts";
import { caughtIds, type CatchRecord } from "./catch.ts";
import type { LearningDay } from "./day.ts";
import type { RecheckRecord } from "./review.ts";

/** The opponent's HP. With HP 3 a random guesser wins 63% of battles; with HP 4, 37% (design 7). */
export const OPPONENT_HP = 4;
/** A battle lasts at most this many turns. */
export const MAX_TURNS = 3;

/** What the rules need from a battle the learner started: one per battle, from its turn events. */
export type BattleRecord = { battleId: string; scenarioId: string; learningDay: LearningDay };

export type WorkedExample = { creatureId: string; name: string; workedExample: BundledCreature["workedExample"] };

/**
 * The team: `size` creatures picked from `choices`, the creatures the learner caught.
 * `workedExamples` come before the battle, one per concept seen for the first time (design 7.1).
 */
export type BattleOffer = {
  scenario: BundledScenario;
  team: { size: number; choices: string[] };
  workedExamples: WorkedExample[];
};

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
export function bestRow(turn: BattleTurn) {
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
  return readyOffers({ town, catches, battles })[0] ?? null;
}

/**
 * Every scenario the learner can win today, as a battle offer, the least played first. A
 * scenario is ready when the team can hold the creature of every best move.
 */
export function readyOffers({
  town,
  catches,
  battles,
}: {
  town: BundledTown;
  catches: CatchRecord[];
  battles: BattleRecord[];
}): BattleOffer[] {
  const caught = caughtIds(catches);
  // A retired creature cannot join a team, even when it was caught.
  const choices = town.creatures.filter((creature) => !creature.retired && caught.has(creature.id)).map((c) => c.id);
  const ready = town.scenarios.filter(
    (scenario) => !scenario.retired && [...conceptsOf(scenario)].every((concept) => choices.includes(concept)),
  );
  const plays = (scenario: BundledScenario) => battles.filter((battle) => battle.scenarioId === scenario.id).length;
  // A stable sort keeps file order between scenarios played equally often.
  return [...ready]
    .sort((a, b) => plays(a) - plays(b))
    .map((scenario) => ({
      scenario,
      team: { size: Math.min(TEAM_SIZE, choices.length), choices },
      workedExamples: workedExamplesFor(town, scenario, catches, battles),
    }));
}

/** The concepts a scenario uses: the creatures of its best moves. */
function conceptsOf(scenario: BundledScenario): Set<string> {
  return new Set(scenario.turns.map((turn) => creatureOf(bestRow(turn).moveId)));
}

/**
 * The worked examples to show before this battle, in town order: one for each concept the
 * learner meets in a battle for the first time. A concept already used in an earlier battle,
 * or caught by the placement test, needs none.
 */
function workedExamplesFor(
  town: BundledTown,
  scenario: BundledScenario,
  catches: CatchRecord[],
  battles: BattleRecord[],
): WorkedExample[] {
  const played = new Set(battles.map((battle) => battle.scenarioId));
  const met = new Set(town.scenarios.filter((s) => played.has(s.id)).flatMap((s) => [...conceptsOf(s)]));
  const placed = new Set(catches.filter((r) => r.fromPlacement && r.correct).map((r) => r.itemId));
  const concepts = conceptsOf(scenario);
  return town.creatures
    .filter((creature) => concepts.has(creature.id) && !met.has(creature.id) && !placed.has(creature.id))
    .map((creature) => ({ creatureId: creature.id, name: creature.name, workedExample: creature.workedExample }));
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

/** The learner's self-check on one turn's model answer: the key points (1 to 3) they said. */
export type SelfCheck = { turnNumber: number; bestMoveId: string; tickedPoints: number[] };

/**
 * The self-check of a played turn. It returns a record and never changes the battle, so the
 * ticks cannot change the damage or the result (design 7.7). The best move is fixed here, at
 * play time, so a later content edit never changes what the check was about.
 */
export function checkTurn(battle: BattleState, turnNumber: number, tickedPoints: number[]): SelfCheck {
  if (!battle.turns.some((turn) => turn.turnNumber === turnNumber)) throw new Error(`Turn ${turnNumber} was not played.`);
  if (tickedPoints.some((point) => !Number.isInteger(point) || point < 1 || point > KEY_POINTS)) {
    throw new Error(`A key point is 1, 2 or ${KEY_POINTS}.`);
  }
  if (new Set(tickedPoints).size !== tickedPoints.length) throw new Error("A key point is ticked once.");
  const turn = battle.scenario.turns[turnNumber - 1];
  return { turnNumber, bestMoveId: bestRow(turn).moveId, tickedPoints: [...tickedPoints].sort((a, b) => a - b) };
}

/** What the rules need from the battle log: a played turn, a battle's end, and a self-check. */
export type TurnRecord = {
  battleId: string;
  scenarioId: string;
  turnNumber: number;
  moveId: string | null;
  bestMove: boolean;
  learningDay: LearningDay;
};
export type BattleEndRecord = { battleId: string; result: "won" | "lost"; learningDay: LearningDay };
export type CheckRecord = SelfCheck & { battleId: string; learningDay: LearningDay };

/**
 * What the battles ask the review schedule to bring back tomorrow (design 7):
 * - a turn's best move, when the learner did not tick all 3 key points of its model answer;
 * - every move used in a lost battle. A battle left unfinished is not lost.
 */
export function battleRechecks({
  turns,
  ends,
  checks,
}: {
  turns: Pick<TurnRecord, "battleId" | "moveId">[];
  ends: BattleEndRecord[];
  checks: CheckRecord[];
}): RecheckRecord[] {
  const fromChecks = checks
    .filter((check) => check.tickedPoints.length < KEY_POINTS)
    .map((check) => ({ itemId: check.bestMoveId, learningDay: check.learningDay }));
  const fromLosses = ends
    .filter((end) => end.result === "lost")
    .flatMap((end) => {
      const used = turns.filter((turn) => turn.battleId === end.battleId).map((turn) => turn.moveId);
      return [...new Set(used)]
        .filter((moveId): moveId is string => moveId !== null)
        .map((itemId) => ({ itemId, learningDay: end.learningDay }));
    });
  return [...fromChecks, ...fromLosses];
}

/** How often the learner picked the best move: the main learning number, not the win rate (design 7). */
export type BestMoveRate = { bestMoves: number; turns: number };

/** The best-move rate per town id, from the flags stored at play time. A scenario id starts with its town id. */
export function bestMoveRates(turns: TurnRecord[]): Map<string, BestMoveRate> {
  const rates = new Map<string, BestMoveRate>();
  for (const turn of turns) {
    const [townId] = turn.scenarioId.split("-");
    const rate = rates.get(townId) ?? { bestMoves: 0, turns: 0 };
    rates.set(townId, { bestMoves: rate.bestMoves + (turn.bestMove ? 1 : 0), turns: rate.turns + 1 });
  }
  return rates;
}

/** For example "67% (2 of 3 turns)". */
export function formatBestMoveRate(rate: BestMoveRate): string {
  if (rate.turns === 0) return "no battle turns yet";
  return `${Math.round((rate.bestMoves / rate.turns) * 100)}% (${rate.bestMoves} of ${rate.turns} turns)`;
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
