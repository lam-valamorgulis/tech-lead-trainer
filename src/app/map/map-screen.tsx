"use client";

import { useEffect, useState } from "react";
import { towns } from "@/content";
import { currentTownNumber, ROADMAP, townStartDay, townToPlay } from "@/core/roadmap";
import { currentLearningDay } from "@/lib/learning-log";
import { browserClient } from "@/lib/supabase/browser";
import { PixelSprite } from "../pixel-sprite";
import { formatDay } from "../format-day";

type TownState = "past" | "current" | "locked";

const STATE_LABEL: Record<TownState, string> = { past: "Past", current: "You are here", locked: "Not open yet" };

// A 12 x 12 house. R = roof, W = wall, D = door, G = ground.
const HOUSE = [
  "....RRRR....",
  "...RRRRRR...",
  "..RRRRRRRR..",
  ".RRRRRRRRRR.",
  "RRRRRRRRRRRR",
  ".WWWWWWWWWW.",
  ".WWDDWWWWWW.",
  ".WWDDWWWWWW.",
  ".WWDDWWWWWW.",
  ".WWDDWWWWWW.",
  ".WWDDWWWWWW.",
  "GGGGGGGGGGGG",
];

const PALETTES: Record<TownState, Record<string, string>> = {
  current: { R: "#ffd166", W: "#f4f3ff", D: "#14132b", G: "#06d6a0" },
  past: { R: "#06d6a0", W: "#b9b6d9", D: "#14132b", G: "#06d6a0" },
  // The roof and ground keep 3:1 contrast on the background (UI rule 11).
  locked: { R: "#6f6ba0", W: "#4a4770", D: "#14132b", G: "#6f6ba0" },
};

/** 12 pixels shown 4 times larger: 48 px, a full tap target (UI rule 6). */
const SPRITE_SCALE = 4;

/** The 12 towns of the year (design 4). The learner's town comes from their own day 1. */
export function MapScreen({ programStartDate }: { programStartDate: string }) {
  const [today, setToday] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    currentLearningDay(browserClient())
      .then((day) => !cancelled && setToday(day))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) return <p role="alert" className="error">We could not load the map. Check your connection.</p>;
  if (!today) return <p className="lead">Loading…</p>;

  const current = currentTownNumber(programStartDate, today);
  const stateOf = (number: number): TownState => (number < current ? "past" : number === current ? "current" : "locked");
  const shown = ROADMAP.find((town) => town.number === (picked ?? current))!;
  // A town with content uses its own name, so the map and the town never disagree.
  const nameOf = (number: number) => towns.find((town) => town.number === number)?.name ?? ROADMAP[number - 1].name;
  const played = townToPlay(towns, current);

  return (
    <>
      <ol className="town-map" aria-label="The 12 towns">
        {ROADMAP.map(({ number }) => {
          const state = stateOf(number);
          return (
            <li key={number}>
              <button
                type="button"
                className={`town town-${state}`}
                aria-pressed={number === shown.number}
                onClick={() => setPicked(number)}
              >
                <PixelSprite art={HOUSE} palette={PALETTES[state]} scale={SPRITE_SCALE} />
                <span className="town-number">Town {number}</span> <span className="town-state">{STATE_LABEL[state]}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <section className="card stack" aria-live="polite" aria-labelledby="town-title">
        <h2 id="town-title">
          Town {shown.number}: {nameOf(shown.number)}
        </h2>
        <p>
          Month {shown.number} · {monthNote(stateOf(shown.number), townStartDay(programStartDate, shown.number))}
        </p>
        {shown.number === current && played && played.number !== current && (
          <p className="lead">
            Its creatures are not ready yet. You keep playing Town {played.number}: {played.name}.
          </p>
        )}
      </section>
    </>
  );
}

function monthNote(state: TownState, startDay: string): string {
  if (state === "current") return "your town now";
  if (state === "past") return "past";
  return `opens ${formatDay(startDay)}`;
}
