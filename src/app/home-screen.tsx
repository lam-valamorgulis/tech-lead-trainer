"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { currentTown, towns } from "@/content";
import type { BundledTown } from "@/content/bundle";
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
import { useMusic } from "./effects";
import { playSound, startSound } from "./sound";
import { SilentModeHint, SpeakerButton } from "./speaker-button";
import { WeeklySummaryCard } from "./weekly-summary";
import { NewTown } from "./new-town";
import { badges, gymIsOpen } from "@/core/gym";
import { currentTownNumber, showsNewTown } from "@/core/roadmap";
import { loadGymRecords } from "@/lib/gym-log";
import { adrOutcomeDue } from "@/core/adr";
import { loadAdrChecks } from "@/lib/weekend-doc";

const CHOICES: CommittedMinutes[] = [3, 15, 45];

export function HomeScreen({ userId, profile, setProfile }: SignedIn) {
  const [planLater, setPlanLater] = usePlanLater(learningDay(new Date(), profile.homeTimeZone, profile.dayCutoffHour));
  const [session, setSession] = useState<CommittedMinutes | null>(null);
  const [status, setStatus] = useState<LearningStatus | null>(null);
  const [rateFailed, setRateFailed] = useState(false);
  const [allChoices, setAllChoices] = useState(false);
  // The town whose "new town" screen the learner already started on this visit.
  const [startedTown, setStartedTown] = useState<number | null>(null);
  const placementTown = usePlacementTown(profile.programStartDate);
  const gymTown = useGymTown(profile.programStartDate);
  const adrTown = useAdrToCheck();
  const rate = status?.rate;
  useMusic("map");

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

  /** Runs inside the commit tap, the only place where iPhone Safari lets audio start. */
  function startSession(minutes: CommittedMinutes) {
    startSound();
    playSound("tap");
    // The status changes once the session counts, so home loads it again afterwards.
    setStatus(null);
    setRateFailed(false);
    setAllChoices(false);
    setSession(minutes);
  }

  const newTown = status ? newTownToShow(profile.programStartDate, status) : null;

  let choices = null;
  if (newTown && newTown.number !== startedTown) {
    // A fresh start comes first. "Start" then shows the Rest Stop or the commit buttons as usual.
    choices = <NewTown town={newTown} onStart={() => setStartedTown(newTown.number)} />;
  } else if (status?.restStop && !allChoices) {
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
      <>
        <SpeakerButton userId={userId} profile={profile} setProfile={setProfile} besideIntro />
        <SilentModeHint soundOn={profile.soundOn} />
        <SessionScreen
          committedMinutes={session}
          programStartDate={profile.programStartDate}
          onDone={() => setSession(null)}
        />
      </>
    );
  }

  return (
    <>
      <SpeakerButton userId={userId} profile={profile} setProfile={setProfile} besideIntro />
      <div className="stack">
        <p>
          Learned <strong>{rate ? formatRate(rate) : "…"}</strong>
          {rateFailed && " (could not load)"}
          {/* One paragraph, so the commit buttons keep their room on a small phone. */}
          <br />
          This week: <strong>{status ? formatWeekMinutes(status.weekMinutes) : "…"}</strong>
        </p>
        {placementTown && (
          <div className="notice row">
            <Link href={`/placement/${placementTown.id}`} className="button button-quiet">
              Take the placement test
            </Link>
            <span className="lead">{placementTown.questions} questions</span>
          </div>
        )}
        <nav className="home-nav" aria-label="More">
          <Link href="/map" className="button button-quiet">
            Map
          </Link>
          {/* A computer task (design 3): on a phone it would push the commit buttons down. The map links it too. */}
          <Link href="/weekend" className="button button-quiet wide-only">
            Weekend
          </Link>
          <Link href="/field-guide" className="button button-quiet">
            Field Guide
          </Link>
          <Link href="/tracking" className="button button-quiet">
            Tracking
          </Link>
          <Link href="/settings" className="button button-quiet">
            Settings
          </Link>
        </nav>
      </div>

      {choices}
      {/* Below the choices: these load late, and must never move or push down the commit buttons. */}
      {adrTown && (
        <div className="notice row">
          <Link href={`/weekend/${adrTown}/adr`} className="button button-quiet">
            Check your ADR
          </Link>
          <span className="lead">Your check date has come: what really happened after your decision?</span>
        </div>
      )}
      {gymTown && (
        <div className="notice row">
          <Link href={`/gym/${gymTown.id}`} className="button button-quiet">
            Enter the Gym
          </Link>
          <span className="lead">The Gym of {gymTown.name} is open: win 4 of 5 for the badge</span>
        </div>
      )}
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

/**
 * The town to welcome the learner to, on their first learning day there (#36). It uses the town
 * they play today, by the same current-town rule as the session, so it never names an empty town.
 */
function newTownToShow(programStartDate: string, status: LearningStatus): BundledTown | null {
  const town = currentTown(programStartDate, status.today);
  if (!town) return null;
  return showsNewTown({ programStartDate, townNumber: town.number, lastSessionDay: status.lastSessionDay }) ? town : null;
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

/**
 * The town of an ADR whose outcome check date has come and that has no outcome yet (design 3).
 * If the ADRs cannot load, home shows nothing: the push reminder still comes on the date.
 */
function useAdrToCheck(): string | null {
  const [townId, setTownId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const client = browserClient();
    Promise.all([currentLearningDay(client), loadAdrChecks(client)])
      .then(([today, adrs]) => !cancelled && setTownId(adrs.find((adr) => adrOutcomeDue(adr, today))?.townId ?? null))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return townId;
}

type GymOffer = { id: string; name: string };

/**
 * The learner's own town when its Gym is open and its badge is not earned yet, so home can
 * offer it. A town with no content yet has no Gym. If the Gyms cannot load, home offers none.
 */
function useGymTown(programStartDate: string): GymOffer | null {
  const [town, setTown] = useState<GymOffer | null>(null);
  useEffect(() => {
    let cancelled = false;
    const client = browserClient();
    currentLearningDay(client)
      .then(async (today) => {
        const own = towns.find((t) => t.number === currentTownNumber(programStartDate, today));
        if (!own || !gymIsOpen(programStartDate, own.number, today)) return null;
        const earned = badges(await loadGymRecords(client, today)).some((badge) => badge.townId === own.id);
        return earned ? null : { id: own.id, name: own.name };
      })
      .then((offer) => !cancelled && setTown(offer))
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
