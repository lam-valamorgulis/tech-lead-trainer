"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { reviewItem } from "@/content";
import type { BundledScenario } from "@/content/bundle";
import type { OpponentType } from "@/content/schema";
import { creatureOf, MAX_TURNS, OPPONENT_HP } from "@/core/battle";
import { activeBefore, battleAfter, hpLevel, turnResultText, turnTimeline, type NameOf, type TurnTimeline } from "@/core/battle-screen";
import { BAR_NAMES, CREATURE_HP, progressV2, teamHp, usableMovesV2, type BattleV2, type PlayedTurnV2 } from "@/core/battle-v2";
import { EFFECTS, soundForDamage, type EffectName } from "@/core/effects";
import { OPPONENT_SPECIES } from "@/core/sprite";
import { scenarioTwist, threatTypeOf } from "@/core/twist";
import { CreatureSprite } from "./creature-sprite";
import { fxStyle } from "./effects";
import { GlossaryText } from "./glossary-text";
import { OPPONENT_LOOK } from "./opponent-look";
import { playSound } from "./sound";

const nameOf: NameOf = (id) => reviewItem(id)?.name ?? id;

/**
 * The learner's pick for one turn: a move (null when the team has none for this threat), the
 * Reason by its index in the content file (null on a turn with no Reasons), and their own words, or "".
 */
export type PlayChoice = (moveId: string | null, reasonIndex: number | null, note: string) => void;

/**
 * The Battle scene v2 (#103, design 9 rules 1 to 6, layout C "Panel" of the approved prototype).
 * The scene fills the screen: the opponent on top, your creature's back below it, an HP box on
 * each side. On your turn a panel slides up over the lower half, never over the creatures:
 * threat, Constraint, moves, then 3 Reasons. While a turn plays, the panel is closed and the
 * effects run as one CSS sequence. Then the result panel says what happened.
 */
export function BattleScene({
  scenario,
  battle,
  onPlay,
  onEnd,
}: {
  scenario: BundledScenario;
  battle: BattleV2;
  onPlay: PlayChoice;
  /** The learner leaves the scene after the last turn's result. */
  onEnd: () => void;
}) {
  // The turn whose result shows, or null while the learner picks.
  const [resultFor, setResultFor] = useState<number | null>(null);
  // A tap on the scene skips the rest of the effects (UI rule 12).
  const [skipped, setSkipped] = useState(false);
  const progress = progressV2(battle);
  const showing = resultFor ?? progress.turnNumber;

  const play: PlayChoice = (moveId, reasonIndex, note) => {
    playSound("select");
    setSkipped(false);
    setResultFor(battle.played.length + 1);
    onPlay(moveId, reasonIndex, note);
  };

  function next() {
    playSound("tap");
    if (progress.finished) onEnd();
    else setResultFor(null);
  }

  const result = resultFor !== null && battle.played.length >= resultFor ? resultFor : null;
  const timeline = result === null ? null : turnTimeline(battle.played[result - 1]);
  useTurnSounds(result === null ? null : battle.played[result - 1], skipped);
  const panelOpen = useResultPanel(result, timeline, skipped);

  return (
    <section className={skipped ? "battle-scene battle-skip" : "battle-scene"} aria-label={`Battle: ${scenario.name}`}>
      {/* A tap on the scene during the effects skips them. The panel below has its own buttons. */}
      <div className="battle-stage" onClick={() => result !== null && setSkipped(true)}>
        <Stage scenario={scenario} battle={battle} turnNumber={showing} result={result} timeline={timeline} />
      </div>
      {result === null && <ChoicePanel key={`turn-${showing}`} scenario={scenario} battle={battle} onPlay={play} />}
      {result !== null && panelOpen && (
        <ResultPanel
          key={`result-${result}`}
          scenario={scenario}
          battle={battle}
          turnNumber={result}
          finished={progress.finished && result === battle.played.length}
          onNext={next}
        />
      )}
    </section>
  );
}

