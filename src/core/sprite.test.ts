import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lookForStatus, paletteForStage, spritePath } from "./sprite.ts";

describe("creature sprites (#99)", () => {
  it("draws stage 1 in the normal colours, and stages 2 and 3 in the second palette", () => {
    expect([paletteForStage(null), paletteForStage(1), paletteForStage(2), paletteForStage(3)]).toEqual(["normal", "normal", "alt", "alt"]);
  });

  it("names the file of a species, its side and its palette", () => {
    expect(spritePath(12, "front", "normal")).toBe("/sprites/monsters/monster-12-front.png");
    expect(spritePath(12, "back", "alt")).toBe("/sprites/monsters/monster-12-back-alt.png");
  });

  it("has all 4 files of every species 1 to 56 in public/sprites/monsters", () => {
    const files = new Set(readdirSync("public/sprites/monsters"));
    for (let species = 1; species <= 56; species++) {
      for (const side of ["front", "back"] as const) {
        for (const palette of ["normal", "alt"] as const) {
          expect(files.has(spritePath(species, side, palette).split("/").pop()!), `${species} ${side} ${palette}`).toBe(true);
        }
      }
    }
  });

  it("draws caught in colour, seen in grey, and not met as a shadow", () => {
    expect([lookForStatus("caught"), lookForStatus("seen"), lookForStatus("not-met")]).toEqual(["color", "grey", "shadow"]);
  });
});
