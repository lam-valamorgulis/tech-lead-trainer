// "Discuss in Claude" and the teach-back (design 10, tickets #19 and #104). Pure functions: no clock, no browser.
import type { BundledScenario } from "../content/bundle.ts";
import type { Card } from "../content/schema.ts";
import { verdictName } from "./agent-diff.ts";
import { bestRow, counterattackSentence, creatureOf, OPPONENT_HP } from "./battle.ts";
import { endView, whyLost, type EndTurn, type EndView, type NameOf, type Ticks } from "./battle-end.ts";
import { BAR_NAMES, endSummary, type BattleV2 } from "./battle-v2.ts";
import type { LearningDay } from "./day.ts";
import type { ReviewRecord } from "./review.ts";
import { opponentTypes, scenarioTwist, threatTypeOf } from "./twist.ts";

/** "traffic" becomes "Traffic", the word the battle screen shows. */
const typeWord = (type: string) => `${type.charAt(0).toUpperCase()}${type.slice(1)}`;

/** Where the package goes. The app copies first, then opens this page (design 10). */
export const CLAUDE_NEW_CHAT = "https://claude.ai/new";

/** The coach prompt of design section 10 (v1.5), word for word. */
export const COACH_PROMPT =
  "You are my tech lead coach. Below is my battle and the model answer. Do not show the model answer yet. Ask me ONE question at a time about my choice and my reason. Wait for my reply. Give hints, not solutions. After three rounds, compare my thinking with the model answer. Then ask me to explain the trade-off again in my own words. Show me two English mistakes and ask me to fix them.";

/** The first line of every package (design 3): the Pro account is personal, so work details stay out. */
export const PRIVACY_REMINDER =
  "Privacy reminder: this text goes to your personal Claude account. Before you send it, remove client names, company code and internal numbers.";

/** What the package needs to know about a creature or a move: its name and its card. */
export type ItemOf = (id: string) => { name: string; card: Card } | undefined;

const KIND_WORDS = { battle: "Battle", meeting: "Meeting Battle", "agent-diff": "Agent Diff Battle" } as const;

export type DiscussInput = {
  /** `diff` is the code of an Agent Diff Battle (#106). */
  scenario: Pick<BundledScenario, "name" | "problem" | "opponentType" | "secondType" | "source" | "turns" | "diff">;
  /** A finished battle. */
  battle: BattleV2;
  /** The learner's own words on each turn, by turn number, when they typed some. */
  notes: Record<number, string>;
  /** The key points (1 to 3) the learner ticked on each turn, by turn number. */
  ticks: Ticks;
  itemOf: ItemOf;
};

/**
 * The Markdown the learner pastes into a new Claude chat (design 10). It holds the learner's own
 * words and the content only: never an email, a user id or a battle id. The coach prompt says
 * "Below is my battle", so it comes right after the privacy reminder, before the battle. Each turn
 * has its Constraint, the Reason picked (and the right one when it was wrong) and the HP lost.
 */
export function discussPackage(input: DiscussInput): string {
  const nameOf: NameOf = (id) => verdictName(id) ?? input.itemOf(id)?.name ?? id;
  const view = endView(input.battle, nameOf);
  const cards = cardSections(input);
  return (
    [
      PRIVACY_REMINDER,
      COACH_PROMPT,
      battleSection(input, view, nameOf),
      ...view.turns.map((turn) => turnSection(input, turn, nameOf)),
      "# Model answer (do not show it yet)",
      ...view.turns.map((turn) => answerSection(input, turn)),
      ...(cards.length > 0 ? ["# Concept cards", ...cards] : []),
    ].join("\n\n") + "\n"
  );
}

function battleSection({ scenario, battle }: DiscussInput, view: EndView, nameOf: NameOf): string {
  const summary = endSummary(battle);
  const bars = BAR_NAMES[battle.kind];
  const turns = summary.turnsUsed;
  const result =
    summary.result === "won"
      ? `I won in ${turns} turn${turns === 1 ? "" : "s"}.`
      : `I lost. ${whyLost(battle, "I")} The opponent still had ${bars.opponent} ${summary.opponentHp} of ${OPPONENT_HP}.`;
  const types = opponentTypes(scenario).map(typeWord);
  const reasons = view.rightReasons;
  return [
    `# My battle: ${scenario.name}`,
    "",
    `- Kind: ${KIND_WORDS[battle.kind]}`,
    types.length === 1 ? `- Opponent type: ${types[0]}` : `- Opponent types: ${types.join(" and ")}`,
    `- Problem: ${scenario.problem}`,
    ...(scenario.source ? [`- Source: ${scenario.source.title}, ${scenario.source.url}`] : []),
    ...(battle.kind === "battle" ? [`- My team: ${battle.team.map(nameOf).join(", ")}`] : []),
    `- Result: ${result}`,
    `- ${bars.team} I lost: ${view.hpLost}`,
    `- Best moves: ${view.bestMoves.count} of ${view.bestMoves.of}`,
    ...(reasons.of > 0 ? [`- Right Reasons: ${reasons.count} of ${reasons.of}`] : []),
    // The coach needs the agent's code to ask about it (#106).
    ...(battle.kind === "agent-diff" && scenario.diff ? ["", "The agent's diff:", "", "```diff", scenario.diff, "```"] : []),
  ].join("\n");
}