/** True when no effect plays: the phone asks for reduced motion, or "Reduce effects" is on (UI rule 12). */
function effectsOff(): boolean {
  return document.documentElement.dataset.effects === "reduced" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Design 9 rule 2: the panel stays closed while a turn's effects run, then the result panel opens.
 * With no effects, or after a tap to skip, it opens at once. Only the timing is in code; the
 * effects themselves are CSS.
 */
function useResultPanel(result: number | null, timeline: TurnTimeline | null, skipped: boolean): boolean {
  const [openFor, setOpenFor] = useState<number | null>(null);
  const resultAt = timeline?.resultAt ?? 0;
  useEffect(() => {
    if (result === null) return;
    const timer = setTimeout(() => setOpenFor(result), skipped || effectsOff() ? 0 : resultAt);
    return () => clearTimeout(timer);
  }, [result, resultAt, skipped]);
  return result !== null && openFor === result;
}

/**
 * Plays each sound of a turn's result at the moment its effect and its text show (UI rule 13).
 * With no effects, the text is all on screen at once, so the sounds follow each other closely.
 */
function useTurnSounds(played: PlayedTurnV2 | null, skipped: boolean) {
  useEffect(() => {
    if (!played || skipped) return;
    const timeline = effectsOff() ? STILL_SOUNDS : turnTimeline(played);
    const timers = [setTimeout(() => playSound(soundForDamage(played.damage)), timeline.hitAt)];
    if (played.hpLost > 0) timers.push(setTimeout(() => playSound("hurt"), timeline.counterAt!));
    if (played.fainted.length > 0) timers.push(setTimeout(() => playSound("faint"), timeline.faintAt!));
    return () => timers.forEach(clearTimeout);
  }, [played, skipped]);
}

/** When the sounds play with no effects: one after the other, each one short. */
const STILL_SOUNDS = { hitAt: 0, counterAt: 300, faintAt: 600 };

/** The scene: both creatures on their pads, both HP boxes, and the effects of a played turn. */
function Stage({
  scenario,
  battle,
  turnNumber,
  result,
  timeline,
}: {
  scenario: BundledScenario;
  battle: BattleV2;
  turnNumber: number;
  result: number | null;
  timeline: TurnTimeline | null;
}) {
  const kind = battle.kind;
  const before = battleAfter(battle, turnNumber - 1);
  const after = battleAfter(battle, result ?? turnNumber - 1);
  const played = result === null ? null : battle.played[result - 1];
  // During a result, the scene shows the creature that took the hit, even when it Fainted.
  const mine = activeBefore(battle, turnNumber) ?? battle.team[battle.team.length - 1];
  const mineIndex = battle.team.indexOf(mine);
  const mineHpBefore = teamHp(before)[mineIndex];
  const mineHp = teamHp(after)[mineIndex];
  const opponentHpBefore = progressV2(before).opponentHp;
  const opponentHp = progressV2(after).opponentHp;
  const alive = teamHp(after).filter((hp) => hp > 0).length;
  const threatType: OpponentType = scenarioTwist(scenario) ? threatTypeOf(scenario, turnNumber - 1) : scenario.opponentType;
  const look = OPPONENT_LOOK[scenario.opponentType];
  // A new creature comes in at the start of the battle and after a Faint (design 7.3).
  const entering = result === null && (turnNumber === 1 || activeBefore(battle, turnNumber - 1) !== mine);
  const t = timeline;

  return (
    <div
      className={t?.counterAt != null ? "battle-shake fx fx-shake" : "battle-shake"}
      style={t?.counterAt != null ? fxStyle("shake", t.counterAt) : undefined}
    >
      <div className="battle-hp battle-hp-opponent">
        <p className="battle-hp-name">
          <span>{scenario.name}</span>
          {/* UI rule 7: the type is a colour, an icon and a word. */}
          <span className="battle-type" style={{ borderColor: look.color }}>
            <span aria-hidden="true">{look.icon}</span> {look.word}
          </span>
        </p>
        <HpBar label={BAR_NAMES[kind].opponent} hp={opponentHp} before={opponentHpBefore} max={OPPONENT_HP} dropAt={t?.hitAt ?? 0} />
        <span className="visually-hidden">
          Opponent {BAR_NAMES[kind].opponent} {opponentHp} of {OPPONENT_HP}
        </span>
      </div>

      <div className="battle-pad battle-pad-opponent" aria-hidden="true" />
      <div className="battle-opponent" data-testid="opponent">
        {/* Design 7.2: the threat's icon above the opponent's head. */}
        {result === null && (
          <span className="battle-threat-icon" aria-hidden="true">
            {OPPONENT_LOOK[threatType].icon}
          </span>
        )}
        <Effect name="faint" at={played && opponentHp === 0 && t ? t.resultAt : null} fainting>
          <Effect name="attack" at={t?.counterAt != null ? t.counterAt - EFFECTS.attack.durationMs : null} variant="down">
            <Effect name="flash" at={played && played.damage > 0 && t ? t.hitAt : null}>
              <div className="battle-idle">
                <CreatureSprite species={OPPONENT_SPECIES[scenario.opponentType]} side="front" />
              </div>
            </Effect>
          </Effect>
        </Effect>
        {played && t && (
          <Pop at={t.hitAt} className="battle-pop-opponent">
            {turnResultText({ battle, scenario, turnNumber: result!, nameOf }).damage}
          </Pop>
        )}
      </div>

      <div className="battle-pad battle-pad-mine" aria-hidden="true" />
      <div className="battle-mine" data-testid="my-creature">
        <Effect name="faint" at={played && played.fainted.includes(mine) && t?.faintAt != null ? t.faintAt : null} fainting>
          <Effect name="enter" at={entering ? 0 : null} key={`${mine}-${turnNumber}-${result}`}>
            <Effect name="attack" at={played?.moveId ? 0 : null} variant="up">
              <Effect name="flash" at={t?.counterAt ?? null}>
                <div className="battle-idle">
                  <CreatureSprite species={reviewItem(mine)?.sprite} side="back" />
                </div>
              </Effect>
            </Effect>
          </Effect>
        </Effect>
        {played && t?.counterAt != null && (
          <Pop at={t.counterAt} className="battle-pop-mine">
            −{played.hpLost} {BAR_NAMES[kind].team}
          </Pop>
        )}
        {played && t?.faintAt != null && played.fainted.length > 0 && (
          <Pop at={t.faintAt} className="battle-pop-faint">
            {played.fainted.map(nameOf).join(", ")} fainted!
          </Pop>
        )}
      </div>

      <div className="battle-hp battle-hp-mine">
        <p className="battle-hp-name">
          <span>{nameOf(mine)}</span>
          {battle.team.length > 1 && <span className="battle-team">Team {alive}/{battle.team.length}</span>}
        </p>
        <HpBar label={BAR_NAMES[kind].team} hp={mineHp} before={mineHpBefore} max={CREATURE_HP} dropAt={t?.counterAt ?? 0} />
        <span className="visually-hidden">
          {nameOf(mine)} {BAR_NAMES[kind].team} {mineHp} of {CREATURE_HP}
        </span>
      </div>
    </div>
  );
}

/**
 * One effect of the scene, as a wrapper with a CSS animation that starts `at` ms after the turn
 * was played. Null: no effect, a plain wrapper. `fainting` hides the wrapper when motion is
 * reduced, so a Fainted creature is gone at once instead of fading out.
 */
function Effect({
  name,
  at,
  variant,
  fainting = false,
  children,
}: {
  name: EffectName;
  at: number | null;
  variant?: "up" | "down";
  fainting?: boolean;
  children: ReactNode;
}) {
  if (at === null) return <div className="battle-fx">{children}</div>;
  const classes = ["battle-fx", "fx", `fx-${name}`, variant && `fx-${name}-${variant}`, fainting && "battle-fainting"];
  return (
    <div className={classes.filter(Boolean).join(" ")} style={fxStyle(name, at)}>
      {children}
    </div>
  );
}

/** A short text that rises over a creature, the twin of a sound. Only with motion: the result panel says it too. */
function Pop({ at, className, children }: { at: number; className: string; children: ReactNode }) {
  return (
    <span className={`battle-pop fx fx-rise ${className}`} style={fxStyle("rise", at)} aria-hidden="true">
      {children}
    </span>
  );
}

/** An HP bar of boxes. The boxes lost this turn empty when the hit lands. */
function HpBar({ label, hp, before, max, dropAt }: { label: string; hp: number; before: number; max: number; dropAt: number }) {
  return (
    <div className={`battle-bar battle-bar-${hpLevel(hp, max)}`} aria-hidden="true">
      <span className="battle-bar-label">{label}</span>
      {Array.from({ length: max }, (_, i) => {
        if (i < hp) return <b key={i} className="battle-bar-on" />;
        if (i < before) return <b key={i} className="battle-bar-lost fx fx-drop" style={{ animationDelay: `${dropAt}ms` }} />;
        return <b key={i} />;
      })}
      <em>
        {hp}/{max}
      </em>
    </div>
  );
}

/** Turn start: the threat and the Constraint, then the moves, then the 3 Reasons (UI rules 3 and 6). */
function ChoicePanel({
  scenario,
  battle,
  onPlay,
}: {
  scenario: BundledScenario;
  battle: BattleV2;
  onPlay: PlayChoice;
}) {
  const turnNumber = battle.played.length + 1;
  const turn = scenario.turns[turnNumber - 1];
  const moves = usableMovesV2(battle);
  const [picked, setPicked] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  // A fast double tap plays the turn once.
  const done = useRef(false);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [picked]);

  function pickMove(moveId: string | null) {
    if (done.current) return;
    if (moveId === null || !turn.reasons) {
      done.current = true;
      onPlay(moveId, null, note);
      return;
    }
    playSound("select");
    setPicked(moveId);
  }

  function pickReason(index: number) {
    if (done.current) return;
    done.current = true;
    onPlay(picked, index, note);
  }

  if (picked !== null && turn.reasons) {
    // Its own key: a new panel starts at its top, even when the move list was scrolled.
    return (
      <Panel key="reasons">
        <h2 ref={heading} tabIndex={-1} className="battle-heading">
          Why {nameOf(picked)}?
        </h2>
        <p className="battle-hint">Pick the Reason before you see the result. A wrong Reason makes the hit weaker.</p>
        {noteOpen ? (
          <label className="field">
            <span className="field-label">Your own words (optional)</span>
            <textarea
              rows={2}
              maxLength={1000}
              value={note}
              onFocus={(event) => boxToPanelTop(event.currentTarget)}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
        ) : (
          <button type="button" className="button-quiet battle-small" onClick={() => setNoteOpen(true)}>
            Add your own words (optional)
          </button>
        )}
        <div className="battle-choices" role="group" aria-label="Reasons">
          {turn.reasons.map((reason, index) => (
            <button key={index} type="button" className="battle-choice" onClick={() => pickReason(index)}>
              {reason.text}
            </button>
          ))}
        </div>
        <button type="button" className="button-quiet battle-small" onClick={() => setPicked(null)}>
          Back to the moves
        </button>
      </Panel>
    );
  }

  return (
    <Panel key="moves" slide>
      <h2 ref={heading} tabIndex={-1} className="battle-heading">
        Turn {turnNumber} of {MAX_TURNS}
      </h2>
      {/* A two-type opponent shows the type that attacks, before the threat (#36). */}
      {scenarioTwist(scenario) && <AttackType type={threatTypeOf(scenario, turnNumber - 1)} />}
      {/* UI rule 3: the threat and the Constraint come before the moves. */}
      <div className="battle-threat">
        <span className="battle-label">Threat</span>
        <p>
          <GlossaryText text={turn.threat} />
        </p>
      </div>
      {turn.constraint && (
        <div className="battle-constraint">
          <span className="battle-label">Constraint</span>
          <p>
            <GlossaryText text={turn.constraint} />
          </p>
        </div>
      )}
      <div className="battle-choices" role="group" aria-label="Your move">
        {moves.map((moveId) => (
          <button key={moveId} type="button" className="battle-choice" onClick={() => pickMove(moveId)}>
            <span className="battle-choice-name">{nameOf(moveId)}</span> <small>({nameOf(creatureOf(moveId))})</small>
          </button>
        ))}
        {moves.length === 0 && (
          <button type="button" className="battle-choice" onClick={() => pickMove(null)}>
            None of my moves fits this threat
          </button>
        )}
      </div>
    </Panel>
  );
}

