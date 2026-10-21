"use client";

import type { BundledTown } from "@/content/bundle";
import { twistOf } from "@/core/twist";
import { TownIntroView } from "./town-intro";

/**
 * The first screen of a town (design 4 and 6.1, tickets #36 and #98): a fresh start that names the
 * town and its new battle twist, then the Town Intro when the content has one. It is short, and
 * its words never blame.
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
      {town.intro && <TownIntroView intro={town.intro} headingLevel={3} />}
      {/* Sticky, so a long Town Intro never hides the way on: the button stays at the bottom while the learner reads. */}
      <button type="button" className="button-main start-town" onClick={onStart}>
        Start Town {town.number}
      </button>
    </section>
  );
}
