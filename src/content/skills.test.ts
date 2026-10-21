import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SKILLS } from "./skills.ts";

describe("SKILLS", () => {
  it("has the 26 numbered Skills of research/tech-lead-skills.md, with the same names", () => {
    const rows = readFileSync("research/tech-lead-skills.md", "utf8")
      .split("\n")
      .map((line) => line.match(/^\| (\d{1,2}) \| ([^|]+) \|/))
      .filter((match) => match !== null)
      .map((match) => ({ id: Number(match[1]), name: match[2].trim() }));
    expect(SKILLS).toEqual(rows);
  });
});
