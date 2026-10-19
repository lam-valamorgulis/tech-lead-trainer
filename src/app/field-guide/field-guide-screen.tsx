"use client";

import { useEffect, useState } from "react";
import { currentTown } from "@/content";
import { fieldGuideProgress, type CatchRecord, type CreatureStatus } from "@/core/catch";
import { loadCatchRecords } from "@/lib/catch-log";
import { currentLearningDay } from "@/lib/learning-log";
import { browserClient } from "@/lib/supabase/browser";

const STATUS_LABEL: Record<CreatureStatus, string> = {
  caught: "Caught",
  seen: "Seen",
  "not-met": "Not met yet",
};

export function FieldGuideScreen() {
  const [records, setRecords] = useState<CatchRecord[] | null>(null);
  const [failed, setFailed] = useState(false);
  const town = currentTown();

  useEffect(() => {
    let cancelled = false;
    const client = browserClient();
    currentLearningDay(client)
      .then((today) => loadCatchRecords(client, today))
      .then((value) => !cancelled && setRecords(value))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!town) return <p className="lead">No creatures here yet. The town 1 content comes next.</p>;
  if (failed) return <p role="alert" className="error">We could not load your Field Guide. Check your connection.</p>;
  if (!records) return <p className="lead">Loading…</p>;

  const view = fieldGuideProgress(town, records);
  return (
    <>
      <p className="lead">
        {view.townName}: {view.caughtCount} of {view.creatures.length} caught
      </p>
      <ul className="creature-list" aria-label={`Creatures of ${view.townName}`}>
        {view.creatures.map((creature) => (
          <li key={creature.id} className={`creature creature-${creature.status}`}>
            <span className="creature-name">{creature.status === "not-met" ? "???" : creature.name}</span>
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
