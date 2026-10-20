"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { currentTown } from "@/content";
import { placementProgress } from "@/core/placement";
import { learningDay } from "@/core/day";
import { needsPlan, planSentence } from "@/core/plan";
import { formatWeekMinutes } from "@/core/week";
import { currentLearningDay, formatRate, loadLearningStatus, type LearningStatus } from "@/lib/learning-log";
import { loadPlacementRecords } from "@/lib/placement-log";
import type { Profile } from "@/lib/profile";
import { browserClient } from "@/lib/supabase/browser";
import type { SignedIn } from "./auth-gate";
import { PlanForm } from "./plan-form";
import { RestStop } from "./rest-stop";
import { SessionScreen, type CommittedMinutes } from "./session-screen";
import { WeeklySummaryCard } from "./weekly-summary";
import { gymIsOpen } from "@/core/gym";

const CHOICES: CommittedMinutes[] = [3, 15, 45];

export function HomeScreen({ userId, profile, setProfile }: SignedIn) {
  const [planLater, setPlanLater] = usePlanLater(learningDay(new Date(), profile.homeTimeZone, profile.dayCutoffHour));
  const [session, setSession] = useState<CommittedMinutes | null>(null);
  const [status, setStatus] = useState<LearningStatus | null>(null);
  const [rateFailed, setRateFailed] = useState(false);
  const [allChoices, setAllChoices] = useState(false);
  const placementTown = usePlacementTown(profile.programStartDate);
  const gymTown = useGymTown(profile.programStartDate);
  const rate = status?.rate;

  useEffect(() => {
    if (session !== null) return;
    let cancelled = false;
    loadLearningStatus(browserClient())
      .then((value) => {
        if (cancelled) return;
        setStatus(value);
        setRateFailed(false);
      })
      .catch(() => !cancelled && setRateFailed(true));
    return () => {
      cancelled = true;
    };
  }, [session]);

  function startSession(minutes: CommittedMinutes) {
    // The status changes once the session counts, so home loads it again afterwards.
    setStatus(null);
    setRateFailed(false);
    setAllChoices(false);
    setSession(minutes);
  }

  let choices = null;
  if (status?.restStop && !allChoices) {
    choices = <RestStop onStart={() => startSession(3)} onShowChoices={() => setAllChoices(true)} />;
  } else if (status || rateFailed) {
    // Shown only once the status is known, so the choices never jump to the Rest Stop under a finger.
    choices = <CommitChoices profile={profile} onChoose={startSession} />;
  }

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
    return (
      <SessionScreen
        committedMinutes={session}
        programStartDate={profile.programStartDate}
        onDone={() => setSession(null)}
      />
    );
  }

  return (
    <>
      <div className="stack">
        <p>
          Learned <strong>{rate ? formatRate(rate) : "…"}</strong>
          {rateFailed && " (could not load)"}
          {/* One paragraph, so the commit buttons keep their room on a small phone. */}
          <br />
          This week: <strong>{status ? formatWeekMinutes(status.weekMinutes) : "…"}</strong>
        </p>
        {gymTown && (
          <div className="notice row">
            <Link href={`/gym/${gymTown.id}`} className="button button-quiet">
              Enter the Gym
            </Link>
            <span className="lead">Last week of {gymTown.name}: win 4 of 5 for the badge</span>
          </div>
        )}
        {placementTown && (
          <div className="notice row">
            <Link href={`/placement/${placementTown.id}`} className="button button-quiet">
              Take the placement test
            </Link>
            <span className="lead">{placementTown.questions} questions</span>
          </div>
        )}
        <nav className="row" aria-label="More">
          <Link href="/map" className="button button-quiet">
            Map
          </Link>
          <Link href="/field-guide" className="button button-quiet">
            Field Guide
          </Link>
          <Link href="/settings" className="button button-quiet">
            Settings
          </Link>
        </nav>
      </div>

      {choices}
      {/* Below the choices: it loads late, and must never move or push down the commit buttons. */}
      <WeeklySummaryCard />
    </>
  );
}

function CommitChoices({ profile, onChoose }: { profile: Profile; onChoose: (minutes: CommittedMinutes) => void }) {
  return (
    <section className="commit" aria-labelledby="commit-title">
      {profile.ifThenPlan && (
        <div className="plan-lines">
          <p className="lead">{planSentence(profile.ifThenPlan)}</p>
          <p className="lead">{profile.tiredDayPlan}</p>
        </div>
      )}
      <h2 id="commit-title">Today I commit to:</h2>
      {CHOICES.map((minutes) => (
        <button key={minutes} type="button" className="button-main" onClick={() => onChoose(minutes)}>
          {minutes} minutes
        </button>
      ))}
    </section>
  );
}

type PlacementOffer = { id: string; questions: number };

/**
 * The current town when its placement test is not done yet, so home can offer it.
 * If the answers cannot load, the offer stays hidden: the test is optional (design 13 cut list).
 */
function usePlacementTown(programStartDate: string): PlacementOffer | null {
  const [town, setTown] = useState<PlacementOffer | null>(null);
  useEffect(() => {
    let cancelled = false;
    const client = browserClient();
    currentLearningDay(client)
      .then(async (today) => {
        const current = currentTown(programStartDate, today);
        if (!current || current.placement.length === 0) return null;
        return { current, records: await loadPlacementRecords(client, today) };
      })
      .then((loaded) => {
        if (cancelled) return;
        if (!loaded) return setTown(null);
        const { current, records } = loaded;
        // Next keeps this screen's state when you leave and come back, so clear an old offer too.
        setTown(placementProgress(current, records).done ? null : { id: current.id, questions: current.placement.length });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [programStartDate]);
  return town;
}

/** The town whose Gym is open now (its last week, and after), so home can offer it. */
function useGymTown(programStartDate: string): { id: string; name: string } | null {
  const [town, setTown] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    currentLearningDay(browserClient())
      .then((today) => {
        if (cancelled) return;
        const current = currentTown(programStartDate, today);
        setTown(current && gymIsOpen(programStartDate, current.number, today) ? { id: current.id, name: current.name } : null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [programStartDate]);
  return town;
}

const PLAN_LATER_KEY = "plan-later-until";

/**
 * "Later" on the plan screen hides it for the rest of the learning day, on this device.
 * Storage can fail (private mode); then the screen simply asks again.
 */
function usePlanLater(today: string): [boolean, (later: boolean) => void] {
  const [later, setLater] = useState(() => {
    try {
      return window.localStorage.getItem(PLAN_LATER_KEY) === today;
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
