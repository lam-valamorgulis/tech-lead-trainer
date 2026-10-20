// The weekend ADR (design 3, week 2; ticket #33). Pure functions: no clock, no browser.
// One ADR for a real decision at work, with a check of the real outcome 4 to 8 weeks later.
import { addDays, type LearningDay } from "./day.ts";
import { PRIVACY_REMINDER } from "./discuss.ts";
import type { ReminderMessage } from "./reminders.ts";

export type AdrSectionKey =
  "title" | "context" | "decision" | "consequences" | "prediction" | "outcome";

/** The parts, in order, with the hints of the month 1 ADR template (Nygard 2011, plus a prediction). */
export const ADR_SECTIONS: {
  key: AdrSectionKey;
  title: string;
  hint: string;
}[] = [
  { key: "title", title: "Title", hint: "The decision in a few words." },
  {
    key: "context",
    title: "Context",
    hint: "What was true when you decided: the needs and the limits. 3 to 6 sentences.",
  },
  {
    key: "decision",
    title: "Decision",
    hint: '"We will ..." in one or two sentences.',
  },
  {
    key: "consequences",
    title: "Consequences",
    hint: "What becomes easier, and what becomes harder. Both.",
  },
  {
    key: "prediction",
    title: "My prediction",
    hint: "What you expect to see in 4 to 8 weeks. Make it something you can check.",
  },
  {
    key: "outcome",
    title: "What really happened",
    hint: "Write this on the check date, under your prediction.",
  },
];

/** Nygard's statuses: deprecated means no longer used, superseded means replaced by a newer ADR. */
export const ADR_STATUSES = [
  "proposed",
  "accepted",
  "deprecated",
  "superseded",
] as const;
export type AdrStatus = (typeof ADR_STATUSES)[number];

const EARLIEST_DAYS = 28;
const LATEST_DAYS = 56;
const SUGGESTED_DAYS = 42;

/** The days the real outcome can be checked: 4 to 8 weeks after the ADR was written (design 3). */
export function outcomeDateRange(writtenOn: LearningDay) {
  return {
    earliest: addDays(writtenOn, EARLIEST_DAYS),
    latest: addDays(writtenOn, LATEST_DAYS),
    suggested: addDays(writtenOn, SUGGESTED_DAYS),
  };
}

export function validOutcomeDate(
  writtenOn: LearningDay,
  date: LearningDay,
): boolean {
  const { earliest, latest } = outcomeDateRange(writtenOn);
  return date >= earliest && date <= latest;
}

/** What the outcome rules need from an ADR. */
export type AdrCheck = {
  outcomeCheckDate: LearningDay | null;
  outcome: string;
};

/** Home shows the outcome check from its date until the learner writes what really happened. */
export function adrOutcomeDue(adr: AdrCheck, today: LearningDay): boolean {
  return (
    adr.outcomeCheckDate !== null &&
    today >= adr.outcomeCheckDate &&
    adr.outcome.trim() === ""
  );
}

/** The push reminder goes out on the check date itself, once, for an ADR without an outcome. */
export function adrReminderDue(adrs: AdrCheck[], today: LearningDay): boolean {
  return adrs.some(
    (adr) => adr.outcomeCheckDate === today && adr.outcome.trim() === "",
  );
}

/**
 * The push reminder on the check date. It goes out at the learner's morning reminder time, as its
 * own kind, so it never replaces the daily reminder. Like every reminder text, it names no content.
 */
export function adrReminderMessage(townId: string): ReminderMessage {
  return {
    title: "Tech Lead Trainer",
    body: "Today is the day to check your ADR. What really happened after your decision?",
    url: `/weekend/${townId}/adr`,
  };
}

/** For a town without its own ADR coach prompt. Same rules as the month 1 ADR file. */
export const ADR_COACH_PROMPT =
  "You are my tech lead coach. Below is an ADR I wrote for a real decision at work. Do not rewrite it for me. Ask me ONE question at a time about the context, the options I did not take, and the consequences. Wait for my reply. Give hints, not solutions. After three rounds, tell me which consequence I missed. Then ask me to explain the decision again in my own words. Show me two English mistakes and ask me to fix them.";

/**
 * The ADR as one Markdown package for "Discuss in Claude" (design 10). It is about real work, so the
 * privacy reminder comes first (design 3).
 */
export function adrPackage({
  adr,
  coachPrompt,
}: {
  adr: {
    sections: Record<AdrSectionKey, string>;
    status: AdrStatus;
    outcomeCheckDate: LearningDay | null;
  };
  coachPrompt: string | null;
}): string {
  const parts = ADR_SECTIONS.filter(({ key }) => key !== "title").flatMap(
    ({ key, title }) => [
      `## ${title}`,
      "",
      adr.sections[key].trim() || "(empty)",
      "",
    ],
  );
  return [
    PRIVACY_REMINDER,
    "",
    coachPrompt ?? ADR_COACH_PROMPT,
    "",
    `# ADR: ${adr.sections.title.trim() || "(no title)"}`,
    "",
    `- Status: ${adr.status}`,
    `- Check the real outcome on: ${adr.outcomeCheckDate ?? "(not set)"}`,
    "",
    ...parts,
  ].join("\n");
}
