"use client";

import { useState, type FormEvent } from "react";
import { cleanCue, DEFAULT_TIRED_PLAN } from "@/core/plan";
import { savePlans, type Profile } from "@/lib/profile";
import { browserClient } from "@/lib/supabase/browser";

/** Edits both if-then plans (design 3). Used on the first open and in Settings. */
export function PlanForm({
  userId,
  profile,
  submitLabel,
  onSaved,
  onLater,
}: {
  userId: string;
  profile: Profile;
  submitLabel: string;
  onSaved: (profile: Profile) => void;
  onLater?: () => void;
}) {
  const [cue, setCue] = useState(profile.ifThenPlan ?? "");
  const [tired, setTired] = useState(profile.tiredDayPlan ?? DEFAULT_TIRED_PLAN);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const cleaned = cleanCue(cue);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!cleaned) return;
    setStatus("saving");
    const tiredDayPlan = tired.trim() === "" ? DEFAULT_TIRED_PLAN : tired.trim();
    try {
      await savePlans(browserClient(), userId, { ifThenPlan: cleaned, tiredDayPlan });
      setCue(cleaned);
      setTired(tiredDayPlan);
      setStatus("saved");
      onSaved({ ...profile, ifThenPlan: cleaned, tiredDayPlan });
    } catch {
      setStatus("failed");
    }
  }

  return (
    <form className="stack" onSubmit={save}>
      <label className="field">
        <span className="field-label">After …</span>
        <input
          type="text"
          maxLength={200}
          placeholder="my morning coffee"
          value={cue}
          onChange={(event) => {
            setCue(event.target.value);
            setStatus("idle");
          }}
        />
      </label>
      <p className="lead">…, I open the app and tap 3 / 15 / 45.</p>
      <label className="field">
        <span className="field-label">If I am tired</span>
        <input
          type="text"
          maxLength={200}
          value={tired}
          onChange={(event) => {
            setTired(event.target.value);
            setStatus("idle");
          }}
        />
      </label>
      <p role="status" className="lead">
        {status === "saved" ? "Your plans are saved." : ""}
      </p>
      <p role="alert" className="error">
        {status === "failed" ? "We could not save your plan. Try again." : ""}
      </p>
      <button type="submit" className="button-main" disabled={!cleaned || status === "saving"}>
        {submitLabel}
      </button>
      {onLater && (
        <button type="button" className="button-quiet" onClick={onLater}>
          Later
        </button>
      )}
    </form>
  );
}
