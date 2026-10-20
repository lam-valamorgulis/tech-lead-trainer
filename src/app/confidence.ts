/** The confidence scale for catch and placement answers: 1 = guess, 2 = think so, 3 = sure. */
export type Confidence = 1 | 2 | 3;

export const CONFIDENCE: { value: Confidence; label: string }[] = [
  { value: 1, label: "Guess" },
  { value: 2, label: "Think so" },
  { value: 3, label: "Sure" },
];
