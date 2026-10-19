"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ThirtyDayRate } from "@/core/day";
import { formatRate, loadThirtyDayRate } from "@/lib/learning-log";
import { browserClient } from "@/lib/supabase/browser";
import type { SignedIn } from "./auth-gate";
import { SessionScreen, type CommittedMinutes } from "./session-screen";

const CHOICES: CommittedMinutes[] = [3, 15, 45];

export function HomeScreen({ email, profile }: SignedIn) {
  const [session, setSession] = useState<CommittedMinutes | null>(null);
  const [rate, setRate] = useState<ThirtyDayRate | null>(null);
  const [rateFailed, setRateFailed] = useState(false);

  useEffect(() => {
    if (session !== null) return;
    let cancelled = false;
    loadThirtyDayRate(browserClient(), profile)
      .then((value) => !cancelled && setRate(value))
      .catch(() => !cancelled && setRateFailed(true));
    return () => {
      cancelled = true;
    };
  }, [profile, session]);

  if (session !== null) {
    return <SessionScreen committedMinutes={session} profile={profile} onDone={() => setSession(null)} />;
  }

  return (
    <>
      <div className="stack">
        <p>
          Learned <strong>{rate ? formatRate(rate) : "…"}</strong>
          {rateFailed && " (could not load)"}
        </p>
        <p className="lead small">Signed in as {email}</p>
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
