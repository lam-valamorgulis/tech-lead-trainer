"use client";

import { useEffect, useState, type FormEvent } from "react";
import { addLaterGoal, LATER_GOAL_MAX_LENGTH, loadLaterGoals, removeLaterGoal, type LaterGoal } from "@/lib/later-list";
import { browserClient } from "@/lib/supabase/browser";

/**
 * The Later list (spec story 22, design 14 rule 5): a new goal from the middle of the year is
 * parked here, so the year's plan stays the same.
 */
export function LaterList() {
  const [goals, setGoals] = useState<LaterGoal[] | "failed" | undefined>(undefined);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadLaterGoals(browserClient())
      .then((value) => !cancelled && setGoals(value))
      .catch(() => !cancelled && setGoals("failed"));
    return () => {
      cancelled = true;
    };
  }, []);

  if (goals === "failed") return <p className="error">We could not load your Later list. Check your connection.</p>;
  if (!goals) return <p className="lead">Loading…</p>;
  const list = goals;

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return setError("Write the goal first.");
    setBusy(true);
    setError("");
    try {
      const goal = await addLaterGoal(browserClient(), text);
      setGoals([...list, goal]);
      setText("");
    } catch {
      setError("We could not park this goal. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(goal: LaterGoal) {
    setBusy(true);
    setError("");
    try {
      await removeLaterGoal(browserClient(), goal.id);
      setGoals(list.filter((g) => g.id !== goal.id));
    } catch {
      setError("We could not remove this goal. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="lead">A new goal in the middle of the year? Park it here. This year&apos;s plan stays the same.</p>
      {list.length === 0 ? (
        <p className="lead">Nothing parked yet.</p>
      ) : (
        <ul className="later-list" aria-label="Later list">
          {list.map((goal) => (
            <li key={goal.id}>
              <span className="later-text">{goal.text}</span>
              <button
                type="button"
                className="button-quiet"
                aria-label={`Remove ${goal.text}`}
                disabled={busy}
                onClick={() => void remove(goal)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="stack" onSubmit={(event) => void add(event)}>
        <label className="field">
          <span className="field-label">A new goal for later</span>
          <input value={text} maxLength={LATER_GOAL_MAX_LENGTH} onChange={(event) => setText(event.target.value)} />
        </label>
        <button type="submit" className="button-quiet" disabled={busy}>
          Park it
        </button>
      </form>
      <p role="alert" className="error">
        {error}
      </p>
    </>
  );
}
