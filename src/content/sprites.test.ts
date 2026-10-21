import { describe, expect, it } from "vitest";
import bundle from "./bundle.generated.json";

// The checker already refuses a species used twice, in any town (check.ts).
describe("creature art in the shipped content (#99)", () => {
  it("gives every creature of Town 1 and Town 2 a species", () => {
    const creatures = bundle.towns.filter((town) => ["t01", "t02"].includes(town.id)).flatMap((town) => town.creatures);
    expect(creatures.filter((creature) => creature.sprite === undefined).map((creature) => creature.id)).toEqual([]);
  });
});
