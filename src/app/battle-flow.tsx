"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { reviewItem } from "@/content";
import { OPPONENT_HP, type BattleOffer } from "@/core/battle";
import { playTurnV2, progressV2, startBattleV2, turnLog, type BattleV2 } from "@/core/battle-v2";
import { OPPONENT_SPECIES } from "@/core/sprite";
import { opponentTypes, scenarioTwist } from "@/core/twist";
import type { OpponentType } from "@/content/schema";
import { postEvents } from "@/lib/events/post-events";
import type { BattleEventFields, LearningEvent } from "@/lib/events/write-events";
import { BattleEnd } from "./battle-end";
import { BattleScene, type PlayChoice } from "./battle-scene";
import { CreatureSprite } from "./creature-sprite";
import { useMusic } from "./effects";
import { GlossaryText } from "./glossary-text";
import { OPPONENT_LOOK } from "./opponent-look";
import { playSound } from "./sound";

type Step = "team" | "scene" | "end";

/**
 * Battle (design 7, rules v2 of ADR 0001): worked examples for new concepts, then the opponent and
 * the team pick. The fight itself is the full-screen scene (#103): each turn shows the threat and
 * the Constraint, then the moves, then 3 Reasons, before the result. Each turn is saved at play
 * time, with whether it was the best move and whether the Reason was right.
 *
 * The end-of-Battle screen (#104) closes the Battle: every turn with its model answer and key
 * points to tick, which feed the review schedule, then "Discuss in Claude" with the teach-back.
 */
export function BattleFlow({
  offer,
  sessionId,
  onDone,
  onLeave,
  battleId: givenBattleId,
}: {
  offer: BattleOffer;
  sessionId: string;
  /** Called when the learner leaves the end screen, with whether they won. */
  onDone: (won: boolean) => void;
  /** Ends the whole session from the Battle scene, as Finish does. The scene hides Finish. */
  onLeave?: () => void;
  /** The battle id, when the caller needs it, as the Gym does. A new one by default. */
  battleId?: string;
}) {
  const [battleId] = useState(() => givenBattleId ?? crypto.randomUUID());
  const [battle, setBattle] = useState<BattleV2 | null>(null);
  const [step, setStep] = useState<Step>("team");
  // Worked examples come first, one screen each, then they hide (design 7.1).
  const [examplesRead, setExamplesRead] = useState(0);
  // The learner's own words of each turn, when they typed some.
  const [notes, setNotes] = useState<Record<number, string>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  // Battle music while the Battle runs. The end screen gives it back, so the map loop returns.
  useMusic(step === "end" ? null : "battle");

  // A new step replaces the button that was tapped, so focus moves to the new heading. The end
  // screen moves focus itself.
  useEffect(() => {
    heading.current?.focus();
  }, [step, examplesRead]);

  const battleFields = (): BattleEventFields => ({
    sessionId,
    occurredAt: new Date().toISOString(),
    battleId,
    scenarioId: offer.scenario.id,
    contentHash: offer.scenario.hash,
  });

  /** Plays and saves one turn. The best move and whether the Reason was right are fixed here, at play time. */
  const play: PlayChoice = (moveId, reasonIndex, note) => {
    if (!battle) return;
    const turnNumber = battle.played.length + 1;
    const next = playTurnV2(battle, moveId, reasonIndex);
    const played = next.played[turnNumber - 1];
    const log = turnLog(next, turnNumber);
    const whyText = note.trim();
    if (whyText) setNotes((before) => ({ ...before, [turnNumber]: whyText }));
    const events: LearningEvent[] = [
      {
        type: "battle-turn",
        clientEventId: crypto.randomUUID(),
        ...battleFields(),
        turnNumber,
        moveId: played.moveId,
        damage: played.damage,
        bestMove: played.bestMove,
        battleKind: log.battleKind,
        moveDamage: log.moveDamage,
        hpLost: log.hpLost,
        ...(whyText ? { whyText } : {}),
        ...(log.reasonIndex !== null && log.reasonCorrect !== null ? { reasonIndex: log.reasonIndex, reasonCorrect: log.reasonCorrect } : {}),
        ...(log.skillIds ? { skillIds: log.skillIds } : {}),
        ...(log.constraintVariant ? { constraintVariant: log.constraintVariant } : {}),
      },
    ];
    const outcome = progressV2(next);
    if (outcome.finished) {
      events.push({
        type: "battle",
        clientEventId: crypto.randomUUID(),
        ...battleFields(),
        team: next.team,
        result: outcome.won ? "won" : "lost",
        turnsUsed: next.played.length,
        battleKind: next.kind,
        faints: outcome.faints,
      });
    }
    void postEvents(events);
    setBattle(next);
  };

  const example = offer.workedExamples[examplesRead];
  if (!battle && example) {
    const isLastExample = examplesRead === offer.workedExamples.length - 1;
    return (
      <section className="stack" aria-labelledby="example-title">
        <h2 id="example-title" ref={heading} tabIndex={-1}>
          Worked example: {example.name}
        </h2>
        <p className="lead">
          A new concept for a battle. Read how it is solved first. Example {examplesRead + 1} of{" "}
          {offer.workedExamples.length}.
        </p>
        <div className="card stack">
          <p>
            <strong>Problem:</strong> <GlossaryText text={example.workedExample.problem} />
          </p>
          <ol className="steps">
            {/* The steps never change order, and two steps may share the same words. */}
            {example.workedExample.steps.map((stepText, index) => (
              <li key={index}>
                <GlossaryText text={stepText} />
              </li>
            ))}
          </ol>
          <p>
            <strong>Answer:</strong> <GlossaryText text={example.workedExample.answer} />
          </p>
        </div>
        <button type="button" className="button-main" onClick={() => setExamplesRead(examplesRead + 1)}>
          {isLastExample ? "Go to the battle" : "Next example"}
        </button>
      </section>
    );
  }

  if (!battle || step === "team") {
    return (
      <section className="stack" aria-labelledby="battle-title">
        <h2 id="battle-title" ref={heading} tabIndex={-1}>
          A battle begins: {offer.scenario.name}
        </h2>
        <div className="battle-intro">
          <CreatureSprite species={OPPONENT_SPECIES[offer.scenario.opponentType]} />
          <OpponentTypeList scenario={offer.scenario} />
        </div>
        <TwistNote scenario={offer.scenario} />
        <p>
          <GlossaryText text={offer.scenario.problem} />
        </p>
        <p>
          Opponent HP {OPPONENT_HP} of {OPPONENT_HP}
        </p>
        <TeamForm
          offer={offer}
          onStart={(team) => {
            playSound("select");
            setBattle(startBattleV2(offer.scenario, team));
            setStep("scene");
          }}
        />
      </section>
    );
  }

  if (step === "scene") {
    return <BattleScene scenario={offer.scenario} battle={battle} onPlay={play} onEnd={() => setStep("end")} onLeave={onLeave} />;
  }

  return <BattleEnd scenario={offer.scenario} battle={battle} notes={notes} eventFields={battleFields} onDone={onDone} />;
}

