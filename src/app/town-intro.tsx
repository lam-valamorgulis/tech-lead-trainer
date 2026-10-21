"use client";

import type { TownIntro } from "@/content/schema";
import { ContentDiagram } from "./content-diagram";
import { GlossaryText } from "./glossary-text";

/** The big picture of a town (design 6.1): its short paragraphs, one diagram and the source. About 3 minutes. */
export function TownIntroView({ intro, headingLevel }: { intro: TownIntro; headingLevel: 2 | 3 }) {
  const Title = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="card stack town-intro">
      <p className="pixel-label">Town Intro · about 3 minutes</p>
      <Title>{intro.title}</Title>
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
