import { describe, expect, it } from "vitest";
import { EFFECTS, flashesInOneSecond, SOUNDS, soundForDamage, soundLength } from "./effects.ts";

describe("sounds (UI rule 10)", () => {
  it("each damage has its own sound", () => {
    expect([soundForDamage(2), soundForDamage(1), soundForDamage(0)]).toEqual(["strong-hit", "hit", "miss"]);
  });

  it("every sound is short: under 1 second", () => {
    for (const [name, notes] of Object.entries(SOUNDS)) {
      expect(soundLength(notes), name).toBeGreaterThan(0);
      expect(soundLength(notes), name).toBeLessThan(1000);
    }
  });

  it("the length of a sound is the sum of its notes", () => {
    expect(soundLength([{ hz: 440, ms: 80 }, { hz: 660, ms: 120 }])).toBe(200);
  });
});

describe("effects (UI rule 9)", () => {
  it("counts every flash of a short effect inside one second", () => {
    expect(flashesInOneSecond({ durationMs: 800, flashes: 4 })).toBe(4);
  });

  it("spreads the flashes of a long effect over its seconds", () => {
    expect(flashesInOneSecond({ durationMs: 2000, flashes: 4 })).toBe(2);
  });

  it("nothing flashes more than 3 times a second", () => {
    for (const [name, effect] of Object.entries(EFFECTS)) {
      expect(flashesInOneSecond(effect), name).toBeLessThanOrEqual(3);
    }
  });

  it("every effect is short: at most half a second, so nothing waits for it", () => {
    for (const [name, effect] of Object.entries(EFFECTS)) {
      expect(effect.durationMs, name).toBeLessThanOrEqual(500);
    }
  });
});
