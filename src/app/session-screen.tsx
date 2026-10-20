"use client";

import { useEffect, useState } from "react";
import { confusablePairs, currentTown, reviewItem, scenarioName, weekendBoss } from "@/content";
import { battleRechecks, bestMoveRates, formatBestMoveRate, nextBattle, type BattleOffer, type BestMoveRate } from "@/core/battle";
import { nextCatch, type CatchItem } from "@/core/catch";
import { teachBackFor } from "@/core/discuss";
import { backlogPaused, DAILY_REVIEW_LIMIT, dueReviews, reviewStates } from "@/core/review";
import type { ThirtyDayRate } from "@/core/day";
import { loadBattleHistory } from "@/lib/battle-log";
import { loadCatchRecords } from "@/lib/catch-log";
import { loadReviewRecords } from "@/lib/review-log";
import { postEvents } from "@/lib/events/post-events";
import type { SessionEvent } from "@/lib/events/write-events";
import { formatWeekMinutes } from "@/core/week";
import { currentLearningDay, formatRate, loadSessionNumbers } from "@/lib/learning-log";
import { browserClient } from "@/lib/supabase/browser";
import { BattleFlow } from "./battle-flow";
import { CatchFlow } from "./catch-flow";
import { ReviewFlow, type DueReview } from "./review-flow";
import { useActiveTime } from "./use-active-time";
import { extraTime, type ExtraTime } from "@/core/extra-time";
import { loadReadingRecords } from "@/lib/reading-log";
import { ExtraTimeFlow } from "./extra-time-flow";

export type CommittedMinutes = SessionEvent["committedMinutes"];

/** The learning number of the current town (design 7): how often the learner picked the best move. */
type BestMoves = { townName: string; rate: BestMoveRate };

type Summary = { saved: boolean; numbers: { rate: ThirtyDayRate; weekMinutes: number } | null; bestMoves: BestMoves | null };

export function SessionScreen({
  committedMinutes,
  programStartDate,
  onDone,
}: {
  committedMinutes: CommittedMinutes;
  /** Day 1 of the learner's program. It decides their town. */
  programStartDate: string;
  onDone: () => void;
}) {
  const [summary, setSummary] = useState<Summary | null>(null);

  if (summary) {
    return (
      <section className="stack" aria-labelledby="summary-title">
        <h2 id="summary-title">{summary.saved ? "Session saved" : "Session not saved yet"}</h2>
        {!summary.saved && (
          <p role="alert" className="error">
            We could not reach the server. The app tries again the next time you learn.
          </p>
        )}
        <p>
          Learned <strong>{summary.numbers ? formatRate(summary.numbers.rate) : "…"}</strong>
          {!summary.numbers && " (could not load)"}
        </p>
        <p className="lead">A day counts when you learn for 3 minutes or more.</p>
        {summary.numbers && (
          <p>
            This week: <strong>{formatWeekMinutes(summary.numbers.weekMinutes)}</strong>
          </p>
        )}
        {summary.bestMoves && (
          <>
            <p>
              Best moves in {summary.bestMoves.townName}: {formatBestMoveRate(summary.bestMoves.rate)}
            </p>
            <p className="lead">Your learning number: how often you picked the best move in a battle.</p>
          </>
        )}
        <button type="button" className="button-main" onClick={onDone}>
          Back home
        </button>
      </section>
    );
  }
  return <RunningSession committedMinutes={committedMinutes} programStartDate={programStartDate} onFinished={setSummary} />;
}

/** Counts and saves active time while it is on screen. Unmounting it stops both timers. */
function RunningSession({
  committedMinutes,
  programStartDate,
  onFinished,
}: {
  committedMinutes: CommittedMinutes;
  programStartDate: string;
  onFinished: (summary: Summary) => void;
}) {
  const [sessionId] = useState(() => crypto.randomUUID());
  const { activeSeconds, snapshot } = useActiveTime(sessionId, committedMinutes);
  const [finishing, setFinishing] = useState(false);
  const { plan, paused } = useTodaysPlan(committedMinutes, programStartDate);
  const working = plan.state === "reviews" || plan.state === "catch" || plan.state === "battle" || plan.state === "extra";

  async function finish() {
    setFinishing(true);
    const saved = await postEvents([snapshot()]);
    const [numbers, bestMoves] = await Promise.all([
      loadSessionNumbers(browserClient()).catch(() => null),
      loadBestMoves(programStartDate).catch(() => null),
    ]);
    onFinished({ saved, numbers, bestMoves });
  }

  return (
    <div className="stack">
      <section className="stack" aria-labelledby="session-title">
        <h2 id="session-title">{committedMinutes}-minute session</h2>
        <p>Active time: {formatMinutes(activeSeconds)}</p>
        {paused && (
          <p className="notice" role="status">
            {PAUSED_MESSAGE}
          </p>
        )}
      </section>
      {plan.state === "reviews" && (
        <ReviewFlow
          reviews={plan.reviews}
          today={plan.today}
          sessionId={sessionId}
          canType={committedMinutes !== 3}
          onDone={plan.next}
        />
      )}
      {plan.state === "catch" && <CatchFlow item={plan.item} sessionId={sessionId} onDone={plan.next} />}
      {plan.state === "battle" && <BattleFlow offer={plan.offer} sessionId={sessionId} onDone={plan.next} />}
      {plan.state === "extra" && (
        <ExtraTimeFlow extra={plan.extra} townId={plan.townId} sessionId={sessionId} onDone={plan.next} />
      )}
      {!working && <p className="lead">{PLAN_MESSAGES[plan.state]}</p>}
      {/* Any session can end at any time. 3 minutes still counts as a learned day. */}
      <button
        type="button"
        className={working ? "button-quiet" : "button-main"}
        disabled={finishing}
        onClick={() => void finish()}
      >
        Finish
      </button>
    </div>
  );
}

