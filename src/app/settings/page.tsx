"use client";

import { AuthGate } from "../auth-gate";
import { SettingsScreen } from "./settings-screen";

export default function SettingsPage() {
  return (
    <main className="shell">
      <h1>Settings</h1>
      <AuthGate>{(signedIn) => <SettingsScreen {...signedIn} />}</AuthGate>
    </main>
  );
}
