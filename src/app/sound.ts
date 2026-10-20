import { SOUNDS, type SoundName } from "@/core/effects";

// 8-bit sounds made in code with the Web Audio API (UI rule 10). There is no sound file.

/** Square waves are loud, so every note plays quietly. */
const VOLUME = 0.06;

let soundOn = false;
let context: AudioContext | null = null;

/** Follows the "Sound effects" setting. Off also stops sounds that would play later. */
export function setSoundOn(on: boolean): void {
  soundOn = on;
}

/**
 * Call inside the commit tap. iPhone Safari starts audio only inside a tap, so sound stays off
 * until the first commit of a visit.
 */
export function startSound(): void {
  if (!soundOn || typeof AudioContext === "undefined") return;
  try {
    context ??= new AudioContext();
    void context.resume().catch(() => undefined);
  } catch {
    // No sound on this browser. Every sound has a text twin, so nothing is lost.
    context = null;
  }
}

export function playSound(name: SoundName): void {
  if (!soundOn || !context) return;
  // iPhone pauses audio when the app goes to the background.
  if (context.state !== "running") void context.resume().catch(() => undefined);
  let at = context.currentTime;
  for (const note of SOUNDS[name]) {
    const seconds = note.ms / 1000;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = note.hz;
    // A short fade at the end of each note avoids a click.
    gain.gain.setValueAtTime(VOLUME, at);
    gain.gain.linearRampToValueAtTime(0, at + seconds);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + seconds);
    at += seconds;
  }
}
