import { hasCronSecret, reminderConfig } from "@/lib/reminders/config";
import { sendDueReminders } from "@/lib/reminders/send-reminders";
import { webPushSender } from "@/lib/reminders/web-push-sender";
import { serverAdminClient } from "@/lib/supabase/server";

// Called by `pg_cron` every 5 minutes (design 12.4). Only the cron secret opens it.
// A second call in the same minute is safe: each reminder is claimed once per learning day.
export async function POST(request: Request): Promise<Response> {
  const config = reminderConfig();
  if (!config) return Response.json({ error: "Reminders are not set up." }, { status: 503 });
  if (!hasCronSecret(request, config.cronSecret)) return Response.json({ error: "Not allowed." }, { status: 401 });

  try {
    const run = await sendDueReminders(serverAdminClient(), new Date(), webPushSender(config.vapid));
    return Response.json(run);
  } catch (error) {
    console.error("POST /api/reminders/notify failed", error);
    return Response.json({ error: "The reminder run failed." }, { status: 500 });
  }
}
