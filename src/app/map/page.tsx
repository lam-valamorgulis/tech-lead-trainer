"use client";

import Link from "next/link";
import { AuthGate } from "../auth-gate";
import { MapScreen } from "./map-screen";

export default function MapPage() {
  return (
    <main className="shell">
      <h1>Map</h1>
      <AuthGate>{({ profile }) => <MapScreen programStartDate={profile.programStartDate} />}</AuthGate>
      <Link href="/" className="button button-quiet back">
        Back
      </Link>
    </main>
  );
}
