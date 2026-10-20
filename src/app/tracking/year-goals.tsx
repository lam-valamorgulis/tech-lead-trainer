"use client";

import { useEffect, useState } from "react";
import { yearGoals, type HandGoal } from "@/core/tracking";
import { browserClient } from "@/lib/supabase/browser";
import { loadCheckedYearGoals, saveYearGoal } from "@/lib/year-goals";

type SaveState = "idle" | "saving" | "saved" | "failed";

/**
 * The 3 year goals (spec story 71). "12 badges" is checked by the app from the badges, so its
 * box cannot be tapped. The other 2 are ticked by hand and saved at once.
 */
export function YearGoals({ earned }: { earned: { townId: string }[] }) {
  const [checked, setChecked] = useState<HandGoal[] | "failed" | undefined>(undefined);
  const [save, setSave] = useState<SaveState>("idle");

  useEffect(() => {
    let cancelled = false;
    loadCheckedYearGoals(browserClient())
      .then((value) => !cancelled && setChecked(value))
      .catch(() => !cancelled && setChecked("failed"));
    return () => {
      cancelled = true;
    };
  }, []);

  if (checked === "failed") return <p className="error">We could not load your year goals. Check your connection.</p>;
  if (!checked) return <p className="lead">Loading…</p>;

  async function toggle(goal: HandGoal, on: boolean) {
    if (checked === "failed" || !checked) return;
    const before = checked;
    // Shown at once; put back if the save fails.
    setChecked(on ? [...before, goal] : before.filter((g) => g !== goal));
    setSave("saving");
    try {
      await saveYearGoal(browserClient(), goal, on);
      setSave("saved");
    } catch {
      setChecked(before);
      setSave("failed");
    }
  }

  return (
    <>
      <fieldset className="choices">
        <legend className="visually-hidden">Year goals</legend>
        {yearGoals(earned, checked).map((goal) => (
          <label key={goal.id} className="choice">
            <input
              type="checkbox"
              checked={goal.checked}
              disabled={!goal.byHand || save === "saving"}
              onChange={(event) => goal.id !== "twelve-badges" && void toggle(goal.id, event.target.checked)}
            />
            {goal.label}
          </label>
        ))}
      </fieldset>
      <p className="lead">The app checks 12 badges for you. Tick the other two yourself.</p>
      <p role="status" className={save === "failed" ? "error" : "lead"}>
        {save === "saved" ? "Saved." : save === "failed" ? "We could not save this. Try again." : ""}
      </p>
    </>
  );
}
