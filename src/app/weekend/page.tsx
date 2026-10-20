"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { currentTown } from "@/content";
import { currentLearningDay } from "@/lib/learning-log";
import { browserClient } from "@/lib/supabase/browser";
import { AuthGate } from "../auth-gate";

/** Home links here. It opens the weekend page of the learner's own town. */
export default function WeekendPage() {
  return (
    <main className="shell">
      <h1>Weekend</h1>
      <AuthGate>{({ profile }) => <OpenOwnTown programStartDate={profile.programStartDate} />}</AuthGate>
    </main>
  );
}

function OpenOwnTown({ programStartDate }: { programStartDate: string }) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    currentLearningDay(browserClient())
      .then((today) => {
        const town = currentTown(programStartDate, today);
        if (town) router.replace(`/weekend/${town.id}`);
        else setFailed(true);
      })
      .catch(() => setFailed(true));
  }, [programStartDate, router]);
  return <p className="lead">{failed ? "No weekend task yet. Check your connection." : "Loading…"}</p>;
}
