"use client";

import type { RefObject } from "react";
import type { BattleOffer } from "@/core/battle";
import { OPPONENT_HP } from "@/core/battle";
import { BAR_NAMES } from "@/core/battle-v2";
import { PERSON_WORDS } from "@/core/portrait";
import { GlossaryText } from "./glossary-text";
import { PERSON_LOOK } from "./opponent-look";
import { PersonPortrait } from "./person-portrait";

/**
 * The start of a Meeting Battle (#105, design 7.1): the person in a frame, who they are, and
 * the situation. You play alone, so there is no team to pick.
 */
export function MeetingIntro({
  offer,
  heading,
  onStart,
}: {
  offer: BattleOffer;
  heading: RefObject<HTMLHeadingElement | null>;
  onStart: () => void;
}) {
  const { scenario } = offer;
  // The offer gives a Meeting Battle only, and the content check makes its person required.
  const person = scenario.person ?? "client";
  const look = PERSON_LOOK[person];
  const doubt = BAR_NAMES.meeting.opponent;
  return (
    <section className="stack" aria-labelledby="meeting-title">
      <h2 id="meeting-title" ref={heading} tabIndex={-1}>
        A meeting begins: {scenario.name}
      </h2>
      <div className="battle-intro">
        <PersonPortrait person={person} />
        {/* UI rule 7: a colour, an icon and a word. */}
        <p className="opponent-type" style={{ borderColor: look.color }}>
          <span aria-hidden="true" className="opponent-icon">
            {look.icon}
          </span>
          With: {PERSON_WORDS[person].name}
        </p>
      </div>
      <p>
        <GlossaryText text={scenario.problem} />
      </p>
      <p>
        {doubt} {OPPONENT_HP} of {OPPONENT_HP}
      </p>
      <p className="lead">
        Your answers lower the {doubt}. A weak answer costs you {BAR_NAMES.meeting.team}.
      </p>
      <button type="button" className="button-main" onClick={onStart}>
        Start the meeting
      </button>
    </section>
  );
}
