import Link from "next/link";
import { Suspense } from "react";
import { GymFromUrl } from "./gym-from-url";

export default function GymPage() {
  return (
    <main className="shell">
      <h1>Gym</h1>
      {/* The town comes from the URL, so it is read at request time inside Suspense. */}
      <Suspense fallback={<p className="lead">Loading…</p>}>
        <GymFromUrl />
      </Suspense>
      <Link href="/" className="button button-quiet back">
        Back home
      </Link>
    </main>
  );
}
