// Lesson before the catch question (design 6.3, ticket #97). Pure functions: no browser, no database.
import type { Lesson } from "@/content/schema";
import type { CatchItem } from "./catch.ts";

/** A catch gives at most two tries: one after the Lesson, one more after the look-back. */
export const CATCH_TRIES = 2;

export type Try = 1 | 2;

/** One screen the learner reads. Old content has one screen made of its card, with the example. */
export type LessonScreen = { text: string; diagram?: string; example?: string };

export type LessonView = { screens: LessonScreen[]; answerScreen: number; source: Lesson["source"] };

/**
 * The screens to read before the question. An item with no Lesson yet (Town 1 and Town 2 before
 * their rewrite) shows its card as one screen, so the catch still teaches first.
 */
export function lessonOf(item: CatchItem): LessonView {
  if (item.lesson) return item.lesson;
  return { screens: [{ text: item.card.text, example: item.card.example }], answerScreen: 0, source: item.card.source };
}

/** The catch phase saved for a try (#97): the first try comes after the Lesson, the second after the look-back. */
export function catchPhase(attempt: Try): "after-lesson" | "after-look-back" {
  return attempt === 1 ? "after-lesson" : "after-look-back";
}

/** What happens after a try: a right answer catches; a wrong first try shows the look-back; a wrong second try ends it. */
export function afterTry(attempt: Try, correct: boolean): "caught" | "look-back" | "missed" {
  if (correct) return "caught";
  return attempt < CATCH_TRIES ? "look-back" : "missed";
}
