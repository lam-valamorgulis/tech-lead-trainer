"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { currentTown } from "@/content";
import type { ThirtyDayRate } from "@/core/day";
import { placementProgress } from "@/core/placement";
import { needsPlan, planSentence } from "@/core/plan";
import { currentLearningDay, formatRate, loadThirtyDayRate } from "@/lib/learning-log";
import { loadPlacementRecords } from "@/lib/placement-log";
import { browserClient } from "@/lib/supabase/browser";
import type { SignedIn } from "./auth-gate";
import { PlanForm } from "./plan-form";
import { SessionScreen, type CommittedMinutes } from "./session-screen";

const CHOICES: CommittedMinutes[] = [3, 15, 45];

export function HomeScreen({ userId, profile, setProfile }: SignedIn) {
  const [planLater, setPlanLater] = usePlanLater();
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

  if (needsPlan(profile) && !planLater) {
    return (
      <section className="stack" aria-labelledby="plan-title">
        <h2 id="plan-title">Your if-then plan</h2>
        <p className="lead">Tie learning to something you already do every day. Write it in your own words.</p>
        <PlanForm
          userId={userId}
          profile={profile}
          submitLabel="Save my plan"
          onSaved={setProfile}
          onLater={() => setPlanLater(true)}
        />
      </section>
    );
  }

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
        {placementTown && (
          <div className="notice row">
            <Link href={`/placement/${placementTown.id}`} className="button button-quiet">
              Take the placement test
            </Link>
            <span className="lead">{placementTown.questions} questions</span>
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
        {profile.ifThenPlan && (
          <div className="plan-lines">
            <p className="lead">{planSentence(profile.ifThenPlan)}</p>
            <p className="lead">{profile.tiredDayPlan}</p>
          </div>
        )}
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

type PlacementOffer = { id: string; questions: number };

/**
 * The current town when its placement test is not done yet, so home can offer it.
 * If the answers cannot load, the offer stays hidden: the test is optional (design 13 cut list).
 */
function usePlacementTown(): PlacementOffer | null {
  const [town, setTown] = useState<PlacementOffer | null>(null);
  useEffect(() => {
    const current = currentTown();
    if (!current || current.placement.length === 0) return;
    let cancelled = false;
    const client = browserClient();
    currentLearningDay(client)
      .then((today) => loadPlacementRecords(client, today))
      .then((records) => {
        if (cancelled) return;
        // Next keeps this screen's state when you leave and come back, so clear an old offer too.
        setTown(placementProgress(current, records).done ? null : { id: current.id, questions: current.placement.length });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return town;
}

const PLAN_LATER_KEY = "plan-later-until";

/**
 * "Later" on the plan screen hides it for the rest of the day, on this device.
 * Storage can fail (private mode); then the screen simply asks again.
 */
function usePlanLater(): [boolean, (later: boolean) => void] {
  const today = new Date().toLocaleDateString("en-CA");
  const [later, setLater] = useState(() => {
    try {
      return typeof window !== "undefined" && window.localStorage.getItem(PLAN_LATER_KEY) === today;
    } catch {
      return false;
    }
  });
  return [
    later,
    (value) => {
      setLater(value);
      try {
        if (value) window.localStorage.setItem(PLAN_LATER_KEY, today);
      } catch {
        // Keep "Later" for this visit only.
      }
    },
  ];
}
