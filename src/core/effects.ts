// Effects and sound (design 9, UI rules 9 and 10). Pure data: no browser, no clock.

/**
 * One note of an 8-bit sound: a wave at `hz` for `ms` milliseconds. A square wave unless `wave`
 * says triangle (softer, for sad sounds). `hz` 0 is a rest: silence for `ms`.
 */
export type Note = { hz: number; ms: number; wave?: "square" | "triangle" };

export type SoundName =
  | "strong-hit"
  | "hit"
  | "miss"
  | "catch"
  | "evolve"
  | "win"
  | "lose"
  | "tap"
  | "select"
  | "hurt"
  | "faint"
  | "wrong"
  | "right";

/**
 * Each one plays next to a text that says the same thing (UI rule 10).
 *
 * License of each sound (ticket #35, #94): every sound below and both music loops are original.
 * They were written for this app as these note lists, and src/app/sound.ts plays them as 8-bit
 * waves with the Web Audio API. There is no sound file and
 * no third-party sound, so no outside license applies. A sound file added later must have a
 * license that allows this use, recorded next to the file.
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
  // #94: richer effects for the v1.5 screens. Each plays next to its text twin.
  tap: [{ hz: 1047, ms: 40 }],
  select: [
    { hz: 784, ms: 50 },
    { hz: 1175, ms: 60 },
  ],
  hurt: [
    { hz: 220, ms: 70 },
    { hz: 165, ms: 120 },
  ],
  faint: [
    { hz: 523, ms: 120, wave: "triangle" },
    { hz: 392, ms: 120, wave: "triangle" },
    { hz: 294, ms: 120, wave: "triangle" },
    { hz: 196, ms: 300, wave: "triangle" },
  ],
  wrong: [
    { hz: 196, ms: 120, wave: "triangle" },
    { hz: 147, ms: 200, wave: "triangle" },
  ],
  right: [
    { hz: 659, ms: 80 },
    { hz: 988, ms: 160 },
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

/** Sounds that start with a short noise burst, like a hit landing. The number is the burst in ms. */
export const NOISE_MS: Partial<Record<SoundName, number>> = { "strong-hit": 180, hit: 100, hurt: 140 };

/**
 * A music loop (UI rule 13): a lead and a bass line, one MIDI note number per sixteenth step.
 * 0 is a rest. Both lines have the same length, so the loop repeats cleanly.
 */
export type Song = { bpm: number; lead: number[]; bass: number[] };

export type SongName = "map" | "battle";

/** Home and the map share one calm loop. Battles have a faster one. Both are original, made for this app. */
export const SONGS: Record<SongName, Song> = {
  map: {
    bpm: 108,
    lead: [
      72, 0, 76, 0, 79, 0, 76, 0, 74, 0, 77, 0, 81, 0, 77, 0, 72, 0, 76, 0, 79, 0, 84, 0, 83, 0, 79, 0, 74, 0, 0, 0,
      72, 0, 76, 0, 79, 0, 76, 0, 77, 0, 81, 0, 84, 0, 81, 0, 79, 0, 77, 0, 76, 0, 74, 0, 72, 0, 0, 0, 0, 0, 0, 0,
    ],
    bass: [
      48, 0, 0, 0, 55, 0, 0, 0, 50, 0, 0, 0, 57, 0, 0, 0, 48, 0, 0, 0, 55, 0, 0, 0, 43, 0, 0, 0, 50, 0, 0, 0,
      48, 0, 0, 0, 55, 0, 0, 0, 53, 0, 0, 0, 60, 0, 0, 0, 43, 0, 0, 0, 50, 0, 0, 0, 48, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
  battle: {
    bpm: 150,
    lead: [
      69, 0, 72, 0, 76, 0, 72, 0, 69, 0, 72, 0, 77, 0, 76, 0, 67, 0, 71, 0, 74, 0, 71, 0, 69, 72, 76, 79, 77, 76, 74, 72,
      69, 0, 72, 0, 76, 0, 79, 0, 81, 0, 79, 0, 77, 0, 76, 0, 74, 0, 72, 0, 71, 0, 74, 0, 76, 0, 0, 0, 69, 0, 0, 0,
    ],
    bass: [
      45, 0, 45, 0, 45, 0, 45, 0, 41, 0, 41, 0, 41, 0, 41, 0, 43, 0, 43, 0, 43, 0, 43, 0, 45, 0, 45, 0, 40, 0, 40, 0,
      45, 0, 45, 0, 45, 0, 45, 0, 41, 0, 41, 0, 41, 0, 41, 0, 43, 0, 43, 0, 40, 0, 40, 0, 45, 0, 0, 0, 45, 0, 0, 0,
    ],
  },
};

/** A MIDI note number as a frequency: note 69 is A4, 440 Hz, and 12 notes up doubles it. */
export function midiToHz(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

/** One step of a loop is a sixteenth note: a quarter of one beat. */
export function stepSeconds(bpm: number): number {
  return 60 / bpm / 4;
}

export function loopSeconds(song: Song): number {
  return song.lead.length * stepSeconds(song.bpm);
}

/** A note of one loop: when it starts in the loop, its pitch and length, and its line. */
export type SongNote = { at: number; hz: number; seconds: number; part: "lead" | "bass" };

/**
 * The notes that start on one step of a loop, at `at` 0. A lead note fills 90% of its step, so
 * notes stay apart. A bass note lasts 2 steps under the lead.
 */
export function stepNotes(song: Song, step: number): SongNote[] {
  const seconds = stepSeconds(song.bpm);
  const i = step % song.lead.length;
  const notes: SongNote[] = [];
  if (song.lead[i]) notes.push({ at: 0, hz: midiToHz(song.lead[i]), seconds: seconds * 0.9, part: "lead" });
  if (song.bass[i]) notes.push({ at: 0, hz: midiToHz(song.bass[i]), seconds: seconds * 1.8, part: "bass" });
  return notes;
}

/** Every note of one loop, in time order. */
export function songNotes(song: Song): SongNote[] {
  const seconds = stepSeconds(song.bpm);
  return song.lead.flatMap((_, step) => stepNotes(song, step).map((note) => ({ ...note, at: step * seconds })));
}
