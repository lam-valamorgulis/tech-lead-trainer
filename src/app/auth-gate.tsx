"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ensureProfile, type Profile } from "@/lib/profile";
import { browserClient } from "@/lib/supabase/browser";
import { SignInForm } from "./sign-in-form";

type State =
  | { name: "loading" }
  | { name: "signed-out" }
  | { name: "signed-in"; email: string; profile: Profile }
  | { name: "error" };

export function AuthGate() {
  const [state, setState] = useState<State>({ name: "loading" });

  useEffect(() => {
    const client = browserClient();
    // The user whose screen is showing or loading. A late answer for anyone else is dropped.
    let shownUserId: string | undefined;
    let unmounted = false;

    async function followSession(session: Session | null) {
      if (unmounted) return;
      if (!session) {
        shownUserId = undefined;
        setState({ name: "signed-out" });
        return;
      }
      const userId = session.user.id;
      if (shownUserId === userId) return;
      shownUserId = userId;
      try {
        // The first sign-in creates the profile. Later sign-ins read it.
        const profile = await ensureProfile(client);
        if (unmounted || shownUserId !== userId) return;
        setState({ name: "signed-in", email: session.user.email ?? "", profile });
      } catch {
        if (unmounted || shownUserId !== userId) return;
        shownUserId = undefined;
        setState({ name: "error" });
      }
    }

    // Fires once with the saved session, then on every sign-in and sign-out.
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      // Supabase asks not to await other Supabase calls inside this callback.
      setTimeout(() => void followSession(session), 0);
    });
    return () => {
      unmounted = true;
      data.subscription.unsubscribe();
    };
  }, []);

  if (state.name === "loading") return <p className="lead">Loading…</p>;
  if (state.name === "signed-out") return <SignInForm />;
  if (state.name === "error") {
    return (
      <p role="alert" className="error">
        We could not load your profile. Check your connection and open the app again.
      </p>
    );
  }

  return (
    <div className="stack">
      <p>Signed in as {state.email}</p>
      <p className="lead">Day 1 of your program: {formatDay(state.profile.programStartDate)}</p>
      <button type="button" className="button-quiet" onClick={() => void browserClient().auth.signOut()}>
        Sign out
      </button>
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
