"use client";

import Link from "next/link";
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
      <Link href="/" className="button button-quiet back">
        Back home
      </Link>
    </main>
  );
}

type Problem = "no-town" | "offline" | null;

function OpenOwnTown({ programStartDate }: { programStartDate: string }) {
  const router = useRouter();
  const [problem, setProblem] = useState<Problem>(null);
  useEffect(() => {
    let cancelled = false;
    currentLearningDay(browserClient())
      .then((today) => {
        if (cancelled) return;
        const town = currentTown(programStartDate, today);
        if (town) router.replace(`/weekend/${town.id}`);
        else setProblem("no-town");
      })
      .catch(() => !cancelled && setProblem("offline"));
    return () => {
      cancelled = true;
    };
  }, [programStartDate, router]);
  if (problem === "no-town") return <p className="lead">No weekend task yet. Your town has no content.</p>;
  if (problem === "offline") return <p role="alert" className="error">We could not open your weekend task. Check your connection.</p>;
  return <p className="lead">Loading…</p>;
}