/** UI rule 7: a colour, an icon and a word, so the type reads without colour too. */
function TypeChip({ type, label, as: Tag = "p" }: { type: OpponentType; label?: string; as?: "p" | "li" }) {
  const look = OPPONENT_LOOK[type];
  return (
    <Tag className="opponent-type" style={{ borderColor: look.color }}>
      <span aria-hidden="true" className="opponent-icon">
        {look.icon}
      </span>
      {label && `${label} `}
      {look.word}
    </Tag>
  );
}

/** The opponent's type, or both types of a two-type opponent, each with its colour, icon and word. */
function OpponentTypeList({ scenario }: { scenario: BattleOffer["scenario"] }) {
  const types = opponentTypes(scenario);
  if (types.length === 1) return <TypeChip type={types[0]} label="Type:" />;
  return (
    <div className="stack">
      <p id="opponent-types-label">Two types:</p>
      <ul className="opponent-types" aria-labelledby="opponent-types-label">
        {types.map((type) => (
          <TypeChip key={type} type={type} as="li" />
        ))}
      </ul>
    </div>
  );
}

/** The town's twist in two short sentences, so the new rule is clear before the battle (#36). */
function TwistNote({ scenario }: { scenario: BattleOffer["scenario"] }) {
  const twist = scenarioTwist(scenario);
  if (!twist) return null;
  return (
    <p className="notice">
      <strong>{twist.name}.</strong> {twist.rule} {twist.damageRule}
    </p>
  );
}

function TeamForm({ offer, onStart }: { offer: BattleOffer; onStart: (team: string[]) => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const ready = picked.length === offer.team.size;

  function toggle(id: string) {
    setPicked(picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id]);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    // The team keeps the town's order, whatever order the boxes were ticked in.
    if (ready) onStart(offer.team.choices.filter((id) => picked.includes(id)));
  }

  return (
    <form className="stack" onSubmit={submit}>
      <fieldset className="choices">
        <legend>
          Pick {offer.team.size} creatures for your team. You can use only their moves. The first one fights first.
        </legend>
        {offer.team.choices.map((id) => (
          <label key={id} className="choice">
            <input
              type="checkbox"
              checked={picked.includes(id)}
              disabled={!picked.includes(id) && ready}
              onChange={() => toggle(id)}
            />
            <span>{reviewItem(id)?.name ?? id}</span>
          </label>
        ))}
      </fieldset>
      <button type="submit" className="button-main" disabled={!ready}>
        Start the battle
      </button>
    </form>
  );
}
