"use client";

import { useEffect, useState } from "react";
import { creatureOf, towns } from "@/content";
import { formatBestMoveRate, type TurnRecord } from "@/core/battle";
import type { CatchRecord } from "@/core/catch";
import { thirtyDayRate, type SessionSnapshot } from "@/core/day";
import { badges, type GymRecord } from "@/core/gym";
import type { ReviewRecord } from "@/core/review";
import { bestMovesByTown, fieldGuideCounts, learningCalendar, weakestThisWeek } from "@/core/tracking";
import { formatWeek, formatWeekMinutes, weekMinutes } from "@/core/week";
import { loadBattleHistory } from "@/lib/battle-log";
import { loadCatchRecords } from "@/lib/catch-log";
import { loadGymRecords } from "@/lib/gym-log";
import { formatRate, loadRecentSnapshots } from "@/lib/learning-log";
import { loadReviewRecords } from "@/lib/review-log";
import { browserClient } from "@/lib/supabase/browser";
import { BadgeList } from "../badge-list";
import { useWeeklySummary, WeeklySummaryNumbers } from "../weekly-summary";
import { LaterList } from "./later-list";
import { LearningCalendar } from "./learning-calendar";
import { YearGoals } from "./year-goals";

type TrackingLog = {
  today: string;
  snapshots: SessionSnapshot[];
  catches: CatchRecord[];
  reviews: ReviewRecord[];
  turns: TurnRecord[];
  gyms: GymRecord[];
};

/**
 * Every tracking number on one screen (ticket #30, design 2). Each number comes from the rule
 * the rest of the app uses. No streak, and no "days learned this week" (design 14, rule 7).
 */
export function TrackingScreen() {
  const log = useTrackingLog();
  const summary = useWeeklySummary();

  if (log === "failed") return <p role="alert" className="error">We could not load your progress. Check your connection.</p>;
  if (!log) return <p className="lead">Loading…</p>;

  const { today, snapshots, catches, reviews, turns, gyms } = log;
  const counts = fieldGuideCounts(towns, catches, reviews);
  const earned = badges(gyms);
  const bestMoves = bestMovesByTown(turns, towns);
  const weakest = weakestThisWeek(reviews, today, creatureOf);

  return (
    <div className="stack tracking">
      <section className="stack" aria-labelledby="rate-title">
        <h2 id="rate-title">Last 30 days</h2>
        <p>Learned {formatRate(thirtyDayRate(snapshots, today))}</p>
        <p>This week: {formatWeekMinutes(weekMinutes(snapshots, today))}</p>
        <LearningCalendar weeks={learningCalendar(snapshots, today)} />
      </section>

      <section className="stack" aria-labelledby="field-guide-title">
        <h2 id="field-guide-title">Field Guide</h2>
        <ul className="tracking-list" aria-label="Field Guide">
          <li>Seen: {counts.seen}</li>
          <li>Caught: {counts.caught}</li>
          <li>Fully evolved: {counts.fullyEvolved}</li>
        </ul>
      </section>

      <section className="stack" aria-labelledby="badges-title">
        <h2 id="badges-title">Badges</h2>
        <BadgeList earned={earned} />
      </section>

      <section className="stack" aria-labelledby="best-moves-title">
        <h2 id="best-moves-title">Best moves per town</h2>
        {bestMoves.length === 0 ? (
          <p className="lead">No battle turns yet.</p>
        ) : (
          <ul className="tracking-list" aria-label="Best moves per town">
            {bestMoves.map(({ townId, name, rate }) => (
              <li key={townId}>
                {name} · {formatBestMoveRate(rate)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="stack" aria-labelledby="weakest-title">
        <h2 id="weakest-title">Weakest this week</h2>
        {weakest.length === 0 ? (
          <p className="lead">None this week. A creature shows here after an Again or Hard answer.</p>
        ) : (
          <ol className="tracking-list" aria-label="Weakest creatures this week">
            {weakest.map((creature) => (
              <li key={creature.id}>{creature.name}</li>
            ))}
          </ol>
        )}
      </section>

      <section className="stack" aria-labelledby="year-goals-title">
        <h2 id="year-goals-title">Year goals</h2>
        <YearGoals earned={earned} />
      </section>

      <section className="stack" aria-labelledby="summary-title">
        <h2 id="summary-title">Last weekly summary</h2>
        {summary === undefined ? (
          <p className="lead">Loading…</p>
        ) : summary === "failed" ? (
          <p className="error">We could not load the weekly summary. Check your connection.</p>
        ) : summary === null ? (
          <p className="lead">No weekly summary yet. It comes on Sunday at 20:00, after a week with learning.</p>
        ) : (
          <>
            <p>{formatWeek(summary.weekStart)}</p>
            <WeeklySummaryNumbers summary={summary} />
          </>
        )}
      </section>

      <section className="stack" aria-labelledby="later-title">
        <h2 id="later-title">Later</h2>
        <LaterList />
      </section>
    </div>
  );
}

/** The learning log the screen needs. Undefined while it loads. */
function useTrackingLog(): TrackingLog | "failed" | undefined {
  const [log, setLog] = useState<TrackingLog | "failed" | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    const client = browserClient();
    loadRecentSnapshots(client)
      .then(async ({ today, recent }) => {
        const [catches, reviews, history, gyms] = await Promise.all([
          loadCatchRecords(client, today),
          loadReviewRecords(client, today),
          loadBattleHistory(client, today),
          loadGymRecords(client, today),
        ]);
        return { today, snapshots: recent, catches, reviews, turns: history.turns, gyms };
      })
      .then((value) => !cancelled && setLog(value))
      .catch(() => !cancelled && setLog("failed"));
    return () => {
      cancelled = true;
    };
  }, []);
  return log;
}
