import { createHash } from "node:crypto";
import type { Creature, Move, PlacementQuestion, Town } from "./schema.ts";

// The bundle is what the app imports: the content plus a content hash per item.
// `npm run content:build` writes it to src/content/bundle.generated.json. Runs in Node only.

type Hashed<T> = T & { hash: string };

export type BundledMove = Hashed<Move>;
export type BundledCreature = Hashed<Omit<Creature, "moves">> & { moves: BundledMove[] };
export type BundledTown = Omit<Town, "creatures" | "placement"> & {
  creatures: BundledCreature[];
  placement: Hashed<PlacementQuestion>[];
};
export type ContentBundle = { towns: BundledTown[] };

export function buildBundle(towns: Town[]): ContentBundle {
  return {
    towns: towns.map((town) => ({
      ...town,
      creatures: town.creatures.map((creature) => ({
        ...creature,
        // A creature's hash leaves out its moves, so editing a move changes only the move.
        hash: contentHash({
          catch: creature.catch,
          card: creature.card,
          review: creature.review,
          workedExample: creature.workedExample,
        }),
        moves: creature.moves.map((move) => ({
          ...move,
          hash: contentHash({ catch: move.catch, card: move.card, review: move.review }),
        })),
      })),
      placement: town.placement.map((question) => ({ ...question, hash: contentHash(question) })),
    })),
  };
}

/**
 * The version of what the learner read. Display names and the retired flag are left out,
 * because changing them does not change what was learned (design 12.2).
 */
export function contentHash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex").slice(0, 16);
}

/** JSON with keys sorted, so the key order in a file never changes the hash. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
