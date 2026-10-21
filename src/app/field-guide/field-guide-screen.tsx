"use client";

import { useEffect, useState } from "react";
import { currentTown } from "@/content";
import type { BundledTown } from "@/content/bundle";
import { fieldGuideProgress, type CatchRecord, type CreatureStatus } from "@/core/catch";
import type { ReviewRecord } from "@/core/review";
import { loadCatchRecords } from "@/lib/catch-log";
import { currentLearningDay } from "@/lib/learning-log";
import { loadReviewRecords } from "@/lib/review-log";
import { browserClient } from "@/lib/supabase/browser";
import { CreatureSprite } from "../creature-sprite";

const STATUS_LABEL: Record<CreatureStatus, string> = {
  caught: "Caught",
  seen: "Seen",
  "not-met": "Not met yet",
};

type FieldGuideData = { town: BundledTown | undefined; catches: CatchRecord[]; reviews: ReviewRecord[] };

export function FieldGuideScreen({ programStartDate }: { programStartDate: string }) {
  const [records, setRecords] = useState<FieldGuideData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const client = browserClient();
    currentLearningDay(client)
      .then(async (today) => {
        const [catches, reviews] = await Promise.all([loadCatchRecords(client, today), loadReviewRecords(client, today)]);
        return { town: currentTown(programStartDate, today), catches, reviews };
      })
      .then((value) => !cancelled && setRecords(value))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [programStartDate]);

  if (failed) return <p role="alert" className="error">We could not load your Field Guide. Check your connection.</p>;
  if (!records) return <p className="lead">Loading…</p>;
  if (!records.town) return <p className="lead">No creatures here yet. The content for your town comes next.</p>;

  const view = fieldGuideProgress(records.town, records.catches, records.reviews);
  return (
    <>
      <p className="lead">
        {view.townName}: {view.caughtCount} of {view.creatures.length} caught
      </p>
      {/* Design 9 rule 19: caught in colour, seen in grey, not met as a black shape with "???". */}
      <ul className="creature-list field-guide-grid" aria-label={`Creatures of ${view.townName}`}>
        {view.creatures.map((creature) => (
          <li key={creature.id} className={`creature creature-${creature.status} creature-stage-${creature.stage ?? 0}`}>
            <CreatureSprite species={creature.sprite} status={creature.status} stage={creature.stage} scale={1.5} />
            <span className="creature-name">
              {creature.stage !== null && (
                <span className="creature-sprite" aria-hidden="true">
                  {"★".repeat(creature.stage)}
                </span>
              )}
              {creature.status === "not-met" ? "???" : creature.name}
            </span>
            <span className="creature-status">
              {STATUS_LABEL[creature.status]}
              {creature.stage !== null && ` · stage ${creature.stage}`}
              {creature.movesTotal > 0 && ` · moves ${creature.movesCaught}/${creature.movesTotal}`}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
