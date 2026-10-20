"use client";

import { useEffect, useRef, useState } from "react";
import { deviceLabel } from "@/lib/events/device";
import { postEvents } from "@/lib/events/post-events";
import type { SessionEvent } from "@/lib/events/write-events";

/** Active time is saved every 60 seconds (design 12.2). */
const SAVE_EVERY_MS = 60_000;

/**
 * Counts active time while the screen is visible, and saves it as session events: at the start,
 * every 60 seconds, and when the app goes to the background. `snapshot()` gives the latest one.
 * Unmounting stops both timers. Used by the daily session and by the Gym.
 */
export function useActiveTime(sessionId: string, committedMinutes: SessionEvent["committedMinutes"]) {
  const [activeSeconds, setActiveSeconds] = useState(0);
  const seconds = useRef(0);

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
      // Leaving the screen inside the app, for example to the boss page, keeps the last seconds.
      void postEvents([snapshot()], { keepalive: true });
    };
    // The session starts once, when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { activeSeconds, snapshot };
}
