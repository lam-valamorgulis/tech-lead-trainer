import { describe, expect, it } from "vitest";
import town1 from "../../content/towns/t01.json";
import town2 from "../../content/towns/t02.json";
import { AGENT_VERDICTS } from "../content/schema.ts";
import { diffLines, VERDICT_WORDS, verdictName } from "./agent-diff.ts";

describe("the lines of an agent's diff (#106)", () => {
  it("marks each line as added, removed or unchanged, by its first sign, and keeps the code after it", () => {
    const diff = ' app.use((req, res, next) => {\n-  res.set("A", "1");\n+  res.set("A", req.headers.origin);\n   next();';
    expect(diffLines(diff)).toEqual([
      { change: "same", sign: " ", code: "app.use((req, res, next) => {" },
      { change: "removed", sign: "−", code: '  res.set("A", "1");' },
      { change: "added", sign: "+", code: '  res.set("A", req.headers.origin);' },
      { change: "same", sign: " ", code: "  next();" },
    ]);
  });

  it("reads a first line with no sign as unchanged: the content file trims the first space away", () => {
    expect(diffLines('router.get("/a", (req, res) => {\n+  res.end();')).toEqual([
      { change: "same", sign: " ", code: 'router.get("/a", (req, res) => {' },
      { change: "added", sign: "+", code: "  res.end();" },
    ]);
  });

  it("keeps an empty line, so the line count matches the diff", () => {
    expect(diffLines("+a\n\n+b").map((line) => line.change)).toEqual(["added", "same", "added"]);
  });

  it("reads every Agent Diff Battle of Town 1 and Town 2 with at least one added line", () => {
    const scenarios = [...town1.scenarios, ...town2.scenarios].filter((scenario) => scenario.kind === "agent-diff");
    expect(scenarios.length).toBeGreaterThanOrEqual(8);
    for (const scenario of scenarios) {
      const lines = diffLines((scenario as { diff: string }).diff);
      expect(lines.some((line) => line.change === "added"), scenario.id).toBe(true);
    }
  });
});

describe("the review verdicts (#106, design 7.1)", () => {
  it("gives every verdict a clear name and a short meaning, and no two verdicts the same name", () => {
    for (const id of AGENT_VERDICTS) {
      expect(verdictName(id), id).toBe(VERDICT_WORDS[id].name);
      expect(VERDICT_WORDS[id].meaning, id).not.toBe("");
    }
    const names = AGENT_VERDICTS.map((id) => verdictName(id));
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual(["Approve", "Ask for a test", "Block", "Narrow"]);
  });

  it("has no name for a move that is not a verdict", () => {
    expect(verdictName("cache.ttl")).toBeUndefined();
    expect(verdictName("answer.facts-0")).toBeUndefined();
  });
});
