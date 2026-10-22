"use client";

import type { RefObject } from "react";
import type { BattleOffer } from "@/core/battle";
import { OPPONENT_HP } from "@/core/battle";
import { BAR_NAMES } from "@/core/battle-v2";
import { AGENT_SPECIES } from "@/core/sprite";
import { CreatureSprite } from "./creature-sprite";
import { DiffBlock } from "./diff-block";
import { GlossaryText } from "./glossary-text";
import { AGENT_LOOK } from "./opponent-look";

/**
 * The start of an Agent Diff Battle (#106, design 7.1): the AI agent, the situation and the diff
 * it wrote, with one hidden problem. You review alone, so there is no team to pick.
 */
export function AgentDiffIntro({
  offer,
  heading,
  onStart,
}: {
  offer: BattleOffer;
  heading: RefObject<HTMLHeadingElement | null>;
  onStart: () => void;
}) {
  const { scenario } = offer;
  const bars = BAR_NAMES["agent-diff"];
  return (
    <section className="stack" aria-labelledby="agent-diff-title">
      <h2 id="agent-diff-title" ref={heading} tabIndex={-1}>
        A code review begins: {scenario.name}
      </h2>
      <div className="battle-intro">
        <CreatureSprite species={AGENT_SPECIES} />
        {/* UI rule 7: a colour, an icon and a word. */}
        <p className="opponent-type" style={{ borderColor: AGENT_LOOK.color }}>
          <span aria-hidden="true" className="opponent-icon">
            {AGENT_LOOK.icon}
          </span>
          With: {AGENT_LOOK.word}
        </p>
      </div>
      <p>
        <GlossaryText text={scenario.problem} />
      </p>
      {/* The content check makes the diff required in an Agent Diff Battle. */}
      {scenario.diff && <DiffBlock diff={scenario.diff} />}
      <p>
        {bars.opponent} {OPPONENT_HP} of {OPPONENT_HP}
      </p>
      <p className="lead">
        The diff has one hidden problem. Your verdicts lower its {bars.opponent}. A weak verdict costs you {bars.team}.
      </p>
      <button type="button" className="button-main" onClick={onStart}>
        Start the review
      </button>
    </section>
  );
}
