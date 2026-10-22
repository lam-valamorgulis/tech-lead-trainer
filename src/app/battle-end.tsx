"use client";

import { useEffect, useRef, useState } from "react";
import { itemCard, reviewItem } from "@/content";
import type { BundledScenario } from "@/content/bundle";
import { endChecks, endView, toggleTick, type EndTurn, type Ticks } from "@/core/battle-end";
import type { BattleV2 } from "@/core/battle-v2";
import { discussPackage, teachBackItems } from "@/core/discuss";
import { postEvents, postEventsOnLeave } from "@/lib/events/post-events";
import type { BattleEventFields } from "@/lib/events/write-events";
import { browserClient } from "@/lib/supabase/browser";
import { DiscussInClaude } from "./discuss-in-claude";
import { Fx } from "./effects";
import { GlossaryText } from "./glossary-text";

const nameOf = (id: string) => reviewItem(id)?.name ?? id;

/**
 * The end-of-Battle screen (design 7.4, ticket #104, the review screen of the approved
 * prototype). One screen: the best moves, the right Reasons and the result, then each turn with
 * its threat, your move, the best move, your Reason, the model answer and its 3 key points to
 * tick. Then "Discuss in Claude" and the teach-back. It reads the bar names of the battle's kind,
 * so every kind of battle uses it.
 *
 * The ticks are saved once, one check per turn: on "Discuss in Claude", on Continue, or when the
 * learner leaves (the page closes, the screen closes as Finish does, or the page hides with at
 * least one tick). A turn left unticked is saved with no ticks, so its best move comes back in
 * tomorrow's reviews. The ticks change only the review schedule, never the result.
 */
