import { lookForStatus, paletteForStage, spritePath, SPRITE_PIXELS, type SpriteSide } from "@/core/sprite";
import type { CreatureStatus } from "@/core/catch";
import type { Stage } from "@/core/review";

/**
 * A creature from the CC0 monster pack (design 9 rules 18 and 19). It grows by a whole number with
 * no smoothing. Stages 2 and 3 use the pack's second palette. In the Field Guide, a creature seen
 * but not caught is grey, and one not met is a black shape. The picture is decoration: the name
 * and the status are always text next to it, so it has no alt text.
 */
export function CreatureSprite({
  species,
  side = "front",
  stage = null,
  status = "caught",
  scale = 2,
}: {
  species: number | undefined;
  side?: SpriteSide;
  stage?: Stage | null;
  status?: CreatureStatus;
  scale?: number;
}) {
  if (species === undefined) return null;
  const size = SPRITE_PIXELS * scale;
  return (
    // A plain img: the sprite is 64 px, so an image service adds nothing, and its file must stay exact.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`creature-art look-${lookForStatus(status)}`}
      src={spritePath(species, side, paletteForStage(stage))}
      width={size}
      height={size}
      alt=""
      decoding="async"
    />
  );
}
