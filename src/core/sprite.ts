// Creature art (design 9 rules 18 and 19, ticket #99). Pure functions: no browser.
import type { CreatureStatus } from "./catch.ts";
import type { Stage } from "./review.ts";

/** The pack's sprites are 64 x 64 pixels. They grow by a whole number, with no smoothing. */
export const SPRITE_PIXELS = 64;

export type SpriteSide = "front" | "back";
export type Palette = "normal" | "alt";

/** Stage 1 has the pack's normal colours. Stages 2 and 3 have its second palette: the creature evolved. */
export function paletteForStage(stage: Stage | null): Palette {
  return stage !== null && stage >= 2 ? "alt" : "normal";
}

/** The file of one species in public/sprites/monsters. */
export function spritePath(species: number, side: SpriteSide, palette: Palette): string {
  return `/sprites/monsters/monster-${species}-${side}${palette === "alt" ? "-alt" : ""}.png`;
}

/** How the Field Guide draws a creature (design 9 rule 19): caught in colour, seen in grey, not met as a black shape. */
export type SpriteLook = "color" | "grey" | "shadow";

export function lookForStatus(status: CreatureStatus): SpriteLook {
  return status === "caught" ? "color" : status === "seen" ? "grey" : "shadow";
}
