// Hard words with a simple definition (design 2, ticket #31). Pure functions.

export type GlossaryWord = { word: string; definition: string };

/** A piece of text. A piece with `word` is a glossary term the learner can tap. */
export type Segment = { text: string; word?: string; definition?: string };

/** The ways a term can appear: "manipulator in the middle (MITM)" also appears as each part. */
function forms(word: string): string[] {
  const short = word.match(/^(.*?)\s*\(([^)]+)\)$/);
  return short ? [word, short[1], short[2]] : [word];
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Splits a text into plain pieces and glossary terms. It matches whole words and ignores case,
 * prefers the longest term, and marks only the first use of each term in the text.
 */
export function glossarySegments(text: string, glossary: GlossaryWord[]): Segment[] {
  const byForm = new Map<string, GlossaryWord>();
  for (const entry of glossary) for (const form of forms(entry.word)) byForm.set(form.toLowerCase(), entry);
  if (byForm.size === 0) return [{ text }];

  const alternatives = [...byForm.keys()].sort((a, b) => b.length - a.length).map(escape);
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${alternatives.join("|")})(?![\\p{L}\\p{N}])`, "giu");

  const segments: Segment[] = [];
  const used = new Set<string>();
  let plainStart = 0;
  for (const match of text.matchAll(pattern)) {
    const entry = byForm.get(match[0].toLowerCase())!;
    if (used.has(entry.word)) continue;
    used.add(entry.word);
    if (match.index > plainStart) segments.push({ text: text.slice(plainStart, match.index) });
    segments.push({ text: match[0], word: entry.word, definition: entry.definition });
    plainStart = match.index + match[0].length;
  }
  if (plainStart < text.length) segments.push({ text: text.slice(plainStart) });
  return segments;
}
