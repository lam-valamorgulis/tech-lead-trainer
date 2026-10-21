import { describe, expect, it } from "vitest";
import bundle from "./bundle.generated.json";

describe("creature art in the shipped content (#99)", () => {
  const creatures = bundle.towns.filter((town) => ["t01", "t02"].includes(town.id)).flatMap((town) => town.creatures);

  it("gives every creature of Town 1 and Town 2 a species of the pack: 1 to 56", () => {
    for (const creature of creatures) {
      expect(creature.sprite, creature.id).toBeGreaterThanOrEqual(1);
      expect(creature.sprite, creature.id).toBeLessThanOrEqual(56);
    }
  });

  it("never uses one species for two creatures", () => {
    const species = creatures.map((creature) => creature.sprite);
    expect(new Set(species).size).toBe(species.length);
  });
});
