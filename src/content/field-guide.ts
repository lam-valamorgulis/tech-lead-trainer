import type { BundledTown } from "./bundle.ts";

export type FieldGuideView = {
  townName: string;
  creatures: { id: string; name: string }[];
};

/** The Field Guide list for one town. Seen, caught and evolved counts come with the catch ticket. */
export function fieldGuide(town: BundledTown): FieldGuideView {
  return {
    townName: town.name,
    creatures: town.creatures.filter((c) => !c.retired).map((c) => ({ id: c.id, name: c.name })),
  };
}
