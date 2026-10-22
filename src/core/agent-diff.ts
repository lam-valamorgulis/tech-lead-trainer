// What an Agent Diff Battle shows (design 7.1, ticket #106): the agent's diff as lines, and the
// words of the review verdicts. Pure functions: no browser.

/** The other side of an Agent Diff Battle in the result lines, for example "The diff's Risk reached 0". */
export const AGENT_DIFF_OPPONENT = "The diff";

/** How a line of the diff changed. */
export type LineChange = "added" | "removed" | "same";

/**
 * One line of the diff. `sign` is what the screen shows in front of the code, so a change reads
 * without colour too (design 9 rule 7). The removed sign is a real minus, easy to tell from a dash.
 */
export type DiffLine = { change: LineChange; sign: "+" | "−" | " "; code: string };

/**
 * The lines of an agent's diff, in unified diff form: "+" starts an added line, "-" a removed
 * one, and a space an unchanged one. The content check trims the diff, so its first line can
 * lose its space: a line with no sign is an unchanged line too.
 */
export function diffLines(diff: string): DiffLine[] {
  return diff.split("\n").map((line) => {
    if (line.startsWith("+")) return { change: "added", sign: "+", code: line.slice(1) };
    if (line.startsWith("-")) return { change: "removed", sign: "−", code: line.slice(1) };
    return { change: "same", sign: " ", code: line.startsWith(" ") ? line.slice(1) : line };
  });
}

/**
 * The words of each review verdict (design 7.1): its name on the button, and its meaning in a few
 * words below it. The meaning says what the verdict does, never whether it is right.
 */
export const VERDICT_WORDS: Record<string, { name: string; meaning: string }> = {
  "verdict.approve": { name: "Approve", meaning: "Merge it as it is" },
  "verdict.ask-for-test": { name: "Ask for a test", meaning: "Merge it only after a test proves it" },
  "verdict.block": { name: "Block", meaning: "Do not merge it" },
  "verdict.narrow": { name: "Narrow", meaning: "Merge only the safe part" },
};

/** The name of a review verdict, or undefined for any other move. */
export function verdictName(moveId: string): string | undefined {
  return VERDICT_WORDS[moveId]?.name;
}
