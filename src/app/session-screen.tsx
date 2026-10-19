"use client";

import { useEffect, useRef, useState } from "react";
import type { ThirtyDayRate } from "@/core/day";
import { deviceLabel } from "@/lib/events/device";
import { postEvents } from "@/lib/events/post-events";
import type { SessionEvent } from "@/lib/events/write-events";
import { formatRate, loadThirtyDayRate } from "@/lib/learning-log";
import type { Profile } from "@/lib/profile";
import { browserClient } from "@/lib/supabase/browser";

export type CommittedMinutes = SessionEvent["committedMinutes"];

/** Active time is saved every 60 seconds (design 12.2). */
const SAVE_EVERY_MS = 60_000;

export function SessionScreen({
  committedMinutes,
  profile,
  onDone,
}: {
  committedMinutes: CommittedMinutes;
  profile: Profile;
  onDone: () => void;
}) {
  const activeSeconds = useActiveSeconds();
  const save = useSessionSnapshots(committedMinutes, activeSeconds);
  const [finished, setFinished] = useState<{ rate: ThirtyDayRate | null } | null>(null);

  async function finish() {
    await save({ keepalive: false });
    const rate = await loadThirtyDayRate(browserClient(), profile).catch(() => null);
    setFinished({ rate });
  }

  if (finished) {
    return (
      <section className="stack" aria-labelledby="summary-title">
        <h2 id="summary-title">Session saved</h2>
        <p>
          Learned <strong>{finished.rate ? formatRate(finished.rate) : "…"}</strong>
        </p>
        <p className="lead">A day counts when you learn for 3 minutes or more.</p>
        <button type="button" className="button-main" onClick={onDone}>
          Back home
        </button>
      </section>
    );
  }

  return (
    <section className="stack session" aria-labelledby="session-title">
      <h2 id="session-title">{committedMinutes}-minute session</h2>
      <p aria-live="polite">Active time: {formatMinutes(activeSeconds.current)}</p>
      <p className="lead">Reviews and catches arrive in the next updates.</p>
      <button type="button" className="button-main" onClick={() => void finish()}>
        Finish
      </button>
    </section>
  );
}

/** Seconds while the app is on screen. Time in the background does not count. */
function useActiveSeconds(): { current: number } {
  const [, rerender] = useState(0);
  const seconds = useRef(0);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        seconds.current += 1;
        rerender((n) => n + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  return seconds;
}

/** Saves a snapshot at the start, every 60 seconds, when the app goes to the background, and on finish. */
function useSessionSnapshots(committedMinutes: CommittedMinutes, activeSeconds: { current: number }) {
  const sessionId = useRef<string>(null);

  function snapshot(): SessionEvent {
    sessionId.current ??= crypto.randomUUID();
    return {
      type: "session",
      clientEventId: crypto.randomUUID(),
      sessionId: sessionId.current,
      occurredAt: new Date().toISOString(),
      committedMinutes,
      activeSeconds: activeSeconds.current,
      device: deviceLabel(),
    };
  }

  useEffect(() => {
    void postEvents([snapshot()]);
    const timer = setInterval(() => void postEvents([snapshot()]), SAVE_EVERY_MS);
    const onHide = () => {
      if (document.visibilityState === "hidden") void postEvents([snapshot()], { keepalive: true });
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onHide);
    };
    // The session starts once, when this screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ({ keepalive }: { keepalive: boolean }) => postEvents([snapshot()], { keepalive });
}

function formatMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}
