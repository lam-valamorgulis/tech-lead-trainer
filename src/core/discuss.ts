// "Discuss in Claude" and the teach-back (design 10, ticket #19). Pure functions: no clock, no browser.
import type { Card } from "../content/schema.ts";
import { battleProgress, counterattackSentence, creatureOf, damageLabel, MAX_TURNS, OPPONENT_HP, type BattleState } from "./battle.ts";
import type { LearningDay } from "./day.ts";
import type { ReviewRecord } from "./review.ts";

/** Where the package goes. The app copies first, then opens this page (design 10). */
export const CLAUDE_NEW_CHAT = "https://claude.ai/new";

/** The coach prompt of design section 10, word for word. */
export const COACH_PROMPT =
  "You are my tech lead coach. Below is my battle and the model answer. Do not show the model answer yet. Ask me ONE question at a time about my choice and my why. Wait for my reply. Give hints, not solutions. After three rounds, compare my thinking with the model answer. Then ask me to explain the trade-off again in my own words. Show me two English mistakes and ask me to fix them.";

/** The first line of every package (design 3): the Pro account is personal, so work details stay out. */
export const PRIVACY_REMINDER =
  "Privacy reminder: this text goes to your personal Claude account. Before you send it, remove client names, company code and internal numbers.";

/** What the package needs to know about a creature or a move: its name and its card. */
export type ItemOf = (id: string) => { name: string; card: Card } | undefined;

export type DiscussInput = {
  battle: BattleState;
  /** The "why" of each turn, by turn number. */
  whys: Record<number, string>;
  /** The key points (1 to 3) the learner ticked on each turn, by turn number. */
  ticks: Record<number, number[]>;
  itemOf: ItemOf;
};

const word = (type: string) => type.charAt(0).toUpperCase() + type.slice(1);

/** The best move of each played turn: the one row with the top damage (the content checker makes sure). */
function bestMoveIds(battle: BattleState): string[] {
  return battle.turns.map(({ turnNumber }) =>
    battle.scenario.turns[turnNumber - 1].moves.reduce((best, row) => (row.damage > best.damage ? row : best)).moveId,
  );
}

/**
 * The Markdown the learner pastes into a new Claude chat. It holds the learner's own words and
 * the content only: never an email, a user id or a battle id. The coach prompt says "Below is my
 * battle", so it comes right after the privacy reminder, before the battle.
 */
export function discussPackage({ battle, whys, ticks, itemOf }: DiscussInput): string {
  const name = (id: string) => itemOf(id)?.name ?? id;
  const progress = battleProgress(battle);
  const result = progress.won
    ? `I won in ${battle.turns.length} turn${battle.turns.length === 1 ? "" : "s"}.`
    : `I lost. The opponent still had HP ${progress.hp} of ${OPPONENT_HP} after ${MAX_TURNS} turns.`;

  const turns = battle.turns.map((turn) => {
    const content = battle.scenario.turns[turn.turnNumber - 1];
    const move = turn.moveId ? `${name(turn.moveId)} (${name(creatureOf(turn.moveId))})` : "none of my moves fit this threat";
    return [
      `## Turn ${turn.turnNumber}`,
      "",
      `- Threat: ${content.threat}`,
      `- My move: ${move}`,
      `- My why: ${whys[turn.turnNumber] ?? ""}`,
      `- Damage: ${damageLabel(turn.damage)}`,
      `- Counterattack: ${counterattackSentence(turn.moveId && name(turn.moveId), turn.counterattack)}`,
      `- Key points I said: ${(ticks[turn.turnNumber] ?? []).length} of ${content.keyPoints.length}`,
    ].join("\n");
  });

  const answers = battle.turns.map(({ turnNumber }) => {
    const content = battle.scenario.turns[turnNumber - 1];
    const ticked = ticks[turnNumber] ?? [];
    const points = content.keyPoints.map((point, index) => `- [${ticked.includes(index + 1) ? "x" : " "}] ${point}`);
    return [`## Turn ${turnNumber}`, "", content.modelAnswer, "", ...points].join("\n");
  });

  const cards = [...new Set(bestMoveIds(battle))].flatMap((id) => {
    const item = itemOf(id);
    if (!item) return [];
    const { text, example, source } = item.card;
    return [[`## ${item.name}`, "", text, "", `Example: ${example}`, "", `Source: ${source.title}, ${source.url}`].join("\n")];
  });

  return [
    PRIVACY_REMINDER,
    COACH_PROMPT,
    [
      `# My battle: ${battle.scenario.name}`,
      "",
      `- Opponent type: ${word(battle.scenario.opponentType)}`,
      `- Problem: ${battle.scenario.problem}`,
      `- My team: ${battle.team.map(name).join(", ")}`,
      `- Result: ${result}`,
    ].join("\n"),
    ...turns,
    "# Model answer (do not show it yet)",
    ...answers,
    ...(cards.length > 0 ? ["# Concept cards", ...cards] : []),
  ].join("\n\n") + "\n";
}

/**
 * The review items a teach-back belongs to: the best move of each played turn and its creature.
 * The learner caught the creature, so a later review of it always comes.
 */
export function teachBackItems(battle: BattleState): string[] {
  return [...new Set(bestMoveIds(battle).flatMap((moveId) => [moveId, creatureOf(moveId)]))];
}

/** The 2 sentences a learner wrote from memory after the chat (design 10). */
export type TeachBackRecord = {
  battleId: string;
  scenarioId: string;
  itemIds: string[];
  sentences: [string, string];
  learningDay: LearningDay;
};

/**
 * The teach-back to show at a review of `itemId`, or null. It comes back once: at the first
 * review of that item on a day after it was written. Teach-backs and reviews are in time order,
 * and the newest teach-back that still waits wins.
 */
export function teachBackFor(itemId: string, teachBacks: TeachBackRecord[], reviews: ReviewRecord[]): TeachBackRecord | null {
  const reviewDays = reviews.filter((review) => review.itemId === itemId).map((review) => review.learningDay);
  const waiting = teachBacks.filter(
    (teachBack) => teachBack.itemIds.includes(itemId) && !reviewDays.some((day) => day > teachBack.learningDay),
  );
  return waiting.at(-1) ?? null;
}
