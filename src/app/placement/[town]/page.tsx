import { Suspense } from "react";
import { PlacementFromUrl } from "./placement-from-url";

export default function PlacementPage() {
  return (
    <main className="shell">
      <h1>Placement test</h1>
      {/* The town comes from the URL, so it is read at request time inside Suspense. */}
      <Suspense fallback={<p className="lead">Loading…</p>}>
        <PlacementFromUrl />
      </Suspense>
    </main>
  );
}