type TodaysWork = {
  today: string;
  reviews: DueReview[];
  catchItem: CatchItem | null;
  battle: BattleOffer | null;
  /** Extra time on a 45-minute day, and the town it belongs to. */
  extra: ExtraTime | null;
  townId: string | null;
  paused: boolean;
};

type Phase = "reviews" | "catch" | "battle" | "extra" | "done";

type TodaysPlan =
  | { state: "loading" | "done" | "nothing" | "failed" }
  | { state: "reviews"; today: string; reviews: DueReview[]; next: () => void }
  | { state: "catch"; item: CatchItem; next: () => void }
  | { state: "battle"; offer: BattleOffer; next: () => void }
  | { state: "extra"; extra: ExtraTime; townId: string; next: () => void };

/** The backlog guard explains itself in one sentence (ticket #8). */
const PAUSED_MESSAGE = `New catches wait until ${DAILY_REVIEW_LIMIT} or fewer reviews are due, so your reviews never pile up.`;

const PLAN_MESSAGES: Record<Exclude<TodaysPlan["state"], "reviews" | "catch" | "battle" | "extra">, string> = {
  loading: "Loading today's plan…",
  done: "All done for today. Tap Finish.",
  nothing: "Nothing is due today. Tap Finish, or stay a little longer.",
  failed: "We could not load today's plan. Check your connection.",
};

/**
 * Today's steps (design 3): reviews first, at most 8. Then, on a 15- or 45-minute day,
 * one new creature or move, and one battle. A 45-minute day then adds extra time.
 */
function useTodaysPlan(
  committedMinutes: CommittedMinutes,
  programStartDate: string,
): { plan: TodaysPlan; paused: boolean } {
  const [work, setWork] = useState<TodaysWork | null>(null);
  const [phase, setPhase] = useState<Phase>("reviews");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const client = browserClient();
    (async () => {
      const today = await currentLearningDay(client);
      const [catches, reviews, history, readings] = await Promise.all([
        loadCatchRecords(client, today),
        loadReviewRecords(client, today),
        loadBattleHistory(client, today),
        loadReadingRecords(client, today),
      ]);
      const battles = history.battles;
      // A lost battle and a model answer with missing key points bring moves back tomorrow.
      const rechecks = battleRechecks(history);
      const isReviewable = (id: string) => reviewItem(id) !== undefined;
      const states = reviewStates(catches, reviews, rechecks);
      const due = dueReviews({ states, reviews, today, isReviewable, pairs: confusablePairs }).map(
        (state): DueReview => {
          // Design 10: the teach-back of a battle comes back at the next review of its items.
          const teachBack = teachBackFor(state.itemId, history.teachBacks, reviews);
          return {
            state,
            item: reviewItem(state.itemId)!,
            mixedWith: state.mixedWith && reviewItem(state.mixedWith)?.name,
            teachBack: teachBack && {
              scenarioName: scenarioName(teachBack.scenarioId) ?? teachBack.scenarioId,
              sentences: teachBack.sentences,
            },
          };
        },
      );
      const town = currentTown(programStartDate, today);
      const paused = backlogPaused(catches, reviews, today, isReviewable, rechecks);
      const catchItem = town ? nextCatch({ town, records: catches, today, committedMinutes, paused }) : null;
      // The battle uses the creatures caught before today's session.
      const battle = town ? nextBattle({ town, catches, battles, today, committedMinutes }) : null;
      const extra = town
        ? extraTime({ town, catches, battles, readings, today, committedMinutes, hasBoss: weekendBoss(town.id) !== undefined })
        : null;
      return { today, reviews: due, catchItem, battle, extra, townId: town?.id ?? null, paused };
    })()
      .then((value) => !cancelled && setWork(value))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [committedMinutes, programStartDate]);

  return { plan: planStep(work, phase, failed, setPhase), paused: work?.paused ?? false };
}

/** Where today's work is: reviews first, then the catch, the battle, extra time on a 45-minute day, then done. */
function planStep(
  work: TodaysWork | null,
  phase: Phase,
  failed: boolean,
  setPhase: (phase: Phase) => void,
): TodaysPlan {
  if (failed) return { state: "failed" };
  if (!work) return { state: "loading" };
  if (phase === "reviews" && work.reviews.length > 0) {
    return { state: "reviews", today: work.today, reviews: work.reviews, next: () => setPhase("catch") };
  }
  if ((phase === "reviews" || phase === "catch") && work.catchItem) {
    return { state: "catch", item: work.catchItem, next: () => setPhase("battle") };
  }
  if (phase !== "done" && phase !== "extra" && work.battle) {
    return { state: "battle", offer: work.battle, next: () => setPhase("extra") };
  }
  if (phase !== "done" && work.extra && work.townId) {
    return { state: "extra", extra: work.extra, townId: work.townId, next: () => setPhase("done") };
  }
  if (work.reviews.length === 0 && !work.catchItem && !work.battle && !work.extra) return { state: "nothing" };
  return { state: "done" };
}

/** The best-move rate of the current town, from every turn the learner played there. */
async function loadBestMoves(programStartDate: string): Promise<BestMoves | null> {
  const client = browserClient();
  const today = await currentLearningDay(client);
  const town = currentTown(programStartDate, today);
  if (!town) return null;
  const history = await loadBattleHistory(client, today);
  return { townName: town.name, rate: bestMoveRates(history.turns).get(town.id) ?? { bestMoves: 0, turns: 0 } };
}

function formatMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}
