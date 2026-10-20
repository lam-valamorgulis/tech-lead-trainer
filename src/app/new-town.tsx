"use client";

import type { BundledTown } from "@/content/bundle";
import { twistOf } from "@/core/twist";

/**
 * The "new town" screen (design 4, ticket #36): a fresh start on the first learning day in a new
 * town. It names the town and its new battle twist. It is short, and its words never blame.
 */
export function NewTown({ town, onStart }: { town: BundledTown; onStart: () => void }) {
  const twist = twistOf(town);
  return (
    <section className="commit" aria-labelledby="new-town-title">
      <h2 id="new-town-title">Welcome to Town {town.number}</h2>
      <p>
        <strong>{town.name}</strong>
      </p>
      <p>A new town is a fresh start: new creatures and new battles.</p>
      {twist && (
        <div className="notice stack">
          <p>
            <strong>New this month: {twist.name}.</strong>
          </p>
          <p>
            {twist.rule} {twist.damageRule}
          </p>
        </div>
      )}
      <button type="button" className="button-main" onClick={onStart}>
        Start Town {town.number}
      </button>
    </section>
  );
}
