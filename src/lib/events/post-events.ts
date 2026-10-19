import type { LearningEvent } from "./write-events";
import { browserClient } from "@/lib/supabase/browser";

// Sends events to POST /api/events. An event that fails to send waits here and goes with the
// next batch. Its client event id makes the retry safe.
let waiting: LearningEvent[] = [];

export async function postEvents(events: LearningEvent[], { keepalive = false } = {}): Promise<boolean> {
  const batch = [...waiting, ...events];
  waiting = [];
  const { data } = await browserClient().auth.getSession();
  const token = data.session?.access_token;
  try {
    if (!token) throw new Error("Not signed in.");
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ events: batch }),
      keepalive,
    });
    if (!response.ok) throw new Error(`POST /api/events: ${response.status}`);
    return true;
  } catch {
    waiting = batch;
    return false;
  }
}
