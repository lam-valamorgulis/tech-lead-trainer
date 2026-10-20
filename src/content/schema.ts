import { z } from "zod";

// The shape of content files (design section 8 and 12.3). IDs are short slugs that never change.
// Display names can change. Removed items get `"retired": true` and stay in the file.

const slug = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const text = z.string().trim().min(1);

export const townIdSchema = z.string().regex(/^t\d{2}$/, "A town id looks like t01.");
export const creatureIdSchema = z.string().regex(slug, "A creature id is a short slug, for example cache.");
export const moveIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*\.[a-z0-9]+(-[a-z0-9]+)*$/, "A move id is <creature>.<move>, for example cache.ttl.");

export const sourceSchema = z.object({
  title: text,
  url: z.url({ protocol: /^https$/, error: "The primary source needs an https link." }),
});

export const cardSchema = z.object({
  text,
  example: text,
  source: sourceSchema,
});

export const catchQuestionSchema = z
  .object({
    question: text,
    // At least 3 choices, so a blind guess catches an item at most 1 time in 3.
    choices: z.array(text).min(3).max(4),
    correctChoice: z.int().min(0),
    explanation: text,
  })
  .refine((q) => q.correctChoice < q.choices.length, {
    message: "correctChoice must point at one of the choices.",
    path: ["correctChoice"],
  });

export const reviewQuestionSchema = z.object({ question: text, answer: text });

export const workedExampleSchema = z.object({
  problem: text,
  steps: z.array(text).min(1),
  answer: text,
});

export const moveSchema = z.object({
  id: moveIdSchema,
  name: text,
  retired: z.boolean().optional(),
  catch: catchQuestionSchema,
  card: cardSchema,
  review: reviewQuestionSchema,
});

export const creatureSchema = z.object({
  id: creatureIdSchema,
  name: text,
  retired: z.boolean().optional(),
  catch: catchQuestionSchema,
  card: cardSchema,
  review: reviewQuestionSchema,
  workedExample: workedExampleSchema,
  moves: z.array(moveSchema),
});

export const placementQuestionSchema = z.object({
  creatureId: creatureIdSchema,
  question: text,
  answer: text,
});

/** The opponent's type in a battle. The app shows each as a colour, an icon and a word (UI rule 4). */
export const OPPONENT_TYPES = ["traffic", "speed", "security", "data", "outage"] as const;

export const scenarioIdSchema = z
  .string()
  .regex(/^t\d{2}-[a-z0-9]+(-[a-z0-9]+)*$/, "A scenario id is <town>-<name>, for example t01-black-friday.");

/** One row of a move table: the damage this move does to this threat, and what it costs. */
export const moveTableRowSchema = z.object({
  moveId: moveIdSchema,
  damage: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  /** One sentence. The app shows it after "You chose <move>." */
  counterattack: text,
});

/** Each turn's model answer has this many key points. The learner ticks the ones they said. */
export const KEY_POINTS = 3;

export const battleTurnSchema = z.object({
  threat: text,
  moves: z.array(moveTableRowSchema).min(3).max(4),
  /** The answer a senior engineer gives to this threat, shown after the turn's result (design 7.7). */
  modelAnswer: text,
  /** Exactly 3 short points of the model answer. Ticks on them change only the review schedule. */
  keyPoints: z.array(text).length(KEY_POINTS, `A turn has exactly ${KEY_POINTS} key points.`),
});

/** A battle against one real tech situation (design 7). */
export const scenarioSchema = z.object({
  id: scenarioIdSchema,
  name: text,
  retired: z.boolean().optional(),
  opponentType: z.enum(OPPONENT_TYPES),
  problem: text,
  /** A battle lasts at most 3 turns, so every scenario has 3. */
  turns: z.array(battleTurnSchema).length(3),
});

export const townSchema = z.object({
  id: townIdSchema,
  number: z.int().min(1).max(12),
  name: text,
  retired: z.boolean().optional(),
  creatures: z.array(creatureSchema),
  placement: z.array(placementQuestionSchema),
  /** Pairs of creature or move ids that are easy to mix up. They can come from different towns. */
  confusablePairs: z.array(z.tuple([z.string(), z.string()])),
  /** Battle scenarios, in the order the app offers them. */
  scenarios: z.array(scenarioSchema).default([]),
});

export const glossarySchema = z.object({
  words: z.array(z.object({ word: text, definition: text })),
});

export type Town = z.infer<typeof townSchema>;
export type Creature = z.infer<typeof creatureSchema>;
export type Move = z.infer<typeof moveSchema>;
export type Card = z.infer<typeof cardSchema>;
export type PlacementQuestion = z.infer<typeof placementQuestionSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type BattleTurn = z.infer<typeof battleTurnSchema>;
export type OpponentType = (typeof OPPONENT_TYPES)[number];
export type Glossary = z.infer<typeof glossarySchema>;
