"use client";

import { useEffect, useState } from "react";
import { SKILLS } from "@/content/skills";
import { LEARNER_PORTRAIT, portraitPath } from "@/core/sprite";
import { formatSkillRate, skillRates, skillsMet, type SkillPick } from "@/core/trainer-card";
import { browserClient } from "@/lib/supabase/browser";
import { loadSkillPicks } from "@/lib/trainer-card-log";

/** The portrait is 64 px. It grows by a whole half step, with no smoothing (design 9). */
const PORTRAIT_SIZE = 96;

/**
 * The Trainer Card (ticket #110, design 2 and 7.7): the learner's portrait and the 26 Skills.
 * Each Skill shows right picks out of times met. A Skill never met is grey and says so in words.
 * No XP and no level.
 */
export function TrainerCardScreen() {
  const picks = useSkillPicks();

  if (picks === "failed") return <p role="alert" className="error">We could not load your Trainer Card. Check your connection.</p>;
  if (!picks) return <p className="lead">Loading…</p>;

  const rates = skillRates(picks);
  return (
    <div className="stack trainer-card">
      <div className="trainer-card-head">
        {/* Design 9 rule 18: a person is a portrait in a frame. The picture is decoration; "You" is the text. */}
        <div className="portrait-frame">
          {/* A plain img: the portrait is 64 px, so an image service adds nothing, and its file must stay exact. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="portrait-art" src={portraitPath(LEARNER_PORTRAIT)} width={PORTRAIT_SIZE} height={PORTRAIT_SIZE} alt="" />
        </div>
        <div>
          <p className="pixel-label trainer-card-name">You</p>
          <p className="trainer-card-met">
            Skills met: {skillsMet(rates)} of {SKILLS.length}
          </p>
        </div>
      </div>
      <p className="lead">
        A rate is your right picks out of the times you met the Skill. In a Battle, the right pick is the best move. In a
        Decision Card or a trade-off question, it is the right option and the right Reason.
      </p>
      <ol className="skill-list" aria-label="Skills">
        {rates.map((rate) => (
          <li key={rate.id} className={rate.met === 0 ? "skill skill-not-met" : "skill"}>
            <span className="skill-name">
              {rate.id}. {rate.name}
            </span>
            <span className="skill-rate">{formatSkillRate(rate)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Every pick that trains a Skill. Undefined while it loads. */
function useSkillPicks(): SkillPick[] | "failed" | undefined {
  const [picks, setPicks] = useState<SkillPick[] | "failed" | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    loadSkillPicks(browserClient())
      .then((value) => !cancelled && setPicks(value))
      .catch(() => !cancelled && setPicks("failed"));
    return () => {
      cancelled = true;
    };
  }, []);
  return picks;
}
