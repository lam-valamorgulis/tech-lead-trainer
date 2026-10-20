import { describe, expect, it } from "vitest";
import { cleanCue, DEFAULT_TIRED_PLAN, needsPlan, planSentence } from "./plan.ts";

describe("planSentence", () => {
  it("puts the learner's own cue into the if-then plan", () => {
    expect(planSentence("drink my morning coffee")).toBe(
      "After I drink my morning coffee, I open the app and tap 3 / 15 / 45.",
    );
  });
});

describe("cleanCue", () => {
  it("keeps only the learner's words when they typed the whole sentence start", () => {
    expect(cleanCue("  After I park my bike.  ")).toBe("park my bike");
    expect(cleanCue("after i brush my teeth,")).toBe("brush my teeth");
  });

  it("gives null for an empty cue", () => {
    expect(cleanCue("   ")).toBeNull();
  });
});

describe("needsPlan", () => {
  it("is true on the first open, before any plan is saved", () => {
    expect(needsPlan({ ifThenPlan: null })).toBe(true);
    expect(needsPlan({ ifThenPlan: "drink my coffee" })).toBe(false);
  });
});

describe("the tired-day plan", () => {
  it("starts as the design's sentence", () => {
    expect(DEFAULT_TIRED_PLAN).toBe("If I am tired, I tap 3.");
  });
});
