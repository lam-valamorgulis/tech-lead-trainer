// If-then plan (design 3, ticket #14): a learning cue tied to a habit the learner already has.

export const DEFAULT_TIRED_PLAN = "If I am tired, I tap 3.";

/**
 * The plan as the learner reads it. The profile stores only their own words, the cue:
 * "my morning coffee" gives "After my morning coffee, I open the app and tap 3 / 15 / 45."
 */
export function planSentence(cue: string): string {
  return `After ${cue}, I open the app and tap 3 / 15 / 45.`;
}

/** The learner's words without a typed "After" or end punctuation. Null when nothing is left. */
export function cleanCue(input: string): string | null {
  const cue = input
    .trim()
    .replace(/^after\b\s*/i, "")
    .replace(/[\s.,;!?]+$/, "")
    .trim();
  return cue === "" ? null : cue;
}

/** The first open asks for the plan until one is saved. */
export function needsPlan(profile: { ifThenPlan: string | null }): boolean {
  return profile.ifThenPlan === null;
}
