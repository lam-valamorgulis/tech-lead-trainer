import { portraitPath, type PortraitPerson } from "@/core/portrait";
import { SPRITE_PIXELS } from "@/core/sprite";

/**
 * A person in a battle (design 9 rule 18, #105): a 64 px portrait in a cream frame, not a sprite
 * on a pad. It grows by 1.5 or 2 with no smoothing (design 9). The person's name is always text
 * next to it, so the picture has no alt text.
 */
export function PersonPortrait({ person, scale = 2 }: { person: PortraitPerson; scale?: 1.5 | 2 }) {
  const size = SPRITE_PIXELS * scale;
  return (
    <span className="portrait-frame">
      {/* A plain img: the portrait is 64 px, so an image service adds nothing, and its file must stay exact. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="portrait-art" src={portraitPath(person)} width={size} height={size} alt="" decoding="async" />
    </span>
  );
}
