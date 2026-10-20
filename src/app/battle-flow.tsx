"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { reviewItem } from "@/content";
import {
  battleProgress,
  checkTurn,
  counterattackSentence,
  creatureOf,
  damageLabel,
  MAX_TURNS,
  OPPONENT_HP,
  playTurn,
  startBattle,
  usableMoves,
  type BattleOffer,
  type BattleState,
} from "@/core/battle";
import { postEvents } from "@/lib/events/post-events";
import type { LearningEvent } from "@/lib/events/write-events";
import { DiscussInClaude } from "./discuss-in-claude";
import { keepAboveKeyboard } from "./keyboard";
import { OPPONENT_LOOK } from "./opponent-look";

type Step = "team" | "turn" | "result" | "check" | "end";

/**
 * Battle (design 7): see the opponent and pick a team. Each turn shows the threat first, then
 * the moves. The "why" comes before the result. The damage comes from the move table.
 * After each result, the model answer: the learner ticks the key points they said.
 * At the end, "Discuss in Claude" and the teach-back (design 10).
 */
export function BattleFlow({
  offer,
  sessionId,
  onDone,
}: {
  offer: BattleOffer;
  sessionId: string;
  onDone: () => void;
}) {
  const [battleId] = useState(() => crypto.randomUUID());
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [step, setStep] = useState<Step>("team");
  // Each turn and each self-check is saved once, even after a fast double tap.
  const played = useRef(new Set<number>());
  const checked = useRef(new Set<number>());
  // The why of each turn, shown next to its model answer.
  const [whys, setWhys] = useState<Record<number, string>>({});
  // The ticked key points of each turn, for the "Discuss in Claude" package.
  const [ticks, setTicks] = useState<Record<number, number[]>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const progress = battle ? battleProgress(battle) : null;

  // A new step replaces the button that was tapped, so focus moves to the new heading.
  useEffect(() => {
    heading.current?.focus();
  }, [step, battle?.turns.length]);

  const battleFields = () => ({
    sessionId,
    occurredAt: new Date().toISOString(),
    battleId,
    scenarioId: offer.scenario.id,
    contentHash: offer.scenario.hash,
  });

  function makeMove(moveId: string | null, whyText: string) {
    if (!battle) return;
    const turnNumber = battle.turns.length + 1;
    if (played.current.has(turnNumber)) return;
    const next = playTurn(battle, moveId);
    played.current.add(turnNumber);
    setWhys((before) => ({ ...before, [turnNumber]: whyText }));
    const turn = next.turns[next.turns.length - 1];
    const events: LearningEvent[] = [
      {
        type: "battle-turn",
        clientEventId: crypto.randomUUID(),
        ...battleFields(),
        turnNumber,
        moveId: turn.moveId,
        damage: turn.damage,
        bestMove: turn.bestMove,
        whyText,
      },
    ];
    const outcome = battleProgress(next);
    if (outcome.finished) {
      events.push({
        type: "battle",
        clientEventId: crypto.randomUUID(),
        ...battleFields(),
        team: next.team,
        result: outcome.won ? "won" : "lost",
        turnsUsed: next.turns.length,
      });
    }
    void postEvents(events);
    setBattle(next);
    setStep("result");
  }

  /** Saves the ticks of the last turn. They change only the review schedule, never the battle. */
  function saveCheck(tickedPoints: number[]) {
    if (!battle) return;
    const { turnNumber } = battle.turns[battle.turns.length - 1];
    if (!checked.current.has(turnNumber)) {
      checked.current.add(turnNumber);
      const check = checkTurn(battle, turnNumber, tickedPoints);
      setTicks((before) => ({ ...before, [turnNumber]: check.tickedPoints }));
      void postEvents([{ type: "battle-check", clientEventId: crypto.randomUUID(), ...battleFields(), ...check }]);
    }
    setStep(battleProgress(battle).finished ? "end" : "turn");
  }

  if (!battle || step === "team") {
    return (
      <section className="stack" aria-labelledby="battle-title">
        <h2 id="battle-title" ref={heading} tabIndex={-1}>
          A battle begins: {offer.scenario.name}
        </h2>
        <OpponentType type={offer.scenario.opponentType} />
        <p>{offer.scenario.problem}</p>
        <HitPoints hp={OPPONENT_HP} />
        <TeamForm
          offer={offer}
          onStart={(team) => {
            setBattle(startBattle(offer, team));
            setStep("turn");
          }}
        />
      </section>
    );
  }

  const last = battle.turns[battle.turns.length - 1];

  if (step === "turn") {
    const turn = battle.scenario.turns[battle.turns.length];
    return (
      <section className="stack" aria-labelledby="turn-title">
        <h2 id="turn-title" ref={heading} tabIndex={-1}>
          Turn {battle.turns.length + 1} of {MAX_TURNS}
        </h2>
        <HitPoints hp={progress!.hp} />
        {last && <p className="lead">Last turn: {resultSentence(last)}</p>}
        {/* UI rule 1: the threat comes before the moves. */}
        <p className="notice">
          <strong>Threat:</strong> {turn.threat}
        </p>
        <MoveForm key={battle.turns.length} moves={usableMoves(battle)} onMove={makeMove} />
      </section>
    );
  }

  if (step === "result") {
    return (
      <section className="stack" aria-labelledby="result-title">
        <h2 id="result-title" ref={heading} tabIndex={-1}>
          Turn {last.turnNumber} result
        </h2>
        <p className="damage">{damageLabel(last.damage)}</p>
        <p>{resultSentence(last)}</p>
        <HitPoints hp={progress!.hp} />
        <button type="button" className="button-main" onClick={() => setStep("check")}>
          See the model answer
        </button>
      </section>
    );
  }

  if (step === "check") {
    const turn = battle.scenario.turns[last.turnNumber - 1];
    return (
      <section className="stack" aria-labelledby="check-title">
        <h2 id="check-title" ref={heading} tabIndex={-1}>
          Model answer
        </h2>
        <p className="lead">Your why: {whys[last.turnNumber]}</p>
        <p>{turn.modelAnswer}</p>
        <CheckForm
          key={last.turnNumber}
          keyPoints={turn.keyPoints}
          nextLabel={progress!.finished ? "See how it ended" : "Next turn"}
          onSave={saveCheck}
        />
      </section>
    );
  }

  return (
    <section className="stack" aria-labelledby="end-title">
      <h2 id="end-title" ref={heading} tabIndex={-1}>
        {progress!.won ? "You won!" : "You lost this time"}
      </h2>
      <p>
        {progress!.won
          ? `The opponent's HP reached 0 in ${battle.turns.length} turns.`
          : `The opponent still has HP ${progress!.hp}. A lost battle is practice too.`}
      </p>
      <DiscussInClaude battle={battle} whys={whys} ticks={ticks} eventFields={battleFields} onDone={onDone} />
    </section>
  );
}

