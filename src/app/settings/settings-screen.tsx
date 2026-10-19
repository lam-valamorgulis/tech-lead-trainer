"use client";

import Link from "next/link";
import { useState } from "react";
import { downloadMyData } from "@/lib/download-data";
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
      <DataSection />
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

const DOWNLOAD_MESSAGES = {
  idle: null,
  working: "Preparing your data file…",
  done: "Your data file is ready.",
  cancelled: "The download was cancelled.",
  failed: "The download failed. Check your connection and try again.",
} as const;

function DataSection() {
  const [status, setStatus] = useState<keyof typeof DOWNLOAD_MESSAGES>("idle");

  async function download() {
    setStatus("working");
    try {
      const result = await downloadMyData();
      setStatus(result === "cancelled" ? "cancelled" : "done");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <section className="stack" aria-labelledby="data-title">
      <h2 id="data-title">Your data</h2>
      <p className="lead">One JSON file with everything you did in the app. On iPhone, choose Save to Files.</p>
      <button type="button" className="button-quiet" disabled={status === "working"} onClick={() => void download()}>
        Download my data
      </button>
      {DOWNLOAD_MESSAGES[status] && (
        <p role="status" className={status === "failed" ? "error" : undefined}>
          {DOWNLOAD_MESSAGES[status]}
        </p>
      )}
    </section>
  );
}
