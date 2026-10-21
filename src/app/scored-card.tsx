"use client";

import { useEffect, useRef, useState } from "react";
import type { ScoredCard } from "@/content";
import { REVIEW_RULES, type Stage } from "@/core/review";
import { postEvents } from "@/lib/events/post-events";
import { CreatureSprite } from "./creature-sprite";
import { Fx } from "./effects";
import { GlossaryText } from "./glossary-text";
import { ReportWrong } from "./report-wrong";

/**
 * A Decision Card (design 6.4) or the Stage 3 trade-off question (design 6.5): a short situation,
 * tap one option, then tap one Reason. The app grades it at once, with a sound and words.
 * Right means the right option and the right Reason. The answer is logged with the file indexes.
 */
export function ScoredCardQuestion({
  card,
  title,
  stage = null,
  sessionId,
  outcome,
  onContinue,
}: {
  card: ScoredCard;
  title: string;
  /** The creature's stage for its picture. null shows the normal colours. */
  stage?: Stage | null;
  sessionId: string;
  /** One line on what the result means for the creature. */
  outcome: (right: boolean) => string;
  onContinue: (right: boolean) => void;
}) {
  const [shownAt] = useState(() => new Date().toISOString());
  // The options and Reasons show in a random order, so the right one is not always first.
  const [optionOrder] = useState(() => shuffledIndexes(card.options.length));
  const [reasonOrder] = useState(() => shuffledIndexes(card.reasons.length));
  const [choice, setChoice] = useState<number | null>(null);
  const [reason, setReason] = useState<number | null>(null);
  const answered = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);

  const choiceRight = choice === card.rightOption;
  const reasonRight = reason !== null && card.reasons[reason].right;
  const right = choiceRight && reasonRight;

  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    if (reason !== null) resultHeading.current?.focus();
  }, [reason]);

  function pickReason(index: number) {
    // A fast double tap saves one answer.
    if (answered.current || choice === null) return;
    answered.current = true;
    const gradedAt = new Date().toISOString();
    void postEvents([
      {
        type: "review-card",
        clientEventId: crypto.randomUUID(),
        sessionId,
        occurredAt: gradedAt,
        itemId: card.id,
        itemKind: card.kind,
        contentHash: card.hash,
        choiceIndex: choice,
        choiceCorrect: choice === card.rightOption,
        reasonIndex: index,
        reasonCorrect: card.reasons[index].right,
        skillIds: card.skills,
        shownAt,
        gradedAt,
        rulesVersion: REVIEW_RULES,
      },
    ]);
    setReason(index);
  }

  const headingId = `scored-${card.kind}-title`;
  return (
    <section className="stack" aria-labelledby={headingId}>
      <h2 id={headingId} ref={heading} tabIndex={-1}>
        {title}
      </h2>
      <div className="scored-creature">
        <CreatureSprite species={card.creature.sprite} stage={stage} />
        <p className="pixel-label">{card.creature.name}</p>
      </div>
      <div className="card stack">
        <p>
          <GlossaryText text={card.situation} />
        </p>
      </div>
      {reason === null ? (
        <>
          <fieldset className="choices">
            <legend>{choice === null ? "Pick one option." : "Your option. Tap another to change it."}</legend>
            {optionOrder.map((index) => (
              <button
                key={index}
                type="button"
                className="pick"
                aria-pressed={choice === index}
                onClick={() => setChoice(index)}
              >
                {card.options[index]}
              </button>
            ))}
          </fieldset>
          {choice !== null && (
            <fieldset className="choices">
              <legend>Why? Pick a Reason.</legend>
              {reasonOrder.map((index) => (
                <button key={index} type="button" className="pick pick-reason" onClick={() => pickReason(index)}>
                  {card.reasons[index].text}
                </button>
              ))}
            </fieldset>
          )}
        </>
      ) : (
        <div className="stack">
          <h3 ref={resultHeading} tabIndex={-1}>
            <Fx effect="pop" sound={right ? "right" : "wrong"}>
              {right ? "Right!" : "Not quite"}
            </Fx>
          </h3>
          <AnswerList
            label="Options"
            items={optionOrder.map((index) => ({ text: card.options[index], right: index === card.rightOption, picked: index === choice }))}
          />
          <AnswerList
            label="Reasons"
            items={reasonOrder.map((index) => ({ text: card.reasons[index].text, right: card.reasons[index].right, picked: index === reason }))}
          />
          <p>
            <GlossaryText text={card.explanation} />
          </p>
          <p className="notice">{outcome(right)}</p>
          <button type="button" className="button-main" onClick={() => onContinue(right)}>
            Continue
          </button>
        </div>
      )}
      <ReportWrong itemId={card.id} contentHash={card.hash} screen="review" />
    </section>
  );
}

/** The options or Reasons after the answer. Each line says in words which was right and which was picked. */
function AnswerList({ label, items }: { label: string; items: { text: string; right: boolean; picked: boolean }[] }) {
  const id = `answers-${label.toLowerCase()}`;
  return (
    <div className="stack answer-group">
      <p className="pixel-label" id={id}>
        {label}
      </p>
      <ul className="answer-list" aria-labelledby={id}>
        {items.map((item) => (
          <li key={item.text} className={item.right ? "answer-right" : item.picked ? "answer-wrong" : undefined}>
            <span>{item.text}</span>
            {(item.right || item.picked) && (
              <span className="answer-mark">
                {item.right ? (item.picked ? "✓ Your pick, right" : "✓ Right") : "✗ Your pick"}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function shuffledIndexes(count: number): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
