import type { OpponentType } from "@/content/schema";
import type { MeetingPerson } from "@/core/portrait";

/**
 * How each opponent type looks (UI rule 4): a colour, an icon and a word. Every colour has at
 * least 3:1 contrast on --color-bg, as rule 11 asks of UI parts.
 */
export const OPPONENT_LOOK: Record<OpponentType, { word: string; icon: string; color: string }> = {
  traffic: { word: "Traffic", icon: "📈", color: "#ff9f1c" },
  speed: { word: "Speed", icon: "⏱️", color: "#4cc9f0" },
  security: { word: "Security", icon: "🛡️", color: "#ff6b6b" },
  data: { word: "Data", icon: "🗄️", color: "#06d6a0" },
  outage: { word: "Outage", icon: "🔌", color: "#c77dff" },
};

/**
 * How the person of a Meeting Battle looks (#105, UI rule 7): an icon and a colour next to the
 * person's word, as an opponent type has. Each colour has 3:1 contrast on the cream HP box and on --color-bg.
 */
export const PERSON_LOOK: Record<MeetingPerson, { icon: string; color: string }> = {
  client: { icon: "💼", color: "#8a63e8" },
  manager: { icon: "📋", color: "#2a8fa3" },
  cto: { icon: "🧭", color: "#d0602f" },
};
