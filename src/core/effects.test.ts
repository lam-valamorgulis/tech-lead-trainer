import { describe, expect, it } from "vitest";
import { EFFECTS, flashesInOneSecond, loopSeconds, midiToHz, songNotes, SONGS, SOUNDS, soundForDamage, soundLength, stepNotes, stepSeconds } from "./effects.ts";

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

describe("sounds v2 (#94)", () => {
  it("has the new effects: tap, select, hurt, faint, wrong and right", () => {
    for (const name of ["tap", "select", "hurt", "faint", "wrong", "right"] as const) {
      expect(soundLength(SOUNDS[name]), name).toBeGreaterThan(0);
    }
  });

  it("a rest (hz 0) counts for the length but makes no tone", () => {
    expect(soundLength([{ hz: 440, ms: 50 }, { hz: 0, ms: 60 }])).toBe(110);
  });

  it("a tap is the shortest sound, so fast taps never pile up", () => {
    const tap = soundLength(SOUNDS.tap);
    for (const [name, notes] of Object.entries(SOUNDS)) expect(soundLength(notes), name).toBeGreaterThanOrEqual(tap);
    expect(tap).toBeLessThanOrEqual(60);
  });

  it("right sounds higher than wrong, so the two are easy to tell apart", () => {
    const top = (name: "right" | "wrong") => Math.max(...SOUNDS[name].map((note) => note.hz));
    expect(top("right")).toBeGreaterThan(top("wrong"));
  });
});

describe("music loops (#94)", () => {
  it("turns a MIDI note into a frequency: A4 is 440 Hz, one octave up doubles it", () => {
    expect(midiToHz(69)).toBe(440);
    expect(midiToHz(81)).toBeCloseTo(880);
  });

  it("has a home-and-map loop and a battle loop, and the battle loop is faster", () => {
    expect(Object.keys(SONGS).sort()).toEqual(["battle", "map"]);
    expect(SONGS.battle.bpm).toBeGreaterThan(SONGS.map.bpm);
  });

  it("each loop has a lead and a bass of the same length, in whole bars of 16 steps", () => {
    for (const [name, song] of Object.entries(SONGS)) {
      expect(song.lead.length, name).toBe(song.bass.length);
      expect(song.lead.length % 16, name).toBe(0);
    }
  });

  it("one step is a sixteenth note: at 120 beats a minute, 0.125 seconds", () => {
    expect(stepSeconds(120)).toBe(0.125);
    expect(loopSeconds({ bpm: 120, lead: new Array(32).fill(0), bass: new Array(32).fill(0) })).toBe(4);
  });

  it("places each note of one loop at its step, and skips the rests", () => {
    const song = { bpm: 120, lead: [72, 0, 74, 0], bass: [48, 0, 0, 0] };
    expect(songNotes(song)).toEqual([
      { at: 0, hz: midiToHz(72), seconds: 0.1125, part: "lead" },
      { at: 0, hz: midiToHz(48), seconds: 0.225, part: "bass" },
      { at: 0.25, hz: midiToHz(74), seconds: 0.1125, part: "lead" },
    ]);
  });

  it("starts again at step 0 after the last step, so the loop repeats cleanly", () => {
    const song = { bpm: 120, lead: [72, 0, 74, 0], bass: [48, 0, 0, 0] };
    expect(stepNotes(song, 4)).toEqual(stepNotes(song, 0));
    expect(stepNotes(song, 1)).toEqual([]);
  });

  it("every loop note is in a range a phone speaker plays: 40 Hz to 2 kHz", () => {
    for (const [name, song] of Object.entries(SONGS)) {
      for (const note of songNotes(song)) {
        expect(note.hz, name).toBeGreaterThanOrEqual(40);
        expect(note.hz, name).toBeLessThanOrEqual(2000);
      }
    }
  });

  it("every loop is between 5 and 30 seconds, so it repeats but not too often", () => {
    for (const [name, song] of Object.entries(SONGS)) {
      expect(loopSeconds(song), name).toBeGreaterThanOrEqual(5);
      expect(loopSeconds(song), name).toBeLessThanOrEqual(30);
    }
  });
});
