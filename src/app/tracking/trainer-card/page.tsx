"use client";

import Link from "next/link";
import { AuthGate } from "../../auth-gate";
import { TrainerCardScreen } from "./trainer-card-screen";

export default function TrainerCardPage() {
  return (
    <main className="shell">
      <h1>Trainer Card</h1>
      <AuthGate>{() => <TrainerCardScreen />}</AuthGate>
      <Link href="/tracking" className="button button-quiet back">
        Back
      </Link>
    </main>
  );
}
