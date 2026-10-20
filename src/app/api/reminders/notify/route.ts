import { hasCronSecret, reminderConfig } from "@/lib/reminders/config";
import { sendDueReminders } from "@/lib/reminders/send-reminders";
import { webPushSender } from "@/lib/reminders/web-push-sender";
import { serverAdminClient } from "@/lib/supabase/server";
import { createDueWeeklySummaries } from "@/lib/weekly-summary";

// Called by `pg_cron` every 5 minutes (design 12.4). Only the cron secret opens it.
// A second call in the same minute is safe: each reminder is claimed once per learning day,
// and each Sunday summary is saved once per week.
export async function POST(request: Request): Promise<Response> {
  const config = reminderConfig();
  if (!config) return Response.json({ error: "Reminders are not set up." }, { status: 503 });
  if (!hasCronSecret(request, config.cronSecret)) return Response.json({ error: "Not allowed." }, { status: 401 });

  const admin = serverAdminClient();
  const now = new Date();
  try {
    const run = await sendDueReminders(admin, now, webPushSender(config.vapid));
    // The summaries come after the reminders, so a summary problem never delays a reminder.
    // Home also makes a missing summary when it opens, so a failed run here loses nothing.
    const summaries = await createDueWeeklySummaries(admin, now).catch((error) => {
      console.error("weekly summaries failed", error);
      return 0;
    });
    return Response.json({ ...run, summaries });
  } catch (error) {
    console.error("POST /api/reminders/notify failed", error);
    return Response.json({ error: "The reminder run failed." }, { status: 500 });
  }
}
