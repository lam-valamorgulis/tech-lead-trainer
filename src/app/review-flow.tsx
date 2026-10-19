"use client";

import { useEffect, useRef, useState } from "react";
import type { ReviewItem } from "@/content";
import { gradeReview, type DueState, type Grade } from "@/core/review";
import { postEvents } from "@/lib/events/post-events";

export type DueReview = { state: DueState; item: ReviewItem };

const GRADES: { grade: Grade; label: string }[] = [
  { grade: "again", label: "Again" },
  { grade: "hard", label: "Hard" },
  { grade: "good", label: "Good" },
  { grade: "easy", label: "Easy" },
];

/**
 * Review (design 6): think of the answer, tap Reveal, then grade yourself.
 * Reviews give no points (spec story 40).
 */
export function ReviewFlow({
  reviews,
  today,
  sessionId,
  canType,
  onDone,
}: {
  reviews: DueReview[];
  today: string;
  sessionId: string;
  /** On 15- and 45-minute days the learner may type an answer before Reveal. */
  canType: boolean;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const current = reviews[index];
  if (!current) return null;
  return (
    <ReviewCard
      // A new key gives each review fresh state and a fresh "shown at" time.
      key={current.item.id}
      review={current}
      position={`${index + 1} of ${reviews.length}`}
      today={today}
      sessionId={sessionId}
      canType={canType}
      onGraded={() => (index + 1 < reviews.length ? setIndex(index + 1) : onDone())}
    />
  );
}

function ReviewCard({
  review: { state, item },
  position,
  today,
  sessionId,
  canType,
  onGraded,
}: {
  review: DueReview;
  position: string;
  today: string;
  sessionId: string;
  canType: boolean;
  onGraded: () => void;
}) {
  const [shownAt] = useState(() => new Date().toISOString());
  const [revealedAt, setRevealedAt] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const graded = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, [revealedAt]);

  function grade(choice: Grade) {
    // A fast double tap saves one review.
    if (graded.current || !revealedAt) return;
    graded.current = true;
    const next = gradeReview({ step: state.step, gradedDay: today, grade: choice });
    const gradedAt = new Date().toISOString();
    void postEvents([
      {
        type: "review",
        clientEventId: crypto.randomUUID(),
        sessionId,
        occurredAt: gradedAt,
        itemId: item.id,
        itemKind: item.kind,
        contentHash: item.hash,
        stepBefore: state.step,
        stepAfter: next.step,
        grade: choice,
        plannedDueDay: state.dueDay,
        shownAt,
        revealedAt,
        gradedAt,
        typedAnswer: typed.trim() === "" ? null : typed.trim(),
        confidence: null,
      },
    ]);
    onGraded();
  }

  return (
    <section className="stack" aria-labelledby="review-title">
      <h2 id="review-title" ref={heading} tabIndex={-1}>
        Review {position}: {item.name}
      </h2>
      <p>{item.review.question}</p>
      {!revealedAt ? (
        <>
          {canType ? (
            <label className="field">
              <span className="field-label">Your answer (optional)</span>
              <textarea rows={3} maxLength={2000} value={typed} onChange={(event) => setTyped(event.target.value)} />
            </label>
          ) : (
            <p className="lead">Think of the answer first.</p>
          )}
          <button type="button" className="button-main" onClick={() => setRevealedAt(new Date().toISOString())}>
            Reveal
          </button>
        </>
      ) : (
        <>
          <div className="card">
            <p>{item.review.answer}</p>
          </div>
          <fieldset className="choices grades">
            <legend>How well did you know it?</legend>
            {GRADES.map(({ grade: choice, label }) => {
              const next = gradeReview({ step: state.step, gradedDay: today, grade: choice });
              return (
                <button key={choice} type="button" className="button-quiet" onClick={() => grade(choice)}>
                  {label}
                  <span className="grade-hint">{next.dueDay ? ` · ${next.step} day${next.step === 1 ? "" : "s"}` : " · done"}</span>
                </button>
              );
            })}
          </fieldset>
        </>
      )}
    </section>
  );
}
