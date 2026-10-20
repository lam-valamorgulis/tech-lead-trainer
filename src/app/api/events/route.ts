import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EventWriteError,
  eventBatchSchema,
  lostBattleIds,
  touchedItemIds,
  writeEvents,
  type LearningEvent,
} from "@/lib/events/write-events";
import { movesOfBattles, refreshReviewState } from "@/lib/review-state";
import { authenticate, bearerToken } from "@/lib/supabase/user";

/**
 * Refreshes the review state of the items a batch is about, and of the moves of a battle it
 * ends with a loss. The state is a cache: if this fails, the events are still saved, and the
 * rebuild script can recompute it. A failed lookup of the lost moves skips only those moves.
 */
async function refreshTouchedState(client: SupabaseClient, userId: string, events: LearningEvent[]): Promise<void> {
  const lostMoves = await movesOfBattles(client, lostBattleIds(events)).catch((error) => {
    console.error("lost battle moves lookup failed", error);
    return [];
  });
  await refreshReviewState(client, userId, [...new Set([...touchedItemIds(events), ...lostMoves])]).catch((error) =>
    console.error("review_state refresh failed", error),
  );
}

// The one endpoint that writes learning events. A retry with the same batch is always safe.
// 400 tells the app to drop the batch; 401 and 500 tell it to try again later.
export async function POST(request: Request): Promise<Response> {
  const token = bearerToken(request);
  if (!token) return Response.json({ error: "Sign in first." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The body must be JSON." }, { status: 400 });
  }
  const batch = eventBatchSchema.safeParse(body);
  if (!batch.success) return Response.json({ error: "Some events are not valid." }, { status: 400 });

  try {
    const signedIn = await authenticate(token);
    if (!signedIn) return Response.json({ error: "Sign in first." }, { status: 401 });
    const { client, userId } = signedIn;

    await writeEvents(client, batch.data.events);

    await refreshTouchedState(client, userId, batch.data.events);
  } catch (error) {
    if (error instanceof EventWriteError && error.refused) {
      return Response.json({ error: "Some events are not valid." }, { status: 400 });
    }
    console.error("POST /api/events failed", error);
    return Response.json({ error: "The events could not be saved. Try again." }, { status: 500 });
  }
  // Events that were already saved count as received too.
  return Response.json({ received: batch.data.events.length });
}
