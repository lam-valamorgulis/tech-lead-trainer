import { z } from "zod";
import { SKILLS } from "./skills.ts";

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

/** One of the 26 tech lead Skills, by its fixed number (src/content/skills.ts). */
export const skillIdSchema = z
  .int()
  .refine((id) => SKILLS.some((skill) => skill.id === id), { message: `A Skill id is a number from 1 to ${SKILLS.length}.` });

/**
 * A diagram as Mermaid text, for example "flowchart LR" and one arrow per line. The app draws it.
 * It is the one kind of text that may have line breaks.
 */
export const diagramSchema = z.string().trim().min(1);

export const LESSON_SCREENS = 3;
/** Design 6.3: each Lesson screen has at most 50 words. */
export const LESSON_SCREEN_WORD_LIMIT = 50;

/** One swipe screen of a Lesson: one idea in at most 50 words, and a diagram when the idea needs one. */
export const lessonScreenSchema = z.object({ text, diagram: diagramSchema.optional() });

/** What a learner reads before the catch question (design 6.3). It adds to the card; it does not replace it. */
export const lessonSchema = z.object({
  screens: z.array(lessonScreenSchema).length(LESSON_SCREENS, `A Lesson has exactly ${LESSON_SCREENS} screens.`),
  /** The screen (0, 1 or 2) that holds the catch answer. A wrong answer shows this screen again. */
  answerScreen: z.int().min(0).max(LESSON_SCREENS - 1),
  /** One primary source for the whole Lesson. */
  source: sourceSchema,
});

/** A reason a learner can pick for their choice. Exactly one Reason of a set is right. */
export const reasonSchema = z.object({ text, right: z.boolean() });

/** A Battle turn, a Decision Card and a trade-off question each have this many Reasons. */
export const REASONS = 3;

const reasonsSchema = z.array(reasonSchema).length(REASONS, `There are exactly ${REASONS} Reasons.`);

/** A card that the app scores by itself: pick one option, then one Reason (design 6.4 and 6.5). */
function choiceCardSchema(options: number, id: z.ZodString) {
  return z
    .object({
      id,
      retired: z.boolean().optional(),
      situation: text,
      options: z.array(text).length(options, `There are exactly ${options} options.`),
      rightOption: z.int().min(0),
      reasons: reasonsSchema,
      /** Shown after the answer: why the right option and Reason are right. */
      explanation: text,
      skills: z.array(skillIdSchema).min(1),
    })
    .refine((card) => card.rightOption < card.options.length, {
      message: "rightOption must point at one of the options.",
      path: ["rightOption"],
    });
}

const segment = "[a-z0-9]+(-[a-z0-9]+)*";

/** The id of a scored card of a creature: <creature>.<group>.<name>. */
function cardIdSchema(group: string, example: string, label: string) {
  return z.string().regex(new RegExp(`^${segment}\\.${group}\\.${segment}$`), `${label} id is <creature>.${group}.<name>, for example ${example}.`);
}

/** A Decision Card in review: a short situation and 2 options. Its id is <creature>.decision.<name>. */
export const decisionCardSchema = choiceCardSchema(2, cardIdSchema("decision", "cache.decision.prices", "A Decision Card"));

/** The hard trade-off question for Stage 3: 3 options. Its id is <creature>.trade-off.<name>. */
export const tradeOffSchema = choiceCardSchema(3, cardIdSchema("trade-off", "cache.trade-off.fresh-prices", "A trade-off question"));

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
  lesson: lessonSchema.optional(),
  catch: catchQuestionSchema,
  card: cardSchema,
  review: reviewQuestionSchema,
});

