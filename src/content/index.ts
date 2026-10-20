import type { BundledTown, ContentBundle } from "./bundle.ts";
import type { Card } from "./schema.ts";
import generated from "./bundle.generated.json";
import fixture from "./fixture.generated.json";

// The content the app ships with, checked and hashed at build time by `npm run content:build`.
// Seam C builds with NEXT_PUBLIC_CONTENT_SET=fixture, so tests do not depend on monthly content.
const bundle = (process.env.NEXT_PUBLIC_CONTENT_SET === "fixture" ? fixture : generated) as ContentBundle;

export const towns: BundledTown[] = bundle.towns.filter((town) => !town.retired);

/** A town by its id, as used in links such as /placement/t01. */
export function getTown(id: string): BundledTown | undefined {
  return towns.find((town) => town.id === id);
}

/** The town a learner is in. Every learner starts at town 1; the map ticket moves them on. */
export function currentTown(): BundledTown | undefined {
  return towns.find((town) => town.number === 1);
}

export type ReviewItem = {
  id: string;
  kind: "creature" | "move";
  name: string;
  hash: string;
  review: { question: string; answer: string };
};

const reviewItems = new Map<string, ReviewItem>();
for (const town of bundle.towns) {
  for (const creature of town.creatures) {
    if (creature.retired) continue;
    const { id, name, hash, review } = creature;
    reviewItems.set(id, { id, kind: "creature", name, hash, review });
    for (const move of creature.moves) {
      if (!move.retired) reviewItems.set(move.id, { id: move.id, kind: "move", name: move.name, hash: move.hash, review: move.review });
    }
  }
}

/** The review question of a creature or move in any town. Retired items are not reviewed. */
export function reviewItem(id: string): ReviewItem | undefined {
  return reviewItems.get(id);
}

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

/** The display name of a battle scenario in any town, retired or not. */
export function scenarioName(id: string): string | undefined {
  return bundle.towns.flatMap((town) => town.scenarios).find((scenario) => scenario.id === id)?.name;
}
