// Creature art (design 9 rules 18 and 19, ticket #99). Pure functions: no browser.
import type { OpponentType } from "../content/schema.ts";
import type { CreatureStatus } from "./catch.ts";
import type { Stage } from "./review.ts";

/**
 * The species that plays the opponent of a Battle, by its type (#103). An opponent is a problem,
 * not a concept, so no creature may use these species (the content check refuses it). Each one
 * fits its type: a long serpent for Traffic, a bat for Speed, a spider for Security, a crab
 * holding its shell for Data, a bug for Outage.
 */
export const OPPONENT_SPECIES: Record<OpponentType, number> = { traffic: 11, speed: 14, security: 53, data: 45, outage: 15 };

/**
 * The species of the AI agent, the opponent of an Agent Diff Battle (#106): a small blue creature
 * with antennae like network nodes. The approved prototype used species 33, which a Town 2
 * creature now has. Like the opponents above, no creature may use it.
 */
export const AGENT_SPECIES = 3;

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

/**
 * The portraits of people (design 9 rule 18): 64 px pictures from peb's "64px portraits" pack in
 * public/sprites/portraits. The learner is portrait 3, as in the approved prototype.
 */
export const PORTRAIT_COUNT = 15;
export const LEARNER_PORTRAIT = 3;

/** The file of one portrait in public/sprites/portraits. */
export function portraitPath(portrait: number): string {
  return `/sprites/portraits/portrait-${portrait}.png`;
}

/** How the Field Guide draws a creature (design 9 rule 19): caught in colour, seen in grey, not met as a black shape. */
export type SpriteLook = "color" | "grey" | "shadow";

export function lookForStatus(status: CreatureStatus): SpriteLook {
  return status === "caught" ? "color" : status === "seen" ? "grey" : "shadow";
}
