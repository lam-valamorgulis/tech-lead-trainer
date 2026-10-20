// The weekend boss design doc (design 3, ticket #32). Pure functions: no clock, no browser.
import type { Boss } from "../content/weekend.ts";
import { PRIVACY_REMINDER } from "./discuss.ts";

/** The design doc of a boss: the five parts of design 3, and a Mermaid diagram. */
export type DesignDoc = {
  problem: string;
  options: string;
  decision: string;
  tradeOffs: string;
  risks: string;
  diagram: string;
};

/** The template, in order, with a short hint for each part (from the month 1 boss file). */
export const DESIGN_DOC_SECTIONS: { key: Exclude<keyof DesignDoc, "diagram">; title: string; hint: string }[] = [
  { key: "problem", title: "Problem", hint: "What breaks, for whom, and how you will know it is fixed. 3 to 5 sentences." },
  { key: "options", title: "Options", hint: "For each problem: at least 2 options. One line each." },
  { key: "decision", title: "Decision", hint: "Which option for each problem, in one sentence each." },
  { key: "tradeOffs", title: "Trade-offs", hint: "What each decision costs you: more work, more risk, a slower page." },
  { key: "risks", title: "Risks", hint: "What can still go wrong, and how you will notice it." },
];

/** For a boss without its own coach prompt. Same rules as the month 1 boss. */
export const DESIGN_DOC_COACH_PROMPT =
  "You are my tech lead coach. Below is my design doc. Do not give me a model answer yet. Ask me ONE question at a time about my options and my decision. Wait for my reply. Give hints, not solutions. After three rounds, tell me which trade-off I missed. Then ask me to explain the trade-off again in my own words. Show me two English mistakes and ask me to fix them.";

/** The design doc as one Markdown package for "Discuss in Claude" (design 10). */
export function designDocPackage({ boss, doc }: { boss: Boss; doc: DesignDoc }): string {
  const situation = boss.situation.map((block) =>
    block.kind === "paragraph" ? block.text : block.items.map((item, index) => `${index + 1}. ${item}`).join("\n"),
  );
  const lines = [
    PRIVACY_REMINDER,
    "",
    boss.coachPrompt ?? DESIGN_DOC_COACH_PROMPT,
    "",
    `# Design doc: ${boss.title}`,
    "",
    "## The situation",
    "",
    situation.join("\n\n"),
    "",
    ...DESIGN_DOC_SECTIONS.flatMap(({ key, title }) => [`## ${title}`, "", doc[key].trim() || "(empty)", ""]),
    "## Diagram",
    "",
    "```mermaid",
    doc.diagram.trim(),
    "```",
    "",
  ];
  return lines.join("\n");
}
