import { createHash } from "node:crypto";
import type { GlossaryWord } from "./glossary.ts";
import type { Boss } from "./weekend.ts";
import type { Creature, DecisionCard, Move, PlacementQuestion, Scenario, Town, TradeOff } from "./schema.ts";

// The bundle is what the app imports: the content plus a content hash per item.
// `npm run content:build` writes it to src/content/bundle.generated.json. Runs in Node only.

type Hashed<T> = T & { hash: string };

export type BundledMove = Hashed<Move>;
export type BundledCreature = Hashed<Omit<Creature, "moves" | "tradeOff" | "decisionCards">> & {
  moves: BundledMove[];
  tradeOff?: Hashed<TradeOff>;
  decisionCards?: Hashed<DecisionCard>[];
};
export type BundledScenario = Hashed<Scenario>;
export type BundledTown = Omit<Town, "creatures" | "placement" | "scenarios"> & {
  creatures: BundledCreature[];
  placement: Hashed<PlacementQuestion>[];
  scenarios: BundledScenario[];
};
/** The weekend boss of a town (design 3: week 1 of each month). */
export type TownWeekend = {
  townId: string;
  boss: Boss;
  /** The coach prompt of the town's week-2 ADR file, or null to use the default. */
  adrCoachPrompt: string | null;
};
export type ContentBundle = { towns: BundledTown[]; glossary: GlossaryWord[]; weekends: TownWeekend[] };

export function buildBundle(towns: Town[], glossary: GlossaryWord[] = [], weekends: TownWeekend[] = []): ContentBundle {
  return {
    glossary,
    weekends,
    towns: towns.map((town) => ({
      ...town,
      creatures: town.creatures.map((creature) => ({
        ...creature,
        // A creature's hash leaves out its moves and its scored cards, so editing one changes only that one.
        // The sprite and the System Map node are display only. An item with no Lesson keeps its old hash.
        hash: contentHash({
          lesson: creature.lesson,
          catch: creature.catch,
          card: creature.card,
          review: creature.review,
          workedExample: creature.workedExample,
        }),
        tradeOff: creature.tradeOff && withHash(creature.tradeOff),
        decisionCards: creature.decisionCards?.map(withHash),
        moves: creature.moves.map((move) => ({
          ...move,
          hash: contentHash({ lesson: move.lesson, catch: move.catch, card: move.card, review: move.review }),
        })),
      })),
      placement: town.placement.map((question) => ({ ...question, hash: contentHash(question) })),
      scenarios: town.scenarios.map((scenario) => ({
        ...scenario,
        // A town with no twist has no second type: an undefined field leaves the hash as it was.
        // The v1.5 fields are undefined in older scenarios, so their hash stays the same too.
        hash: contentHash({
          kind: scenario.kind,
          person: scenario.person,
          opponentType: scenario.opponentType,
          secondType: scenario.secondType,
          problem: scenario.problem,
          diff: scenario.diff,
          source: scenario.source,
          turns: scenario.turns,
        }),
      })),
    })),
  };
}

/** A Decision Card or a trade-off question, with the hash of what the learner reads and answers. */
function withHash<Card extends TradeOff | DecisionCard>(card: Card): Hashed<Card> {
  const { situation, options, rightOption, reasons, explanation, skills } = card;
  return { ...card, hash: contentHash({ situation, options, rightOption, reasons, explanation, skills }) };
}

/**
 * The version of what the learner read. Display names and the retired flag are left out,
 * because changing them does not change what was learned (design 12.2).
 */
export function contentHash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex").slice(0, 16);
}

/** JSON with keys sorted, so the key order in a file never changes the hash. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
