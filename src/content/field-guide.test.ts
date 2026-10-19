import { describe, expect, it } from "vitest";
import { buildBundle } from "./bundle.ts";
import { fieldGuide } from "./field-guide.ts";
import { fixtureTown } from "./fixture-town.ts";
import { townSchema } from "./schema.ts";

describe("fieldGuide", () => {
  it("lists the creatures of a town by display name, in content order", () => {
    const [town] = buildBundle([townSchema.parse(fixtureTown())]).towns;
    expect(fieldGuide(town)).toEqual({
      townName: "Fixture Town",
      creatures: [
        { id: "cache", name: "Cache" },
        { id: "cookie", name: "Cookie" },
      ],
    });
  });

  it("leaves out retired creatures", () => {
    const content = fixtureTown();
    Object.assign(content.creatures[1], { retired: true });
    const [town] = buildBundle([townSchema.parse(content)]).towns;
    expect(fieldGuide(town).creatures.map((c) => c.name)).toEqual(["Cache"]);
  });
});
