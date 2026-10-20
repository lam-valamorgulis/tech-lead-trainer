import { vapidPublicKey } from "@/lib/reminders/config";

// The public push key, read when the app asks, so it is never baked into a build.
// `{ publicKey: null }` means the owner has not added the keys yet: the app keeps reminders off.
export async function GET(request: Request): Promise<Response> {
  // Reading the request keeps this route out of the build-time prerender, like /api/export.
  void request.headers.get("accept");
  return Response.json({ publicKey: vapidPublicKey() }, { headers: { "cache-control": "no-store" } });
}
