import { OPPONENT_HP } from "../core/battle.ts";
import { glossarySchema, townSchema, type Creature, type Move, type Scenario, type Town } from "./schema.ts";

export type ContentInput = {
  /** The parsed JSON of each town file. Not trusted yet. */
  towns: unknown[];
  glossary: unknown;
  /** Every id that ever shipped (content/ledger.json). */
  ledger: string[];
};

export type Problem = { where: string; message: string };

export const CARD_WORD_LIMIT = 150;
export const SENTENCE_WORD_LIMIT = 20;
/** Design section 8: 10 placement questions per town. */
export const PLACEMENT_QUESTIONS = 10;

/** Returns every problem in the content. An empty list means the content can ship. */
export function checkContent(input: ContentInput): Problem[] {
  const problems: Problem[] = [];
  const towns: Town[] = [];

  input.towns.forEach((raw, index) => {
    const parsed = townSchema.safeParse(raw);
    if (parsed.success) towns.push(parsed.data);
    else problems.push(...schemaProblems(townLabel(raw, index), parsed.error.issues));
  });

  const glossary = glossarySchema.safeParse(input.glossary);
  if (glossary.success) {
    for (const entry of glossary.data.words) {
      problems.push(...sentenceProblems(`glossary.${entry.word}`, entry.definition));
      problems.push(...plainTextProblems(`glossary.${entry.word}`, entry));
    }
  } else {
    problems.push(...schemaProblems("glossary", glossary.error.issues));
  }

  // A town file that does not parse is already a problem. Its ids are not checked further.
  if (towns.length < input.towns.length) return problems;

  problems.push(...idProblems(towns, input.ledger));
  for (const town of towns) {
    problems.push(...townProblems(town, towns));
    problems.push(...townPlainTextProblems(town));
  }
  return problems;
}

/** Every string in a value, with its path, for example ["card.text", "…"]. */
function textsWithPaths(value: unknown, path: string[] = []): [string, string][] {
  if (typeof value === "string") return [[path.join("."), value]];
  if (Array.isArray(value)) return value.flatMap((child, i) => textsWithPaths(child, [...path, String(i)]));
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => textsWithPaths(child, [...path, key]));
  }
  return [];
}

// The app shows content as plain text: a backtick shows as a backtick, and a line break collapses.
const PLAIN_TEXT_RULES: { mark: RegExp; message: string }[] = [
  { mark: /`/, message: "The text has a backtick. The app shows plain text, so write the word without code marks." },
  { mark: /\r|\n/, message: "The text has a line break. The app shows plain text, so keep it on one line." },
];

/** Names each text by its item, like the other rules do: t01.cache.ttl.card.example. */
function townPlainTextProblems(town: Town): Problem[] {
  const { creatures, ...townTexts } = town;
  return [
    ...plainTextProblems(town.id, townTexts),
    ...creatures.flatMap(({ moves, ...creature }) => [
      ...plainTextProblems(itemLabel(town, creature), creature),
      ...moves.flatMap((move) => plainTextProblems(itemLabel(town, move), move)),
    ]),
  ];
}

function plainTextProblems(prefix: string, value: unknown): Problem[] {
  return textsWithPaths(value).flatMap(([path, text]) =>
    PLAIN_TEXT_RULES.filter(({ mark }) => mark.test(text)).map(({ message }) => ({
      where: `${prefix}.${path}`,
      message,
    })),
  );
}

/** Every id in the content, in file order: towns, creatures, moves and battle scenarios. */
export function contentIds(towns: Town[]): string[] {
  return towns.flatMap((town) => [
    town.id,
    ...town.creatures.flatMap((c) => [c.id, ...c.moves.map((m) => m.id)]),
    ...town.scenarios.map((s) => s.id),
  ]);
}

function idProblems(towns: Town[], ledger: string[]): Problem[] {
  const problems: Problem[] = [];
  const ids = contentIds(towns);
  const where = new Map<string, string>();
  for (const town of towns) {
    where.set(town.id, town.id);
    for (const item of items(town)) where.set(item.id, itemLabel(town, item));
    for (const scenario of town.scenarios) where.set(scenario.id, `${town.id}.${scenario.id}`);
  }

  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) problems.push({ where: where.get(id)!, message: `The id ${id} is used more than once.` });
    seen.add(id);
  }

  const shipped = new Set(ledger);
  for (const id of new Set(ids)) {
    if (!shipped.has(id)) {
      problems.push({ where: where.get(id)!, message: `${id} is not in content/ledger.json. Run \`npm run content:build\`.` });
    }
  }
  for (const id of ledger) {
    if (!seen.has(id)) {
      problems.push({
        where: "ledger",
        message: `${id} shipped before, but it is missing. Mark it retired instead of deleting it.`,
      });
    }
  }
  return problems;
}

