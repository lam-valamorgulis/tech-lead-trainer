"use client";

import { useEffect, useState } from "react";
import { saveSoundOn } from "@/lib/profile";
import { browserClient } from "@/lib/supabase/browser";
import type { SignedIn } from "./auth-gate";
import { playSound, setSoundOn, soundStarted, startSound } from "./sound";

/** Per device: the iPhone silent switch belongs to the phone, not to the account. */
const HINT_SEEN_KEY = "silent-mode-hint-seen";

/**
 * The speaker button on the play screens (UI rule 13). It is the same switch as "Sound effects"
 * in Settings: both save `sound_on` in the profile. It mutes at once and saves after.
 */
export function SpeakerButton({
  userId,
  profile,
  setProfile,
  besideIntro = false,
}: Pick<SignedIn, "userId" | "profile" | "setProfile"> & {
  /** Home only: its long title fills the top corner, so the button sits beside the intro line. */
  besideIntro?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  // One save at a time, so two fast taps can never save out of order.
  const [saving, setSaving] = useState(false);
  const on = profile.soundOn;

  async function toggle() {
    if (saving) return;
    const next = !on;
    setSaving(true);
    setFailed(false);
    // Inside the tap, so iPhone Safari lets the audio start.
    setSoundOn(next);
    if (next) {
      startSound();
      playSound("tap");
    }
    setProfile({ ...profile, soundOn: next });
    try {
      await saveSoundOn(browserClient(), userId, next);
    } catch {
      setSoundOn(on);
      setProfile({ ...profile, soundOn: on });
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={besideIntro ? "speaker speaker-beside-intro" : "speaker"}>
      <button
        type="button"
        className="speaker-button"
        aria-pressed={on}
        aria-label={on ? "Sound on" : "Sound off"}
        aria-busy={saving}
        onClick={() => void toggle()}
      >
        <SpeakerIcon on={on} />
      </button>
      {failed && (
        <p role="alert" className="speaker-note error">
          We could not save the sound setting. Try again.
        </p>
      )}
    </div>
  );
}

/**
 * One line, once on this device: the first time the music starts after a commit tap with sound
 * on (UI rule 14). It sits in the page flow, so it covers nothing. It shows after sign-in, in
 * the browser, so storage is there on the first render.
 */
export function SilentModeHint() {
  const [show] = useState(() => {
    if (!soundStarted()) return false;
    try {
      return localStorage.getItem(HINT_SEEN_KEY) === null;
    } catch {
      // No storage, for example in a private window: show the line on each visit instead.
      return true;
    }
  });
  useEffect(() => {
    if (!show) return;
    try {
      localStorage.setItem(HINT_SEEN_KEY, "1");
    } catch {
      // Nothing to remember it in. The line comes back next visit, which is harmless.
    }
  }, [show]);
  return show ? <p className="lead">Turn off silent mode to hear the music</p> : null;
}

function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor" />
      {on ? (
        <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M16 9l6 6M22 9l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}
