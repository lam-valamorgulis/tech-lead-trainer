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
 * A copy of the events of one type that have not reached the server yet, for example a catch
 * made offline. Take it BEFORE reading the database: an event that is sent in between is then in
 * the copy or in the database, never in neither. Remove the ones the database already has.
 */
export function pendingEvents<T extends LearningEvent["type"]>(type: T): Extract<LearningEvent, { type: T }>[] {
  return outbox.pending().filter((event): event is Extract<LearningEvent, { type: T }> => event.type === type);
}
