import Link from "next/link";
import { Suspense } from "react";
import { WeekendFromUrl } from "./weekend-from-url";

export default function WeekendTownPage() {
  return (
    <main className="shell">
      <h1>Weekend</h1>
      {/* The town comes from the URL, so it is read at request time inside Suspense. */}
      <Suspense fallback={<p className="lead">Loading…</p>}>
        <WeekendFromUrl />
      </Suspense>
      <Link href="/" className="button button-quiet back">
        Back home
      </Link>
    </main>
  );
}
