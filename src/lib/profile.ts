import type { SupabaseClient } from "@supabase/supabase-js";

export type Profile = {
  homeTimeZone: string;
  dayCutoffHour: number;
  /** "HH:MM" in the home time zone. */
  morningReminderTime: string;
  eveningReminderTime: string;
  plainFont: boolean;
  reduceEffects: boolean;
  soundOn: boolean;
  ifThenPlan: string | null;
  tiredDayPlan: string | null;
  /** Day 1 of the program, "YYYY-MM-DD". */
  programStartDate: string;
};

type ProfileRow = {
  home_time_zone: string;
  day_cutoff_hour: number;
  morning_reminder_time: string;
  evening_reminder_time: string;
  plain_font: boolean;
  reduce_effects: boolean;
  sound_on: boolean;
  if_then_plan: string | null;
  tired_day_plan: string | null;
  program_start_date: string;
};

const COLUMNS =
  "home_time_zone, day_cutoff_hour, morning_reminder_time, evening_reminder_time, plain_font, reduce_effects, sound_on, if_then_plan, tired_day_plan, program_start_date";

/**
 * Returns the signed-in user's profile. The first call creates it with the design defaults,
 * and the database sets day 1 to today's learning day.
 */
export async function ensureProfile(client: SupabaseClient): Promise<Profile> {
  const created = await client
    .from("profiles")
    .upsert({}, { onConflict: "user_id", ignoreDuplicates: true });
  if (created.error) throw created.error;

  const { data, error } = await client.from("profiles").select(COLUMNS).single<ProfileRow>();
  if (error) throw error;
  return toProfile(data);
}

function toProfile(row: ProfileRow): Profile {
  return {
    homeTimeZone: row.home_time_zone,
    dayCutoffHour: row.day_cutoff_hour,
    // Postgres returns "07:30:00".
    morningReminderTime: row.morning_reminder_time.slice(0, 5),
    eveningReminderTime: row.evening_reminder_time.slice(0, 5),
    plainFont: row.plain_font,
    reduceEffects: row.reduce_effects,
    soundOn: row.sound_on,
    ifThenPlan: row.if_then_plan,
    tiredDayPlan: row.tired_day_plan,
    programStartDate: row.program_start_date,
  };
}
