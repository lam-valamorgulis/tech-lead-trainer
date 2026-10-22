"use client";

import Link from "next/link";
import { badges } from "@/core/gym";
import { currentTownNumber } from "@/core/roadmap";
import { BadgeList } from "../badge-list";
import { TownBoard } from "./town-board";
import { useMapDay } from "./use-map-day";

/** The 12 towns of the year (design 4 and 5). The learner's town comes from their own day 1. */
export function MapScreen({ programStartDate }: { programStartDate: string }) {
  const { day, failed } = useMapDay();

  if (failed) return <p role="alert" className="error">We could not load the map. Check your connection.</p>;
  if (!day) return <p className="lead">Loading…</p>;

  const earned = day.gyms ? badges(day.gyms) : null;
  return (
    <>
      <p className="lead">Tap a town to open it.</p>
      <TownBoard current={currentTownNumber(programStartDate, day.today)} />
      {/* Design 6.2: the System Map is its own screen; the map of the 12 towns stays. */}
      <Link href="/map/system" className="button button-quiet system-map-link">
        System Map
      </Link>
      <section className="stack" aria-labelledby="badges-title">
        <h2 id="badges-title">Badges</h2>
        {earned === null ? <p className="lead">We could not load your badges. Check your connection.</p> : <BadgeList earned={earned} />}
      </section>
    </>
  );
}
