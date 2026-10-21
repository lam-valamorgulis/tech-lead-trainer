// The pixel map of the 12 towns (design 5, ticket #111). Pure functions: where each town sits,
// the road between them, and what a town's page opens. No clock, no database.
import { ROADMAP } from "./roadmap.ts";

export type TownState = "past" | "current" | "locked";

/**
 * The town state rule of the map: the towns before the learner's town are past, the later ones
 * are locked. `currentTown` comes from currentTownNumber, the learner's own month.
 */
export function townState(townNumber: number, currentTown: number): TownState {
  if (townNumber < currentTown) return "past";
  return townNumber === currentTown ? "current" : "locked";
}

/** The map is 3 towns wide and 4 towns tall, so it fits a phone held upright (UI rule 2). */
const COLUMNS = 3;
/** Each town sits in the middle of a cell of 8 x 10 tiles. The taller cell leaves room for the road. */
const CELL = { width: 8, height: 10 };
export const MAP_TILES = { width: COLUMNS * CELL.width, height: (ROADMAP.length / COLUMNS) * CELL.height };

/** A town on the map: its cell, and the centre of the cell in tiles. */
export type MapSpot = { number: number; column: number; row: number; x: number; y: number };

/**
 * The road winds like a snake: left to right on row 1, right to left on row 2, and so on.
 * Each town sits next to the one before it, so the road never crosses the map.
 */
export const MAP_SPOTS: MapSpot[] = ROADMAP.map(({ number }) => {
  const row = Math.floor((number - 1) / COLUMNS);
  const step = (number - 1) % COLUMNS;
  const column = row % 2 === 0 ? step : COLUMNS - 1 - step;
  return { number, column, row, x: column * CELL.width + CELL.width / 2, y: row * CELL.height + CELL.height / 2 };
});

const ROAD_WIDTH = 2;

/** The road in tiles: one straight piece, 2 tiles wide, from each town to the next. */
export function roadPieces(): { x: number; y: number; width: number; height: number }[] {
  return MAP_SPOTS.slice(1).map((spot, i) => {
    const before = MAP_SPOTS[i];
    const left = Math.min(spot.x, before.x) - ROAD_WIDTH / 2;
    const top = Math.min(spot.y, before.y) - ROAD_WIDTH / 2;
    return {
      x: left,
      y: top,
      width: Math.abs(spot.x - before.x) + ROAD_WIDTH,
      height: Math.abs(spot.y - before.y) + ROAD_WIDTH,
    };
  });
}

/** The town number in a page address such as /map/3, or null when it is not one of the 12 towns. */
export function parseTownNumber(text: string): number | null {
  if (!/^[1-9]\d?$/.test(text)) return null;
  const number = Number(text);
  return ROADMAP.some((town) => town.number === number) ? number : null;
}

export type TownLink = { label: string; href: string };

/**
 * What a town's page opens (ticket #111). It links only to what exists: a locked town, or a town
 * with no content yet, opens nothing. The Field Guide shows the town the learner plays now, so
 * only that town links to it. The badge is shown on the page, not linked.
 */
export function townLinks({
  state,
  town,
  played,
  gymOpen,
}: {
  state: TownState;
  /** The town's content, or undefined when it has none yet. */
  town: { id: string; hasIntro: boolean; hasBoss: boolean } | undefined;
  /** The town whose creatures the learner plays now (townToPlay). */
  played: boolean;
  /** From gymIsOpen: the Gym opens in the town's last week, and stays open after. */
  gymOpen: boolean;
}): TownLink[] {
  if (state === "locked" || !town) return [];
  const links: TownLink[] = [];
  if (town.hasIntro) links.push({ label: "Town Intro", href: `/town-intro/${town.id}` });
  if (played) links.push({ label: "Field Guide", href: "/field-guide" });
  if (town.hasBoss) links.push({ label: "Weekend boss", href: `/weekend/${town.id}` });
  if (gymOpen) links.push({ label: "Enter the Gym", href: `/gym/${town.id}` });
  return links;
}
