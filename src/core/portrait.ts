// People in battles (design 9 rule 18, ticket #105): a framed pixel portrait, not a sprite on a pad.
// The portraits are peb's "64px portraits" (CC-BY 4.0), named on the Credits screen (#99).
import type { MEETING_PEOPLE } from "../content/schema.ts";

export type MeetingPerson = (typeof MEETING_PEOPLE)[number];

/** Who a portrait shows: the person on the other side of a Meeting Battle, or You. */
export type PortraitPerson = MeetingPerson | "you";

/**
 * The portrait of each person, by its number in public/sprites/portraits. You (3) and the
 * client (11) are the two portraits of the approved prototype. The manager and the CTO are two
 * calm, grown-up faces from the same pack. A portrait is display only: no log stores it.
 */
export const PORTRAITS: Record<PortraitPerson, number> = { you: 3, client: 11, manager: 13, cto: 14 };

/** The words for each person on the screen: the HP box, the threat label and the result lines. */
export const PERSON_WORDS: Record<MeetingPerson, { name: string; the: string }> = {
  client: { name: "Client", the: "The client" },
  manager: { name: "Manager", the: "Your manager" },
  cto: { name: "CTO", the: "The CTO" },
};

/** The file of one portrait in public/sprites/portraits. */
export function portraitPath(person: PortraitPerson): string {
  return `/sprites/portraits/portrait-${PORTRAITS[person]}.png`;
}
