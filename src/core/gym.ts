// Gym and badges (design 4 and 5, ticket #26). Pure functions: no clock, no database.
// The Gym is the town's final test: 5 battles in a row, and 4 wins give the town's badge.
// It never locks the next town: the learner's town comes from the calendar only (roadmap.ts).
import { kindOf, type Scenario } from "../content/schema.ts";
import { battleOffers, bestRow, creatureOf, readyOffers, type BattleOffer, type OfferInput } from "./battle.ts";
import { addDays, type LearningDay } from "./day.ts";
import type { ConfusablePair } from "./review.ts";
import { townStartDay } from "./roadmap.ts";

export const GYM_BATTLES = 5;
export const GYM_WINS_NEEDED = 4;

/** What the rules need from a finished Gym. */
export type GymRecord = { townId: string; passed: boolean; learningDay: LearningDay };

export type GymProgress = { played: number; wins: number; finished: boolean; passed: boolean };

/** The Gym opens in the last week of the town's month: 7 days before the next town starts. */
export function gymOpensOn(programStartDate: LearningDay, townNumber: number): LearningDay {
  return addDays(townStartDay(programStartDate, townNumber + 1), -7);
}

/** Open from that day on, so a lost Gym can be tried again any time. */
export function gymIsOpen(programStartDate: LearningDay, townNumber: number, today: LearningDay): boolean {
  return today >= gymOpensOn(programStartDate, townNumber);
}

/**
 * One turn of a Gym twin next to the old scenario. Not null when the turn is the old threat, word
 * for word, under another Constraint line: the reversed Constraint (design 7.5).
 */
export type ReversedTurn = {
  /** The Constraint the learner saw last time. Null when the old turn had none. */
  oldConstraint: string | null;
  /** The best move last time. The content check makes it lose on at least one reversed turn of each twin. */
  oldBestMoveId: string;
} | null;

/** What a Gym twin offer knows about the old scenario it replays. */
export type GymTwin = { originalId: string; originalName: string; turns: ReversedTurn[] };

/**
 * Each turn of a twin next to the old scenario: the reversed turns, and null for a turn that is
 * new, or a copy with the same Constraint. The old turn with the same threat is the one at the
 * same place when it matches, else the first that matches.
 */
export function reversedTurns(twin: Pick<Scenario, "turns">, original: Pick<Scenario, "turns">): ReversedTurn[] {
  return twin.turns.map((turn, index) => {
    const sameThreat = (old: Scenario["turns"][number]) => old.threat === turn.threat;
    const atSamePlace = original.turns[index];
    const old = atSamePlace && sameThreat(atSamePlace) ? atSamePlace : original.turns.find(sameThreat);
    if (!old || turn.constraint === undefined || old.constraint === turn.constraint) return null;
    return { oldConstraint: old.constraint ?? null, oldBestMoveId: bestRow(old).moveId };
  });
}

/**
 * The Gym twins the learner can play (design 7.5, #113): twins of a normal Battle the learner
 * already played, so the situation is an old one. Each needs the same caught creatures as any
 * Battle. A twin of a Meeting Battle waits: the Gym holds normal Battles only.
 */
export function gymTwinOffers(input: OfferInput): BattleOffer[] {
  const played = new Set(input.battles.map((battle) => battle.scenarioId));
  const scenarios = new Map(input.town.scenarios.map((scenario) => [scenario.id, scenario]));
  const twins = input.town.scenarios.filter((scenario) => {
    const original = scenario.twinOf === undefined ? undefined : scenarios.get(scenario.twinOf);
    return !scenario.retired && kindOf(scenario) === "battle" && original !== undefined && !original.retired && played.has(original.id);
  });
  return battleOffers(input, twins).map((offer) => {
    const original = scenarios.get(offer.scenario.twinOf!)!;
    return { ...offer, twin: { originalId: original.id, originalName: original.name, turns: reversedTurns(offer.scenario, original) } };
  });
}

/**
 * The Gym's 5 battles: Gym twins first, then the normal ready scenarios, the least played first
 * in each group. A town with no twins, or with none ready, plays 5 normal battles. Null when fewer
 * than 5 are ready in all.
 */
export function gymBattles(input: OfferInput): BattleOffer[] | null {
  const twins = gymTwinOffers(input);
  const offers = readyOffers(input);
  if (twins.length + offers.length < GYM_BATTLES) return null;
  // The offers are made before the Gym starts, so a concept's worked example comes only once:
  // before the first Gym battle that shows it.
  const shown = new Set<string>();
  return mixConfusables([twins, offers], input.town.confusablePairs).map((offer) => {
    const workedExamples = offer.workedExamples.filter((example) => !shown.has(example.creatureId));
    for (const example of workedExamples) shown.add(example.creatureId);
    return { ...offer, workedExamples };
  });
}

/**
 * The creatures and moves a battle puts in front of the learner: every move of its move tables and
 * their creatures. A wrong move is often the confusable one, so it counts too.
 */
function testedItems(offer: BattleOffer): Set<string> {
  return new Set(offer.scenario.turns.flatMap((turn) => turn.moves.flatMap((row) => [row.moveId, creatureOf(row.moveId)])));
}

/**
 * Picks the Gym's battles one at a time (design 4: the Gym mixes confusable concepts). `groups`
 * come in priority order: a pick comes from the first group with a battle left. Inside it, each
 * pick is the battle that completes the most confusable pairs, so both sides meet in the Gym, and
 * then adds the most new sides. A tie keeps the offer order: the least played first, then file order.
 */
function mixConfusables(groups: BattleOffer[][], pairs: ConfusablePair[]): BattleOffer[] {
  const tested = new Map(groups.flat().map((offer) => [offer, testedItems(offer)]));
  const covered = new Set<string>();
  const score = (offer: BattleOffer) => {
    const after = new Set([...covered, ...tested.get(offer)!]);
    const pairsMet = pairs.filter(([a, b]) => after.has(a) && after.has(b)).length;
    const newSides = pairs.flat().filter((id) => after.has(id) && !covered.has(id)).length;
    return pairsMet * 100 + newSides;
  };
  const lefts = groups.map((group) => [...group]);
  const picked: BattleOffer[] = [];
  while (picked.length < GYM_BATTLES) {
    const left = lefts.find((group) => group.length > 0)!;
    const best = left.reduce((top, offer) => (score(offer) > score(top) ? offer : top));
    left.splice(left.indexOf(best), 1);
    picked.push(best);
    for (const id of tested.get(best)!) covered.add(id);
  }
  return picked;
}

/** Where a Gym stands after each battle, won or lost. It ends after 5, or once the badge is out of reach. */
export function gymProgress(results: boolean[]): GymProgress {
  const wins = results.filter(Boolean).length;
  const losses = results.length - wins;
  const outOfReach = losses > GYM_BATTLES - GYM_WINS_NEEDED;
  const finished = results.length === GYM_BATTLES || outOfReach;
  return { played: results.length, wins, finished, passed: finished && wins >= GYM_WINS_NEEDED };
}

/** Each town with a passed Gym, once, with the day of its first pass. */
export function badges(gyms: GymRecord[]): { townId: string; earnedOn: LearningDay }[] {
  const earned = new Map<string, LearningDay>();
  for (const gym of [...gyms].sort((a, b) => a.learningDay.localeCompare(b.learningDay))) {
    if (gym.passed && !earned.has(gym.townId)) earned.set(gym.townId, gym.learningDay);
  }
  return [...earned].map(([townId, earnedOn]) => ({ townId, earnedOn }));
}
