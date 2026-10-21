"use client";

import Link from "next/link";
import { AuthGate } from "../auth-gate";
import { SilentModeHint, SpeakerButton } from "../speaker-button";
import { MapScreen } from "./map-screen";

// The map music plays from the map layout, so it goes on without a break into a town's page.
export default function MapPage() {
  return (
    <main className="shell">
      <h1>Map</h1>
      <AuthGate>
        {(signedIn) => (
          <>
            <SpeakerButton {...signedIn} />
            <SilentModeHint />
            <MapScreen programStartDate={signedIn.profile.programStartDate} />
          </>
        )}
      </AuthGate>
      <Link href="/" className="button button-quiet back">
        Back
      </Link>
    </main>
  );
}
