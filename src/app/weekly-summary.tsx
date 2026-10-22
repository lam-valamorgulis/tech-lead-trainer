"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatBestMoveRate } from "@/core/battle";
import { formatWeek, formatWeekMinutes, formatWeekRate, type Creature, type StoredWeeklySummary } from "@/core/week";
import { postEvents } from "@/lib/events/post-events";
import { loadWeeklySummary } from "@/lib/load-weekly-summary";
import { browserClient } from "@/lib/supabase/browser";
import { loadWorkAnswer, type WorkAnswer } from "@/lib/work-question-log";
import { keepAboveKeyboard } from "./keyboard";

/**
 * The Sunday summary of the last finished week (ticket #23), closed until tapped, so home stays
 * short. It shows the saved numbers only, then the work question (#114). Nothing shows when that
 * week had no learning, or when the summary cannot load: home works the same without it.
 */
export function WeeklySummaryCard() {
  const summary = useWeeklySummary();
  if (!summary || summary === "failed") return null;
  const concept = summary.picks?.workConcept;
  return (
    <details className="notice week-summary">
      <summary>Week summary: {formatWeek(summary.weekStart)}</summary>
      <WeeklySummaryNumbers summary={summary} />
      {concept && <WorkQuestion weekStart={summary.weekStart} concept={concept} />}
    </details>
  );
}

/**
 * The saved numbers of one Sunday summary, as they were shown. A week saved before v1.5 has no
 * picks and keeps its old lines.
 */
export function WeeklySummaryNumbers({ summary }: { summary: StoredWeeklySummary }) {
  const names = (creatures: Creature[]) => creatures.map((creature) => creature.name).join(", ");
  const { picks } = summary;
  return (
    <ul className="week-summary-numbers">
      <li>Days learned: {summary.daysLearned} of 7</li>
      <li>Time: {formatWeekMinutes(summary.minutes, summary.goalMinutes)}</li>
      {picks ? (
        <>
          <li>Best moves under Constraint: {formatWeekRate(picks.constraintBestMoves, "turn")}</li>
          <li>Decision Cards right: {formatWeekRate(picks.decisionCards, "card")}</li>
          <li>Most-missed concepts: {names(picks.mostMissed) || "none this week"}</li>
        </>
      ) : (
        <li>Best moves: {formatBestMoveRate(summary.bestMoves)}</li>
      )}
      <li>Weakest creatures: {names(summary.weakest) || "none this week"}</li>
    </ul>
  );
}

/**
 * "Where did you meet <concept> at work this week?" (design 3). "Not this week" is one tap, and
 * the 1 or 2 sentences are optional. Each answer is a new row in the log, and the latest one shows.
 */
function WorkQuestion({ weekStart, concept }: { weekStart: string; concept: Creature }) {
  // Undefined while it loads. A failed load still lets the learner answer.
  const [answer, setAnswer] = useState<WorkAnswer | null | undefined>(undefined);
  const [note, setNote] = useState("");
  const sent = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadWorkAnswer(browserClient(), weekStart)
      .then((saved) => !cancelled && setAnswer(saved))
      .catch(() => !cancelled && setAnswer(null));
    return () => {
      cancelled = true;
    };
  }, [weekStart]);

  function save(met: boolean) {
    // A fast double tap saves one answer.
    if (sent.current) return;
    sent.current = true;
    const text = met ? note.trim() : "";
    void postEvents([
      {
        type: "work-question",
        clientEventId: crypto.randomUUID(),
        // Home is not a learning session, so the answer gets its own session id.
        sessionId: crypto.randomUUID(),
        occurredAt: new Date().toISOString(),
        weekStart,
        conceptId: concept.id,
        met,
        ...(text ? { note: text } : {}),
      },
    ]);
    setAnswer({ met, note: text || null });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    save(true);
  }

  if (answer === undefined) return null;
  const question = `Where did you meet ${concept.name} at work this week?`;
  if (answer) {
    return (
      <div className="stack work-question">
        <p className="field-label">{question}</p>
        <p role="status">
          Your answer: {answer.met ? (answer.note ?? "I met it at work.") : "Not this week."}
        </p>
      </div>
    );
  }
  return (
    <form className="stack work-question" onSubmit={submit} aria-labelledby="work-question-title">
      <p id="work-question-title" className="field-label">
        {question}
      </p>
      <label className="field">
        <span>Where? 1 or 2 sentences (optional)</span>
        <textarea
          rows={2}
          maxLength={500}
          value={note}
          // UI rule 7: the box stays above the iPhone keyboard.
          onFocus={(event) => keepAboveKeyboard(event.currentTarget.closest("label"))}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <div className="row">
        <button type="submit" className="button-main">
          I met it
        </button>
        <button type="button" className="button button-quiet" onClick={() => save(false)}>
          Not this week
        </button>
      </div>
      <div aria-hidden="true" className="keyboard-room" />
    </form>
  );
}

/**
 * The last Sunday summary: undefined while it loads, null when that week had no learning,
 * and "failed" when it cannot load.
 */
export function useWeeklySummary(): StoredWeeklySummary | null | "failed" | undefined {
  const [summary, setSummary] = useState<StoredWeeklySummary | null | "failed" | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    loadWeeklySummary()
      // Next keeps this screen's state when you leave and come back, so "none" is set too.
      .then((value) => !cancelled && setSummary(value))
      .catch(() => !cancelled && setSummary("failed"));
    return () => {
      cancelled = true;
    };
  }, []);
  return summary;
}
