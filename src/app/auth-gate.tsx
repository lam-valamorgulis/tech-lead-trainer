"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { ensureProfile, type Profile } from "@/lib/profile";
import { browserClient } from "@/lib/supabase/browser";
import { SignInForm } from "./sign-in-form";

export type SignedIn = {
  userId: string;
  email: string;
  profile: Profile;
  /** Call after the profile changes, so every screen shows the new values. */
  setProfile: (profile: Profile) => void;
};

type State =
  | { name: "loading" }
  | { name: "signed-out" }
  | { name: "signed-in"; userId: string; email: string; profile: Profile }
  | { name: "error" };

/** Shows the sign-in form until someone is signed in, then the screen in `children`. */
export function AuthGate({ children }: { children: (signedIn: SignedIn) => ReactNode }) {
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
        setState({ name: "signed-in", userId, email: session.user.email ?? "", profile });
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
  return children({
    userId: state.userId,
    email: state.email,
    profile: state.profile,
    setProfile: (profile) => setState({ ...state, profile }),
  });
}
