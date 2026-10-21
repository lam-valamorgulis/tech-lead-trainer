import type { CardKind } from "../core/review.ts";
import type { BundledTown } from "./bundle.ts";
import type { DecisionCard, TradeOff } from "./schema.ts";

/**
 * A Decision Card or a trade-off question as the review screen shows it (design 6.4 and 6.5), with
 * its creature's name and art.
 */
export type ScoredCard = Omit<DecisionCard | TradeOff, "retired"> & {
  kind: CardKind;
  hash: string;
  creature: { id: string; name: string; sprite?: number };
};

/**
 * The scored cards review can show, from every town: Decision Cards by id, and trade-off questions
 * by creature id. Retired cards and the cards of a retired creature are left out.
 */
export function reviewCards(towns: BundledTown[]): { decisionCards: Map<string, ScoredCard>; tradeOffs: Map<string, ScoredCard> } {
  const decisionCards = new Map<string, ScoredCard>();
  const tradeOffs = new Map<string, ScoredCard>();
  for (const town of towns) {
    for (const creature of town.creatures) {
      if (creature.retired) continue;
      const owner = { id: creature.id, name: creature.name, sprite: creature.sprite };
      for (const card of creature.decisionCards ?? []) {
        if (!card.retired) decisionCards.set(card.id, { ...card, kind: "decision", creature: owner });
      }
      const tradeOff = creature.tradeOff;
      if (tradeOff && !tradeOff.retired) tradeOffs.set(creature.id, { ...tradeOff, kind: "trade-off", creature: owner });
    }
  }
  return { decisionCards, tradeOffs };
}
