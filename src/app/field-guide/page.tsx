"use client";

import Link from "next/link";
import { AuthGate } from "../auth-gate";
import { FieldGuideScreen } from "./field-guide-screen";

export default function FieldGuidePage() {
  return (
    <main className="shell">
      <h1>Field Guide</h1>
      <AuthGate>{() => <FieldGuideScreen />}</AuthGate>
      <Link href="/" className="button button-quiet back">
        Back
      </Link>
    </main>
  );
}
