"use client";

import { useParams } from "next/navigation";
import { getTown } from "@/content";
import { currentTownNumber } from "@/core/roadmap";
import { currentLearningDay } from "@/lib/learning-log";
import { browserClient } from "@/lib/supabase/browser";
import { useEffect, useState } from "react";
import { AuthGate } from "../../auth-gate";
import { TownIntroView } from "../../town-intro";

export function TownIntroFromUrl() {
  const { town: id } = useParams<{ town: string }>();
  return <AuthGate>{({ profile }) => <TownIntroOfTown id={id} programStartDate={profile.programStartDate} />}</AuthGate>;
}

/** Like the map: the Town Intro of the learner's town and the towns before it, never a town not reached yet. */
function TownIntroOfTown({ id, programStartDate }: { id: string; programStartDate: string }) {
  const town = getTown(id);
  const [current, setCurrent] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    currentLearningDay(browserClient())
      .then((today) => !cancelled && setCurrent(currentTownNumber(programStartDate, today)))
      .catch(() => !cancelled && setCurrent(0));
    return () => {
      cancelled = true;
    };
  }, [programStartDate]);

  if (!town?.intro) return <p className="lead">This town has no Town Intro.</p>;
  if (current === null) return <p className="lead">Loading…</p>;
  if (town.number > current) return <p className="lead">Town {town.number} is not open yet.</p>;
  return (
    <>
      <p className="lead">
        Town {town.number}: {town.name}
      </p>
      <TownIntroView intro={town.intro} headingLevel={2} />
    </>
  );
}
