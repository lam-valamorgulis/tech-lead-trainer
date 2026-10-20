"use client";

import { useEffect, useState } from "react";
import { getTown } from "@/content";
import type { BattleOffer } from "@/core/battle";
import { GYM_BATTLES, GYM_WINS_NEEDED, gymBattles, gymIsOpen, gymOpensOn, gymProgress } from "@/core/gym";
import { loadBattleHistory } from "@/lib/battle-log";
import { loadCatchRecords } from "@/lib/catch-log";
import { postEvents } from "@/lib/events/post-events";
import { currentLearningDay } from "@/lib/learning-log";
import { browserClient } from "@/lib/supabase/browser";
import { BattleFlow } from "../../battle-flow";
import { formatDay } from "../../format-day";
import { useActiveTime } from "../../use-active-time";

type Loaded = { today: string; battles: BattleOffer[] | null };

/**
 * The town's Gym (design 4 and 5): 5 battles in a row, and 4 wins give the badge. A lost Gym
 * never locks the next town, and it can be tried again any time.
 */
export function GymScreen({ townId, programStartDate }: { townId: string; programStartDate: string }) {
  const town = getTown(townId);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [started, setStarted] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [gymId] = useState(() => crypto.randomUUID());
  const [sessionId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (!town) return;
    let cancelled = false;
    const client = browserClient();
    currentLearningDay(client)
      .then(async (today) => {
        const [catches, history] = await Promise.all([loadCatchRecords(client, today), loadBattleHistory(client, today)]);
        return { today, battles: gymBattles({ town, catches, battles: history.battles }) };
      })
      .then((value) => !cancelled && setLoaded(value))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [town]);

  if (!town) return <p className="lead">This town does not exist.</p>;
  if (failed) return <p role="alert" className="error">We could not load the Gym. Check your connection.</p>;
  if (!loaded) return <p className="lead">Loading…</p>;

  if (!gymIsOpen(programStartDate, town.number, loaded.today)) {
    return (
      <p className="lead">
        The Gym of {town.name} opens on {formatDay(gymOpensOn(programStartDate, town.number))}, in the last week of
        the town.
      </p>
    );
  }
  if (!loaded.battles) {
    return (
      <p className="lead">
        The Gym needs {GYM_BATTLES} battles you can win. Catch more creatures of {town.name} first.
      </p>
    );
  }

  const progress = gymProgress(results);

  if (progress.finished) {
    return (
      <section className="stack" aria-labelledby="gym-end-title">
        <h2 id="gym-end-title">{progress.passed ? `You earned the ${town.name} badge!` : "No badge this time"}</h2>
        <p>
          You won {progress.wins} of {progress.played} battles.
          {progress.passed ? " The badge is on your map." : ` The badge needs ${GYM_WINS_NEEDED} wins. Try again any time.`}
        </p>
        <p className="lead">The next town opens on its own date. The Gym never locks it.</p>
      </section>
    );
  }

  if (!started) {
    return (
      <section className="stack" aria-labelledby="gym-title">
        <h2 id="gym-title">Gym of {town.name}</h2>
        <p>
          {GYM_BATTLES} battles in a row. Win {GYM_WINS_NEEDED} to earn the town badge.
        </p>
        <p className="lead">A lost Gym never locks the next town. You can try again any time.</p>
        <button type="button" className="button-main" onClick={() => setStarted(true)}>
          Start the Gym
        </button>
      </section>
    );
  }

  return (
    <GymRun
      townId={town.id}
      offers={loaded.battles}
      gymId={gymId}
      sessionId={sessionId}
      results={results}
      onResults={setResults}
    />
  );
}

/**
 * A Gym in progress. Its time counts as learning time, like a daily session: it is saved as
 * a 45-minute session, the day for extra battles (design 3).
 */
function GymRun({
  townId,
  offers,
  gymId,
  sessionId,
  results,
  onResults,
}: {
  townId: string;
  offers: BattleOffer[];
  gymId: string;
  sessionId: string;
  results: boolean[];
  onResults: (results: boolean[]) => void;
}) {
  const { snapshot } = useActiveTime(sessionId, 45);
  // One id per Gym battle, so the end of the Gym can list the battles it holds.
  const [battleIds] = useState(() => Array.from({ length: GYM_BATTLES }, () => crypto.randomUUID()));
  const progress = gymProgress(results);

  function finishBattle(won: boolean) {
    const next = [...results, won];
    const end = gymProgress(next);
    if (end.finished) {
      void postEvents([
        snapshot(),
        {
          type: "gym",
          clientEventId: crypto.randomUUID(),
          sessionId,
          occurredAt: new Date().toISOString(),
          gymId,
          townId,
          battleIds: battleIds.slice(0, end.played),
          wins: end.wins,
          passed: end.passed,
        },
      ]);
    }
    onResults(next);
  }

  return (
    <>
      <p className="lead" role="status">
        Gym battle {results.length + 1} of {GYM_BATTLES} · wins {progress.wins}
      </p>
      <BattleFlow
        key={results.length}
        offer={offers[results.length]}
        sessionId={sessionId}
        battleId={battleIds[results.length]}
        onDone={finishBattle}
      />
    </>
  );
}
