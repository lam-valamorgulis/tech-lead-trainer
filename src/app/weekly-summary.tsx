"use client";

import { useEffect, useState } from "react";
import { formatBestMoveRate } from "@/core/battle";
import { formatWeek, formatWeekMinutes, type StoredWeeklySummary } from "@/core/week";
import { loadWeeklySummary } from "@/lib/load-weekly-summary";

/**
 * The Sunday summary of the last finished week (ticket #23), closed until tapped, so home stays
 * short. It shows the saved numbers only. Nothing shows when that week had no learning, or
 * when the summary cannot load: home works the same without it.
 */
export function WeeklySummaryCard() {
  const summary = useWeeklySummary();
  if (!summary) return null;
  return (
    <details className="notice week-summary">
      <summary>Week summary: {formatWeek(summary.weekStart)}</summary>
      <WeeklySummaryNumbers summary={summary} />
    </details>
  );
}

/** The saved numbers of one Sunday summary, as they were shown. */
export function WeeklySummaryNumbers({ summary }: { summary: StoredWeeklySummary }) {
  const weakest = summary.weakest.map((creature) => creature.name).join(", ");
  return (
    <ul className="week-summary-numbers">
      <li>Days learned: {summary.daysLearned} of 7</li>
      <li>Time: {formatWeekMinutes(summary.minutes, summary.goalMinutes)}</li>
      <li>Best moves: {formatBestMoveRate(summary.bestMoves)}</li>
      <li>Weakest creatures: {weakest || "none this week"}</li>
    </ul>
  );
}

/**
 * The last Sunday summary: undefined while it loads, null when there is none or it cannot load.
 */
export function useWeeklySummary(): StoredWeeklySummary | null | undefined {
  const [summary, setSummary] = useState<StoredWeeklySummary | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    loadWeeklySummary()
      // Next keeps this screen's state when you leave and come back, so "none" is set too.
      .then((value) => !cancelled && setSummary(value))
      .catch(() => !cancelled && setSummary(null));
    return () => {
      cancelled = true;
    };
  }, []);
  return summary;
}
