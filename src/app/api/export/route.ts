import { buildExport } from "@/lib/export";
import { authenticate } from "@/lib/supabase/user";

// "Download my data" (design 12.6): the signed-in user's raw event log as one JSON file.
export async function GET(request: Request): Promise<Response> {
  try {
    const signedIn = await authenticate(request);
    if (!signedIn) return Response.json({ error: "Sign in first." }, { status: 401 });

    const file = await buildExport(signedIn.client, signedIn.userId);
    return new Response(JSON.stringify(file), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        // Named by the learning day in the home time zone, like everything else the learner sees.
        "content-disposition": `attachment; filename="tech-lead-trainer-${file.today}.json"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/export failed", error);
    return Response.json({ error: "The export failed. Try again." }, { status: 500 });
  }
}
