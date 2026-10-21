"use client";

import Link from "next/link";
import { towns, weekendBoss } from "@/content";
import { badges, gymIsOpen, GYM_BATTLES, GYM_WINS_NEEDED, type GymRecord } from "@/core/gym";
import { currentTownNumber, townStartDay, townToPlay } from "@/core/roadmap";
import { townLinks, townState } from "@/core/town-map";
import { formatDay } from "../../format-day";
import { PixelSprite } from "../../pixel-sprite";
import { HOUSE, HOUSE_PALETTES, STATE_LABEL, StateIcon } from "../town-look";
import { useMapDay } from "../use-map-day";

/** The town's house shown 6 times larger: 72 px. */
const HOUSE_SCALE = 6;

/**
 * A town's page (ticket #111): its state, its month, and links to what the town has. A locked
 * town shows when it opens and nothing else, as on the map.
 */
export function TownScreen({ number, programStartDate }: { number: number; programStartDate: string }) {
  const { day, failed } = useMapDay();

  if (failed) return <p role="alert" className="error">We could not load this town. Check your connection.</p>;
  if (!day) return <p className="lead">Loading…</p>;

  const current = currentTownNumber(programStartDate, day.today);
  const state = townState(number, current);
  const town = towns.find((t) => t.number === number);
  const played = townToPlay(towns, current);
  const links = townLinks({
    state,
    town: town && { id: town.id, hasIntro: town.intro !== undefined, hasBoss: weekendBoss(town.id) !== undefined },
    played: played?.number === number,
    gymOpen: town !== undefined && gymIsOpen(programStartDate, number, day.today),
  });
  const startDay = townStartDay(programStartDate, number);

  return (
    <>
      <div className="town-banner">
        <PixelSprite art={HOUSE} palette={HOUSE_PALETTES[state]} scale={HOUSE_SCALE} />
        <div className="stack">
          <p className={`town-state-line town-${state}`}>
            <StateIcon state={state} /> {STATE_LABEL[state]}
          </p>
          <p>
            Month {number} · {state === "locked" ? `opens ${formatDay(startDay)}` : state === "current" ? "your town now" : "past"}
          </p>
        </div>
      </div>
      {state === "current" && played && played.number !== number && (
        <p className="lead">
          Its creatures are not ready yet. You keep playing Town {played.number}: {played.name}.
        </p>
      )}
      {state === "locked" && <p className="lead">Its Town Intro, boss and Gym open with the town.</p>}
      {links.length > 0 && (
        <nav aria-label={`Town ${number}`}>
          <ul className="town-links">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="button button-quiet">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {town && state !== "locked" && <TownBadge townId={town.id} gyms={day.gyms} />}
    </>
  );
}

/** The town's badge, earned in its Gym (ticket #26). The medal is decoration; the words say it all. */
function TownBadge({ townId, gyms }: { townId: string; gyms: GymRecord[] | null }) {
  if (gyms === null) return <p className="lead">We could not load the badge. Check your connection.</p>;
  const badge = badges(gyms).find((earned) => earned.townId === townId);
  if (!badge) {
    return (
      <p className="lead">
        No badge yet. Win {GYM_WINS_NEEDED} of the {GYM_BATTLES} battles in the Gym to earn it.
      </p>
    );
  }
  return (
    <p className="town-badge">
      <span aria-hidden="true">🏅</span> Badge earned · {formatDay(badge.earnedOn)}
    </p>
  );
}
