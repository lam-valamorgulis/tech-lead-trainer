import { NOISE_MS, SONGS, SOUNDS, stepNotes, stepSeconds, type SongName, type SoundName } from "@/core/effects";

// 8-bit sounds and music made in code with the Web Audio API (UI rules 10 and 13). There is no sound file.

/** Square waves are loud. Effects play louder than before #94 (0.06), and music sits under them. */
const EFFECTS_VOLUME = 0.15;
const MUSIC_VOLUME = 0.08;
/**
 * The music timer runs every 25 ms and plans the notes of the next 200 ms, so a slow screen
 * update on the phone does not leave a gap. Mute is still instant: it silences the master gain.
 */
const MUSIC_TICK_MS = 25;
const MUSIC_AHEAD_SECONDS = 0.2;

let soundOn = false;
let context: AudioContext | null = null;
let master: GainNode | null = null;
let effects: GainNode | null = null;
let music: GainNode | null = null;

/** The songs the open screens asked for. The last one plays: a battle inside a session plays the battle loop. */
const songStack: SongName[] = [];
/** The loop that plays, its next step and when that step starts on the audio clock. */
let playing: { song: SongName; step: number; nextAt: number } | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

/**
 * A browser driven by a test (Playwright sets `navigator.webdriver`) plays every sound at volume 0.
 * The sound code still runs, so tests still cover it, but the owner's Mac stays quiet.
 */
function masterVolume(on: boolean): number {
  return on && !navigator.webdriver ? 1 : 0;
}

/** Follows the "Sound effects" setting and the speaker button. Off silences every sound at once. */
export function setSoundOn(on: boolean): void {
  soundOn = on;
  if (master && context) master.gain.setValueAtTime(masterVolume(on), context.currentTime);
  if (on) followSong();
  else stopMusic();
}

/**
 * Call inside a tap: the first tap on any screen, or the speaker button. iPhone Safari starts
 * audio only inside a tap, so sound stays off until then (UI rule 13).
 */
export function startSound(): void {
  if (!soundOn || typeof AudioContext === "undefined") return;
  try {
    if (!context) {
      // "ambient" follows the iPhone silent switch: a silent phone keeps the app silent (UI rule 14).
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
      if (session) session.type = "ambient";
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = masterVolume(true);
      master.connect(context.destination);
      effects = context.createGain();
      effects.gain.value = EFFECTS_VOLUME;
      effects.connect(master);
      music = context.createGain();
      music.gain.value = MUSIC_VOLUME;
      music.connect(master);
    }
    void context.resume().catch(() => undefined);
    followSong();
  } catch {
    // No sound on this browser. Every sound has a text twin, so nothing is lost.
    context = null;
  }
}

/** True once a tap started the audio, so a screen knows the music can be heard. */
export function soundStarted(): boolean {
  return soundOn && context !== null;
}

export function playSound(name: SoundName): void {
  if (!soundOn || !context || !effects) return;
  // iPhone pauses audio when the app goes to the background.
  if (context.state !== "running") void context.resume().catch(() => undefined);
  let at = context.currentTime;
  const noise = NOISE_MS[name];
  if (noise) playNoise(context, effects, at, noise / 1000);
  for (const note of SOUNDS[name]) {
    const seconds = note.ms / 1000;
    if (note.hz > 0) playTone(context, effects, note.hz, at, seconds, note.wave ?? "square");
    at += seconds;
  }
}

/**
 * A screen asks for a music loop while it is open. Returns the call that gives it back, so the
 * loop of the screen underneath plays again: a battle ends, and the map loop comes back.
 */
export function requestMusic(song: SongName): () => void {
  songStack.push(song);
  followSong();
  return () => {
    const index = songStack.lastIndexOf(song);
    if (index >= 0) songStack.splice(index, 1);
    followSong();
  };
}

function followSong(): void {
  const wanted = songStack.at(-1) ?? null;
  if (!soundOn || !context || wanted === null) return stopMusic();
  if (playing?.song === wanted) return;
  playing = { song: wanted, step: 0, nextAt: context.currentTime + 0.05 };
  timer ??= setInterval(planMusic, MUSIC_TICK_MS);
}

function stopMusic(): void {
  playing = null;
  if (timer) clearInterval(timer);
  timer = null;
}

/** Plans every loop step that starts in the next 120 ms. The loop repeats without end. */
function planMusic(): void {
  if (!playing || !context || !music) return;
  // iPhone pauses audio when the app goes to the background: start it again when it comes back.
  if (context.state === "suspended") void context.resume().catch(() => undefined);
  const song = SONGS[playing.song];
  // After the phone paused the app, skip the missed steps instead of playing them all at once.
  if (playing.nextAt < context.currentTime) playing.nextAt = context.currentTime;
  while (playing.nextAt < context.currentTime + MUSIC_AHEAD_SECONDS) {
    for (const note of stepNotes(song, playing.step)) {
      playTone(context, music, note.hz, playing.nextAt, note.seconds, note.part === "lead" ? "square" : "triangle");
    }
    playing.step += 1;
    playing.nextAt += stepSeconds(song.bpm);
  }
}

function playTone(audio: AudioContext, out: AudioNode, hz: number, at: number, seconds: number, wave: OscillatorType): void {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = wave;
  oscillator.frequency.value = hz;
  // Each note fades to silence over its length, so it ends without a click.
  gain.gain.setValueAtTime(1, at);
  gain.gain.linearRampToValueAtTime(0, at + seconds);
  oscillator.connect(gain).connect(out);
  oscillator.start(at);
  oscillator.stop(at + seconds);
}

/** A short burst of fading noise: the sound of a hit landing. */
function playNoise(audio: AudioContext, out: AudioNode, at: number, seconds: number): void {
  const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * seconds), audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.connect(out);
  source.start(at);
}
