"use client";

import { useEffect, useState } from "react";
import type { GymRecord } from "@/core/gym";
import { loadGymRecords } from "@/lib/gym-log";
import { currentLearningDay } from "@/lib/learning-log";
import { browserClient } from "@/lib/supabase/browser";

export type MapDay = { today: string; gyms: GymRecord[] | null };

/**
 * The learning day and the Gym results, for the map and a town's page. The map works without
 * the badges, so a failed Gym read only hides them (gyms is null).
 */
export function useMapDay(): { day: MapDay | null; failed: boolean } {
  const [day, setDay] = useState<MapDay | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const client = browserClient();
    currentLearningDay(client)
      .then(async (today) => ({ today, gyms: await loadGymRecords(client, today).catch(() => null) }))
      .then((value) => !cancelled && setDay(value))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  return { day, failed };
}
