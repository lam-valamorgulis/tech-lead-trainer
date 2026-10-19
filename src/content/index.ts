import type { BundledTown, ContentBundle } from "./bundle.ts";
import generated from "./bundle.generated.json";
import fixture from "./fixture.generated.json";

// The content the app ships with, checked and hashed at build time by `npm run content:build`.
// Seam C builds with NEXT_PUBLIC_CONTENT_SET=fixture, so tests do not depend on monthly content.
const bundle = (process.env.NEXT_PUBLIC_CONTENT_SET === "fixture" ? fixture : generated) as ContentBundle;

export const towns: BundledTown[] = bundle.towns.filter((town) => !town.retired);

/** The town a learner is in. Every learner starts at town 1; the map ticket moves them on. */
export function currentTown(): BundledTown | undefined {
  return towns.find((town) => town.number === 1);
}
