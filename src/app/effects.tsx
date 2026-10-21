"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { EFFECTS, type EffectName, type SongName, type SoundName } from "@/core/effects";
import type { Profile } from "@/lib/profile";
import { playSound, requestMusic, setSoundOn, soundStarted, startSound } from "./sound";

/**
 * Applies the "Reduce effects" and "Sound effects" settings of the signed-in learner.
 * Signed out, there is no sound.
 */
export function useEffectSettings(profile: Profile | null): void {
  const reduceEffects = profile?.reduceEffects ?? false;
  const soundOn = profile?.soundOn ?? false;
  useEffect(() => {
    setSoundOn(soundOn);
    // The CSS plays no effect under this attribute, the same as under prefers-reduced-motion.
    if (reduceEffects) document.documentElement.dataset.effects = "reduced";
    else delete document.documentElement.dataset.effects;
  }, [reduceEffects, soundOn]);

  // UI rule 13: sound starts from the first tap on any screen. iPhone Safari allows it only inside a tap.
  useEffect(() => {
    if (!soundOn) return;
    function onTap() {
      startSound();
      if (soundStarted()) stop();
    }
    function stop() {
      document.removeEventListener("click", onTap, true);
      document.removeEventListener("keydown", onTap, true);
    }
    document.addEventListener("click", onTap, true);
    document.addEventListener("keydown", onTap, true);
    return stop;
  }, [soundOn]);
}

/**
 * Plays a music loop while the screen is open (UI rule 13). When it closes, the loop of the
 * screen underneath plays again, so the map loop comes back after a battle. Null gives the
 * loop back while the screen stays open, as the Battle's end screen does.
 */
export function useMusic(song: SongName | null): void {
  useEffect(() => (song === null ? undefined : requestMusic(song)), [song]);
}

/**
 * Text with a short effect and a sound (UI rules 9 and 10). The text is the sound's twin, so a
 * sound never plays without words on screen. The effect plays once and nothing waits for it.
 */
export function Fx({ effect, sound, children }: { effect?: EffectName; sound?: SoundName; children: ReactNode }) {
  const played = useRef(false);

  useEffect(() => {
    if (!sound || played.current) return;
    played.current = true;
    playSound(sound);
  }, [sound]);

  if (!effect) return <>{children}</>;
  return (
    <span className={`fx fx-${effect}`} style={fxStyle(effect)}>
      {children}
    </span>
  );
}

/**
 * The inline style of an effect: its length from EFFECTS, the one source, and when it starts.
 * The Battle scene (#103) plays its effects one after the other with these delays.
 */
export function fxStyle(effect: EffectName, delayMs = 0): CSSProperties {
  return { animationDuration: `${EFFECTS[effect].durationMs}ms`, animationDelay: `${delayMs}ms` };
}
