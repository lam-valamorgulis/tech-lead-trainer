"use client";

import type { BundledTown } from "@/content/bundle";
import type { TownIntro } from "@/content/schema";
import { twistOf } from "@/core/twist";
import { ContentDiagram } from "./content-diagram";
import { GlossaryText } from "./glossary-text";

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
      {town.intro && <TownIntroView intro={town.intro} />}
      <button type="button" className="button-main" onClick={onStart}>
        Start Town {town.number}
      </button>
    </section>
  );
}

/** The big picture of a town: a few short screens, one diagram and the source. About 3 minutes. */
export function TownIntroView({ intro }: { intro: TownIntro }) {
  return (
    <div className="card stack town-intro">
      <p className="pixel-label">Town Intro · about 3 minutes</p>
      <h3>{intro.title}</h3>
      <ContentDiagram source={intro.diagram} />
      {intro.screens.map((screen, index) => (
        <p key={index}>
          <GlossaryText text={screen} />
        </p>
      ))}
      <p>
        <a href={intro.source.url} target="_blank" rel="noopener noreferrer">
          Source: {intro.source.title}
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      </p>
    </div>
  );
}
