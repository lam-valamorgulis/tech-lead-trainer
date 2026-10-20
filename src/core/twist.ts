// Town twists (design 4, ticket #36). Pure functions: no clock, no database.
// Each town can turn on one small battle twist in its content. A town with no twist, like
// town 1, keeps the battle rules of design 7 exactly.
import type { BundledScenario } from "@/content/bundle";
import type { OpponentType, Twist, TwistKind } from "../content/schema.ts";

/** What each twist is called, and its rule in one sentence each. The app shows these words. */
export type TwistInfo = { name: string; rule: string; damageRule: string };

export const TWISTS: Record<TwistKind, TwistInfo> = {
  "two-types": {
    name: "Two-type opponents",
    rule: "Each opponent has two types, and each turn shows the type that attacks.",
    damageRule: "Damage still comes from the turn's move table, as in town 1.",
  },
};

/** The town's twist, or null when the town has none. */
export function twistOf(town: { twist?: Twist }): TwistInfo | null {
  return town.twist ? TWISTS[town.twist.kind] : null;
}

/** The opponent's types: its one type, or both types in a two-types town, the first type first. */
export function opponentTypes(scenario: Pick<BundledScenario, "opponentType" | "secondType">): OpponentType[] {
  return scenario.secondType ? [scenario.opponentType, scenario.secondType] : [scenario.opponentType];
}

/**
 * The type that attacks on a turn (0, 1 or 2). In a two-types town each turn names it. Otherwise
 * the opponent has one type, and that type attacks on every turn.
 */
export function threatTypeOf(scenario: Pick<BundledScenario, "opponentType" | "turns">, turnIndex: number): OpponentType {
  return scenario.turns[turnIndex]?.threatType ?? scenario.opponentType;
}
