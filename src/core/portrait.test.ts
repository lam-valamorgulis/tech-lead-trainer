import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MEETING_PEOPLE } from "../content/schema.ts";
import { PERSON_WORDS, PORTRAITS, portraitPath } from "./portrait.ts";

describe("portraits of people (#105, design 9 rule 18)", () => {
  it("gives You the portrait of the approved prototype, and the client its prototype portrait", () => {
    expect(portraitPath("you")).toBe("/sprites/portraits/portrait-3.png");
    expect(portraitPath("client")).toBe("/sprites/portraits/portrait-11.png");
  });

  it("gives every Meeting person a portrait and words, and no two people share a portrait", () => {
    for (const person of MEETING_PEOPLE) {
      expect(PORTRAITS[person], person).toBeDefined();
      expect(PERSON_WORDS[person].name, person).not.toBe("");
    }
    const numbers = Object.values(PORTRAITS);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("uses only portraits that ship in the credited pack", () => {
    for (const person of [...MEETING_PEOPLE, "you" as const]) {
      expect(existsSync(`public${portraitPath(person)}`), person).toBe(true);
    }
  });
});
