import { describe, expect, it } from "vitest";
import { sessionStep } from "./session-plan.ts";

const all = { reviews: true, catch: true, battle: true, extra: true };

describe("sessionStep", () => {
  it("runs reviews, then the catch, the battle, extra time, then done", () => {
    expect(sessionStep(all, "reviews")).toBe("reviews");
    expect(sessionStep(all, "catch")).toBe("catch");
    expect(sessionStep(all, "battle")).toBe("battle");
    expect(sessionStep(all, "extra")).toBe("extra");
    expect(sessionStep(all, "done")).toBe("done");
  });

  it("skips a step that has nothing today", () => {
    expect(sessionStep({ ...all, reviews: false }, "reviews")).toBe("catch");
    expect(sessionStep({ reviews: false, catch: false, battle: false, extra: true }, "reviews")).toBe("extra");
    expect(sessionStep({ ...all, extra: false }, "extra")).toBe("done");
  });

  it("says nothing when no step has work at all", () => {
    expect(sessionStep({ reviews: false, catch: false, battle: false, extra: false }, "reviews")).toBe("nothing");
  });

  it("never goes back to an earlier step", () => {
    expect(sessionStep(all, "extra")).toBe("extra");
    expect(sessionStep({ ...all, extra: false }, "extra")).toBe("done");
  });
});
