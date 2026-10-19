"use client";

import { useEffect, useRef, useState } from "react";
import { currentTown, reviewItem } from "@/content";
import { nextCatch, type CatchItem } from "@/core/catch";
import { dueReviews, reviewStates } from "@/core/review";
import type { ThirtyDayRate } from "@/core/day";
import { loadCatchRecords } from "@/lib/catch-log";
import { loadReviewRecords } from "@/lib/review-log";
import { deviceLabel } from "@/lib/events/device";
import { postEvents } from "@/lib/events/post-events";
import type { SessionEvent } from "@/lib/events/write-events";
import { currentLearningDay, formatRate, loadThirtyDayRate } from "@/lib/learning-log";
import { browserClient } from "@/lib/supabase/browser";
import { CatchFlow } from "./catch-flow";
import { ReviewFlow, type DueReview } from "./review-flow";

export type CommittedMinutes = SessionEvent["committedMinutes"];

/** Active time is saved every 60 seconds (design 12.2). */
const SAVE_EVERY_MS = 60_000;

type Summary = { saved: boolean; rate: ThirtyDayRate | null };

export function SessionScreen({ committedMinutes, onDone }: { committedMinutes: CommittedMinutes; onDone: () => void }) {
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
          Learned <strong>{summary.rate ? formatRate(summary.rate) : "…"}</strong>
          {!summary.rate && " (could not load)"}
        </p>
        <p className="lead">A day counts when you learn for 3 minutes or more.</p>
        <button type="button" className="button-main" onClick={onDone}>
          Back home
        </button>
      </section>
    );
  }
  return <RunningSession committedMinutes={committedMinutes} onFinished={setSummary} />;
}

/** Counts and saves active time while it is on screen. Unmounting it stops both timers. */
function RunningSession({
  committedMinutes,
  onFinished,
}: {
  committedMinutes: CommittedMinutes;
  onFinished: (summary: Summary) => void;
}) {
  const [activeSeconds, setActiveSeconds] = useState(0);
  const seconds = useRef(0);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [finishing, setFinishing] = useState(false);
  const plan = useTodaysPlan(committedMinutes);
  const working = plan.state === "reviews" || plan.state === "catch";

  function snapshot(): SessionEvent {
    return {
      type: "session",
      clientEventId: crypto.randomUUID(),
      sessionId,
      occurredAt: new Date().toISOString(),
      committedMinutes,
      activeSeconds: seconds.current,
      device: deviceLabel(),
    };
  }

  useEffect(() => {
    // Time in the background does not count.
    const tick = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      seconds.current += 1;
      setActiveSeconds(seconds.current);
    }, 1000);
    // Saves at the start, every 60 seconds, and when the app goes to the background.
    void postEvents([snapshot()]);
    const save = setInterval(() => void postEvents([snapshot()]), SAVE_EVERY_MS);
    const onHide = () => {
      if (document.visibilityState === "hidden") void postEvents([snapshot()], { keepalive: true });
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(tick);
      clearInterval(save);
      document.removeEventListener("visibilitychange", onHide);
    };
    // The session starts once, when this screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finish() {
    setFinishing(true);
    const saved = await postEvents([snapshot()]);
    const rate = await loadThirtyDayRate(browserClient()).catch(() => null);
    onFinished({ saved, rate });
  }

  return (
    <div className="stack">
      <section className="stack" aria-labelledby="session-title">
        <h2 id="session-title">{committedMinutes}-minute session</h2>
        <p>Active time: {formatMinutes(activeSeconds)}</p>
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

type TodaysWork = { today: string; reviews: DueReview[]; catchItem: CatchItem | null };

type TodaysPlan =
  | { state: "loading" | "done" | "nothing" | "failed" }
  | { state: "reviews"; today: string; reviews: DueReview[]; next: () => void }
  | { state: "catch"; item: CatchItem; next: () => void };

const PLAN_MESSAGES: Record<Exclude<TodaysPlan["state"], "reviews" | "catch">, string> = {
  loading: "Loading today's plan…",
  done: "All done for today. Tap Finish.",
  nothing: "Nothing is due today. Tap Finish, or stay a little longer.",
  failed: "We could not load today's plan. Check your connection.",
};

/**
 * Today's steps (design 3): reviews first, at most 8. Then, on a 15- or 45-minute day,
 * one new creature or move.
 */
function useTodaysPlan(committedMinutes: CommittedMinutes): TodaysPlan {
  const [work, setWork] = useState<TodaysWork | null>(null);
  const [phase, setPhase] = useState<"reviews" | "catch" | "done">("reviews");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const client = browserClient();
    (async () => {
      const today = await currentLearningDay(client);
      const [catches, reviews] = await Promise.all([loadCatchRecords(client, today), loadReviewRecords(client, today)]);
      const due = dueReviews({
        states: reviewStates(catches, reviews),
        reviews,
        today,
        isReviewable: (id) => reviewItem(id) !== undefined,
      }).map((state) => ({ state, item: reviewItem(state.itemId)! }));
      const town = currentTown();
      const catchItem = town ? nextCatch({ town, records: catches, today, committedMinutes }) : null;
      return { today, reviews: due, catchItem };
    })()
      .then((value) => !cancelled && setWork(value))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [committedMinutes]);

  if (failed) return { state: "failed" };
  if (!work) return { state: "loading" };
  if (phase === "reviews" && work.reviews.length > 0) {
    return { state: "reviews", today: work.today, reviews: work.reviews, next: () => setPhase("catch") };
  }
  if (phase !== "done" && work.catchItem) {
    return { state: "catch", item: work.catchItem, next: () => setPhase("done") };
  }
  if (work.reviews.length === 0 && !work.catchItem) return { state: "nothing" };
  return { state: "done" };
}

function formatMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}
