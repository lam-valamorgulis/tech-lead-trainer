"use client";

import { useEffect, useRef, useState } from "react";
import { currentTown } from "@/content";
import { nextCatch, type CatchItem } from "@/core/catch";
import type { ThirtyDayRate } from "@/core/day";
import { loadCatchRecords } from "@/lib/catch-log";
import { deviceLabel } from "@/lib/events/device";
import { postEvents } from "@/lib/events/post-events";
import type { SessionEvent } from "@/lib/events/write-events";
import { currentLearningDay, formatRate, loadThirtyDayRate } from "@/lib/learning-log";
import { browserClient } from "@/lib/supabase/browser";
import { CatchFlow } from "./catch-flow";

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
  const catchItem = useTodaysCatch(committedMinutes);

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
      {catchItem.state === "ready" ? (
        <CatchFlow item={catchItem.item} sessionId={sessionId} onDone={catchItem.done} />
      ) : (
        <p className="lead">{CATCH_MESSAGES[catchItem.state]}</p>
      )}
      {/* Any session can end at any time. 3 minutes still counts as a learned day. */}
      <button
        type="button"
        className={catchItem.state === "ready" ? "button-quiet" : "button-main"}
        disabled={finishing}
        onClick={() => void finish()}
      >
        Finish
      </button>
    </div>
  );
}

type TodaysCatch =
  | { state: "loading" | "none" | "done" | "failed" }
  | { state: "ready"; item: CatchItem; done: () => void };

const CATCH_MESSAGES: Record<Exclude<TodaysCatch["state"], "ready">, string> = {
  loading: "Loading today's catch…",
  none: "No new catch today. Reviews arrive in the next update.",
  done: "Today's catch is done. Reviews arrive in the next update.",
  failed: "We could not load today's catch. Check your connection.",
};

/** One new creature or move on a 15- or 45-minute day (design 3). */
function useTodaysCatch(committedMinutes: CommittedMinutes): TodaysCatch {
  // A 3-minute day is reviews only.
  const offersCatch = committedMinutes !== 3 && currentTown() !== undefined;
  const [state, setState] = useState<TodaysCatch>({ state: offersCatch ? "loading" : "none" });
  useEffect(() => {
    const town = currentTown();
    if (!offersCatch || !town) return;
    let cancelled = false;
    const client = browserClient();
    currentLearningDay(client)
      .then(async (today) => [today, await loadCatchRecords(client, today)] as const)
      .then(([today, records]) => {
        if (cancelled) return;
        const item = nextCatch({ town, records, today, committedMinutes });
        setState(item ? { state: "ready", item, done: () => setState({ state: "done" }) } : { state: "none" });
      })
      .catch(() => !cancelled && setState({ state: "failed" }));
    return () => {
      cancelled = true;
    };
  }, [committedMinutes, offersCatch]);
  return state;
}

function formatMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}
