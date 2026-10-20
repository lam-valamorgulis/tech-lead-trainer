"use client";

import { useState } from "react";
import type { Profile } from "@/lib/profile";
import { browserClient } from "@/lib/supabase/browser";
import type { SignedIn } from "../auth-gate";

type Status = "idle" | "saving" | "saved" | "failed";

/** UI rules 9 and 10: the "Reduce effects" setting and the mute toggle, saved in the profile. */
export function EffectsSection({ userId, profile, setProfile }: Pick<SignedIn, "userId" | "profile" | "setProfile">) {
  const [status, setStatus] = useState<Status>("idle");
  // The box changes at once. A failed save puts it back.
  const [shown, setShown] = useState({ reduceEffects: profile.reduceEffects, soundOn: profile.soundOn });

  async function save(change: Partial<Pick<Profile, "reduceEffects" | "soundOn">>) {
    const next = { ...shown, ...change };
    setShown(next);
    setStatus("saving");
    const { error } = await browserClient()
      .from("profiles")
      .update({ reduce_effects: next.reduceEffects, sound_on: next.soundOn })
      .eq("user_id", userId);
    if (error) {
      setShown(shown);
      return setStatus("failed");
    }
    setProfile({ ...profile, ...next });
    setStatus("saved");
  }

  return (
    <section className="stack" aria-labelledby="effects-title">
      <h2 id="effects-title">Effects and sound</h2>
      <label className="choice">
        <input
          type="checkbox"
          checked={shown.reduceEffects}
          disabled={status === "saving"}
          onChange={(event) => void save({ reduceEffects: event.target.checked })}
        />
        <span>Reduce effects</span>
      </label>
      <p className="lead">No movement and no flashes. The Reduce Motion setting of your phone does this too.</p>
      <label className="choice">
        <input
          type="checkbox"
          checked={shown.soundOn}
          disabled={status === "saving"}
          onChange={(event) => void save({ soundOn: event.target.checked })}
        />
        <span>Sound effects</span>
      </label>
      <p className="lead">Short 8-bit sounds. They start when you tap a commit button. The screen always shows the same news in words.</p>
      <p role="status" className="lead">
        {status === "saved" ? "Saved." : ""}
      </p>
      <p role="alert" className="error">
        {status === "failed" ? "We could not save this setting. Try again." : ""}
      </p>
    </section>
  );
}
