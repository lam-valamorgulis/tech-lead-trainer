import { towns } from "@/content";
import { ROADMAP } from "@/core/roadmap";
import type { TownState } from "@/core/town-map";

// The look of a town on the map and on its page. Each state has a colour, an icon and a word
// (UI rule 7): the colour is never the only sign.

export const STATE_LABEL: Record<TownState, string> = { past: "Past", current: "You are here", locked: "Not open yet" };

/** A town with content uses its own name, so the map and the town never disagree. */
export function townName(number: number): string {
  return towns.find((town) => town.number === number)?.name ?? ROADMAP[number - 1].name;
}

// A 12 x 12 house. R = roof, W = wall, D = door, G = ground. Drawn for this app.
export const HOUSE = [
  "....RRRR....",
  "...RRRRRR...",
  "..RRRRRRRR..",
  ".RRRRRRRRRR.",
  "RRRRRRRRRRRR",
  ".WWWWWWWWWW.",
  ".WWDDWWWWWW.",
  ".WWDDWWWWWW.",
  ".WWDDWWWWWW.",
  ".WWDDWWWWWW.",
  ".WWDDWWWWWW.",
  "GGGGGGGGGGGG",
];

export const HOUSE_PALETTES: Record<TownState, Record<string, string>> = {
  current: { R: "#ffd166", W: "#f4f3ff", D: "#14132b", G: "#06d6a0" },
  past: { R: "#06d6a0", W: "#b9b6d9", D: "#14132b", G: "#06d6a0" },
  // The roof and ground keep 3:1 contrast on the background (UI rule 16).
  locked: { R: "#6f6ba0", W: "#4a4770", D: "#14132b", G: "#6f6ba0" },
};

// 7 x 7 pixel icons, drawn for this app: a tick for past, a star for here, a padlock for locked.
const ICONS: Record<TownState, string[]> = {
  past: ["......X", ".....XX", "X...XX.", "XX.XX..", ".XXX...", "..X....", "......."],
  current: ["...X...", "...X...", "XXXXXXX", ".XXXXX.", "..XXX..", ".XX.XX.", "XX...XX"],
  locked: ["..XXX..", ".X...X.", ".X...X.", "XXXXXXX", "XXX.XXX", "XXX.XXX", "XXXXXXX"],
};

/** The icon of a town state, in the colour of the text around it. The word next to it names the state. */
export function StateIcon({ state }: { state: TownState }) {
  return <PixelIcon rows={ICONS[state]} className={`state-icon state-icon-${state}`} />;
}

// The "You are here" pin over the current town: an arrow that points down.
const PIN = ["XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."];

export function TownPin() {
  return <PixelIcon rows={PIN} className="town-pin" />;
}

function PixelIcon({ rows, className }: { rows: string[]; className: string }) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${rows[0].length} ${rows.length}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {rows.flatMap((row, y) =>
        [...row].map((letter, x) => (letter === "X" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" /> : null)),
      )}
    </svg>
  );
}
