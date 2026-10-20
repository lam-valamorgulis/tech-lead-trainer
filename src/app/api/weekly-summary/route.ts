import { serverAdminClient } from "@/lib/supabase/server";
import { authenticate, bearerToken } from "@/lib/supabase/user";
import { ensureWeeklySummary } from "@/lib/weekly-summary";

// Home calls this when it opens. It answers with the summary of the last finished week, and
// makes it first when it is missing. So the summary exists even when the 5-minute timer is
// not set up yet (the timer calls the app only after the reminder wizard ran).
export async function POST(request: Request): Promise<Response> {
  const token = bearerToken(request);
  if (!token) return Response.json({ error: "Sign in first." }, { status: 401 });
  try {
    const signedIn = await authenticate(token);
    if (!signedIn) return Response.json({ error: "Sign in first." }, { status: 401 });
    const summary = await ensureWeeklySummary(serverAdminClient(), signedIn.userId, new Date());
    return Response.json({ summary });
  } catch (error) {
    console.error("POST /api/weekly-summary failed", error);
    return Response.json({ error: "The weekly summary could not load." }, { status: 500 });
  }
}
