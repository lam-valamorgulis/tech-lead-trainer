// Catch rules (design 6, ticket #6). Pure functions: no clock, no database.
import type { BundledCreature, BundledMove, BundledTown } from "@/content/bundle";
import type { LearningDay } from "./day.ts";
import { reviewStates, type ReviewRecord, type Stage } from "./review.ts";

export type ItemKind = "creature" | "move";

/** One thing to catch: a creature or one of its moves. */
export type CatchItem = {
  id: string;
  kind: ItemKind;
  creatureId: string;
  name: string;
  hash: string;
  catch: BundledCreature["catch"];
  card: BundledCreature["card"];
  /** Read before the question (design 6.3). Old content has none yet. */
  lesson?: BundledCreature["lesson"];
};

/** What the rules need from a saved catch event, or from a right placement answer. */
export type CatchRecord = {
  itemId: string;
  correct: boolean;
  learningDay: LearningDay;
  /** A placement answer catches without using up the day's catch. */
  fromPlacement?: boolean;
};

/** Every item of a town in teaching order: each creature, then its moves. */
export function catchQueue(town: BundledTown): CatchItem[] {
  return town.creatures
    .filter((creature) => !creature.retired)
    .flatMap((creature) => [
      toItem(creature, "creature", creature.id),
      ...creature.moves.filter((move) => !move.retired).map((move) => toItem(move, "move", creature.id)),
    ]);
}

function toItem(item: BundledCreature | BundledMove, kind: ItemKind, creatureId: string): CatchItem {
  return { id: item.id, kind, creatureId, name: item.name, hash: item.hash, catch: item.catch, card: item.card, lesson: item.lesson };
}

export function caughtIds(records: CatchRecord[]): Set<string> {
  return new Set(records.filter((r) => r.correct).map((r) => r.itemId));
}

/**
 * The one new item for today, or null. A 3-minute day is reviews only, and a day that
 * already had a catch attempt gets no second one. `paused` is the backlog guard (#8).
 */
export function nextCatch({
  town,
  records,
  today,
  committedMinutes,
  paused = false,
}: {
  town: BundledTown;
  records: CatchRecord[];
  today: LearningDay;
  committedMinutes: 3 | 15 | 45;
  paused?: boolean;
}): CatchItem | null {
  if (committedMinutes === 3 || paused) return null;
  if (records.some((r) => r.learningDay === today && !r.fromPlacement)) return null;
  const caught = caughtIds(records);
  return catchQueue(town).find((item) => !caught.has(item.id)) ?? null;
}

export type CatchAnswer = { correct: boolean; rightAnswer: string; explanation: string };

/** Checks the chosen answer by its text, so the screen can show the choices in any order. */
export function checkCatchAnswer(item: CatchItem, chosen: string): CatchAnswer {
  const rightAnswer = item.catch.choices[item.catch.correctChoice];
  return { correct: chosen === rightAnswer, rightAnswer, explanation: item.catch.explanation };
}

export type CreatureStatus = "caught" | "seen" | "not-met";

export type FieldGuideProgress = {
  townName: string;
  caughtCount: number;
  creatures: {
    id: string;
    name: string;
    status: CreatureStatus;
    /** 1 when caught, then 2 and 3 as reviews pass (design 5). */
    stage: Stage | null;
    movesCaught: number;
    movesTotal: number;
  }[];
};

/** The Field Guide for one town: seen, caught and not met yet. */
export function fieldGuideProgress(
  town: BundledTown,
  records: CatchRecord[],
  reviews: ReviewRecord[],
): FieldGuideProgress {
  const caught = caughtIds(records);
  const states = reviewStates(records, reviews);
  const seen = new Set(records.map((r) => r.itemId));
  const creatures = town.creatures
    // A retired creature stays in the guide of someone who caught it.
    .filter((creature) => !creature.retired || caught.has(creature.id))
    .map((creature) => {
      const status: CreatureStatus = caught.has(creature.id) ? "caught" : seen.has(creature.id) ? "seen" : "not-met";
      const moves = creature.moves.filter((move) => !move.retired || caught.has(move.id));
      return {
        id: creature.id,
        name: creature.name,
        status,
        stage: status === "caught" ? (states.get(creature.id)?.stage ?? 1) : null,
        movesCaught: moves.filter((move) => caught.has(move.id)).length,
        movesTotal: moves.length,
      };
    });
  return { townName: town.name, caughtCount: creatures.filter((c) => c.status === "caught").length, creatures };
}
