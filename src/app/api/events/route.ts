import { EventWriteError, eventBatchSchema, touchedItemIds, writeEvents } from "@/lib/events/write-events";
import { refreshReviewState } from "@/lib/review-state";
import { authenticate, bearerToken } from "@/lib/supabase/user";

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
    const signedIn = await authenticate(request);
    if (!signedIn) return Response.json({ error: "Sign in first." }, { status: 401 });
    const { client, userId } = signedIn;

    await writeEvents(client, batch.data.events);

    // The review state is a cache. If this update fails, the events are still saved,
    // and the rebuild script can recompute it.
    await refreshReviewState(client, userId, touchedItemIds(batch.data.events)).catch((error) =>
      console.error("review_state refresh failed", error),
    );
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
