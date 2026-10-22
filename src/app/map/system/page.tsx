"use client";

import Link from "next/link";
import { AuthGate } from "../../auth-gate";
import { SilentModeHint, SpeakerButton } from "../../speaker-button";
import { SystemMapScreen } from "./system-map-screen";

/** The System Map (design 6.2, ticket #112): its own screen, next to the map of the 12 towns. */
export default function SystemMapPage() {
  return (
    <main className="shell">
      <h1>System Map</h1>
      {/* The map music plays here too, so the speaker button and the silent-mode line come with it. */}
      <AuthGate>
        {(signedIn) => (
          <>
            <SpeakerButton {...signedIn} />
            <SilentModeHint />
            <SystemMapScreen />
          </>
        )}
      </AuthGate>
      <Link href="/map" className="button button-quiet back">
        Back to the map
      </Link>
    </main>
  );
}
