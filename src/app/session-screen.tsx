"use client";

import { useEffect, useRef, useState } from "react";
import type { ThirtyDayRate } from "@/core/day";
import { deviceLabel } from "@/lib/events/device";
import { postEvents } from "@/lib/events/post-events";
import type { SessionEvent } from "@/lib/events/write-events";
import { formatRate, loadThirtyDayRate } from "@/lib/learning-log";
import { browserClient } from "@/lib/supabase/browser";

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
  const sessionId = useRef<string>(null);
  const [finishing, setFinishing] = useState(false);

  function snapshot(): SessionEvent {
    sessionId.current ??= crypto.randomUUID();
    return {
      type: "session",
      clientEventId: crypto.randomUUID(),
      sessionId: sessionId.current,
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
    <section className="stack" aria-labelledby="session-title">
      <h2 id="session-title">{committedMinutes}-minute session</h2>
      <p>Active time: {formatMinutes(activeSeconds)}</p>
      <p className="lead">Reviews and catches arrive in the next updates.</p>
      <button type="button" className="button-main" disabled={finishing} onClick={() => void finish()}>
        Finish
      </button>
    </section>
  );
}

function formatMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}
