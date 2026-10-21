"use client";

import Link from "next/link";
import { AuthGate } from "../auth-gate";
import { useMusic } from "../effects";
import { SpeakerButton } from "../speaker-button";
import { MapScreen } from "./map-screen";

export default function MapPage() {
  useMusic("map");
  return (
    <main className="shell">
      <h1>Map</h1>
      <AuthGate>
        {(signedIn) => (
          <>
            <SpeakerButton {...signedIn} />
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
