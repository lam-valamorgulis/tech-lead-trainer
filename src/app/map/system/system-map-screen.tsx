"use client";

import { Fragment, useEffect, useState } from "react";
import { towns } from "@/content";
import type { CatchRecord } from "@/core/catch";
import type { ReviewRecord } from "@/core/review";
import { HIDDEN_NAME, systemMap, type SystemMapCreature } from "@/core/system-map";
import { loadCatchRecords } from "@/lib/catch-log";
import { currentLearningDay } from "@/lib/learning-log";
import { loadReviewRecords } from "@/lib/review-log";
import { browserClient } from "@/lib/supabase/browser";
import { CreatureSprite } from "../../creature-sprite";

type Records = { catches: CatchRecord[]; reviews: ReviewRecord[] };

/**
 * The System Map (design 6.2, ticket #112): the places of one web system from top to bottom, the
 * links between them, and an outer ring. Each caught creature sits at its place as a small sprite.
 * A place with no caught creature shows "???". The places are a list, not a picture, so they never
 * overlap and the page scrolls on a small phone.
 */
export function SystemMapScreen() {
  const [records, setRecords] = useState<Records | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const client = browserClient();
    currentLearningDay(client)
      .then(async (today) => {
        const [catches, reviews] = await Promise.all([loadCatchRecords(client, today), loadReviewRecords(client, today)]);
        return { catches, reviews };
      })
      .then((value) => !cancelled && setRecords(value))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) return <p role="alert" className="error">We could not load your System Map. Check your connection.</p>;
  if (!records) return <p className="lead">Loading…</p>;

  const view = systemMap(towns, records.catches, records.reviews);
  return (
    <>
      <p className="lead">
        {view.caughtCount === 0
          ? "Catch a creature to see where it lives in a real web system."
          : `${view.caughtCount} caught ${view.caughtCount === 1 ? "creature sits" : "creatures sit"} in a real web system. A request goes from the top down.`}
      </p>
      <div className="system-map">
        <ol className="system-chain" aria-label="The places of the system, from the browser down">
          {view.places.map((place, i) => {
            const edge = view.edges[i];
            return (
              <Fragment key={place.id}>
                <li className={`system-place${place.name === null ? " system-place-hidden" : ""}`} data-node={place.id}>
                  <h2 className="system-place-name">{place.name ?? HIDDEN_NAME}</h2>
                  {place.hint && <p className="system-place-hint">{place.hint}</p>}
                  <CreatureRow creatures={place.creatures} label={`Creatures at ${place.name ?? HIDDEN_NAME}`} />
                </li>
                {/* The link to the next place: an arrow, and the creatures that sit on it. */}
                {edge && (
                  <li className="system-edge" data-node={edge.id} aria-hidden={edge.creatures.length === 0 ? true : undefined}>
                    <span className="system-arrow" aria-hidden="true" />
                    {edge.creatures.length > 0 && (
                      <div className="system-edge-body">
                        <p className="pixel-label system-edge-label">{edge.label}</p>
                        <CreatureRow creatures={edge.creatures} label={`Creatures on the link: ${edge.label}`} />
                      </div>
                    )}
                  </li>
                )}
              </Fragment>
            );
          })}
        </ol>
        {/* The outer ring: towns that are not one part of the system, such as Testing and Security. */}
        <section className={`system-ring${view.ring.name === null ? " system-place-hidden" : ""}`} data-node={view.ring.id}>
          <h2 className="system-place-name">{view.ring.name ?? HIDDEN_NAME}</h2>
          {view.ring.hint && <p className="system-place-hint">{view.ring.hint}</p>}
          <CreatureRow creatures={view.ring.creatures} label="Creatures around the system" />
        </section>
      </div>
    </>
  );
}

/** The creatures at one place. A sprite is 64 px, shown 1 time: whole-number scaling (design 9). */
function CreatureRow({ creatures, label }: { creatures: SystemMapCreature[]; label: string }) {
  if (creatures.length === 0) return null;
  return (
    <ul className="system-creatures" aria-label={label}>
      {creatures.map((creature) => (
        <li key={creature.id} className="system-creature" data-creature={creature.id}>
          <CreatureSprite species={creature.sprite} stage={creature.stage} scale={1} />
          <span className="system-creature-name">{creature.name}</span>
        </li>
      ))}
    </ul>
  );
}