export function BattleEnd({
  scenario,
  battle,
  notes,
  eventFields,
  onDone,
}: {
  scenario: BundledScenario;
  /** A finished battle. */
  battle: BattleV2;
  /** The learner's own words on each turn, when they typed some. */
  notes: Record<number, string>;
  eventFields: () => BattleEventFields;
  onDone: (won: boolean) => void;
}) {
  const [view] = useState(() => endView(battle, nameOf));
  const won = view.result === "won";
  const [ticks, setTicks] = useState<Ticks>({});
  const [saved, setSaved] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  const token = useSessionToken();

  // The ticks are saved once (one check per turn), so a ref stops a second save at once.
  const savedOnce = useRef(false);
  /** `leaving`: the page hides or closes, so the request must start now, inside the event. */
  function saveTicks(current: Ticks, leaving = false) {
    if (savedOnce.current) return;
    savedOnce.current = true;
    setSaved(true);
    const events = endChecks(battle, current).map((check) => ({
      type: "battle-check" as const,
      clientEventId: crypto.randomUUID(),
      ...eventFields(),
      ...check,
    }));
    if (leaving) postEventsOnLeave(events, token.current);
    else void postEvents(events);
  }
  useSaveOnLeave(ticks, saveTicks);

  // The scene was over this screen a moment ago. On a slow device the first focus can come
  // before the page shows again, so it tries once more on the next frame.
  useEffect(() => {
    const target = heading.current;
    if (!target) return;
    target.focus();
    const frame = requestAnimationFrame(() => {
      if (document.activeElement !== target) target.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  /** Runs inside the "Discuss in Claude" tap: it saves the ticks, then packs them. */
  function pack(): string {
    saveTicks(ticks);
    return discussPackage({ scenario, battle, notes, ticks, itemOf: itemCard });
  }

  function done() {
    saveTicks(ticks);
    onDone(won);
  }

  return (
    <section className="stack battle-end" aria-labelledby="end-title">
      <p className="pixel-label battle-end-label">Review · {scenario.name}</p>
      <h2 id="end-title" ref={heading} tabIndex={-1}>
        {/* A loss gets a soft sound and no movement. */}
        {won ? (
          <Fx effect="pop" sound="win">
            You won!
          </Fx>
        ) : (
          <Fx sound="lose">You lost this time</Fx>
        )}
      </h2>
      <p>{view.line}</p>
      <ul className="battle-end-stats" aria-label="Your battle in numbers">
        <li>
          <b>
            {view.bestMoves.count}/{view.bestMoves.of}
          </b>
          <span>best moves</span>
        </li>
        {view.rightReasons.of > 0 && (
          <li>
            <b>
              {view.rightReasons.count}/{view.rightReasons.of}
            </b>
            <span>right Reasons</span>
          </li>
        )}
        <li>
          <b>{won ? "Won" : "Lost"}</b>
          <span>result</span>
        </li>
      </ul>
      <p className="lead">
        Tick the key points you could say yourself.
        {view.ticksFeedReviews && " A point you did not tick comes back in tomorrow’s reviews."} Your ticks never change the result.
      </p>
      {view.turns.map((turn) => (
        <TurnReview
          key={turn.turnNumber}
          turn={turn}
          ticked={ticks[turn.turnNumber] ?? []}
          locked={saved}
          onToggle={(point) => setTicks((before) => toggleTick(before, turn.turnNumber, point))}
        />
      ))}
      {/* Always in the page, so a screen reader reads the words when they appear. */}
      <p role="status">{saved && "Your ticks are saved. They change only your review schedule."}</p>
      <h3>Keep learning</h3>
      <DiscussInClaude pack={pack} teachBackItems={teachBackItems(battle)} eventFields={eventFields} onDone={done} />
    </section>
  );
}

/** One turn of the review: what happened, the model answer, and its key points to tick. */
function TurnReview({
  turn,
  ticked,
  locked,
  onToggle,
}: {
  turn: EndTurn;
  ticked: number[];
  locked: boolean;
  onToggle: (point: number) => void;
}) {
  const titleId = `end-turn-${turn.turnNumber}`;
  return (
    <article className="battle-end-turn stack" aria-labelledby={titleId}>
      <h3 id={titleId}>Turn {turn.turnNumber}</h3>
      <p>
        <GlossaryText text={turn.threat} />
      </p>
      {turn.constraint && (
        <p>
          <span className="pixel-label battle-end-tag">Constraint</span> <GlossaryText text={turn.constraint} />
        </p>
      )}
      {/* UI rule 7: each chip has its words, never a colour alone. */}
      <p>
        <span className={turn.isBest ? "battle-chip battle-chip-ok" : "battle-chip battle-chip-no"}>
          {turn.isBest ? "Best move" : "Not best"}
        </span>{" "}
        You: <b>{turn.move ?? "no move fit this threat"}</b>
        {!turn.isBest && (
          <>
            {" "}
            · Best: <b>{turn.bestMove}</b>
          </>
        )}
      </p>
      {turn.reason !== null && (
        <p>
          <span className={turn.reasonCorrect ? "battle-chip battle-chip-ok" : "battle-chip battle-chip-no"}>
            {turn.reasonCorrect ? "Right Reason" : "Wrong Reason"}
          </span>{" "}
          Your Reason: “{turn.reason}”
          {turn.rightReason && <> The right one: “{turn.rightReason}”</>}
        </p>
      )}
      <div className="battle-end-answer">
        <span className="pixel-label battle-end-tag">Model answer</span>
        <p>
          <GlossaryText text={turn.modelAnswer} />
        </p>
      </div>
      <fieldset className="choices">
        <legend>
          Tick what you could say yourself<span className="visually-hidden"> on turn {turn.turnNumber}</span>
        </legend>
        {turn.keyPoints.map((point, index) => (
          <label key={index} className="choice">
            <input type="checkbox" checked={ticked.includes(index + 1)} disabled={locked} onChange={() => onToggle(index + 1)} />
            <span>{point}</span>
          </label>
        ))}
      </fieldset>
    </article>
  );
}

/**
 * The session token, read while the screen is open, so a save as the page closes needs no wait
 * for it. It follows a token refresh.
 */
function useSessionToken() {
  const token = useRef<string | null>(null);
  useEffect(() => {
    const auth = browserClient().auth;
    void auth.getSession().then(({ data }) => {
      token.current ??= data.session?.access_token ?? null;
    });
    const { data } = auth.onAuthStateChange((_event, session) => {
      token.current = session?.access_token ?? null;
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return token;
}

/**
 * Saves the ticks when the learner leaves without a tap:
 * - the page closes ("pagehide"), or the screen closes, as Finish does: always;
 * - the page hides, for example when the iPhone locks: only when at least one box is ticked.
 *   iPhone Safari may close a hidden tab and never say so, so ticks the learner chose are saved
 *   at once. With no tick, nothing is saved, so the boxes do not lock while the learner is away.
 */
function useSaveOnLeave(ticks: Ticks, save: (ticks: Ticks, leaving?: boolean) => void) {
  // The latest ticks and save function, so the listeners never go stale.
  const latest = useRef({ ticks, save });
  useEffect(() => {
    latest.current = { ticks, save };
  });
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const onLeave = () => latest.current.save(latest.current.ticks, true);
    const onHide = () => {
      const ticked = Object.values(latest.current.ticks).some((points) => points.length > 0);
      if (document.visibilityState === "hidden" && ticked) onLeave();
    };
    window.addEventListener("pagehide", onLeave);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      document.removeEventListener("visibilitychange", onHide);
      mounted.current = false;
      // React's development check mounts every screen twice. Only a real close saves: the screen
      // is still gone a moment later.
      setTimeout(() => {
        if (!mounted.current) latest.current.save(latest.current.ticks);
      }, 0);
    };
  }, []);
}
