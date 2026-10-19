import type { BundledTown, ContentBundle } from "./bundle.ts";
import generated from "./bundle.generated.json";

// The content the app ships with, checked and hashed at build time by `npm run content:build`.
const bundle = generated as ContentBundle;

export const towns: BundledTown[] = bundle.towns.filter((town) => !town.retired);

export function getTown(id: string): BundledTown | undefined {
  return bundle.towns.find((town) => town.id === id);
}

/** The town a learner is in. Every learner starts at town 1; the map ticket moves them on. */
export function currentTown(): BundledTown | undefined {
  return towns.find((town) => town.number === 1);
}