export const creatureSchema = z.object({
  id: creatureIdSchema,
  name: text,
  retired: z.boolean().optional(),
  /** The species number in the creature art pack. Display only: it is not in the content hash. */
  sprite: z.int().min(1).optional(),
  lesson: lessonSchema.optional(),
  catch: catchQuestionSchema,
  card: cardSchema,
  review: reviewQuestionSchema,
  workedExample: workedExampleSchema,
  /** The Stage 3 question (design 6.5). */
  tradeOff: tradeOffSchema.optional(),
  decisionCards: z.array(decisionCardSchema).optional(),
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

/**
 * The move ids of a Meeting Battle and an Agent Diff Battle, which are not creature moves:
 * a Meeting answer is answer.<name>, with its words in the row's label. A review verdict is one of AGENT_VERDICTS.
 */
export const MEETING_ANSWER_PREFIX = "answer.";
export const VERDICT_PREFIX = "verdict.";
export const AGENT_VERDICTS = ["approve", "ask-for-test", "block", "narrow"].map((name) => `${VERDICT_PREFIX}${name}`);

/** One row of a move table: the damage this move does to this threat, and what it costs. */
export const moveTableRowSchema = z.object({
  moveId: moveIdSchema,
  /** Only in a Meeting Battle: the answer the learner can give, as the button shows it. */
  label: text.optional(),
  damage: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  /** One sentence. The app shows it after "You chose <move>." */
  counterattack: text,
});

/** Each turn's model answer has this many key points. The learner ticks the ones they said. */
export const KEY_POINTS = 3;

export const battleTurnSchema = z.object({
  /** Only in a "two-types" town: which of the opponent's two types attacks this turn (#36). */
  threatType: z.enum(OPPONENT_TYPES).optional(),
  threat: text,
  /** v1.5: the one-line situation that decides which move is best (design 7.2). */
  constraint: text.optional(),
  /** v1.5: the 3 Reasons the learner picks from before the result. Exactly one is right. */
  reasons: reasonsSchema.optional(),
  /** v1.5: the Skills this turn trains. */
  skills: z.array(skillIdSchema).min(1).optional(),
  moves: z.array(moveTableRowSchema).min(3).max(4),
  /** The answer a senior engineer gives to this threat, shown after the turn's result (design 7.7). */
  modelAnswer: text,
  /** Exactly 3 short points of the model answer. Ticks on them change only the review schedule. */
  keyPoints: z.array(text).length(KEY_POINTS, `A turn has exactly ${KEY_POINTS} key points.`),
});

/** The three kinds of Battle (design 7.1). A scenario with no kind is a normal "battle". */
export const SCENARIO_KINDS = ["battle", "meeting", "agent-diff"] as const;

/** The kind of a scenario: a scenario with no kind is a normal Battle. */
export function kindOf(scenario: { kind?: (typeof SCENARIO_KINDS)[number] }): (typeof SCENARIO_KINDS)[number] {
  return scenario.kind ?? "battle";
}

/** Who asks the questions in a Meeting Battle. */
export const MEETING_PEOPLE = ["client", "manager", "cto"] as const;

/** A battle against one real tech situation (design 7). */
export const scenarioSchema = z.object({
  id: scenarioIdSchema,
  name: text,
  retired: z.boolean().optional(),
  kind: z.enum(SCENARIO_KINDS).optional(),
  /** Only in a Meeting Battle: the person on the other side. */
  person: z.enum(MEETING_PEOPLE).optional(),
  /** Only in an Agent Diff Battle: the short diff an AI agent wrote, with one planted problem. It may have line breaks. */
  diff: z.string().trim().min(1).optional(),
  /** v1.5: the real incident or situation this battle comes from (design 7.6). */
  source: sourceSchema.optional(),
  opponentType: z.enum(OPPONENT_TYPES),
  /** Only in a "two-types" town, where it is required: the opponent's second type (#36). */
  secondType: z.enum(OPPONENT_TYPES).optional(),
  problem: text,
  /** A battle lasts at most 3 turns, so every scenario has 3. */
  turns: z.array(battleTurnSchema).length(3),
});

/**
 * The battle twists a town can turn on (design 4, ticket #36): one small new rule per town.
 * "two-types": every opponent has two types, and each turn names the type that attacks.
 */
export const TWIST_KINDS = ["two-types"] as const;

export const twistSchema = z.object({ kind: z.enum(TWIST_KINDS) });

/** The big picture of a town, shown on its first day (design 6.1). About 3 minutes, with one diagram. */
export const townIntroSchema = z.object({
  title: text,
  screens: z.array(text).min(1),
  diagram: diagramSchema,
  source: sourceSchema,
});

export const townSchema = z.object({
  id: townIdSchema,
  number: z.int().min(1).max(12),
  name: text,
  retired: z.boolean().optional(),
  intro: townIntroSchema.optional(),
  /** The 1 or 2 tech lead Skills the town adds (design 4). */
  skills: z.array(skillIdSchema).min(1).max(2).optional(),
  /** The town's battle twist. Town 1 has none, so its battles keep the rules of design 7. */
  twist: twistSchema.optional(),
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
export type Twist = z.infer<typeof twistSchema>;
export type TwistKind = (typeof TWIST_KINDS)[number];
export type Glossary = z.infer<typeof glossarySchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type Reason = z.infer<typeof reasonSchema>;
export type DecisionCard = z.infer<typeof decisionCardSchema>;
export type TradeOff = z.infer<typeof tradeOffSchema>;
export type TownIntro = z.infer<typeof townIntroSchema>;
export type ScenarioKind = (typeof SCENARIO_KINDS)[number];
