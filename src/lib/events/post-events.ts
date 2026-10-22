import { browserClient } from "@/lib/supabase/browser";
import { Outbox, type SendResult } from "./outbox";
import type { LearningEvent } from "./write-events";

type SendOptions = { keepalive?: boolean };

async function send(batch: LearningEvent[], options?: SendOptions): Promise<SendResult> {
  const { data } = await browserClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return "retry";
  const response = await fetch("/api/events", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ events: batch }),
    keepalive: options?.keepalive ?? false,
  });
  if (response.ok) return "sent";
  // 400: these events can never be saved. 401 and 5xx can work later.
  return response.status === 400 ? "refused" : "retry";
}

const outbox = new Outbox<LearningEvent, SendOptions>(send);

/** Sends events to POST /api/events. Resolves true when every waiting event is saved. */
export function postEvents(events: LearningEvent[], options?: SendOptions): Promise<boolean> {
  return outbox.add(events, options);
}

/**
 * Sends events while the page hides or closes. The request starts at once, inside the leave
 * event, with keepalive: a request that waits for the session first may start after the page is
 * gone. So the caller passes a session token it read while the page was open. Without a token,
 * or when the request fails while the page still lives, the events wait in the outbox. A retry
 * is safe: the server keeps one row per event id.
 */
export function postEventsOnLeave(events: LearningEvent[], token: string | null): void {
  if (!token) {
    void outbox.add(events, { keepalive: true });
    return;
  }
  const request = fetch("/api/events", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ events }),
    keepalive: true,
  });
  // 400: these events can never be saved, as in send(). Anything else can work later.
  void request
    .then((response) => (response.ok || response.status === 400 ? undefined : Promise.reject(new Error("retry"))))
    .catch(() => void outbox.add(events, { keepalive: true }));
}

/**
 * A copy of the events of one type that have not reached the server yet, for example a catch
 * made offline. Take it BEFORE reading the database: an event that is sent in between is then in
 * the copy or in the database, never in neither. Remove the ones the database already has.
 */
export function pendingEvents<T extends LearningEvent["type"]>(type: T): Extract<LearningEvent, { type: T }>[] {
  return outbox.pending().filter((event): event is Extract<LearningEvent, { type: T }> => event.type === type);
}
