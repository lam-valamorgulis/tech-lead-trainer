// Effects and sound (design 9, UI rules 9 and 10). Pure data: no browser, no clock.

/** One note of an 8-bit sound: a square wave at `hz` for `ms` milliseconds. */
export type Note = { hz: number; ms: number };

export type SoundName = "strong-hit" | "hit" | "miss" | "catch" | "evolve" | "win" | "lose";

/**
 * The sounds are made in code with the Web Audio API, so no sound file and no license is needed.
 * Each one plays next to a text that says the same thing (UI rule 10).
 */
export const SOUNDS: Record<SoundName, Note[]> = {
  "strong-hit": [
    { hz: 523, ms: 70 },
    { hz: 784, ms: 110 },
  ],
  hit: [{ hz: 523, ms: 90 }],
  miss: [
    { hz: 220, ms: 80 },
    { hz: 165, ms: 140 },
  ],
  catch: [
    { hz: 659, ms: 70 },
    { hz: 784, ms: 70 },
    { hz: 1047, ms: 140 },
  ],
  evolve: [
    { hz: 523, ms: 80 },
    { hz: 659, ms: 80 },
    { hz: 784, ms: 80 },
    { hz: 1047, ms: 200 },
  ],
  win: [
    { hz: 392, ms: 90 },
    { hz: 523, ms: 90 },
    { hz: 659, ms: 90 },
    { hz: 784, ms: 240 },
  ],
  lose: [
    { hz: 330, ms: 140 },
    { hz: 262, ms: 220 },
  ],
};

/** Damage 2 is a strong hit, 1 a hit, 0 a miss: the same words as the damage text. */
export function soundForDamage(damage: 0 | 1 | 2): SoundName {
  return (["miss", "hit", "strong-hit"] as const)[damage];
}

export function soundLength(notes: Note[]): number {
  return notes.reduce((total, note) => total + note.ms, 0);
}

/** A screen effect. `flashes` is how many times its keyframes flash in one play. */
export type Effect = { durationMs: number; flashes: number };

export type EffectName = "pop" | "flash";

/** The CSS keyframes in globals.css play once, for this long. */
export const EFFECTS: Record<EffectName, Effect> = {
  // The text grows a little and comes back: movement, no flash.
  pop: { durationMs: 300, flashes: 0 },
  // The opponent's HP lights up once when a move hits.
  flash: { durationMs: 400, flashes: 1 },
};

/** The most flashes in any one second, with the flashes spread evenly over the effect. */
export function flashesInOneSecond(effect: Effect): number {
  if (effect.durationMs <= 1000) return effect.flashes;
  return Math.ceil((effect.flashes * 1000) / effect.durationMs);
}