/** What the learner did on a turn. The best move and the key points stay in the hidden model answer. */
function turnSection({ scenario, battle, notes, ticks }: DiscussInput, turn: EndTurn, nameOf: NameOf): string {
  const played = battle.played[turn.turnNumber - 1];
  const row = played.moveId === null ? null : battle.turns[turn.turnNumber - 1].moves.find((r) => r.moveId === played.moveId)!;
  const note = notes[turn.turnNumber]?.trim() ?? "";
  const reasonLines =
    turn.reason === null
      ? []
      : [
          `- My Reason: ${turn.reason} (${turn.reasonCorrect ? "right" : "wrong"})`,
          ...(turn.rightReason ? [`- Right Reason: ${turn.rightReason}`] : []),
        ];
  // A Meeting answer is a whole sentence, so it goes in quotes.
  const counterattack =
    row?.label !== undefined ? `You chose “${row.label}” ${row.counterattack}` : counterattackSentence(played.moveId && nameOf(played.moveId), row?.counterattack ?? null);
  return [
    `## Turn ${turn.turnNumber}`,
    "",
    // A two-type opponent names the type that attacked; a one-type battle reads as before (#36).
    ...(scenarioTwist(scenario) ? [`- Threat type: ${typeWord(threatTypeOf(scenario, turn.turnNumber - 1))}`] : []),
    `- Threat: ${turn.threat}`,
    ...(turn.constraint ? [`- Constraint: ${turn.constraint}`] : []),
    `- My move: ${turn.move ?? "none of my moves fit this threat"}`,
    ...reasonLines,
    ...(note ? [`- My own words: ${note}`] : []),
    `- Damage: ${turn.damage}${turn.weakened ? " (1 weaker for the wrong Reason)" : ""}`,
    `- Counterattack: ${counterattack}`,
    `- ${BAR_NAMES[battle.kind].team} I lost: ${turn.hpLost}`,
    `- Key points I said: ${(ticks[turn.turnNumber] ?? []).length} of ${turn.keyPoints.length}`,
  ].join("\n");
}

function answerSection({ ticks }: DiscussInput, turn: EndTurn): string {
  const ticked = ticks[turn.turnNumber] ?? [];
  const points = turn.keyPoints.map((point, index) => `- [${ticked.includes(index + 1) ? "x" : " "}] ${point}`);
  return [`## Turn ${turn.turnNumber}`, "", `Best move: ${turn.bestMove}`, "", turn.modelAnswer, "", ...points].join("\n");
}

/** The card of each turn's best move, then of each other move the learner picked. Each card once. */
function cardSections({ battle, itemOf }: DiscussInput): string[] {
  const picked = battle.played.flatMap((turn) => (turn.moveId ? [turn.moveId] : []));
  return [...new Set([...bestMoveIds(battle), ...picked])].flatMap((id) => {
    const item = itemOf(id);
    if (!item) return [];
    const { text, example, source } = item.card;
    return [[`## ${item.name}`, "", text, "", `Example: ${example}`, "", `Source: ${source.title}, ${source.url}`].join("\n")];
  });
}

/** The best move of each played turn. */
function bestMoveIds(battle: BattleV2): string[] {
  return battle.played.map(({ turnNumber }) => bestRow(battle.turns[turnNumber - 1]).moveId);
}

/**
 * The review items a teach-back belongs to: the best move of each played turn and its creature.
 * The learner caught the creature, so a later review of it always comes. A Meeting answer and a
 * review verdict have no creature, so there only the move itself counts.
 */
export function teachBackItems(battle: BattleV2): string[] {
  const ids = bestMoveIds(battle);
  return [...new Set(battle.kind === "battle" ? ids.flatMap((moveId) => [moveId, creatureOf(moveId)]) : ids)];
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
 * The teach-back to show at a review of `itemId`, or null. It shows at every review of that item
 * until one is graded on a day after the teach-back's day; a review on the same day does not use
 * it up. Teach-backs are in time order, and the newest one that still waits wins.
 */
export function teachBackFor(itemId: string, teachBacks: TeachBackRecord[], reviews: ReviewRecord[]): TeachBackRecord | null {
  const reviewDays = reviews.filter((review) => review.itemId === itemId).map((review) => review.learningDay);
  const waiting = teachBacks.filter(
    (teachBack) => teachBack.itemIds.includes(itemId) && !reviewDays.some((day) => day > teachBack.learningDay),
  );
  return waiting.at(-1) ?? null;
}
