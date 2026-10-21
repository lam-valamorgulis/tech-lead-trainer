import Link from "next/link";
import { Suspense } from "react";
import { TownFromUrl } from "./town-from-url";

/** A town's page, opened from the map (ticket #111): its Town Intro, Field Guide, boss, Gym and badge. */
export default function TownPage() {
  return (
    <main className="shell">
      {/* The town comes from the URL, so it is read at request time inside Suspense. */}
      <Suspense fallback={<p className="lead">Loading…</p>}>
        <TownFromUrl />
      </Suspense>
      <Link href="/map" className="button button-quiet back">
        Back to the map
      </Link>
    </main>
  );
}
