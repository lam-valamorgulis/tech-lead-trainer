// Hard words with a simple definition (design 2, ticket #31). Pure functions.
import type { Glossary } from "./schema.ts";

export type GlossaryWord = Glossary["words"][number];

/** A piece of text. A piece with `word` is a glossary term the learner can tap. */
export type Segment = { text: string } | { text: string; word: string; definition: string };

/** The ways a term can appear: "manipulator in the middle (MITM)" also appears as each part. */
function forms(word: string): string[] {
  const short = word.match(/^(.*?)\s*\(([^)]+)\)$/);
  return short ? [word, short[1], short[2]] : [word];
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type Matcher = { byForm: Map<string, GlossaryWord>; pattern: RegExp | null };
const matchers = new WeakMap<GlossaryWord[], Matcher>();

/** One pattern per glossary, built once. It uses no lookbehind, which old iOS Safari may lack. */
function matcherFor(glossary: GlossaryWord[]): Matcher {
  const cached = matchers.get(glossary);
  if (cached) return cached;
  const byForm = new Map<string, GlossaryWord>();
  for (const entry of glossary) for (const form of forms(entry.word)) byForm.set(form.toLowerCase(), entry);
  const alternatives = [...byForm.keys()].sort((a, b) => b.length - a.length).map(escape);
  // Group 1 is the character before the term, so the term starts at a word boundary.
  const pattern =
    alternatives.length === 0 ? null : new RegExp(`(^|[^\\p{L}\\p{N}])(${alternatives.join("|")})(?![\\p{L}\\p{N}])`, "giu");
  const matcher = { byForm, pattern };
  matchers.set(glossary, matcher);
  return matcher;
}

/**
 * Splits a text into plain pieces and glossary terms. It matches whole words and ignores case,
 * prefers the longest term, and marks only the first use of each term in the text.
 */
export function glossarySegments(text: string, glossary: GlossaryWord[]): Segment[] {
  const { byForm, pattern } = matcherFor(glossary);
  if (!pattern) return [{ text }];

  const segments: Segment[] = [];
  const used = new Set<string>();
  let plainStart = 0;
  for (const match of text.matchAll(pattern)) {
    const term = match[2];
    const entry = byForm.get(term.toLowerCase());
    // A case-folding edge (such as "ſ" for "s") can match without a map key. Leave it plain.
    if (!entry || used.has(entry.word)) continue;
    used.add(entry.word);
    const start = match.index + match[1].length;
    if (start > plainStart) segments.push({ text: text.slice(plainStart, start) });
    segments.push({ text: term, word: entry.word, definition: entry.definition });
    plainStart = start + term.length;
  }
  if (plainStart < text.length) segments.push({ text: text.slice(plainStart) });
  return segments;
}