/** The self-check (design 7.7): tick the key points you said. Any number of ticks is fine. */
function CheckForm({
  keyPoints,
  nextLabel,
  onSave,
}: {
  keyPoints: string[];
  nextLabel: string;
  onSave: (tickedPoints: number[]) => void;
}) {
  const [ticked, setTicked] = useState<number[]>([]);

  function toggle(point: number) {
    setTicked(ticked.includes(point) ? ticked.filter((p) => p !== point) : [...ticked, point]);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave(ticked);
  }

  return (
    <form className="stack" onSubmit={submit}>
      <fieldset className="choices">
        <legend>Tick the key points you said in your why.</legend>
        {keyPoints.map((point, index) => (
          <label key={index} className="choice">
            <input type="checkbox" checked={ticked.includes(index + 1)} onChange={() => toggle(index + 1)} />
            <span>{point}</span>
          </label>
        ))}
      </fieldset>
      <p className="lead">A point you did not say comes back in tomorrow&apos;s reviews. Your ticks never change the damage.</p>
      <button type="submit" className="button-main">
        {nextLabel}
      </button>
    </form>
  );
}

/** UI rule 4: a colour, an icon and a word, so the type reads without colour too. */
function OpponentType({ type }: { type: BattleOffer["scenario"]["opponentType"] }) {
  const look = OPPONENT_LOOK[type];
  return (
    <p className="opponent-type" style={{ borderColor: look.color }}>
      <span aria-hidden="true" className="opponent-icon">
        {look.icon}
      </span>
      Type: {look.word}
    </p>
  );
}

function HitPoints({ hp }: { hp: number }) {
  return (
    <p>
      Opponent HP {hp} of {OPPONENT_HP}{" "}
      <span aria-hidden="true">{"♥".repeat(hp) + "♡".repeat(OPPONENT_HP - hp)}</span>
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
        <legend>Pick {offer.team.size} creatures for your team. You can use only their moves.</legend>
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

/** UI rule 2: "You chose X. Y happens." */
function resultSentence(turn: BattleState["turns"][number]): string {
  return counterattackSentence(turn.moveId && moveLabel(turn.moveId).name, turn.counterattack);
}

/** The move and its creature, for example "TTL (Cache)". */
function moveLabel(moveId: string): { name: string; label: string } {
  const name = reviewItem(moveId)?.name ?? moveId;
  return { name, label: `${name} (${reviewItem(creatureOf(moveId))?.name ?? creatureOf(moveId)})` };
}

const NO_MOVE = "none";

function MoveForm({ moves, onMove }: { moves: string[]; onMove: (moveId: string | null, whyText: string) => void }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [why, setWhy] = useState("");
  const form = useRef<HTMLDivElement>(null);
  const ready = chosen !== null && why.trim().length > 0;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (ready) onMove(chosen === NO_MOVE ? null : chosen, why.trim());
  }

  return (
    <form className="stack" onSubmit={submit}>
      <fieldset className="choices">
        <legend>Your move</legend>
        {moves.map((moveId) => (
          <label key={moveId} className="choice">
            <input type="radio" name="move" checked={chosen === moveId} onChange={() => setChosen(moveId)} />
            <span>{moveLabel(moveId).label}</span>
          </label>
        ))}
        {moves.length === 0 && (
          <label className="choice">
            <input type="radio" name="move" checked={chosen === NO_MOVE} onChange={() => setChosen(NO_MOVE)} />
            <span>None of my moves fits this threat</span>
          </label>
        )}
      </fieldset>
      <div ref={form} className="stack why-form">
        <label className="field">
          <span className="field-label">Why this move?</span>
          <span className="lead">1 or 2 sentences, before you see the result.</span>
          <textarea rows={3} maxLength={1000} value={why} onFocus={() => keepAboveKeyboard(form.current)}onChange={(event) => setWhy(event.target.value)} />
        </label>
        <button type="submit" className="button-main" disabled={!ready}>
          Make the move
        </button>
      </div>
      {/* Room below the button, so the box can scroll to the top of a phone screen. */}
      <div aria-hidden="true" className="keyboard-room" />
    </form>
  );
}
