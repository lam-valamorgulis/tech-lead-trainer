"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { currentTown } from "@/content";
import type { ThirtyDayRate } from "@/core/day";
import { placementProgress } from "@/core/placement";
import { currentLearningDay, formatRate, loadThirtyDayRate } from "@/lib/learning-log";
import { loadPlacementRecords } from "@/lib/placement-log";
import { browserClient } from "@/lib/supabase/browser";
import type { SignedIn } from "./auth-gate";
import { SessionScreen, type CommittedMinutes } from "./session-screen";

const CHOICES: CommittedMinutes[] = [3, 15, 45];

export function HomeScreen({ email }: SignedIn) {
  const [session, setSession] = useState<CommittedMinutes | null>(null);
  const [rate, setRate] = useState<ThirtyDayRate | null>(null);
  const [rateFailed, setRateFailed] = useState(false);
  const placementTown = usePlacementTown();

  useEffect(() => {
    if (session !== null) return;
    let cancelled = false;
    loadThirtyDayRate(browserClient())
      .then((value) => !cancelled && setRate(value))
      .catch(() => !cancelled && setRateFailed(true));
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (session !== null) {
    return <SessionScreen committedMinutes={session} onDone={() => setSession(null)} />;
  }

  return (
    <>
      <div className="stack">
        <p>
          Learned <strong>{rate ? formatRate(rate) : "…"}</strong>
          {rateFailed && " (could not load)"}
        </p>
        <p className="lead">Signed in as {email}</p>
        {placementTown && (
          <div className="notice stack">
            <p>
              Before {placementTown.name}: answer {placementTown.questions} short questions. What you already know is
              caught at once.
            </p>
            <Link href={`/placement/${placementTown.id}`} className="button button-quiet">
              Take the placement test
            </Link>
          </div>
        )}
        <nav className="row" aria-label="More">
          <Link href="/field-guide" className="button button-quiet">
            Field Guide
          </Link>
          <Link href="/settings" className="button button-quiet">
            Settings
          </Link>
        </nav>
      </div>

      <section className="commit" aria-labelledby="commit-title">
        <h2 id="commit-title">Today I commit to:</h2>
        {CHOICES.map((minutes) => (
          <button key={minutes} type="button" className="button-main" onClick={() => setSession(minutes)}>
            {minutes} minutes
          </button>
        ))}
      </section>
    </>
  );
}

/** The current town when its placement test is not done yet, so home can offer it. */
function usePlacementTown(): { id: string; name: string; questions: number } | null {
  const [town, setTown] = useState<{ id: string; name: string; questions: number } | null>(null);
  useEffect(() => {
    const current = currentTown();
    if (!current || current.placement.length === 0) return;
    let cancelled = false;
    const client = browserClient();
    currentLearningDay(client)
      .then((today) => loadPlacementRecords(client, today))
      .then((records) => {
        if (cancelled || placementProgress(current, records).done) return;
        setTown({ id: current.id, name: current.name, questions: current.placement.length });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return town;
}
