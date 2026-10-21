"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { checkCatchAnswer, type CatchAnswer, type CatchItem } from "@/core/catch";
import { afterTry, lessonOf, type LessonScreen, type LessonView, type Try } from "@/core/lesson";
import { postEvents } from "@/lib/events/post-events";
import { CONFIDENCE, type Confidence } from "./confidence";
import { Fx } from "./effects";
import { ReportWrong } from "./report-wrong";
import { GlossaryText } from "./glossary-text";
import { useMermaidSvg } from "./mermaid-diagram";
import { playSound } from "./sound";

type Phase =
  | { name: "lesson"; screen: number }
  | { name: "ask"; attempt: Try }
  | { name: "caught" | "missed"; answer: CatchAnswer };

/** A swipe this many pixels sideways turns the Lesson page. */
const SWIPE_PX = 50;

/**
 * Catch (design 6.3): teach first, then ask. The learner swipes through the Lesson screens, then
 * answers one question. A right answer catches the item at stage 1. A wrong first answer shows the
 * Lesson screen that holds the answer, and the learner gets one more try.
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
  const lesson = lessonOf(item);
  const [phase, setPhase] = useState<Phase>({ name: "lesson", screen: 0 });
  // The right answer is not always first.
  const [choices] = useState(() => shuffle(item.catch.choices));
  // Each try is saved once, even after a fast double tap.
  const answered = useRef(new Set<Try>());
  const heading = useRef<HTMLHeadingElement>(null);
  const step = phase.name === "lesson" ? `lesson-${phase.screen}` : phase.name === "ask" ? `ask-${phase.attempt}` : phase.name;

  // A new step replaces the button that was tapped, so focus moves to the new heading.
  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  function answer(chosen: string, confidence: Confidence, attempt: Try) {
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
        phase: attempt === 1 ? "after-lesson" : "after-look-back",
        attempt,
      },
    ]);
    const next = afterTry(attempt, result.correct);
    if (next === "look-back") {
      playSound("wrong");
      setPhase({ name: "ask", attempt: 2 });
    } else {
      setPhase({ name: next, answer: result });
    }
  }

  if (phase.name === "lesson") {
    const last = lesson.screens.length - 1;
    // Past the last screen, the question comes.
    const turn = (to: number) => setPhase(to > last ? { name: "ask", attempt: 1 } : { name: "lesson", screen: Math.max(0, to) });
    const screen = lesson.screens[phase.screen];
    return (
      <SwipeArea onSwipe={(direction) => turn(phase.screen + direction)}>
        <section className="stack lesson" aria-labelledby="lesson-title">
          <p className="pixel-label">
            Lesson · {item.name} · {phase.screen + 1} of {lesson.screens.length}
          </p>
          {lesson.screens.length > 1 && <PageDots count={lesson.screens.length} current={phase.screen} />}
          <h2 id="lesson-title" ref={heading} tabIndex={-1}>
            {phase.screen === 0 ? `A new ${item.kind}: ${item.name}` : item.name}
          </h2>
          <LessonCard screen={screen} source={lesson.source} />
          {phase.screen === last && <ReportWrong itemId={item.id} contentHash={item.hash} screen="catch-card" />}
          <button type="button" className="button-main" onClick={() => turn(phase.screen + 1)}>
            {phase.screen < last ? "Next" : "I am ready: catch it"}
          </button>
          {phase.screen > 0 && (
            <button type="button" className="button-quiet" onClick={() => turn(phase.screen - 1)}>
              Back
            </button>
          )}
        </section>
      </SwipeArea>
    );
  }

  if (phase.name === "ask") {
    return <AskStep {...{ item, choices, heading }} attempt={phase.attempt} lesson={lesson} onAnswer={answer} />;
  }

  return (
    <section className="stack" aria-labelledby="result-title">
      <h2 id="result-title" ref={heading} tabIndex={-1}>
        {phase.name === "caught" ? <Caught name={item.name} /> : <Fx sound="wrong">Not this time</Fx>}
      </h2>
      <p>
        {phase.name === "caught"
          ? phase.answer.explanation
          : `The answer is: ${phase.answer.rightAnswer}. ${phase.answer.explanation} ${item.name} comes back next time.`}
      </p>
      <button type="button" className="button-main" onClick={() => onDone(phase.name === "caught")}>
        Continue
      </button>
    </section>
  );
}

/** The question. On the second try, the Lesson screen that holds the answer shows above it. */
function AskStep({
  item,
  choices,
  heading,
  attempt,
  lesson,
  onAnswer,
}: {
  item: CatchItem;
  choices: string[];
  heading: RefObject<HTMLHeadingElement | null>;
  attempt: Try;
  lesson: LessonView;
  onAnswer: (chosen: string, confidence: Confidence, attempt: Try) => void;
}) {
  const lookBack = lesson.screens[lesson.answerScreen];
  return (
    <section className="stack" aria-labelledby="catch-title">
      <h2 id="catch-title" ref={heading} tabIndex={-1}>
        {attempt === 1 ? `Catch ${item.name}` : "Not yet. Look again"}
      </h2>
      {attempt === 2 && (
        <div className="look-back stack">
          <p className="pixel-label">
            Look again · Lesson {lesson.answerScreen + 1} of {lesson.screens.length}
          </p>
          <LessonCard screen={lookBack} source={lesson.source} />
          <p className="lead">One more try.</p>
        </div>
      )}
      {/* A new form for the second try, so the first answer is not still ticked. */}
      <QuestionForm key={attempt} question={item.catch.question} choices={choices} onAnswer={(chosen, confidence) => onAnswer(chosen, confidence, attempt)} />
    </section>
  );
}

