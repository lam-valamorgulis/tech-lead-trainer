"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { getTown } from "@/content";
import { placementProgress, type PlacementRecord } from "@/core/placement";
import { postEvents } from "@/lib/events/post-events";
import { currentLearningDay } from "@/lib/learning-log";
import { loadPlacementRecords } from "@/lib/placement-log";
import { browserClient } from "@/lib/supabase/browser";
import { CONFIDENCE, type Confidence } from "../../confidence";



/**
 * Placement test (design 4): short answers before a town starts. The learner checks each
 * answer against the model answer. A right answer catches the creature at stage 1.
 */
export function PlacementScreen({ townId }: { townId: string }) {
  const town = getTown(townId);
  const [records, setRecords] = useState<PlacementRecord[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    let cancelled = false;
    const client = browserClient();
    currentLearningDay(client)
      .then((today) => loadPlacementRecords(client, today))
      .then((value) => !cancelled && setRecords(value))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!town) return <p className="lead">This town does not exist.</p>;
  if (failed) return <p role="alert" className="error">We could not load the test. Check your connection.</p>;
  if (!records) return <p className="lead">Loading…</p>;

  const progress = placementProgress(town, records);
  if (progress.done) {
    return (
      <section className="stack" aria-labelledby="result-title">
        <h2 id="result-title">{town.name}: your result</h2>
        <p>
          You knew {progress.correct} of {progress.total}.
        </p>
        <p className="lead">
          Low scores are normal. Trying before you learn helps you remember, and the test shows what to learn next.
        </p>
        <Link href="/" className="button button-main">
          Back home
        </Link>
      </section>
    );
  }

  const question = progress.next!;
  return (
    <PlacementQuestion
      key={question.creatureId}
      position={`Question ${progress.answered + 1} of ${progress.total}`}
      question={question}
      last={progress.answered + 1 === progress.total}
      creatureName={town.creatures.find((c) => c.id === question.creatureId)?.name ?? question.creatureId}
      onAnswered={(answer) => {
        void postEvents([
          {
            type: "placement",
            clientEventId: crypto.randomUUID(),
            sessionId,
            occurredAt: new Date().toISOString(),
            townId: town.id,
            itemId: question.creatureId,
            contentHash: question.hash,
            answerText: answer.text,
            correct: answer.correct,
            confidence: answer.confidence,
          },
        ]);
      }}
      onNext={(correct) =>
        setRecords([...records, { townId: town.id, itemId: question.creatureId, correct, learningDay: "" }])
      }
    />
  );
}

function PlacementQuestion({
  position,
  question,
  creatureName,
  last,
  onAnswered,
  onNext,
}: {
  position: string;
  question: { question: string; answer: string };
  creatureName: string;
  last: boolean;
  onAnswered: (answer: { text: string; confidence: Confidence; correct: boolean }) => void;
  onNext: (correct: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [checked, setChecked] = useState(false);
  const [marked, setMarked] = useState<boolean | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, [checked, marked]);

  const ready = text.trim() !== "" && confidence !== null;

  function check(event: FormEvent) {
    event.preventDefault();
    if (ready) setChecked(true);
  }

  function mark(correct: boolean) {
    // Each answer is saved once, even after a fast double tap.
    if (marked !== null || confidence === null) return;
    setMarked(correct);
    onAnswered({ text: text.trim(), confidence, correct });
  }

  return (
    <section className="stack" aria-labelledby="question-title">
      <h2 id="question-title" ref={heading} tabIndex={-1}>
        {position}
      </h2>
      <p>{question.question}</p>
      {!checked ? (
        <form className="stack" onSubmit={check}>
          <label className="field">
            <span className="field-label">Your answer</span>
            <textarea rows={3} maxLength={2000} value={text} onChange={(event) => setText(event.target.value)} />
          </label>
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
          {!ready && <p className="lead">Write a short answer and pick how sure you are. A guess is fine.</p>}
          <button type="submit" className="button-main" disabled={!ready}>
            Check
          </button>
        </form>
      ) : (
        <>
          <div className="card stack">
            <p>
              <strong>Model answer:</strong> {question.answer}
            </p>
          </div>
          {marked === null ? (
            <fieldset className="choices row-choices">
              <legend>Did your answer say the same thing?</legend>
              <button type="button" className="button-quiet" onClick={() => mark(true)}>
                Yes, I knew it
              </button>
              <button type="button" className="button-quiet" onClick={() => mark(false)}>
                Not yet
              </button>
            </fieldset>
          ) : (
            <>
              <p>{marked ? `You caught ${creatureName} at stage 1.` : "That is fine. You will learn it in this town."}</p>
              <button type="button" className="button-main" onClick={() => onNext(marked)}>
                {last ? "See your result" : "Next question"}
              </button>
            </>
          )}
        </>
      )}
    </section>
  );
}
