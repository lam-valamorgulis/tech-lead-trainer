import { describe, expect, it } from "vitest";
import { cleanCue, DEFAULT_TIRED_PLAN, needsPlan, planSentence } from "./plan.ts";

describe("planSentence", () => {
  it("puts the learner's own cue after 'After', as in the design's example", () => {
    expect(planSentence("my morning coffee")).toBe("After my morning coffee, I open the app and tap 3 / 15 / 45.");
    expect(planSentence("I park my bike")).toBe("After I park my bike, I open the app and tap 3 / 15 / 45.");
  });
});

describe("cleanCue", () => {
  it("drops a typed 'After' and the end punctuation", () => {
    expect(cleanCue("  After my morning coffee.  ")).toBe("my morning coffee");
    expect(cleanCue("after I brush my teeth,")).toBe("I brush my teeth");
  });

  it("gives null for an empty cue or a lone 'After'", () => {
    expect(cleanCue("   ")).toBeNull();
    expect(cleanCue("After")).toBeNull();
  });
});

describe("needsPlan", () => {
  it("is true on the first open, before any plan is saved", () => {
    expect(needsPlan({ ifThenPlan: null })).toBe(true);
    expect(needsPlan({ ifThenPlan: "my morning coffee" })).toBe(false);
  });
});

describe("the tired-day plan", () => {
  it("starts as the design's sentence", () => {
    expect(DEFAULT_TIRED_PLAN).toBe("If I am tired, I tap 3.");
  });
});