function townProblems(town: Town, allTowns: Town[]): Problem[] {
  const problems: Problem[] = [];

  for (const creature of town.creatures) {
    for (const move of creature.moves) {
      if (!move.id.startsWith(`${creature.id}.`)) {
        problems.push({
          where: itemLabel(town, move),
          message: `A move of ${creature.id} must have an id that starts with ${creature.id}.`,
        });
      }
    }
  }

  for (const item of items(town)) {
    const at = itemLabel(town, item);
    const cardWords = countWords(item.card.text) + countWords(item.card.example);
    if (cardWords > CARD_WORD_LIMIT) {
      problems.push({
        where: `${at}.card`,
        message: `The card has ${cardWords} words. The limit is ${CARD_WORD_LIMIT}, with the example.`,
      });
    }
    for (const [field, value] of proseFields(item)) {
      problems.push(...sentenceProblems(`${at}.${field}`, value));
    }
    problems.push(...catchChoiceProblems(`${at}.catch.choices`, item.catch.choices));
  }

  const placementNeeded = Math.min(PLACEMENT_QUESTIONS, town.creatures.filter((c) => !c.retired).length);
  if (town.placement.length !== placementNeeded) {
    problems.push({
      where: `${town.id}.placement`,
      message: `The town has ${town.placement.length} placement question(s). It needs ${placementNeeded}: one per creature, up to ${PLACEMENT_QUESTIONS}.`,
    });
  }

  const creatureIds = new Set(town.creatures.map((c) => c.id));
  town.placement.forEach((question, index) => {
    const at = `${town.id}.placement.${index}`;
    if (!creatureIds.has(question.creatureId)) {
      problems.push({ where: at, message: `${question.creatureId} is not a creature of ${town.id}.` });
    }
    problems.push(...sentenceProblems(`${at}.question`, question.question));
    problems.push(...sentenceProblems(`${at}.answer`, question.answer));
  });

  const everyItem = new Set(allTowns.flatMap((t) => items(t).map((item) => item.id)));
  town.confusablePairs.forEach((pair, index) => {
    for (const id of pair) {
      if (!everyItem.has(id)) {
        problems.push({
          where: `${town.id}.confusablePairs.${index}`,
          message: `${id} is not a creature or move in any town.`,
        });
      }
    }
  });

  // A move table can use the moves of any town, like a confusable pair.
  const moves = new Map(allTowns.flatMap((t) => t.creatures.flatMap((c) => c.moves)).map((m) => [m.id, m]));
  for (const scenario of town.scenarios) {
    problems.push(...scenarioProblems(town, scenario, moves));
  }

  return problems;
}

/** The rules that keep every battle playable and its best-move rate measurable (design 12.3). */
function scenarioProblems(town: Town, scenario: Scenario, moves: Map<string, Move>): Problem[] {
  const problems: Problem[] = [];
  const scenarioAt = `${town.id}.${scenario.id}`;
  if (!scenario.id.startsWith(`${town.id}-`)) {
    problems.push({ where: scenarioAt, message: `A scenario of ${town.id} must have an id that starts with ${town.id}-.` });
  }
  problems.push(...sentenceProblems(`${scenarioAt}.problem`, scenario.problem));

  const bestTotal = scenario.turns.reduce((sum, turn) => sum + Math.max(...turn.moves.map((row) => row.damage)), 0);
  if (bestTotal < OPPONENT_HP) {
    problems.push({
      where: scenarioAt,
      message: `The best moves do ${bestTotal} damage in total. A perfect battle must bring the opponent's HP ${OPPONENT_HP} to 0.`,
    });
  }

  scenario.turns.forEach((turn, index) => {
    const at = `${scenarioAt}.turns.${index}`;
    problems.push(...sentenceProblems(`${at}.threat`, turn.threat));
    problems.push(...sentenceProblems(`${at}.modelAnswer`, turn.modelAnswer));
    turn.keyPoints.forEach((point, i) => problems.push(...sentenceProblems(`${at}.keyPoints.${i}`, point)));
    const top = Math.max(...turn.moves.map((row) => row.damage));
    const best = turn.moves.filter((row) => row.damage === top).length;
    if (best !== 1) {
      problems.push({
        where: at,
        message: `The turn has ${best} moves with the top damage ${top}. It needs exactly one best move.`,
      });
    }
    const seen = new Set<string>();
    turn.moves.forEach(({ moveId, counterattack }, row) => {
      if (seen.has(moveId)) problems.push({ where: at, message: `${moveId} is in the move table more than once.` });
      seen.add(moveId);
      const count = sentences(counterattack).length;
      if (count !== 1) {
        problems.push({
          where: `${at}.moves.${row}.counterattack`,
          message: `A counterattack is one sentence. This has ${count}.`,
        });
      }
      problems.push(...sentenceProblems(`${at}.moves.${row}.counterattack`, counterattack));
      const move = moves.get(moveId);
      if (!move) problems.push({ where: at, message: `${moveId} is not a move in any town.` });
      else if (move.retired) problems.push({ where: at, message: `${moveId} is retired, so it cannot be in a move table.` });
    });
  });
  return problems;
}

