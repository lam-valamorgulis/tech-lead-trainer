"use client";

import Link from "next/link";
import { AuthGate } from "../auth-gate";
import { TrackingScreen } from "./tracking-screen";

export default function TrackingPage() {
  return (
    <main className="shell">
      <h1>Tracking</h1>
      <AuthGate>{() => <TrackingScreen />}</AuthGate>
      <Link href="/" className="button button-quiet back">
        Back
      </Link>
    </main>
  );
}