function LessonCard({ screen, source }: { screen: LessonScreen; source: LessonView["source"] }) {
  return (
    <div className="card stack">
      {screen.diagram && <LessonDiagram source={screen.diagram} />}
      <p>
        <GlossaryText text={screen.text} />
      </p>
      {screen.example && (
        <p>
          <strong>Example:</strong> <GlossaryText text={screen.example} />
        </p>
      )}
      <p>
        <a href={source.url} target="_blank" rel="noopener noreferrer">
          Source: {source.title}
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      </p>
    </div>
  );
}

/** A Lesson diagram, drawn from its Mermaid text. Its text stays for screen readers. */
function LessonDiagram({ source }: { source: string }) {
  const { svg, problem } = useMermaidSvg(source);
  if (problem) return <p className="lead">The diagram could not be drawn.</p>;
  return (
    <figure className="diagram lesson-diagram" aria-label="Diagram">
      {svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <p className="lead">Drawing…</p>}
    </figure>
  );
}

function PageDots({ count, current }: { count: number; current: number }) {
  return (
    <div className="page-dots" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i key={i} className={i <= current ? "on" : undefined} />
      ))}
    </div>
  );
}

/** Turns a sideways swipe into a page turn: left for the next screen, right for the one before. */
function SwipeArea({ onSwipe, children }: { onSwipe: (direction: 1 | -1) => void; children: ReactNode }) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return (
    <div
      className="swipe-area"
      onPointerDown={(event) => (start.current = { x: event.clientX, y: event.clientY })}
      onPointerUp={(event) => {
        const from = start.current;
        start.current = null;
        if (!from) return;
        const dx = event.clientX - from.x;
        // A mostly sideways move only: scrolling down the screen never turns a page.
        if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > 2 * Math.abs(event.clientY - from.y)) onSwipe(dx < 0 ? 1 : -1);
      }}
    >
      {children}
    </div>
  );
}

/** The heading of a catch, with its sound and a short pop (UI rules 9 and 10). */
function Caught({ name }: { name: string }) {
  return (
    <Fx effect="pop" sound="catch">
      You caught {name}!
    </Fx>
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


function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
