// Gym and badges (design 4 and 5, ticket #26). Pure functions: no clock, no database.
// The Gym is the town's final test: 5 battles in a row, and 4 wins give the town's badge.
// It never locks the next town: the learner's town comes from the calendar only (roadmap.ts).
import { creatureOf, readyOffers, type BattleOffer, type OfferInput } from "./battle.ts";
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

/** The Gym's 5 battles: 5 different ready scenarios, the least played first. Null when fewer are ready. */
export function gymBattles(input: OfferInput): BattleOffer[] | null {
  const offers = readyOffers(input);
  if (offers.length < GYM_BATTLES) return null;
  // The offers are made before the Gym starts, so a concept's worked example comes only once:
  // before the first Gym battle that shows it.
  const shown = new Set<string>();
  return mixConfusables(offers, input.town.confusablePairs).map((offer) => {
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
 * Picks the Gym's battles one at a time (design 4: the Gym mixes confusable concepts). Each pick
 * is the battle that completes the most confusable pairs, so both sides meet in the Gym, and then
 * adds the most new sides. A tie keeps the offer order: the least played first, then file order.
 */
function mixConfusables(offers: BattleOffer[], pairs: ConfusablePair[]): BattleOffer[] {
  const tested = new Map(offers.map((offer) => [offer, testedItems(offer)]));
  const covered = new Set<string>();
  const score = (offer: BattleOffer) => {
    const after = new Set([...covered, ...tested.get(offer)!]);
    const pairsMet = pairs.filter(([a, b]) => after.has(a) && after.has(b)).length;
    const newSides = pairs.flat().filter((id) => after.has(id) && !covered.has(id)).length;
    return pairsMet * 100 + newSides;
  };
  const left = [...offers];
  const picked: BattleOffer[] = [];
  while (picked.length < GYM_BATTLES) {
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
