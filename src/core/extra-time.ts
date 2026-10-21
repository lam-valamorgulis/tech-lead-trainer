// The 45-minute day (design 3, ticket #34). Pure functions: no clock, no database.
// After the reviews, the catch and the battle, a free day adds "extra time": an extra battle,
// the boss, or a read-close-write task (read one primary source, close it, write 3 points).
import type { BundledTown } from "@/content/bundle";
import { nextBattle, readyOffers, type BattleOffer, type OfferInput } from "./battle.ts";
import { catchQueue, type CatchRecord } from "./catch.ts";
import type { LearningDay } from "./day.ts";

/** What the rules need from a saved read-close-write task. */
export type ReadingRecord = { itemId: string; learningDay: LearningDay };

export type ReadingTask = { itemId: string; itemName: string; source: { title: string; url: string } };

export type ExtraTime = {
  /** A second battle today, never today's normal battle. Null when no other scenario is ready. */
  extraBattle: BattleOffer | null;
  /** The town has a weekend boss to work on. */
  boss: boolean;
  /** The primary source to read, close and recall. Null before the first catch. */
  reading: ReadingTask | null;
};

/** Extra time for a 45-minute day, or null on a 3- or 15-minute day. */
export function extraTime({
  town,
  towns,
  catches,
  battles,
  readings,
  today,
  committedMinutes,
  hasBoss,
}: OfferInput & {
  readings: ReadingRecord[];
  today: LearningDay;
  committedMinutes: 3 | 15 | 45;
  hasBoss: boolean;
}): ExtraTime | null {
  if (committedMinutes !== 45) return null;
  const main = nextBattle({ town, towns, catches, battles, today, committedMinutes });
  const playedToday = new Set(battles.filter((battle) => battle.learningDay === today).map((battle) => battle.scenarioId));
  const extraBattle =
    readyOffers({ town, towns, catches, battles }).find(
      (offer) => offer.scenario.id !== main?.scenario.id && !playedToday.has(offer.scenario.id),
    ) ?? null;
  const reading = readingFor(town, catches, readings);
  // A menu with no task would only be in the way.
  if (!extraBattle && !hasBoss && !reading) return null;
  return { extraBattle, boss: hasBoss, reading };
}

/**
 * The source of a caught creature or move: one never read yet first, in catch order. Once every
 * caught item was read, the one read longest ago.
 */
function readingFor(town: BundledTown, catches: CatchRecord[], readings: ReadingRecord[]): ReadingTask | null {
  const items = new Map(catchQueue(town).map((item) => [item.id, item]));
  const caughtInOrder = [...new Set(catches.filter((record) => record.correct).map((record) => record.itemId))].filter(
    (id) => items.has(id),
  );
  if (caughtInOrder.length === 0) return null;
  const lastRead = (id: string) =>
    readings.filter((reading) => reading.itemId === id).reduce<string>((last, r) => (r.learningDay > last ? r.learningDay : last), "");
  // An item never read has "" as its last day, so it sorts first; a stable sort keeps catch order.
  const [itemId] = [...caughtInOrder].sort((a, b) => lastRead(a).localeCompare(lastRead(b)));
  const item = items.get(itemId)!;
  return { itemId, itemName: item.name, source: item.card.source };
}
