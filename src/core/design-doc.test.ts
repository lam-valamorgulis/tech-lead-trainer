import { describe, expect, it } from "vitest";
import { DESIGN_DOC_COACH_PROMPT, designDocPackage, DESIGN_DOC_SECTIONS } from "./design-doc.ts";
import { PRIVACY_REMINDER } from "./discuss.ts";

const boss = {
  title: "Weekend 1 boss: the slow sale page",
  situation: [
    { kind: "paragraph" as const, text: "The sale page of `shop.example` loads slowly." },
    { kind: "list" as const, items: ["Every visitor downloads the logo again.", "Far visitors wait."] },
  ],
  mermaidStarter: "sequenceDiagram",
  coachPrompt: "You are my tech lead coach. Ask me ONE question at a time.",
};

describe("the design doc template", () => {
  it("has the five parts of design 3: Problem, Options, Decision, Trade-offs, Risks", () => {
    expect(DESIGN_DOC_SECTIONS.map((section) => section.title)).toEqual(["Problem", "Options", "Decision", "Trade-offs", "Risks"]);
  });
});

describe("designDocPackage", () => {
  it("starts with the privacy reminder and the boss's coach prompt, then the situation, the doc and the diagram", () => {
    const text = designDocPackage({
      boss,
      doc: { problem: "The page is slow.", options: "Cache or CDN.", decision: "", tradeOffs: "", risks: "", diagram: "graph TD\n  A-->B" },
    });
    expect(text).toBe(
      [
        PRIVACY_REMINDER,
        "",
        "You are my tech lead coach. Ask me ONE question at a time.",
        "",
        "# Design doc: Weekend 1 boss: the slow sale page",
        "",
        "## The situation",
        "",
        "The sale page of `shop.example` loads slowly.",
        "",
        "1. Every visitor downloads the logo again.",
        "2. Far visitors wait.",
        "",
        "## Problem",
        "",
        "The page is slow.",
        "",
        "## Options",
        "",
        "Cache or CDN.",
        "",
        "## Decision",
        "",
        "(empty)",
        "",
        "## Trade-offs",
        "",
        "(empty)",
        "",
        "## Risks",
        "",
        "(empty)",
        "",
        "## Diagram",
        "",
        "```mermaid",
        "graph TD",
        "  A-->B",
        "```",
        "",
      ].join("\n"),
    );
  });

  it("uses the default coach prompt when the boss has none", () => {
    const doc = { problem: "", options: "", decision: "", tradeOffs: "", risks: "", diagram: "" };
    expect(designDocPackage({ boss: { ...boss, coachPrompt: null }, doc })).toContain(DESIGN_DOC_COACH_PROMPT);
  });
});