// The catch screen checks the answer by its text, so two equal choices would both count as right.
// Choices that differ only in capital letters or spaces look the same to a learner, so they count as equal.
function catchChoiceProblems(where: string, choices: string[]): Problem[] {
  const seen = new Set<string>();
  const problems: Problem[] = [];
  for (const choice of choices) {
    const key = choice.toLowerCase().split(/\s+/).join(" ");
    if (seen.has(key)) {
      problems.push({ where, message: `Two choices are the same: "${choice}". Every choice must be different.` });
    }
    seen.add(key);
  }
  return problems;
}

function itemLabel(town: Town, item: Creature | Move): string {
  return `${town.id}.${item.id}`;
}

/** Creatures and moves: the things a learner catches and reviews. */
function items(town: Town): (Creature | Move)[] {
  return town.creatures.flatMap((creature) => [creature, ...creature.moves]);
}

function proseFields(item: Creature | Move): [string, string][] {
  const fields: [string, string][] = [
    ["catch.question", item.catch.question],
    ...item.catch.choices.map((choice, i): [string, string] => [`catch.choices.${i}`, choice]),
    ["catch.explanation", item.catch.explanation],
    ["card.text", item.card.text],
    ["card.example", item.card.example],
    ["review.question", item.review.question],
    ["review.answer", item.review.answer],
  ];
  if ("workedExample" in item) {
    fields.push(
      ["workedExample.problem", item.workedExample.problem],
      ...item.workedExample.steps.map((step, i): [string, string] => [`workedExample.steps.${i}`, step]),
      ["workedExample.answer", item.workedExample.answer],
    );
  }
  return fields;
}

function sentenceProblems(where: string, value: string): Problem[] {
  return sentences(value)
    .filter((sentence) => countWords(sentence) > SENTENCE_WORD_LIMIT)
    .map((sentence) => ({
      where,
      message: `A sentence has ${countWords(sentence)} words. The limit is ${SENTENCE_WORD_LIMIT}: "${sentence.split(/\s+/).slice(0, 3).join(" ")} …"`,
    }));
}

// A word ending in . ! or ? ends a sentence, also when quotes or brackets follow it.
const SENTENCE_END = /[.!?]["'”’)\]]*$/;
const ABBREVIATIONS = new Set(["e.g.", "i.e.", "vs.", "dr.", "mr.", "ms."]);

function sentences(value: string): string[] {
  const result: string[] = [];
  let current: string[] = [];
  for (const token of value.split(/\s+/).filter(Boolean)) {
    current.push(token);
    if (SENTENCE_END.test(token) && !ABBREVIATIONS.has(token.toLowerCase())) {
      result.push(current.join(" "));
      current = [];
    }
  }
  if (current.length > 0) result.push(current.join(" "));
  return result;
}

/** A word is any run of characters that holds a letter or a digit. */
export function countWords(value: string): number {
  return value.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

function townLabel(raw: unknown, index: number): string {
  const id = (raw as { id?: unknown } | null)?.id;
  return typeof id === "string" ? id : `town file ${index + 1}`;
}

function schemaProblems(prefix: string, issues: { path: PropertyKey[]; message: string }[]): Problem[] {
  return issues.map((issue) => ({
    where: [prefix, ...issue.path.map(String)].join("."),
    message: issue.message,
  }));
}
