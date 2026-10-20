// The order of a session (design 3). A pure function: no clock, no database.
// Reviews come first, then the catch, the battle, and on a 45-minute day extra time.

export type SessionStep = "reviews" | "catch" | "battle" | "extra" | "done";

/** Which steps have work today. */
export type SessionWork = { reviews: boolean; catch: boolean; battle: boolean; extra: boolean };

const ORDER = ["reviews", "catch", "battle", "extra"] as const;

/**
 * The step to show: the first step from `phase` on that has work today. "nothing" when no step
 * had work at all, "done" when the steps with work are finished. It never goes back.
 */
export function sessionStep(work: SessionWork, phase: SessionStep): SessionStep | "nothing" {
  if (!ORDER.some((step) => work[step])) return "nothing";
  if (phase === "done") return "done";
  return ORDER.slice(ORDER.indexOf(phase)).find((step) => work[step]) ?? "done";
}