/**
 * The iPhone keyboard covers the bottom of the screen. The box moves to the top of the panel,
 * so it stays above the keyboard. Only the panel scrolls: the scene itself never moves.
 */
function boxToPanelTop(box: HTMLTextAreaElement) {
  const panel = box.closest<HTMLElement>(".battle-panel");
  const align = () => panel?.scrollTo({ top: box.offsetTop - 8 });
  align();
  setTimeout(align, 400);
}

function AttackType({ type }: { type: OpponentType }) {
  const look = OPPONENT_LOOK[type];
  return (
    <p className="opponent-type" style={{ borderColor: look.color }}>
      <span aria-hidden="true" className="opponent-icon">
        {look.icon}
      </span>
      This turn attacks with: {look.word}
    </p>
  );
}

/**
 * After the effects: the damage, "You chose X. Y happens.", the right Reason when yours was wrong,
 * and what the opponent did back (UI rules 4 and 5). It opens when the effects are done.
 */
function ResultPanel({
  scenario,
  battle,
  turnNumber,
  finished,
  onNext,
}: {
  scenario: BundledScenario;
  battle: BattleV2;
  turnNumber: number;
  finished: boolean;
  onNext: () => void;
}) {
  const text = turnResultText({ battle, scenario, turnNumber, nameOf });
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <Panel slide>
      <h2 ref={heading} tabIndex={-1} className="battle-heading">
        Turn {turnNumber} result
      </h2>
      <p className="battle-damage">{text.damage}</p>
      <p>
        <GlossaryText text={text.choice} />
      </p>
      {text.reason && <p className="battle-wrong">{text.reason}</p>}
      <p>{text.hitBack}</p>
      <button type="button" className="button-main" onClick={onNext}>
        {finished ? "See how it ended" : "Next turn"}
      </button>
    </Panel>
  );
}

/** The panel over the lower half of the scene: at most half the screen, never over the creatures. */
function Panel({ slide = false, children }: { slide?: boolean; children: ReactNode }) {
  const style: CSSProperties | undefined = slide ? fxStyle("slide") : undefined;
  // The slot slides and the panel inside it scrolls. One element doing both can paint in the wrong place.
  return (
    <div className={slide ? "battle-slot fx fx-slide" : "battle-slot"} style={style}>
      <div className="battle-panel" data-testid="battle-panel">
        {children}
      </div>
    </div>
  );
}
