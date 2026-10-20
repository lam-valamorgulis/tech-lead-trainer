import { towns } from "@/content";
import { formatDay } from "./format-day";

/** The badges earned (ticket #26), on the map and the tracking screen. The medal is decoration. */
export function BadgeList({ earned }: { earned: { townId: string; earnedOn: string }[] }) {
  if (earned.length === 0) {
    return <p className="lead">No badges yet. Win 4 of the 5 battles in a town&apos;s Gym to earn one.</p>;
  }
  return (
    <ul className="badge-list" aria-label="Badges">
      {earned.map(({ townId, earnedOn }) => {
        const town = towns.find((t) => t.id === townId);
        return (
          <li key={townId}>
            <span aria-hidden="true">🏅</span> {town ? `Town ${town.number}: ${town.name}` : townId} · {formatDay(earnedOn)}
          </li>
        );
      })}
    </ul>
  );
}
