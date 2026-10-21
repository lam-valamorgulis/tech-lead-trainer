import Link from "next/link";
import { useId } from "react";
import { MAP_SPOTS, MAP_TILES, roadPieces, townState } from "@/core/town-map";
import { PixelSprite } from "../pixel-sprite";
import { HOUSE, HOUSE_PALETTES, STATE_LABEL, StateIcon, TownPin } from "./town-look";

/** 12 pixels shown 4 times larger: 48 px (design 9: whole-number scaling). */
const HOUSE_SCALE = 4;

const percent = (part: number, whole: number) => `${(part / whole) * 100}%`;

/**
 * The drawn map of the 12 towns (design 5, ticket #111). A tap on a town opens its page. Each
 * town is a link at least 44 px tall and wide (UI rule 9); the map picture under it is decoration.
 */
export function TownBoard({ current }: { current: number }) {
  return (
    <div className="town-board" style={{ aspectRatio: `${MAP_TILES.width} / ${MAP_TILES.height}` }}>
      <MapArt />
      <ol className="town-spots" aria-label="The 12 towns">
        {MAP_SPOTS.map(({ number, x, y }) => {
          const state = townState(number, current);
          return (
            <li key={number} className="town-spot" style={{ left: percent(x, MAP_TILES.width), top: percent(y, MAP_TILES.height) }}>
              {state === "current" && <TownPin />}
              <Link href={`/map/${number}`} className={`town town-${state}`} aria-current={state === "current" ? "location" : undefined}>
                <span className="town-house">
                  <PixelSprite art={HOUSE} palette={HOUSE_PALETTES[state]} scale={HOUSE_SCALE} />
                  <StateIcon state={state} />
                </span>
                <span className="town-number">Town {number}</span> <span className="town-state">{STATE_LABEL[state]}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// Decoration in tiles, drawn for this app. Trees and the pond sit between the rows of towns,
// where the road does not pass.
const TREES: [number, number][] = [
  [1, 9],
  [4.5, 9.5],
  [8, 9],
  [11.5, 9.5],
  [14, 9],
  [17.5, 19],
  [21, 19.5],
  [1, 29],
  [4.5, 29.5],
  [8, 29],
  [11.5, 29.5],
  [14, 29],
];
const POND = { x: 9, y: 18.75, width: 6, height: 2.5 };

const COLOURS = {
  grass: "#3f8f4a",
  tuft: "#57a85d",
  roadEdge: "#8a6a3d",
  road: "#d9b77e",
  crown: "#1f5f3a",
  leaf: "#2f7d4a",
  trunk: "#6b4a2b",
  water: "#3a7bd5",
  shine: "#9fd8f5",
};

/** The picture under the towns: grass, the road from town 1 to town 12, trees and a pond. */
function MapArt() {
  const grass = useId();
  const road = roadPieces();
  return (
    <svg className="map-art" viewBox={`0 0 ${MAP_TILES.width} ${MAP_TILES.height}`} shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={grass} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill={COLOURS.grass} />
          <rect x="0.5" y="0.75" width="0.5" height="0.25" fill={COLOURS.tuft} />
          <rect x="2.5" y="2.75" width="0.5" height="0.25" fill={COLOURS.tuft} />
        </pattern>
      </defs>
      <rect width={MAP_TILES.width} height={MAP_TILES.height} fill={`url(#${grass})`} />
      {road.map((piece, i) => (
        <rect key={`edge-${i}`} x={piece.x - 0.25} y={piece.y - 0.25} width={piece.width + 0.5} height={piece.height + 0.5} fill={COLOURS.roadEdge} />
      ))}
      {road.map((piece, i) => (
        <rect key={`road-${i}`} {...piece} fill={COLOURS.road} />
      ))}
      <rect x={POND.x + 1} y={POND.y} width={POND.width - 2} height={POND.height} fill={COLOURS.water} />
      <rect x={POND.x} y={POND.y + 0.5} width={POND.width} height={POND.height - 1} fill={COLOURS.water} />
      <rect x={POND.x + 1.5} y={POND.y + 0.75} width="1" height="0.25" fill={COLOURS.shine} />
      <rect x={POND.x + 3.5} y={POND.y + 1.5} width="1" height="0.25" fill={COLOURS.shine} />
      {TREES.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="2" height="1.5" fill={COLOURS.crown} />
          <rect x={x + 0.25} y={y + 0.25} width="0.75" height="0.5" fill={COLOURS.leaf} />
          <rect x={x + 0.75} y={y + 1.5} width="0.5" height="0.5" fill={COLOURS.trunk} />
        </g>
      ))}
    </svg>
  );
}
