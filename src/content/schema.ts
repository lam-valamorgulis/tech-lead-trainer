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
    choices: z.array(text).min(2).max(4),
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

export const townSchema = z.object({
  id: townIdSchema,
  number: z.int().min(1).max(12),
  name: text,
  retired: z.boolean().optional(),
  creatures: z.array(creatureSchema),
  placement: z.array(placementQuestionSchema),
  /** Pairs of creature or move ids that are easy to mix up. They can come from different towns. */
  confusablePairs: z.array(z.tuple([z.string(), z.string()])),
});

export const glossarySchema = z.object({
  words: z.array(z.object({ word: text, definition: text })),
});

export type Town = z.infer<typeof townSchema>;
export type Creature = z.infer<typeof creatureSchema>;
export type Move = z.infer<typeof moveSchema>;
export type Card = z.infer<typeof cardSchema>;
export type PlacementQuestion = z.infer<typeof placementQuestionSchema>;
export type Glossary = z.infer<typeof glossarySchema>;
