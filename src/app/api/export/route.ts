import { buildExport } from "@/lib/export";
import { bearerToken, serverUserClient } from "@/lib/supabase/user";

// "Download my data" (design 12.6): the signed-in user's raw event log as one JSON file.
export async function GET(request: Request): Promise<Response> {
  const token = bearerToken(request);
  if (!token) return Response.json({ error: "Sign in first." }, { status: 401 });

  const client = serverUserClient(token);
  const { data: user, error: authError } = await client.auth.getUser(token);
  if (authError || !user.user) return Response.json({ error: "Sign in first." }, { status: 401 });

  try {
    const file = await buildExport(client);
    // Named by the learning day in the home time zone, like everything else the learner sees.
    const day = file.daysLearnedLast30.today;
    return new Response(JSON.stringify(file, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="tech-lead-trainer-${day}.json"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/export failed", error);
    return Response.json({ error: "The export failed. Try again." }, { status: 500 });
  }
}
