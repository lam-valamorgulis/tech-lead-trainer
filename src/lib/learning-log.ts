import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, learningDay, RATE_WINDOW_DAYS, thirtyDayRate, type ThirtyDayRate } from "@/core/day";
import type { Profile } from "./profile";

/** Today in the home time zone. The phone's own time zone is never used (design 12.4). */
export function today(profile: Profile, now = new Date()): string {
  return learningDay(now, profile.homeTimeZone, profile.dayCutoffHour);
}

export async function loadThirtyDayRate(client: SupabaseClient, profile: Profile): Promise<ThirtyDayRate> {
  const end = today(profile);
  // One day more than the window: a session counts for the day it started.
  const { data, error } = await client
    .from("session_events")
    .select("session_id, occurred_at, learning_day, active_seconds")
    .gte("learning_day", addDays(end, -RATE_WINDOW_DAYS))
    .returns<{ session_id: string; occurred_at: string; learning_day: string; active_seconds: number }[]>();
  if (error) throw error;
  return thirtyDayRate(
    data.map((row) => ({
      sessionId: row.session_id,
      occurredAt: new Date(row.occurred_at),
      learningDay: row.learning_day,
      activeSeconds: row.active_seconds,
    })),
    end,
  );
}

export function formatRate(rate: ThirtyDayRate): string {
  return `${rate.learnedDays} of ${rate.windowDays} days`;
}
