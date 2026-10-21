import Link from "next/link";
import { Suspense } from "react";
import { TownIntroFromUrl } from "./town-intro-from-url";

/** The Town Intro again, opened from the map (design 6.1, ticket #98). */
export default function TownIntroPage() {
  return (
    <main className="shell">
      <h1>Town Intro</h1>
      {/* The town comes from the URL, so it is read at request time inside Suspense. */}
      <Suspense fallback={<p className="lead">Loading…</p>}>
        <TownIntroFromUrl />
      </Suspense>
      <Link href="/map" className="button button-quiet back">
        Back to the map
      </Link>
    </main>
  );
}
