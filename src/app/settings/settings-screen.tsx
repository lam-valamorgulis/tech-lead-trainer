"use client";

import Link from "next/link";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/browser";
import type { SignedIn } from "../auth-gate";

export function SettingsScreen({ userId, profile, setProfile }: SignedIn) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const phoneTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  async function switchToPhoneTimeZone() {
    setBusy(true);
    setError(null);
    const { error: updateError } = await browserClient()
      .from("profiles")
      .update({ home_time_zone: phoneTimeZone })
      .eq("user_id", userId);
    setBusy(false);
    if (updateError) setError("We could not save the time zone. Try again.");
    else setProfile({ ...profile, homeTimeZone: phoneTimeZone });
  }

  return (
    <div className="stack">
      <section className="stack" aria-labelledby="time-zone-title">
        <h2 id="time-zone-title">Time zone</h2>
        <p>Home time zone: {profile.homeTimeZone}</p>
        <p className="lead">
          Your day starts at 0{profile.dayCutoffHour}:00 in your home time zone. Travel does not change it.
        </p>
        {phoneTimeZone !== profile.homeTimeZone && (
          <p className="lead">This phone is set to {phoneTimeZone}.</p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button
          type="button"
          className="button-quiet"
          disabled={busy || phoneTimeZone === profile.homeTimeZone}
          onClick={() => void switchToPhoneTimeZone()}
        >
          Use this phone&apos;s time zone
        </button>
      </section>
      <section className="stack" aria-labelledby="program-title">
        <h2 id="program-title">Program</h2>
        <p>Day 1 of your program: {formatDay(profile.programStartDate)}</p>
      </section>
      <button type="button" className="button-quiet" onClick={() => void browserClient().auth.signOut()}>
        Sign out
      </button>
      <Link href="/" className="button button-quiet">
        Back
      </Link>
    </div>
  );
}

function formatDay(isoDate: string): string {
  // Noon UTC keeps the date the same in every time zone.
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
