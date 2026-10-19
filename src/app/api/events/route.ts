import { eventBatchSchema, writeEvents } from "@/lib/events/write-events";
import { bearerToken, serverUserClient } from "@/lib/supabase/user";

// The one endpoint that writes learning events. A retry with the same batch is always safe.
export async function POST(request: Request): Promise<Response> {
  const token = bearerToken(request);
  if (!token) return Response.json({ error: "Sign in first." }, { status: 401 });

  const client = serverUserClient(token);
  const { data: user, error: authError } = await client.auth.getUser(token);
  if (authError || !user.user) return Response.json({ error: "Sign in first." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The body must be JSON." }, { status: 400 });
  }
  const batch = eventBatchSchema.safeParse(body);
  if (!batch.success) return Response.json({ error: "Some events are not valid.", issues: batch.error.issues }, { status: 400 });

  try {
    await writeEvents(client, batch.data.events);
  } catch {
    return Response.json({ error: "The events could not be saved. Try again." }, { status: 500 });
  }
  // Events that were already saved count as received too.
  return Response.json({ received: batch.data.events.length });
}
