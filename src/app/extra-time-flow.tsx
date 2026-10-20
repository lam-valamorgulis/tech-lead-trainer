"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ExtraTime, ReadingTask } from "@/core/extra-time";
import { postEvents } from "@/lib/events/post-events";
import { BattleFlow } from "./battle-flow";

type Choice = "pick" | "battle" | "reading";

/**
 * Extra time on a 45-minute day (design 3): one more battle, the boss, or read-close-write.
 * The boss is a computer task with its own page, so it is a link.
 */
export function ExtraTimeFlow({
  extra,
  townId,
  sessionId,
  onDone,
}: {
  extra: ExtraTime;
  townId: string;
  sessionId: string;
  onDone: () => void;
}) {
  const [choice, setChoice] = useState<Choice>("pick");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [choice]);

  if (choice === "battle" && extra.extraBattle) {
    return <BattleFlow offer={extra.extraBattle} sessionId={sessionId} onDone={onDone} />;
  }
  if (choice === "reading" && extra.reading) {
    return <ReadCloseWrite task={extra.reading} sessionId={sessionId} onDone={onDone} />;
  }
  return (
    <section className="stack" aria-labelledby="extra-title">
      <h2 id="extra-title" ref={heading} tabIndex={-1}>
        Extra time
      </h2>
      <p className="lead">A free day: pick one more task.</p>
      {extra.extraBattle && (
        <button type="button" className="button-main" onClick={() => setChoice("battle")}>
          Extra battle
        </button>
      )}
      {extra.reading && (
        <button type="button" className="button-main" onClick={() => setChoice("reading")}>
          Read, close, write
        </button>
      )}
      {extra.boss && (
        <Link href={`/weekend/${townId}`} className="button button-quiet">
          Work on the boss
        </Link>
      )}
    </section>
  );
}

/**
 * Read one primary source, close it, then write 3 points from memory (spec story 93). The source
 * is hidden while the learner writes, so the points come from recall, not from copying.
 */
function ReadCloseWrite({ task, sessionId, onDone }: { task: ReadingTask; sessionId: string; onDone: () => void }) {
  const [step, setStep] = useState<"read" | "write" | "saved">("read");
  const [points, setPoints] = useState(["", "", ""]);
  const saved = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  const ready = points.every((point) => point.trim() !== "");

  function save(event: FormEvent) {
    event.preventDefault();
    // A fast double tap saves one task.
    if (!ready || saved.current) return;
    saved.current = true;
    void postEvents([
      {
        type: "reading",
        clientEventId: crypto.randomUUID(),
        sessionId,
        occurredAt: new Date().toISOString(),
        itemId: task.itemId,
        sourceUrl: task.source.url,
        points: points.map((point) => point.trim()),
      },
    ]);
    setStep("saved");
  }

  const sourceLink = (
    <a href={task.source.url} target="_blank" rel="noopener noreferrer">
      {task.source.title}
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  );

  if (step === "read") {
    return (
      <section className="stack" aria-labelledby="read-title">
        <h2 id="read-title" ref={heading} tabIndex={-1}>
          Read: {task.itemName}
        </h2>
        <p>Read this primary source. Take your time. Then close it here and write what you remember.</p>
        <p>{sourceLink}</p>
        <button type="button" className="button-main" onClick={() => setStep("write")}>
          I have read it: close the source
        </button>
      </section>
    );
  }

  if (step === "saved") {
    return (
      <section className="stack" aria-labelledby="saved-title">
        <h2 id="saved-title" ref={heading} tabIndex={-1}>
          3 points saved
        </h2>
        <p>Saved. Now open the source again and compare.</p>
        <p>{sourceLink}</p>
        <button type="button" className="button-main" onClick={onDone}>
          Done
        </button>
      </section>
    );
  }

  return (
    <form className="stack" onSubmit={save} aria-labelledby="write-title">
      <h2 id="write-title" ref={heading} tabIndex={-1}>
        Write: {task.itemName}
      </h2>
      <p className="lead">The source is closed. Write 3 points from memory, one sentence each.</p>
      {points.map((point, index) => (
        <label key={index} className="field">
          <span className="field-label">Point {index + 1}</span>
          <textarea
            rows={2}
            maxLength={500}
            value={point}
            onChange={(event) => setPoints(points.map((p, i) => (i === index ? event.target.value : p)))}
          />
        </label>
      ))}
      <button type="submit" className="button-main" disabled={!ready}>
        Save my 3 points
      </button>
    </form>
  );
}
