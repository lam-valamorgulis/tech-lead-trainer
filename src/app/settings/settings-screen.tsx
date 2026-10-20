"use client";

import Link from "next/link";
import { useState } from "react";
import { fetchMyData, saveFile, shareFile, usesShareSheet } from "@/lib/download-data";
import { browserClient } from "@/lib/supabase/browser";
import { PlanForm } from "../plan-form";
import type { SignedIn } from "../auth-gate";
import { RemindersSection } from "./reminders-section";

export function SettingsScreen({ userId, email, profile, setProfile }: SignedIn) {
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
      <section className="stack" aria-labelledby="plans-title">
        <h2 id="plans-title">Your plans</h2>
        <PlanForm
          userId={userId}
          profile={profile}
          submitLabel="Save plans"
          onSaved={setProfile}
        />
      </section>
      <RemindersSection userId={userId} profile={profile} setProfile={setProfile} />
      <DataSection />
      <section className="stack" aria-labelledby="program-title">
        <h2 id="program-title">Program</h2>
        <p>Day 1 of your program: {formatDay(profile.programStartDate)}</p>
      </section>
      <p className="lead">Signed in as {email}</p>
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

type DownloadStatus =
  | { name: "idle" | "working" | "done" | "cancelled" | "failed" }
  | { name: "ready"; file: File };

const DOWNLOAD_MESSAGES: Record<DownloadStatus["name"], string> = {
  idle: "",
  working: "Preparing your data file…",
  ready: "Your file is ready. Tap Save to Files.",
  done: "Your data file is ready.",
  cancelled: "The download was cancelled.",
  failed: "The download failed. Check your connection and try again.",
};

function DataSection() {
  const [status, setStatus] = useState<DownloadStatus>({ name: "idle" });

  async function prepare() {
    setStatus({ name: "working" });
    try {
      const file = await fetchMyData();
      // iPhone opens the share sheet only from a fresh tap, so it gets a second button.
      if (usesShareSheet() && navigator.canShare({ files: [file] })) {
        setStatus({ name: "ready", file });
      } else {
        saveFile(file);
        setStatus({ name: "done" });
      }
    } catch {
      setStatus({ name: "failed" });
    }
  }

  function share(file: File) {
    shareFile(file).then(
      (result) => setStatus({ name: result === "shared" ? "done" : "cancelled" }),
      () => setStatus({ name: "failed" }),
    );
  }

  return (
    <section className="stack" aria-labelledby="data-title">
      <h2 id="data-title">Your data</h2>
      <p className="lead">One JSON file with everything you did in the app. On iPhone, choose Save to Files.</p>
      {status.name === "ready" ? (
        <button type="button" className="button-main" onClick={() => share(status.file)}>
          Save to Files
        </button>
      ) : (
        <button type="button" className="button-quiet" disabled={status.name === "working"} onClick={() => void prepare()}>
          Download my data
        </button>
      )}
      {/* The live regions stay on the page, so a screen reader hears every change. */}
      <p role="status" className="lead">
        {status.name === "failed" ? "" : DOWNLOAD_MESSAGES[status.name]}
      </p>
      <p role="alert" className="error">
        {status.name === "failed" ? DOWNLOAD_MESSAGES.failed : ""}
      </p>
    </section>
  );
}
