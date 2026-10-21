import type { ConfusablePair } from "@/core/review";
import { currentTownNumber, townToPlay } from "@/core/roadmap";
import type { Creature, CreatureOf } from "../core/week.ts";
import type { BundledTown, ContentBundle } from "./bundle.ts";
import type { Boss } from "./weekend.ts";
import type { Card } from "./schema.ts";
import { reviewCards, type ScoredCard } from "./scored-cards.ts";
import generated from "./bundle.generated.json";
import fixture from "./fixture.generated.json";

// The content the app ships with, checked and hashed at build time by `npm run content:build`.
// Seam C builds with NEXT_PUBLIC_CONTENT_SET=fixture, so tests do not depend on monthly content.
const bundle = (process.env.NEXT_PUBLIC_CONTENT_SET === "fixture" ? fixture : generated) as ContentBundle;

export const towns: BundledTown[] = bundle.towns.filter((town) => !town.retired);

/** Pairs of creatures or moves that are easy to mix up, from every town (design 6). */
export const confusablePairs: ConfusablePair[] = bundle.towns.flatMap((town) => town.confusablePairs);

/** The weekend boss of a town (design 3: week 1 of each month), or undefined when it has none yet. */
export function weekendBoss(townId: string): Boss | undefined {
  return bundle.weekends.find((weekend) => weekend.townId === townId)?.boss;
}

/** The ADR coach prompt of a town's weekend, or null to use the default. */
export function adrCoachPrompt(townId: string): string | null {
  return bundle.weekends.find((weekend) => weekend.townId === townId)?.adrCoachPrompt ?? null;
}

/** Hard words with a simple definition, shown on tap (design 2). */
export const glossary = bundle.glossary;

/** A town by its id, as used in links such as /placement/t01. */
export function getTown(id: string): BundledTown | undefined {
  return towns.find((town) => town.id === id);
}

/**
 * The town a learner plays today: the town of their own month (design 4), or the last earlier
 * town with content when theirs is not ready yet.
 */
export function currentTown(programStartDate: string, today: string): BundledTown | undefined {
  return townToPlay(towns, currentTownNumber(programStartDate, today));
}

export type ReviewItem = {
  id: string;
  kind: "creature" | "move";
  name: string;
  hash: string;
  review: { question: string; answer: string };
  /** The species of the creature, or of the move's creature (#99). */
  sprite?: number;
};

const reviewItems = new Map<string, ReviewItem>();
const creatures = new Map<string, Creature>();
for (const town of bundle.towns) {
  for (const creature of town.creatures) {
    if (creature.retired) continue;
    const { id, name, hash, review, sprite } = creature;
    reviewItems.set(id, { id, kind: "creature", name, hash, review, sprite });
    creatures.set(id, { id, name });
    for (const move of creature.moves) {
      if (move.retired) continue;
      reviewItems.set(move.id, { id: move.id, kind: "move", name: move.name, hash: move.hash, review: move.review, sprite });
      creatures.set(move.id, { id, name });
    }
  }
}

/** The review question of a creature or move in any town. Retired items are not reviewed. */
export function reviewItem(id: string): ReviewItem | undefined {
  return reviewItems.get(id);
}

export type { ScoredCard };

const { decisionCards: scoredCards, tradeOffs } = reviewCards(bundle.towns);

/** Every Decision Card that review can show: retired cards and the cards of retired creatures are left out. */
export const decisionCardIds: string[] = [...scoredCards.keys()];

/** A Decision Card by its id, or undefined when it cannot be shown. */
export function decisionCard(id: string): ScoredCard | undefined {
  return scoredCards.get(id);
}

/** The Stage 3 trade-off question of a creature, or undefined when it has none to show. */
export function tradeOffQuestion(creatureId: string): ScoredCard | undefined {
  return tradeOffs.get(creatureId);
}

/** The creature a reviewed item belongs to: the creature itself, or the creature of a move. */
export const creatureOf: CreatureOf = (itemId) => creatures.get(itemId);

const cards = new Map<string, { name: string; card: Card }>();
for (const town of bundle.towns) {
  for (const creature of town.creatures) {
    cards.set(creature.id, { name: creature.name, card: creature.card });
    for (const move of creature.moves) cards.set(move.id, { name: move.name, card: move.card });
  }
}

/** The name and card of a creature or move in any town, retired or not. */
export function itemCard(id: string): { name: string; card: Card } | undefined {
  return cards.get(id);
}

const scenarioNames = new Map(bundle.towns.flatMap((town) => town.scenarios.map((scenario) => [scenario.id, scenario.name])));

/** The display name of a battle scenario in any town, retired or not. */
export function scenarioName(id: string): string | undefined {
  return scenarioNames.get(id);
}
