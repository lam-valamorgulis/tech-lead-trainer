"use client";

import { useMusic } from "../effects";

/**
 * The map loop. It lives in the map layout, so going from the map to a town's page and back
 * keeps the loop playing. It follows the speaker button and the silent switch like every loop.
 */
export function MapMusic() {
  useMusic("map");
  return null;
}
