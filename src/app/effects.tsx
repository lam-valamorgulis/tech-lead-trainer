"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { EFFECTS, type EffectName, type SoundName } from "@/core/effects";
import type { Profile } from "@/lib/profile";
import { playSound, setSoundOn } from "./sound";

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
    <span className={`fx fx-${effect}`} style={{ animationDuration: `${EFFECTS[effect].durationMs}ms` }}>
      {children}
    </span>
  );
}
