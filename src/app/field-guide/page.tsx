import type { Metadata } from "next";
import Link from "next/link";
import { currentTown } from "@/content";
import { fieldGuide } from "@/content/field-guide";

export const metadata: Metadata = { title: "Field Guide" };

export default function FieldGuidePage() {
  const town = currentTown();
  const view = town ? fieldGuide(town) : undefined;

  return (
    <main className="shell">
      <h1>Field Guide</h1>
      {view && view.creatures.length > 0 ? (
        <>
          <p className="lead">{view.townName}</p>
          <ul className="creature-list" aria-label={`Creatures of ${view.townName}`}>
            {view.creatures.map((creature) => (
              <li key={creature.id}>{creature.name}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="lead">No creatures here yet. The town 1 content comes next.</p>
      )}
      <Link href="/" className="button button-quiet">
        Back
      </Link>
    </main>
  );
}
