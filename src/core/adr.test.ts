import { describe, expect, it } from "vitest";
import { ADR_COACH_PROMPT, adrPackage, ADR_SECTIONS, adrOutcomeDue, adrReminderDue, adrReminderMessage, outcomeDateRange, validOutcomeDate } from "./adr.ts";

describe("the ADR template", () => {
  it("has Nygard's parts, plus a prediction and the real outcome (month 1 ADR template)", () => {
    expect(ADR_SECTIONS.map((section) => section.title)).toEqual([
      "Title",
      "Context",
      "Decision",
      "Consequences",
      "My prediction",
      "What really happened",
    ]);
  });
});

describe("the outcome check date", () => {
  it("is 4 to 8 weeks after the ADR was written, 6 weeks by default", () => {
    expect(outcomeDateRange("2026-11-01")).toEqual({ earliest: "2026-11-29", latest: "2026-12-27", suggested: "2026-12-13" });
  });

  it("refuses a date outside 4 to 8 weeks", () => {
    expect(validOutcomeDate("2026-11-01", "2026-11-28")).toBe(false);
    expect(validOutcomeDate("2026-11-01", "2026-11-29")).toBe(true);
    expect(validOutcomeDate("2026-11-01", "2026-12-27")).toBe(true);
    expect(validOutcomeDate("2026-11-01", "2026-12-28")).toBe(false);
  });
});

describe("the outcome reminder", () => {
  const adr = { outcomeCheckDate: "2026-12-13", outcome: "" };

  it("is sent on the check date itself, once", () => {
    expect(adrReminderDue([adr], "2026-12-12")).toBe(false);
    expect(adrReminderDue([adr], "2026-12-13")).toBe(true);
    expect(adrReminderDue([adr], "2026-12-14")).toBe(false);
  });

  it("is not sent when the real outcome is already written, or when there is no date", () => {
    expect(adrReminderDue([{ ...adr, outcome: "It worked." }], "2026-12-13")).toBe(false);
    expect(adrReminderDue([{ outcomeCheckDate: null, outcome: "" }], "2026-12-13")).toBe(false);
  });

  it("stays on home from the check date until the real outcome is written", () => {
    expect(adrOutcomeDue(adr, "2026-12-12")).toBe(false);
    expect(adrOutcomeDue(adr, "2026-12-13")).toBe(true);
    expect(adrOutcomeDue(adr, "2027-01-20")).toBe(true);
    expect(adrOutcomeDue({ ...adr, outcome: "  " }, "2027-01-20")).toBe(true);
    expect(adrOutcomeDue({ ...adr, outcome: "It worked." }, "2027-01-20")).toBe(false);
  });
});

describe("adrReminderMessage", () => {
  it("names no work content, never blames, and links to the ADR by its town", () => {
    expect(adrReminderMessage("t01")).toEqual({
      title: "Tech Lead Trainer",
      body: "Today is the day to check your ADR. What really happened after your decision?",
      url: "/weekend/t01/adr",
    });
  });
});

describe("adrPackage", () => {
  const adr = {
    sections: {
      title: "Prices in the browser",
      context: "The server template is slow.",
      decision: "We will load prices in the browser.",
      consequences: "",
      prediction: "Pages get faster.",
      outcome: "",
    },
    status: "accepted" as const,
    outcomeCheckDate: "2026-12-13",
  };

  it("starts with the privacy reminder, then the coach prompt, then the ADR with its status and check date", () => {
    const text = adrPackage({ adr, coachPrompt: "You are my coach." });
    expect(text.split("\n").slice(0, 3)).toEqual([expect.stringMatching(/^Privacy reminder:/), "", "You are my coach."]);
    expect(text).toContain("# ADR: Prices in the browser\n\n- Status: accepted\n- Check the real outcome on: 2026-12-13");
    expect(text).toContain("## Consequences\n\n(empty)");
    expect(text).toContain("## My prediction\n\nPages get faster.");
    expect(text).not.toContain("## Title");
  });

  it("uses the default coach prompt when the town has none", () => {
    expect(adrPackage({ adr, coachPrompt: null })).toContain(ADR_COACH_PROMPT);
  });
});
