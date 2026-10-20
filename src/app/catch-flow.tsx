"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { checkCatchAnswer, type CatchAnswer, type CatchItem } from "@/core/catch";
import { postEvents } from "@/lib/events/post-events";
import type { CatchEvent } from "@/lib/events/write-events";
import { CONFIDENCE, type Confidence } from "./confidence";
import { ReportWrong } from "./report-wrong";
import { GlossaryText } from "./glossary-text";

type Phase =
  | { name: "ask"; attempt: CatchEvent["phase"] }
  | { name: "feedback"; answer: CatchAnswer }
  | { name: "card"; caught: boolean }
  | { name: "result"; caught: boolean; answer: CatchAnswer };



/**
 * Catch (design 6): try the question first, then read the card. A right answer catches the
 * item at stage 1. After a wrong first answer, the same question comes back after the card.
 */
export function CatchFlow({
  item,
  sessionId,
  onDone,
}: {
  item: CatchItem;
  sessionId: string;
  onDone: (caught: boolean) => void;
}) {
  const [phase, setPhase] = useState<Phase>({ name: "ask", attempt: "before-card" });
  // The right answer is not always first.
  const [choices] = useState(() => shuffle(item.catch.choices));
  // Each answer is saved once, even after a fast double tap.
  const answered = useRef(new Set<CatchEvent["phase"]>());
  const heading = useRef<HTMLHeadingElement>(null);

  // A new step replaces the button that was tapped, so focus moves to the new heading.
  useEffect(() => {
    heading.current?.focus();
  }, [phase.name]);

  function answer(chosen: string, confidence: Confidence, attempt: CatchEvent["phase"]) {
    if (answered.current.has(attempt)) return;
    answered.current.add(attempt);
    const result = checkCatchAnswer(item, chosen);
    void postEvents([
      {
        type: "catch",
        clientEventId: crypto.randomUUID(),
        sessionId,
        occurredAt: new Date().toISOString(),
        itemId: item.id,
        itemKind: item.kind,
        contentHash: item.hash,
        answerText: chosen,
        correct: result.correct,
        confidence,
        phase: attempt,
      },
    ]);
    setPhase(attempt === "before-card" ? { name: "feedback", answer: result } : { name: "result", caught: result.correct, answer: result });
  }

  if (phase.name === "ask") {
    return (
      <section className="stack" aria-labelledby="catch-title">
        <h2 id="catch-title" ref={heading} tabIndex={-1}>
          {phase.attempt === "before-card" ? `A new ${item.kind} appears` : "Try again"}
        </h2>
        {phase.attempt === "before-card" && (
          <p className="lead">Try to answer before you read about it. A guess is fine.</p>
        )}
        <QuestionForm
          question={item.catch.question}
          choices={choices}
          onAnswer={(chosen, confidence) => answer(chosen, confidence, phase.attempt)}
        />
      </section>
    );
  }

  if (phase.name === "feedback") {
    return (
      <section className="stack" aria-labelledby="feedback-title">
        <h2 id="feedback-title" ref={heading} tabIndex={-1}>{phase.answer.correct ? `You caught ${item.name}!` : "Not yet"}</h2>
        <p>
          {phase.answer.correct
            ? phase.answer.explanation
            : "That is not the answer. Read the card, then try once more."}
        </p>
        <button type="button" className="button-main" onClick={() => setPhase({ name: "card", caught: phase.answer.correct })}>
          Read the card
        </button>
      </section>
    );
  }

  if (phase.name === "card") {
    return (
      <section className="stack" aria-labelledby="card-title">
        <h2 id="card-title" ref={heading} tabIndex={-1}>
          {item.name}
        </h2>
        <CardView card={item.card} />
        <ReportWrong itemId={item.id} contentHash={item.hash} screen="catch-card" />
        {phase.caught ? (
          <button type="button" className="button-main" onClick={() => onDone(true)}>
            Done
          </button>
        ) : (
          <button type="button" className="button-main" onClick={() => setPhase({ name: "ask", attempt: "after-card" })}>
            Try the question again
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="stack" aria-labelledby="result-title">
      <h2 id="result-title" ref={heading} tabIndex={-1}>{phase.caught ? `You caught ${item.name}!` : "Not this time"}</h2>
      <p>
        {phase.caught
          ? phase.answer.explanation
          : `The answer is: ${phase.answer.rightAnswer}. ${phase.answer.explanation} ${item.name} comes back next time.`}
      </p>
      <button type="button" className="button-main" onClick={() => onDone(phase.caught)}>
        Continue
      </button>
    </section>
  );
}

function QuestionForm({
  question,
  choices,
  onAnswer,
}: {
  question: string;
  choices: string[];
  onAnswer: (chosen: string, confidence: Confidence) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const ready = chosen !== null && confidence !== null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (chosen !== null && confidence !== null) onAnswer(chosen, confidence);
  }

  return (
    <form className="stack" onSubmit={submit}>
      <fieldset className="choices">
        <legend>{question}</legend>
        {choices.map((choice) => (
          <label key={choice} className="choice">
            <input type="radio" name="choice" value={choice} checked={chosen === choice} onChange={() => setChosen(choice)} />
            <span>{choice}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="choices row-choices">
        <legend>How sure are you?</legend>
        {CONFIDENCE.map(({ value, label }) => (
          <label key={value} className="choice">
            <input
              type="radio"
              name="confidence"
              value={value}
              checked={confidence === value}
              onChange={() => setConfidence(value)}
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      {!ready && <p className="lead">Pick an answer and how sure you are.</p>}
      <button type="submit" className="button-main" disabled={!ready}>
        Check
      </button>
    </form>
  );
}

function CardView({ card }: { card: CatchItem["card"] }) {
  return (
    <div className="card stack">
      <p>
        <GlossaryText text={card.text} />
      </p>
      <p>
        <strong>Example:</strong> <GlossaryText text={card.example} />
      </p>
      <p>
        <a href={card.source.url} target="_blank" rel="noopener noreferrer">
          Source: {card.source.title}
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      </p>
    </div>
  );
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
