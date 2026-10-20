// Placement test (design 4 and 6, ticket #13). Pure functions: no clock, no database.
import type { BundledTown } from "@/content/bundle";
import type { CatchRecord } from "./catch.ts";
import type { LearningDay } from "./day.ts";

/** What the rules need from a saved placement answer. */
export type PlacementRecord = { townId: string; itemId: string; correct: boolean; learningDay: LearningDay };

export type PlacementProgress = {
  done: boolean;
  next: BundledTown["placement"][number] | null;
  answered: number;
  total: number;
  correct: number;
};

/** Where the learner is in a town's placement test: each question is answered once. */
export function placementProgress(town: BundledTown, records: PlacementRecord[]): PlacementProgress {
  const answers = new Map(records.filter((r) => r.townId === town.id).map((r) => [r.itemId, r.correct]));
  const next = town.placement.find((question) => !answers.has(question.creatureId)) ?? null;
  const answered = town.placement.filter((question) => answers.has(question.creatureId));
  return {
    done: next === null,
    next,
    answered: answered.length,
    total: town.placement.length,
    correct: answered.filter((question) => answers.get(question.creatureId)).length,
  };
}

/** A right placement answer catches that creature at stage 1, like a catch does. */
export function placementCatches(records: PlacementRecord[]): CatchRecord[] {
  return records
    .filter((record) => record.correct)
    .map((record) => ({ itemId: record.itemId, correct: true, learningDay: record.learningDay, fromPlacement: true }));
}
