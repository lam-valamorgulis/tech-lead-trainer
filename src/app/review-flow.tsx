"use client";

import { useEffect, useRef, useState } from "react";
import { tradeOffQuestion, type ReviewItem, type ScoredCard } from "@/content";
import { dayNumber } from "@/core/day";
import { asksTradeOff, evolvesTo, gradeReview, REVIEW_RULES, type DueState, type Grade, type Stage } from "@/core/review";
import { postEvents } from "@/lib/events/post-events";
import { Fx } from "./effects";
import { ReportWrong } from "./report-wrong";
import { GlossaryText } from "./glossary-text";
import { CreatureSprite } from "./creature-sprite";
import { ScoredCardQuestion } from "./scored-card";

/** The 2 sentences the learner wrote after a battle about this item (design 10), if they still wait. */
export type TeachBack = { scenarioName: string; sentences: [string, string] };

export type DueReview = {
  state: DueState;
  item: ReviewItem;
  teachBack?: TeachBack | null;
  /** The name of the due item this one was mixed in next to, before its own due day. */
  mixedWith?: string;
};

/** A Decision Card in today's reviews (design 6.4): about 1 place in 4. */
export type DecisionReview = { card: ScoredCard };

/** One place in today's reviews. */
export type ReviewPlace = DueReview | DecisionReview;

/** What follows a graded review card: the evolution moment, then the Stage 3 trade-off question. */
type FollowUp = { name: "evolved"; stage: Stage } | { name: "trade-off"; card: ScoredCard };

const GRADES: { grade: Grade; label: string }[] = [
  { grade: "again", label: "Again" },
  { grade: "hard", label: "Hard" },
  { grade: "good", label: "Good" },
  { grade: "easy", label: "Easy" },
];

/**
 * Review (design 6): think of the answer, tap Reveal, then grade yourself. About 1 place in 4 is a
 * Decision Card, which the app grades. Reviews give no points (spec story 40).
 */
export function ReviewFlow({
  reviews,
  today,
  sessionId,
  canType,
  onDone,
}: {
  reviews: ReviewPlace[];
  today: string;
  sessionId: string;
  /** On 15- and 45-minute days the learner may type an answer before Reveal. */
  canType: boolean;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const current = reviews[index];
  if (!current) return null;
  const position = `${index + 1} of ${reviews.length}`;
  const next = () => (index + 1 < reviews.length ? setIndex(index + 1) : onDone());
  if ("card" in current) {
    const { creature } = current.card;
    return (
      <ScoredCardQuestion
        key={current.card.id}
        card={current.card}
        title={`Review ${position}: Decision Card`}
        sessionId={sessionId}
        outcome={(right) =>
          right
            ? `Good call. ${creature.name} keeps its review day.`
            : `${creature.name} comes back in tomorrow's review.`
        }
        onContinue={next}
      />
    );
  }
  return (
    <ReviewCard
      // A new key gives each review fresh state and a fresh "shown at" time.
      key={current.item.id}
      review={current}
      position={position}
      today={today}
      sessionId={sessionId}
      canType={canType}
      onGraded={next}
    />
  );
}

function ReviewCard({
  review: { state, item, teachBack, mixedWith },
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
  // After the grade: the evolution moment (design 5), then the trade-off question (design 6.5).
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const followUp = followUps[0];
  const graded = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, [revealedAt, followUp]);

  /** The next follow-up screen, or the next review. */
  function done(rest: FollowUp[]) {
    if (rest.length > 0) setFollowUps(rest);
    else onGraded();
  }

  /** The schedule after a grade. The due day makes an early (mixed-in) review keep its schedule. */
  function nextReview(choice: Grade) {
    return gradeReview({ step: state.step, gradedDay: today, grade: choice, dueDay: state.dueDay });
  }

  function grade(choice: Grade) {
    // A fast double tap saves one review.
    if (graded.current || !revealedAt) return;
    graded.current = true;
    const next = nextReview(choice);
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
        rulesVersion: REVIEW_RULES,
      },
    ]);
    const steps: FollowUp[] = [];
    if (item.kind === "creature") {
      const stage = evolvesTo(state, choice, today);
      if (stage) steps.push({ name: "evolved", stage });
      // A creature with no trade-off question to show stays at Stage 2 until its content has one.
      const tradeOff = asksTradeOff(state, choice, today) ? tradeOffQuestion(item.id) : undefined;
      if (tradeOff) steps.push({ name: "trade-off", card: tradeOff });
    }
    done(steps);
  }

  if (followUp?.name === "trade-off") {
    return (
      <ScoredCardQuestion
        card={followUp.card}
        title={`Stage 3 question: ${item.name}`}
        stage={2}
        sessionId={sessionId}
        outcome={(right) =>
          right ? `${item.name} is ready to evolve.` : `${item.name} stays at Stage 2. This question comes back at its next review.`
        }
        onContinue={(right) => done(right ? [{ name: "evolved", stage: 3 }] : followUps.slice(1))}
      />
    );
  }

  if (followUp?.name === "evolved") {
    const evolved = followUp.stage;
    return (
      <section className="stack" aria-labelledby="evolved-title">
        <h2 id="evolved-title" ref={heading} tabIndex={-1}>
          <Fx effect="pop" sound="evolve">
            {item.name} evolved!
          </Fx>
        </h2>
        {/* Stages 2 and 3 have the second palette, so the evolution shows in the picture too. */}
        <CreatureSprite species={item.sprite} stage={evolved} />
        <p>
          <span className="creature-sprite" aria-hidden="true">
            {"★".repeat(evolved)}
          </span>
          Stage {evolved} of 3. The Field Guide shows it too.
        </p>
        <button type="button" className="button-main" onClick={() => done(followUps.slice(1))}>
          Continue
        </button>
      </section>
    );
  }

  return (
    <section className="stack" aria-labelledby="review-title">
      <h2 id="review-title" ref={heading} tabIndex={-1}>
        Review {position}: {item.name}
      </h2>
      {/* A move shows its creature in the normal colours: the creature's own stage lives in the Field Guide. */}
      <CreatureSprite species={item.sprite} stage={item.kind === "creature" ? state.stage : null} />
      {mixedWith && (
        <p className="notice">Mixed in: easy to confuse with {mixedWith}.</p>
      )}
      <p>
        <GlossaryText text={item.review.question} />
      </p>
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
            <p>
              <GlossaryText text={item.review.answer} />
            </p>
          </div>
          {/* After Reveal only: the learner's own words hold the answer too. */}
          {teachBack && (
            <div className="notice">
              <p>
                <strong>Your own words after the battle {teachBack.scenarioName}:</strong>
              </p>
              {teachBack.sentences.map((sentence, index) => (
                <p key={index}>{sentence}</p>
              ))}
            </div>
          )}
          <fieldset className="choices grades">
            <legend>How well did you know it?</legend>
            {GRADES.map(({ grade: choice, label }) => {
              const next = nextReview(choice);
              // Days until the next review. An early review keeps its due day, so this is not always the step.
              const days = next.dueDay ? dayNumber(next.dueDay) - dayNumber(today) : null;
              return (
                <button key={choice} type="button" className="button-quiet" onClick={() => grade(choice)}>
                  {label}
                  <span className="grade-hint">{days !== null ? ` · ${days} day${days === 1 ? "" : "s"}` : " · done"}</span>
                </button>
              );
            })}
          </fieldset>
        </>
      )}
      {/* Before or after Reveal: the question can be wrong too. */}
      <ReportWrong itemId={item.id} contentHash={item.hash} screen="review" />
    </section>
  );
}
